const path = require('path');
const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');
const { broadcastInvoice } = require('../realtime/events');
const { buildInvoicePdf } = require('../utils/pdf');
const { writeFile, readFile, removeFile, exists } = require('../utils/storage');
const { getCompanySettings } = require('./companySettingService');
const { getPrismaPagination, createPaginatedResponse, parsePaginationParams } = require('../utils/pagination');
const { calculateTotalPaid, updateInvoicePaymentStatus } = require('./paymentService');
const loyaltyService = require('./loyaltyService');
const { sendInvoiceCreatedEmail } = require('./email/emailService');
const logger = require('../utils/logger');

const VALID_STATUSES = ['DRAFT', 'GENERATED', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];
const IMMUTABLE_STATUSES = new Set(['PAID', 'CANCELLED']);
const STATUS_TRANSITIONS = {
  DRAFT: new Set(['DRAFT', 'GENERATED', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']),
  GENERATED: new Set(['GENERATED', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']),
  SENT: new Set(['SENT', 'PAID', 'OVERDUE', 'CANCELLED']),
  PAID: new Set(['PAID']),
  OVERDUE: new Set(['OVERDUE', 'PAID', 'CANCELLED']),
  CANCELLED: new Set(['CANCELLED']),
};

const toNumeric = (value) => {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const roundCurrency = (value) => Math.round(value * 100) / 100;

const mapInvoice = (invoice) => {
  if (!invoice) return null;
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    appointmentId: invoice.appointmentId,
    serviceOrderId: invoice.serviceOrderId,
    clientId: invoice.clientId,
    status: invoice.status?.toLowerCase() || 'draft',
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    subtotal: Number(invoice.subtotal || 0),
    tax: Number(invoice.tax || 0),
    total: Number(invoice.total || 0),
    loyaltyDiscount: invoice.loyaltyDiscount != null ? Number(invoice.loyaltyDiscount) : 0,
    loyaltyTierAtTime: invoice.loyaltyTierAtTime || null,
    notes: invoice.notes,
    sentAt: invoice.sentAt,
    paidAt: invoice.paidAt,
    // Payment tracking
    advancePayment: Number(invoice.advancePayment || 0),
    remainingBalance: Number(invoice.remainingBalance || 0),
    paymentStatus: invoice.paymentStatus?.toLowerCase() || 'unpaid',
    advancePaidAt: invoice.advancePaidAt,
    finalPaidAt: invoice.finalPaidAt,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
    lineItems: invoice.lineItems?.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      // Enhanced quantity tracking
      hardwareQuantity: Number(item.hardwareQuantity || 1),
      laborQuantity: Number(item.laborQuantity || 1),
      hardwarePrice: Number(item.hardwarePrice || 0),
      laborPrice: Number(item.laborPrice || 0),
      hardwareUnit: item.hardwareUnit,
      laborUnit: item.laborUnit,
      totalPrice: Number(item.totalPrice),
      // Backward compatibility fields
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.hardwarePrice || 0) + Number(item.laborPrice || 0),
      order: item.order,
    })) || [],
    appointment: invoice.appointment
      ? {
          id: invoice.appointment.id,
          title: invoice.appointment.title,
          scheduledStart: invoice.appointment.scheduledStart,
          scheduledEnd: invoice.appointment.scheduledEnd,
          status: invoice.appointment.status?.toLowerCase(),
          asset: invoice.appointment.asset
            ? {
                id: invoice.appointment.asset.id,
                name: invoice.appointment.asset.name,
                manufacturer: invoice.appointment.asset.manufacturer,
                model: invoice.appointment.asset.model,
                year: invoice.appointment.asset.year,
                identifier: invoice.appointment.asset.identifier,
                type: invoice.appointment.asset.type,
              }
            : null,
        }
      : null,
    client: invoice.client
      ? {
          id: invoice.client.id,
          type: invoice.client.type,
          firstName: invoice.client.firstName,
          lastName: invoice.client.lastName,
          companyName: invoice.client.companyName,
          contactName: invoice.client.contactName,
          phone: invoice.client.phone,
          email: invoice.client.email,
          vatNumber: invoice.client.vatNumber,
          registrationNumber: invoice.client.registrationNumber,
        }
      : null,
    anafSync: invoice.anafSync
      ? {
          id: invoice.anafSync.id,
          status: invoice.anafSync.status,
          uploadIndex: invoice.anafSync.uploadIndex,
          uploadedAt: invoice.anafSync.uploadedAt,
          processedAt: invoice.anafSync.processedAt,
          lastCheckedAt: invoice.anafSync.lastCheckedAt,
          errorMessage: invoice.anafSync.errorMessage,
          retryCount: invoice.anafSync.retryCount,
          maxRetries: invoice.anafSync.maxRetries,
        }
      : null,
    pdfUrl: invoice.pdfUrl ? `/files/${invoice.pdfUrl.replace(/\\/g, '/')}` : null,
  };
};

