const path = require('path');
const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');
const { broadcastInvoice } = require('../realtime/events');
const { buildInvoicePdf } = require('../utils/pdf');
const { writeFile, readFile, removeFile, exists } = require('../utils/storage');
const { getCompanySettings } = require('./companySettingService');
const { getPrismaPagination, createPaginatedResponse, parsePaginationParams } = require('../utils/pagination');

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
          vehicle: invoice.appointment.vehicle
            ? {
                id: invoice.appointment.vehicle.id,
                make: invoice.appointment.vehicle.make,
                model: invoice.appointment.vehicle.model,
                year: invoice.appointment.vehicle.year,
                plateNumber: invoice.appointment.vehicle.plateNumber,
                carId: invoice.appointment.vehicle.carId,
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
    include: {
      vehicle: true,
    },
  },
  client: true,
};

const generateInvoiceNumber = async (client = prisma) => {
  const now = new Date();
  const year = now.getFullYear();

  // Count invoices from this year
  const count = await client.invoice.count({
    where: {
      issueDate: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    },
  });

  const sequence = String(count + 1).padStart(5, '0');
  return `INV-${year}-${sequence}`;
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
};

const sanitizeLineItems = (lineItems = []) => {
  return lineItems.map((item, index) => {
    const name = String(item?.name ?? '').trim();
    if (!name) {
      throw new AppError(`Line item #${index + 1} is missing a name`, 400);
    }

    // Enhanced quantity tracking - separate for hardware and labor
    const hardwareQuantity = Math.max(0, parseInt(item?.hardwareQuantity ?? 1, 10) || 1);
    const laborQuantity = Math.max(0, parseInt(item?.laborQuantity ?? 1, 10) || 1);

    const hardwarePriceValue = toNumeric(item?.hardwarePrice);
    const hardwarePrice = hardwarePriceValue === null ? 0 : Math.max(0, hardwarePriceValue);

    const laborPriceValue = toNumeric(item?.laborPrice);
    const laborPrice = laborPriceValue === null ? 0 : Math.max(0, laborPriceValue);

    // Calculate total: (hwQty * hwPrice) + (laborQty * laborPrice)
    const totalPrice = roundCurrency(
      (hardwareQuantity * hardwarePrice) + (laborQuantity * laborPrice)
    );

    // Backward compatibility: if unitPrice is provided but no hardware/labor prices, use it
    const unitPriceValue = toNumeric(item?.unitPrice);
    const legacyUnitPrice = unitPriceValue !== null ? roundCurrency(unitPriceValue) : 0;

    // Legacy quantity for backward compatibility
    const quantityValue = toNumeric(item?.quantity);
    const legacyQuantity = quantityValue === null ? 1 : Math.max(0.001, quantityValue);

    return {
      name,
      description: item?.description ? String(item.description).trim() : null,
      // Enhanced fields
      hardwareQuantity,
      laborQuantity,
      hardwarePrice: roundCurrency(hardwarePrice),
      laborPrice: roundCurrency(laborPrice),
      hardwareUnit: item?.hardwareUnit ? String(item.hardwareUnit).trim() : null,
      laborUnit: item?.laborUnit ? String(item.laborUnit).trim() : null,
      totalPrice,
      // Legacy fields for backward compatibility
      quantity: legacyQuantity,
      unitPrice: legacyUnitPrice || roundCurrency(hardwarePrice + laborPrice),
      order: item?.order ?? index,
    };
  });
};

const calculateTotals = (sanitizedLineItems = [], taxInput) => {
  const subtotal = roundCurrency(
    sanitizedLineItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)
  );
  const taxValue = toNumeric(taxInput);
  const tax = roundCurrency(Math.max(taxValue ?? 0, 0));
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

const sanitizePayload = (payload = {}, existing) => {
  const lineItemsProvided = Object.prototype.hasOwnProperty.call(payload, 'lineItems');
  const sanitizedItems = lineItemsProvided
    ? sanitizeLineItems(Array.isArray(payload.lineItems) ? payload.lineItems : [])
    : existing?.lineItems?.map((item, index) => ({
        name: item.name,
        description: item.description,
        quantity: Number(item.quantity || 1),
        // Backward compatibility: combine hardwarePrice + laborPrice for unitPrice
        unitPrice: Number(item.hardwarePrice || 0) + Number(item.laborPrice || 0),
        order: item.order ?? index,
      })) || [];

  if (sanitizedItems.length === 0) {
    throw new AppError('Invoice must include at least one line item', 400);
  }

  const totals = calculateTotals(sanitizedItems, payload.tax);
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

const getInvoiceById = async (id) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: includeConfig,
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  return mapInvoice(invoice);
};