const includeConfig = {
  lineItems: {
    orderBy: {
      order: 'asc',
    },
  },
  appointment: {
    select: {
      id: true,
      title: true,
      scheduledStart: true,
      scheduledEnd: true,
      status: true,
      asset: {
        select: {
          id: true,
          name: true,
          manufacturer: true,
          model: true,
          year: true,
          identifier: true,
          type: true,
          metadata: true,
        },
      },
    },
  },
  client: {
    select: {
      id: true,
      type: true,
      firstName: true,
      lastName: true,
      companyName: true,
      contactName: true,
      phone: true,
      email: true,
      address: true,
      vatNumber: true,
      registrationNumber: true,
    },
  },
};

/**
 * Get standard include config for invoice queries
 */
const getIncludeConfig = () => {
  return {
    lineItems: {
      orderBy: {
        order: 'asc',
      },
    },
    appointment: {
      select: {
        id: true,
        title: true,
        scheduledStart: true,
        scheduledEnd: true,
        status: true,
        asset: {
          select: {
            id: true,
            name: true,
            manufacturer: true,
            model: true,
            year: true,
            identifier: true,
            type: true,
            metadata: true,
          },
        },
      },
    },
    client: {
      select: {
        id: true,
        type: true,
        firstName: true,
        lastName: true,
        companyName: true,
        contactName: true,
        phone: true,
        email: true,
        address: true,
        vatNumber: true,
        registrationNumber: true,
      },
    },
  };
};

const generateInvoiceNumber = async (client = prisma, organizationId = null) => {
  const now = new Date();
  const year = now.getFullYear();

  // Load per-org invoice sequence settings (using global prisma since organization is not a tenant model)
  let seq = {};
  if (organizationId) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true },
      });
      seq = org?.settings?.invoiceSequence || {};
    } catch {
      // Fall back to defaults on error
    }
  }

  const prefix = (seq.prefix || 'INV').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'INV';
  const separator = ['-', '/', '_', ''].includes(seq.separator) ? seq.separator : '-';
  const includeYear = seq.includeYear !== false;
  const paddingDigits = Math.max(3, Math.min(10, Number(seq.paddingDigits) || 5));
  const startingNumber = Math.max(1, Number(seq.startingNumber) || 1);
  const baseYear = Number(seq.baseYear) || year;

  // startingNumber applies only for the configured base year; other years start from 1
  const effectiveStart = year === baseYear ? startingNumber : 1;

  // Count invoices from this year (tenantPrisma already filters by organizationId)
  const count = await client.invoice.count({
    where: {
      issueDate: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    },
  });

  // baseCount = invoice count when startingNumber was set (stored alongside it)
  const baseCount = Math.max(0, Number(seq.baseCount) || 0);
  // Compute next number: startingNumber + invoices created since the change
  const invoicesSinceChange = Math.max(0, count - baseCount);
  const sequence = String(effectiveStart + invoicesSinceChange).padStart(paddingDigits, '0');

  if (includeYear) {
    return separator
      ? `${prefix}${separator}${year}${separator}${sequence}`
      : `${prefix}${year}${sequence}`;
  }
  return separator ? `${prefix}${separator}${sequence}` : `${prefix}${sequence}`;
};

const sanitizeFilename = (value, fallback) => {
  const base = (value || fallback || 'invoice').toString().trim();
  const sanitized = base.replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/_+/g, '_');
  return sanitized || fallback || 'invoice';
};

const buildRelativePdfPath = (appointmentId, invoiceNumber, invoiceId) => {
  const folder = sanitizeFilename(appointmentId, invoiceId || 'invoice');
  const filename = sanitizeFilename(invoiceNumber, invoiceId || appointmentId);
  return path.posix.join('invoices', folder, `${filename}.pdf`);
};

const persistPdfForInvoice = async ({
  mappedInvoice,
  relativePath,
  previousPath,
  updateRecord = false,
  companySettings,
  client = prisma,
}) => {
  try {
    const buffer = await buildInvoicePdf(mappedInvoice, companySettings);

    await writeFile(relativePath, buffer);

    if (previousPath && previousPath !== relativePath) {
      await removeFile(previousPath);
    }

    if (updateRecord) {
      await client.invoice.update({
        where: { id: mappedInvoice.id },
        data: { pdfUrl: relativePath },
      });
    }

    return { buffer, relativePath };
  } catch (error) {
    throw error;
  }
};

const sanitizeLineItems = (lineItems = []) => {
  return lineItems.map((item, index) => {
    const name = String(item?.name ?? '').trim();
    if (!name) {
      throw new AppError(`Line item #${index + 1} is missing a name`, 400);
    }

    // Enhanced quantity tracking - separate for hardware and labor
    // Allow 0 for quantities in case item only has hardware OR labor (not both)
    const hardwareQuantity = Math.max(0, parseInt(item?.hardwareQuantity ?? 0, 10) || 0);
    const laborQuantity = Math.max(0, parseInt(item?.laborQuantity ?? 0, 10) || 0);

    // If both are 0, default to 1 for legacy support
    const finalHardwareQuantity = (hardwareQuantity === 0 && laborQuantity === 0) ? 1 : hardwareQuantity;
    const finalLaborQuantity = (hardwareQuantity === 0 && laborQuantity === 0) ? 1 : laborQuantity;

    let hardwarePrice = 0;
    let laborPrice = 0;

    // Try to get hardware and labor prices
    const hardwarePriceValue = toNumeric(item?.hardwarePrice);
    const laborPriceValue = toNumeric(item?.laborPrice);

    // If both hardware and labor prices are provided, use them
    if (hardwarePriceValue !== null || laborPriceValue !== null) {
      hardwarePrice = hardwarePriceValue !== null ? Math.max(0, hardwarePriceValue) : 0;
      laborPrice = laborPriceValue !== null ? Math.max(0, laborPriceValue) : 0;
    } else {
      // Backward compatibility: if unitPrice is provided but no hardware/labor prices, use it as labor price
      const unitPriceValue = toNumeric(item?.unitPrice);
      if (unitPriceValue !== null && unitPriceValue > 0) {
        // Put all price in labor for backward compatibility
        laborPrice = Math.max(0, unitPriceValue);
        hardwarePrice = 0;
      }
    }

    // Calculate total: (hwQty * hwPrice) + (laborQty * laborPrice)
    const totalPrice = roundCurrency(
      (finalHardwareQuantity * hardwarePrice) + (finalLaborQuantity * laborPrice)
    );

    // Legacy quantity for backward compatibility
    const quantityValue = toNumeric(item?.quantity);
    const legacyQuantity = quantityValue === null ? 1 : Math.max(0.001, quantityValue);

    return {
      name,
      description: item?.description ? String(item.description).trim() : null,
      // Enhanced fields
      hardwareQuantity: finalHardwareQuantity,
      laborQuantity: finalLaborQuantity,
      hardwarePrice: roundCurrency(hardwarePrice),
      laborPrice: roundCurrency(laborPrice),
      hardwareUnit: item?.hardwareUnit ? String(item.hardwareUnit).trim() : null,
      laborUnit: item?.laborUnit ? String(item.laborUnit).trim() : null,
      totalPrice,
      // Legacy fields for backward compatibility
      quantity: legacyQuantity,
      unitPrice: roundCurrency(hardwarePrice + laborPrice),
      order: item?.order ?? index,
    };
  });
};

const calculateTotals = (sanitizedLineItems = [], taxInput, companySettings = null) => {
  const subtotal = roundCurrency(
    sanitizedLineItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)
  );

  let tax = 0;

  // Calculate TVA if enabled in company settings
  if (companySettings && companySettings.tvaEnabled) {
    const tvaPercentage = Number(companySettings.tvaPercentage) || 0;
    tax = roundCurrency(subtotal * (tvaPercentage / 100));
  } else {
    // Use provided tax value or 0
    const taxValue = toNumeric(taxInput);
    tax = roundCurrency(Math.max(taxValue ?? 0, 0));
  }

  const total = roundCurrency(subtotal + tax);

  return { subtotal, tax, total };
};

const resolveStatus = (requestedStatus, existingStatus) => {
  const current = existingStatus ? existingStatus.toString().toUpperCase() : undefined;
  const desired = (requestedStatus ?? current ?? 'DRAFT').toString().toUpperCase();
  if (!VALID_STATUSES.includes(desired)) {
    throw new AppError(`Invalid invoice status "${requestedStatus}"`, 400);
  }

  if (current) {
    if (IMMUTABLE_STATUSES.has(current) && desired !== current) {
      throw new AppError(`Invoice is already ${current.toLowerCase()} and cannot change status`, 409);
    }
    if (!STATUS_TRANSITIONS[current].has(desired)) {
      throw new AppError(`Cannot transition invoice from ${current.toLowerCase()} to ${desired.toLowerCase()}`, 409);
    }
  }

  return desired;
};

const sanitizePayload = (payload = {}, existing, companySettings = null) => {
  const lineItemsProvided = Object.prototype.hasOwnProperty.call(payload, 'lineItems');
  const sanitizedItems = lineItemsProvided
    ? sanitizeLineItems(Array.isArray(payload.lineItems) ? payload.lineItems : [])
    : sanitizeLineItems(
        (existing?.lineItems || []).map((item) => ({
          name: item.name,
          description: item.description,
          hardwareQuantity: item.hardwareQuantity,
          laborQuantity: item.laborQuantity,
          hardwarePrice: item.hardwarePrice,
          laborPrice: item.laborPrice,
          hardwareUnit: item.hardwareUnit,
          laborUnit: item.laborUnit,
          quantity: item.quantity,
          order: item.order,
        }))
      );

  if (sanitizedItems.length === 0) {
    throw new AppError('Invoice must include at least one line item', 400);
  }

  const totals = calculateTotals(sanitizedItems, payload.tax, companySettings);
  const status = resolveStatus(payload.status, existing?.status);

  // Validate dates
  const issueDate = payload.issueDate ? new Date(payload.issueDate) : (existing?.issueDate || new Date());
  const dueDate = payload.dueDate ? new Date(payload.dueDate) : existing?.dueDate;

  if (!dueDate) {
    throw new AppError('Due date is required', 400);
  }

  if (dueDate < issueDate) {
    throw new AppError('Due date cannot be before issue date', 400);
  }

  return {
    status,
    issueDate,
    dueDate,
    notes: payload?.notes ? String(payload.notes).trim() : null,
    totals,
    sanitizedItems,
  };
};