const listInvoices = async (filters = {}, options = {}) => {
  const { paginate = false } = options;
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

  const orderBy = filters.sortBy
    ? { [filters.sortBy]: filters.sortOrder || 'desc' }
    : { createdAt: 'desc' };

  if (!paginate) {
    const invoices = await prisma.invoice.findMany({
      where,
      include: includeConfig,
      orderBy,
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

const createInvoice = async (payload, options = {}) => {
  const { tx, skipBroadcast = false } = options;
  const client = tx || prisma;

  // Validate appointment exists and is completed
  const appointment = await client.appointment.findUnique({
    where: { id: payload.appointmentId },
    include: {
      client: true,
      vehicle: true,
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

  const invoiceNumber = await generateInvoiceNumber(client);
  const { status, issueDate, dueDate, notes, totals, sanitizedItems } = sanitizePayload(payload);
  const relativePdfPath = buildRelativePdfPath(payload.appointmentId, invoiceNumber);

  // Payment tracking from appointment
  const advancePayment = appointment.advancePayment ? Number(appointment.advancePayment) : 0;
  const remainingBalance = roundCurrency(totals.total - advancePayment);
  const paymentStatus = advancePayment === 0 ? 'UNPAID' : (remainingBalance <= 0 ? 'PAID' : 'PARTIAL');

  const invoice = await client.invoice.create({
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
      pdfUrl: relativePdfPath,
      // Payment tracking
      advancePayment,
      remainingBalance,
      paymentStatus,
      advancePaidAt: appointment.advancePaidAt,
      finalPaidAt: appointment.finalPaidAt,
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
    include: includeConfig,
  });

  const mapped = mapInvoice(invoice);
  const companySettings = await getCompanySettings();

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

  return mapped;
};

const updateInvoice = async (id, payload, options = {}) => {
  const { tx, skipBroadcast = false } = options;
  const client = tx || prisma;

  const existing = await client.invoice.findUnique({
    where: { id },
    include: { lineItems: true },
  });

  if (!existing) {
    throw new AppError('Invoice not found', 404);
  }

  const { status, issueDate, dueDate, notes, totals, sanitizedItems } = sanitizePayload(payload, existing);
  const relativePdfPath = existing.pdfUrl || buildRelativePdfPath(existing.appointmentId, existing.invoiceNumber, id);

  // Recalculate payment status if advance payment or total changed
  const advancePayment = payload.advancePayment !== undefined
    ? Number(payload.advancePayment)
    : Number(existing.advancePayment || 0);
  const remainingBalance = roundCurrency(totals.total - advancePayment);
  const paymentStatus = advancePayment === 0 ? 'UNPAID' : (remainingBalance <= 0 ? 'PAID' : 'PARTIAL');

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
      pdfUrl: relativePdfPath,
      // Update payment tracking
      advancePayment,
      remainingBalance,
      paymentStatus,
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
  const companySettings = await getCompanySettings();

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

const deleteInvoice = async (id, options = {}) => {
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

const generateInvoicePdf = async (id, { refresh = false } = {}) => {
  const invoice = await prisma.invoice.findUnique({
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
  const companySettings = await getCompanySettings();
  const { buffer, relativePath: storedPath } = await persistPdfForInvoice({
    mappedInvoice: mapped,
    relativePath,
    previousPath: invoice.pdfUrl,
    updateRecord: !invoice.pdfUrl || invoice.pdfUrl !== relativePath,
    companySettings,
    client: prisma,
  });
  mapped.pdfUrl = `/files/${storedPath.replace(/\\/g, '/')}`;
  const filename = path.basename(relativePath);

  return { buffer, filename };
};

const markInvoiceAsSent = async (id, options = {}) => {
  const { tx, skipBroadcast = false } = options;
  const client = tx || prisma;

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

const markInvoiceAsPaid = async (id, options = {}) => {
  const { tx, skipBroadcast = false } = options;
  const client = tx || prisma;

  const invoice = await client.invoice.findUnique({
    where: { id },
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  const updated = await client.invoice.update({
    where: { id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
    },
    include: includeConfig,
  });

  const mapped = mapInvoice(updated);

  if (!skipBroadcast) {
    broadcastInvoice('paid', mapped);
  }

  return mapped;
};

const getInvoicesByAppointment = async (appointmentId) => {
  const invoices = await prisma.invoice.findMany({
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
const createInvoiceFromServiceOrder = async (serviceOrderId, options = {}) => {
  const { tx, skipBroadcast = false } = options;
  const client = tx || prisma;

  // Get service order with all related data
  const serviceOrder = await client.serviceOrder.findUnique({
    where: { id: serviceOrderId },
    include: {
      appointment: {
        include: {
          client: true,
          vehicle: true,
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

  return createInvoice(payload, { tx: client, skipBroadcast });
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