const getInvoiceById = async (prisma, id) => {
  const includeConfig = getIncludeConfig();

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: includeConfig,
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  return mapInvoice(invoice);
};

const listInvoices = async (prisma, filters = {}, options = {}) => {
  const { paginate = false, locationFilter } = options;
  const where = {};

  // Status filter
  if (filters.status) {
    where.status = filters.status.toUpperCase();
  }

  // Client filter
  if (filters.clientId) {
    where.clientId = filters.clientId;
  }

  // Date range filters
  if (filters.issueDateFrom || filters.issueDateTo) {
    where.issueDate = {};
    if (filters.issueDateFrom) {
      where.issueDate.gte = new Date(filters.issueDateFrom);
    }
    if (filters.issueDateTo) {
      where.issueDate.lte = new Date(filters.issueDateTo);
    }
  }

  // Search by invoice number
  if (filters.search) {
    where.invoiceNumber = {
      contains: filters.search,
      mode: 'insensitive',
    };
  }

  // Location filter - invoices are filtered via their appointment's location
  if (locationFilter && locationFilter.locationId) {
    where.appointment = {
      locationId: locationFilter.locationId,
    };
  } else if (locationFilter && locationFilter.OR) {
    // Handle includeNull case
    where.appointment = {
      OR: locationFilter.OR.map((cond) => ({
        locationId: cond.locationId,
      })),
    };
  }

  const includeConfig = getIncludeConfig();

  const orderBy = filters.sortBy
    ? { [filters.sortBy]: filters.sortOrder || 'desc' }
    : { createdAt: 'desc' };

  if (!paginate) {
    // Cap at 200 to prevent unbounded memory usage; use export endpoints for full datasets
    const invoices = await prisma.invoice.findMany({
      where,
      include: includeConfig,
      orderBy,
      take: 200,
    });

    return invoices.map(mapInvoice);
  }

  const pagination = parsePaginationParams(filters);
  const prismaPagination = getPrismaPagination(pagination);

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: includeConfig,
      orderBy,
      ...prismaPagination,
    }),
    prisma.invoice.count({ where }),
  ]);

  return createPaginatedResponse(invoices.map(mapInvoice), total, pagination);
};

const createInvoice = async (prisma, payload, options = {}) => {
  const { tx, skipBroadcast = false, organizationId = null } = options;
  const client = tx || prisma;

  // Validate appointment exists and is completed
  const appointment = await client.appointment.findUnique({
    where: { id: payload.appointmentId },
    select: {
      id: true,
      title: true,
      scheduledStart: true,
      scheduledEnd: true,
      status: true,
      clientId: true,
      client: {
        select: {
          id: true,
          type: true,
          firstName: true,
          lastName: true,
          companyName: true,
          contactName: true,
          phone: true,
          email: true,
          address: true,
          vatNumber: true,
          registrationNumber: true,
        },
      },
      asset: {
        select: {
          id: true,
          name: true,
          manufacturer: true,
          model: true,
          year: true,
          identifier: true,
          type: true,
          metadata: true,
        },
      },
    },
  });

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  if (appointment.status !== 'COMPLETED') {
    throw new AppError('Cannot create invoice for appointment that is not completed', 400);
  }

  // Use appointment's client if not provided
  const clientId = payload.clientId || appointment.clientId;
  if (!clientId) {
    throw new AppError('Client is required for invoice', 400);
  }

  // Fetch company settings for TVA calculation
  const companySettings = await getCompanySettings(organizationId);

  const { status, issueDate, dueDate, notes, totals, sanitizedItems } = sanitizePayload(payload, null, companySettings);

  // Apply loyalty tier discount if applicable (opt-in; default true)
  let loyaltyDiscount = null;
  let loyaltyTierAtTime = null;
  if (payload.applyLoyaltyDiscount !== false) {
    try {
      const tierInfo = await loyaltyService.getTierDiscount(prisma, clientId);
      if (tierInfo && tierInfo.discountPercent > 0) {
        loyaltyTierAtTime = tierInfo.tier;
        loyaltyDiscount = roundCurrency(totals.subtotal * (tierInfo.discountPercent / 100));
        totals.total = roundCurrency(totals.total - loyaltyDiscount);
      }
    } catch (err) {
      // Loyalty failures never block invoice creation
    }
  }

  // Payment tracking from Payment records (not just advance payment)
  const totalPaid = await calculateTotalPaid(prisma, payload.appointmentId, { tx: client });
  const remainingBalance = roundCurrency(totals.total - totalPaid);
  const paymentStatus = totalPaid === 0 ? 'UNPAID' : (remainingBalance <= 0 ? 'PAID' : 'PARTIAL');

  // Get payment dates from Payment records
  const payments = await client.payment.findMany({
    where: { appointmentId: payload.appointmentId },
    orderBy: { paymentDate: 'asc' },
  });
  const advancePaidAt = payments.length > 0 ? payments[0].paymentDate : null;
  const finalPaidAt = paymentStatus === 'PAID' && payments.length > 0
    ? payments[payments.length - 1].paymentDate
    : null;

  // Retry loop handles the rare case of concurrent invoice creation for the same org
  // producing duplicate invoice numbers (@@unique([organizationId, invoiceNumber]))
  let invoice;
  let invoiceNumber;
  const MAX_INVOICE_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_INVOICE_RETRIES; attempt++) {
    invoiceNumber = await generateInvoiceNumber(client, organizationId);
    try {
      invoice = await client.invoice.create({
        data: {
          invoiceNumber,
          appointmentId: payload.appointmentId,
          serviceOrderId: payload.serviceOrderId || null,
          clientId,
          status,
          issueDate,
          dueDate,
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total,
          notes,
          pdfUrl: buildRelativePdfPath(payload.appointmentId, invoiceNumber),
          loyaltyDiscount,
          loyaltyTierAtTime,
          // Payment tracking (from Payment records, not appointment fields)
          advancePayment: totalPaid,
          remainingBalance,
          paymentStatus,
          advancePaidAt,
          finalPaidAt,
          lineItems: {
            create: sanitizedItems.map((item) => ({
              name: item.name,
              description: item.description,
              // Enhanced quantity and price tracking
              hardwareQuantity: item.hardwareQuantity,
              laborQuantity: item.laborQuantity,
              hardwarePrice: item.hardwarePrice,
              laborPrice: item.laborPrice,
              hardwareUnit: item.hardwareUnit,
              laborUnit: item.laborUnit,
              totalPrice: item.totalPrice,
              // Legacy fields
              quantity: item.quantity,
              order: item.order,
            })),
          },
        },
      });
      break; // success
    } catch (err) {
      const isDuplicate = err.code === 'P2002' &&
        (err.meta?.target ?? []).some(t => String(t).includes('invoiceNumber'));
      if (isDuplicate && attempt < MAX_INVOICE_RETRIES - 1) continue;
      throw err;
    }
  }

  const relativePdfPath = buildRelativePdfPath(payload.appointmentId, invoiceNumber);

  // Manually construct the mapped invoice from data we already have
  // to avoid circular reference issues
  const mapped = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    appointmentId: invoice.appointmentId,
    serviceOrderId: invoice.serviceOrderId,
    clientId: invoice.clientId,
    status: invoice.status?.toLowerCase(),
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    subtotal: Number(invoice.subtotal),
    tax: Number(invoice.tax),
    total: Number(invoice.total),
    notes: invoice.notes,
    sentAt: invoice.sentAt,
    paidAt: invoice.paidAt,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
    advancePayment: invoice.advancePayment ? Number(invoice.advancePayment) : 0,
    remainingBalance: invoice.remainingBalance ? Number(invoice.remainingBalance) : 0,
    paymentStatus: invoice.paymentStatus?.toLowerCase(),
    advancePaidAt: invoice.advancePaidAt,
    finalPaidAt: invoice.finalPaidAt,
    lineItems: sanitizedItems,
    appointment: appointment ? {
      id: appointment.id,
      title: appointment.title,
      scheduledStart: appointment.scheduledStart,
      scheduledEnd: appointment.scheduledEnd,
      status: appointment.status?.toLowerCase(),
      asset: appointment.asset || null,
    } : null,
    client: appointment?.client || null,
    pdfUrl: invoice.pdfUrl ? `/files/${invoice.pdfUrl.replace(/\\/g, '/')}` : null,
  };

  await persistPdfForInvoice({
    mappedInvoice: mapped,
    relativePath: relativePdfPath,
    previousPath: null,
    updateRecord: false,
    companySettings,
    client,
  });

  mapped.pdfUrl = `/files/${relativePdfPath.replace(/\\/g, '/')}`;

  if (!skipBroadcast) {
    broadcastInvoice('created', mapped);
  }

  // Send invoice email to client (fire-and-forget)
  const invoiceClient = mapped.client || appointment?.client;
  if (invoiceClient?.email) {
    sendInvoiceCreatedEmail(prisma, {
      invoice: mapped,
      client: invoiceClient,
      companySettings,
      organizationId: appointment?.organizationId,
    }).catch((err) => logger.error('[EMAIL] Invoice created email failed:', err.message));
  }

  return mapped;
};

const updateInvoice = async (prisma, id, payload, options = {}) => {
  const { tx, skipBroadcast = false, userId } = options;
  const client = tx || prisma;

  const existing = await client.invoice.findUnique({
    where: { id },
    include: { lineItems: true, appointment: true },
  });

  if (!existing) {
    throw new AppError('Invoice not found', 404);
  }

  // Fetch company settings for TVA calculation
  const companySettings = await getCompanySettings(existing.organizationId);

  const { status, issueDate, dueDate, notes, totals, sanitizedItems } = sanitizePayload(payload, existing, companySettings);
  const relativePdfPath = existing.pdfUrl || buildRelativePdfPath(existing.appointmentId, existing.invoiceNumber, id);

  // Handle loyalty discount for this update
  let updatedLoyaltyDiscount = Number(existing.loyaltyDiscount || 0);
  let updatedLoyaltyTierAtTime = existing.loyaltyTierAtTime || null;

  if (payload.applyLoyaltyDiscount === false) {
    // Remove loyalty discount
    updatedLoyaltyDiscount = 0;
    updatedLoyaltyTierAtTime = null;
  } else if (payload.applyLoyaltyDiscount === true) {
    // Recalculate loyalty discount from client's current tier
    try {
      const tierInfo = await loyaltyService.getTierDiscount(prisma, existing.clientId);
      if (tierInfo && tierInfo.discountPercent > 0) {
        updatedLoyaltyTierAtTime = tierInfo.tier;
        updatedLoyaltyDiscount = roundCurrency(totals.subtotal * (tierInfo.discountPercent / 100));
      } else {
        updatedLoyaltyDiscount = 0;
        updatedLoyaltyTierAtTime = null;
      }
    } catch (err) {
      updatedLoyaltyDiscount = 0;
    }
  }
  // else: preserve existing (updatedLoyaltyDiscount already set above)

  // Apply loyalty discount to the recalculated total
  if (updatedLoyaltyDiscount > 0) {
    totals.total = roundCurrency(totals.total - updatedLoyaltyDiscount);
  }

  // Track if we're changing to PAID status for PDF regeneration
  const changingToPaid = status === 'PAID' && existing.status !== 'PAID';

  // If changing status to PAID, check for TVA adjustment need
  if (changingToPaid && userId) {
    const totalPaidBeforeAdjustment = await calculateTotalPaid(prisma, existing.appointmentId, { tx: client });
    const invoiceTotal = Number(totals.total);
    const remainingAmount = roundCurrency(invoiceTotal - totalPaidBeforeAdjustment);

    if (remainingAmount > 0) {
      // Check if TVA adjustment already exists
      const existingAdjustment = await client.payment.findFirst({
        where: {
          appointmentId: existing.appointmentId,
          invoiceId: id,
          type: 'TVA_ADJUSTMENT',
        },
      });

      if (!existingAdjustment) {
        // Get last payment for payment method
        const lastPayment = await client.payment.findFirst({
          where: { appointmentId: existing.appointmentId },
          orderBy: { paymentDate: 'desc' },
        });

        // Create TVA adjustment payment
        await client.payment.create({
          data: {
            appointmentId: existing.appointmentId,
            invoiceId: id,
            amount: remainingAmount,
            paymentMethod: lastPayment?.paymentMethod || 'CASH',
            paymentDate: existing.issueDate || new Date(),
            type: 'TVA_ADJUSTMENT',
            notes: 'Plata TVA - generată automat',
            createdById: userId,
          },
        });
      }
    }
  }

  // Recalculate payment status from Payment records (after potential TVA adjustment)
  const totalPaid = await calculateTotalPaid(prisma, existing.appointmentId, { tx: client });
  const remainingBalance = roundCurrency(totals.total - totalPaid);
  const paymentStatus = totalPaid === 0 ? 'UNPAID' : (remainingBalance <= 0 ? 'PAID' : 'PARTIAL');

  // Get payment dates from Payment records
  const payments = await client.payment.findMany({
    where: { appointmentId: existing.appointmentId },
    orderBy: { paymentDate: 'asc' },
  });
  const advancePaidAt = payments.length > 0 ? payments[0].paymentDate : null;
  const finalPaidAt = paymentStatus === 'PAID' && payments.length > 0
    ? payments[payments.length - 1].paymentDate
    : null;

  const includeConfig = getIncludeConfig();

  const invoice = await client.invoice.update({
    where: { id },
    data: {
      status,
      issueDate,
      dueDate,
      notes,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      loyaltyDiscount: updatedLoyaltyDiscount > 0 ? updatedLoyaltyDiscount : null,
      loyaltyTierAtTime: updatedLoyaltyTierAtTime,
      pdfUrl: relativePdfPath,
      // Set paidAt when changing status to PAID
      ...(changingToPaid && { paidAt: new Date() }),
      // Update payment tracking (from Payment records)
      advancePayment: totalPaid,
      remainingBalance,
      paymentStatus,
      advancePaidAt,
      finalPaidAt,
      lineItems: {
        deleteMany: {},
        create: sanitizedItems.map((item) => ({
          name: item.name,
          description: item.description,
          // Enhanced quantity and price tracking
          hardwareQuantity: item.hardwareQuantity,
          laborQuantity: item.laborQuantity,
          hardwarePrice: item.hardwarePrice,
          laborPrice: item.laborPrice,
          hardwareUnit: item.hardwareUnit,
          laborUnit: item.laborUnit,
          totalPrice: item.totalPrice,
          // Legacy fields
          quantity: item.quantity,
          order: item.order,
        })),
      },
    },
    include: includeConfig,
  });

  const mapped = mapInvoice(invoice);

  await persistPdfForInvoice({
    mappedInvoice: mapped,
    relativePath: relativePdfPath,
    previousPath: existing.pdfUrl,
    updateRecord: false,
    companySettings,
    client,
  });

  mapped.pdfUrl = `/files/${relativePdfPath.replace(/\\/g, '/')}`;

  if (!skipBroadcast) {
    broadcastInvoice('updated', mapped);
  }

  return mapped;
};

const deleteInvoice = async (prisma, id, options = {}) => {
  const { tx, skipBroadcast = false } = options;
  const client = tx || prisma;

  const invoice = await client.invoice.findUnique({
    where: { id },
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  if (invoice.status === 'PAID') {
    throw new AppError('Cannot delete a paid invoice', 400);
  }

  // Delete PDF file
  if (invoice.pdfUrl) {
    await removeFile(invoice.pdfUrl);
  }

  await client.invoice.delete({
    where: { id },
  });

  if (!skipBroadcast) {
    broadcastInvoice('deleted', { id });
  }

  return { success: true };
};

const generateInvoicePdf = async (tenantPrisma, id, { refresh = false } = {}) => {
  const client = tenantPrisma || prisma;
  const invoice = await client.invoice.findUnique({
    where: { id },
    include: includeConfig,
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  if (!refresh && invoice.pdfUrl && (await exists(invoice.pdfUrl))) {
    const buffer = await readFile(invoice.pdfUrl);
    const filename = path.basename(invoice.pdfUrl);
    return { buffer, filename };
  }

  const mapped = mapInvoice(invoice);
  const relativePath = invoice.pdfUrl || buildRelativePdfPath(invoice.appointmentId, invoice.invoiceNumber, invoice.id);
  const companySettings = await getCompanySettings(invoice.organizationId);
  const { buffer, relativePath: storedPath } = await persistPdfForInvoice({
    mappedInvoice: mapped,
    relativePath,
    previousPath: invoice.pdfUrl,
    updateRecord: !invoice.pdfUrl || invoice.pdfUrl !== relativePath,
    companySettings,
    client,
  });
  mapped.pdfUrl = `/files/${storedPath.replace(/\\/g, '/')}`;
  const filename = path.basename(relativePath);

  return { buffer, filename };
};

const markInvoiceAsSent = async (prismaClient, id, options = {}) => {
  const { tx, skipBroadcast = false } = options;
  const client = tx || prismaClient;

  const invoice = await client.invoice.findUnique({
    where: { id },
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  if (invoice.status === 'DRAFT') {
    throw new AppError('Cannot mark a draft invoice as sent', 400);
  }

  const updated = await client.invoice.update({
    where: { id },
    data: {
      status: 'SENT',
      sentAt: new Date(),
    },
    include: includeConfig,
  });

  const mapped = mapInvoice(updated);

  if (!skipBroadcast) {
    broadcastInvoice('sent', mapped);
  }

  return mapped;
};

const markInvoiceAsPaid = async (prismaClient, id, options = {}) => {
  const { tx, skipBroadcast = false, userId } = options;
  const client = tx || prismaClient;

  const invoice = await client.invoice.findUnique({
    where: { id },
    include: {
      appointment: true,
    },
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  // Calculate total paid from existing payments
  const totalPaid = await calculateTotalPaid(client, invoice.appointmentId, { tx: client });
  const invoiceTotal = Number(invoice.total);
  const remainingAmount = roundCurrency(invoiceTotal - totalPaid);

  // If there's a remaining balance (likely TVA difference), create an adjustment payment
  if (remainingAmount > 0 && userId) {
    // Check if there's already a TVA adjustment payment for this invoice
    const existingAdjustment = await client.payment.findFirst({
      where: {
        appointmentId: invoice.appointmentId,
        invoiceId: id,
        type: 'TVA_ADJUSTMENT',
      },
    });

    if (!existingAdjustment) {
      // Get the last payment to use the same payment method
      const lastPayment = await client.payment.findFirst({
        where: { appointmentId: invoice.appointmentId },
        orderBy: { paymentDate: 'desc' },
      });

      // Create TVA adjustment payment
      await client.payment.create({
        data: {
          appointmentId: invoice.appointmentId,
          invoiceId: id,
          amount: remainingAmount,
          paymentMethod: lastPayment?.paymentMethod || 'CASH',
          paymentDate: invoice.issueDate || new Date(),
          type: 'TVA_ADJUSTMENT',
          notes: 'Plata TVA - generată automat',
          createdById: userId,
        },
      });
    }
  }

  // Recalculate payment totals after potentially adding TVA adjustment
  const newTotalPaid = await calculateTotalPaid(client, invoice.appointmentId, { tx: client });
  const newRemainingBalance = roundCurrency(invoiceTotal - newTotalPaid);
  const newPaymentStatus = newTotalPaid === 0 ? 'UNPAID' : (newRemainingBalance <= 0 ? 'PAID' : 'PARTIAL');

  // Get payment dates
  const payments = await client.payment.findMany({
    where: { appointmentId: invoice.appointmentId },
    orderBy: { paymentDate: 'asc' },
  });
  const advancePaidAt = payments.length > 0 ? payments[0].paymentDate : null;
  const finalPaidAt = newPaymentStatus === 'PAID' && payments.length > 0
    ? payments[payments.length - 1].paymentDate
    : null;

  const updated = await client.invoice.update({
    where: { id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      advancePayment: newTotalPaid,
      remainingBalance: newRemainingBalance,
      paymentStatus: newPaymentStatus,
      advancePaidAt,
      finalPaidAt,
    },
    include: includeConfig,
  });

  const mapped = mapInvoice(updated);

  // Regenerate PDF to reflect PAID status and updated payment info
  const companySettings = await getCompanySettings(invoice.organizationId);
  await persistPdfForInvoice({
    mappedInvoice: mapped,
    relativePath: invoice.pdfUrl || buildRelativePdfPath(invoice.appointmentId, invoice.invoiceNumber, id),
    previousPath: invoice.pdfUrl,
    updateRecord: false,
    companySettings,
    client,
  });

  if (!skipBroadcast) {
    broadcastInvoice('paid', mapped);
  }

  return mapped;
};

const getInvoicesByAppointment = async (prismaClient, appointmentId) => {
  const invoices = await prismaClient.invoice.findMany({
    where: { appointmentId },
    include: includeConfig,
    orderBy: { createdAt: 'desc' },
  });

  return invoices.map(mapInvoice);
};

/**
 * Create an invoice from a service order
 * This automatically copies all line items from the service order to the invoice
 */
const createInvoiceFromServiceOrder = async (prisma, serviceOrderId, options = {}) => {
  const { tx, skipBroadcast = false, organizationId = null, applyLoyaltyDiscount = true } = options;
  const client = tx || prisma;

  // Get service order with all related data
  const serviceOrder = await client.serviceOrder.findUnique({
    where: { id: serviceOrderId },
    include: {
      appointment: {
        select: {
          id: true,
          clientId: true,
          status: true,
          client: {
            select: {
              id: true,
              type: true,
              firstName: true,
              lastName: true,
              companyName: true,
              vatNumber: true,
              registrationNumber: true,
            },
          },
          asset: {
            select: {
              id: true,
              name: true,
              manufacturer: true,
              model: true,
              year: true,
              identifier: true,
              type: true,
              metadata: true,
            },
          },
        },
      },
      lineItems: {
        orderBy: { id: 'asc' },
      },
    },
  });

  if (!serviceOrder) {
    throw new AppError('Service order not found', 404);
  }

  if (!serviceOrder.appointment) {
    throw new AppError('Service order must have an associated appointment', 400);
  }

  // Map service order line items to invoice line items
  const lineItems = serviceOrder.lineItems.map((item, index) => ({
    name: item.name,
    description: item.description,
    hardwareQuantity: item.hardwareQuantity,
    laborQuantity: item.laborQuantity,
    hardwarePrice: Number(item.hardwarePrice),
    laborPrice: Number(item.laborPrice),
    hardwareUnit: item.hardwareUnit,
    laborUnit: item.laborUnit,
    order: index,
  }));

  // Create invoice with service order data
  const payload = {
    appointmentId: serviceOrder.appointmentId,
    serviceOrderId: serviceOrder.id,
    clientId: serviceOrder.appointment.clientId,
    lineItems,
    tax: Number(serviceOrder.tax || 0),
    notes: serviceOrder.notes,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default: 30 days from now
  };

  return createInvoice(prisma, { ...payload, applyLoyaltyDiscount }, { tx: client, skipBroadcast, organizationId });
};

module.exports = {
  getInvoiceById,
  listInvoices,
  createInvoice,
  createInvoiceFromServiceOrder,
  updateInvoice,
  deleteInvoice,
  generateInvoicePdf,
  markInvoiceAsSent,
  markInvoiceAsPaid,
  getInvoicesByAppointment,
};
