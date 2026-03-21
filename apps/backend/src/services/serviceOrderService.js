const path = require('path');
const {AppError} = require('../utils/errors');
const {broadcastServiceOrder} = require('../realtime/events');
const {mapUser} = require('../utils/transform');
const {buildServiceOrderPdf} = require('../utils/pdf');
const {writeFile, readFile, removeFile, exists} = require('../utils/storage');
const {getCompanySettings} = require('./companySettingService');
const logger = require('../utils/logger');

const VALID_STATUSES = ['DRAFT', 'GENERATED', 'SENT', 'SIGNED', 'CANCELLED'];
const IMMUTABLE_STATUSES = new Set(['SIGNED', 'CANCELLED']);
const STATUS_TRANSITIONS = {
    DRAFT: new Set(['DRAFT', 'GENERATED', 'SENT', 'SIGNED', 'CANCELLED']),
    GENERATED: new Set(['GENERATED', 'SENT', 'SIGNED', 'CANCELLED']),
    SENT: new Set(['SENT', 'SIGNED', 'CANCELLED']),
    SIGNED: new Set(['SIGNED']),
    CANCELLED: new Set(['CANCELLED']),
};

const toNumeric = (value) => {
    if (value === null || typeof value === 'undefined' || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const roundCurrency = (value) => {
    // Convert to number first to handle Decimal types from Prisma
    const num = Number(value);
    // Round to 2 decimal places using toFixed to avoid floating point issues
    return Number(num.toFixed(2));
};

const mapServiceOrder = (order) => {
    if (!order) return null;
    const assignees = order.appointment?.assignees || [];
    return {
        id: order.id,
        appointmentId: order.appointmentId,
        orderNumber: order.orderNumber,
        status: order.status?.toLowerCase() || 'draft',
        subtotal: Number(order.subtotal || 0),
        tax: Number(order.tax || 0),
        total: Number(order.total || 0),
        notes: order.notes,
        metadata: order.metadata,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        lineItems: order.lineItems.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            hardwareQuantity: item.hardwareQuantity !== null && item.hardwareQuantity !== undefined ? item.hardwareQuantity : item.quantity,
            laborQuantity: item.laborQuantity !== null && item.laborQuantity !== undefined ? item.laborQuantity : item.quantity,
            unitPrice: Number(item.hardwarePrice || 0) + Number(item.laborPrice || 0), // Backward compatibility: unitPrice = hardwarePrice + laborPrice
            hardwarePrice: Number(item.hardwarePrice || 0),
            laborPrice: Number(item.laborPrice || 0),
            totalPrice: Number(item.totalPrice),
            hardwareUnit: item.hardwareUnit,
            laborUnit: item.laborUnit,
        })),
        appointment: order.appointment
            ? {
                id: order.appointment.id,
                title: order.appointment.title,
                scheduledStart: order.appointment.scheduledStart,
                scheduledEnd: order.appointment.scheduledEnd,
                location: order.appointment.location,
                advancePayment: order.appointment.advancePayment,
                remainingBalance: order.appointment.remainingBalance,
                paymentStatus: order.appointment.paymentStatus,
                advancePaidAt: order.appointment.advancePaidAt,
                finalPaidAt: order.appointment.finalPaidAt,
                createdBy: order.appointment.createdBy
                    ? {
                        firstName: order.appointment.createdBy.firstName,
                        lastName: order.appointment.createdBy.lastName,
                    }
                    : null,
                assignees: assignees.map((assignment) => mapUser(assignment.user)),
                client: order.appointment.client
                    ? {
                        id: order.appointment.client.id,
                        type: order.appointment.client.type,
                        firstName: order.appointment.client.firstName,
                        lastName: order.appointment.client.lastName,
                        companyName: order.appointment.client.companyName,
                        contactName: order.appointment.client.contactName,
                        phone: order.appointment.client.phone,
                        email: order.appointment.client.email,
                        vatNumber: order.appointment.client.vatNumber,
                        registrationNumber: order.appointment.client.registrationNumber,
                    }
                    : null,
                asset: order.appointment.asset
                    ? {
                        id: order.appointment.asset.id,
                        name: order.appointment.asset.name,
                        manufacturer: order.appointment.asset.manufacturer,
                        model: order.appointment.asset.model,
                        year: order.appointment.asset.year,
                        identifier: order.appointment.asset.identifier,
                        type: order.appointment.asset.type,
                        metadata: order.appointment.asset.metadata,
                    }
                    : null,
            }
            : null,
        assigneeIds: assignees.map((assignment) => assignment.userId),
        pdfUrl: order.pdfUrl ? `/files/${order.pdfUrl.replace(/\\/g, '/')}` : null,
    };
};

const includeConfig = {
    lineItems: true,
    appointment: {
        include: {
            client: true,
            asset: true,
            createdBy: true,
            assignees: {
                include: {
                    user: {
                        include: {
                            roles: {
                                include: {
                                    role: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};

const generateOrderNumber = async (client, organizationId) => {
    const where = organizationId ? { organizationId } : {};
    const count = await client.serviceOrder.count({ where });
    const sequence = String(count + 1).padStart(5, '0');
    return `CS-${sequence}`;
};

const sanitizeFilename = (value, fallback) => {
    const base = (value || fallback || 'comanda-service').toString().trim();
    const sanitized = base.replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/_+/g, '_');
    return sanitized || fallback || 'comanda-service';
};

const buildDownloadFilename = (order) => {
    const orderNum = sanitizeFilename(order.orderNumber, 'CS');

    // Extract client name
    let clientName = 'Client';
    if (order.appointment?.client) {
        const client = order.appointment.client;
        if (client.type === 'INDIVIDUAL') {
            clientName = [client.firstName, client.lastName].filter(Boolean).join('_') || 'Client';
        } else {
            clientName = client.companyName || client.contactName || 'Client';
        }
    }
    clientName = sanitizeFilename(clientName, 'Client');

    // Extract asset identifier (plate number, serial number, etc.)
    let assetIdentifier = 'NoAsset';
    if (order.appointment?.asset?.identifier) {
        assetIdentifier = sanitizeFilename(order.appointment.asset.identifier, 'NoAsset');
    }

    return `${orderNum}_${clientName}_${assetIdentifier}.pdf`;
};

const buildRelativePdfPath = (appointmentId, orderNumber, orderId) => {
    const folder = sanitizeFilename(appointmentId, orderId || 'order');
    const filename = sanitizeFilename(orderNumber, orderId || appointmentId);
    return path.posix.join('comanda-service', folder, `${filename}.pdf`);
};

const persistPdfForOrder = async ({
                                      mappedOrder,
                                      relativePath,
                                      previousPath,
                                      updateRecord = false,
                                      companySettings,
                                      client,
                                  }) => {
    const buffer = await buildServiceOrderPdf(mappedOrder, companySettings);
    await writeFile(relativePath, buffer);

    if (previousPath && previousPath !== relativePath) {
        await removeFile(previousPath);
    }

    if (updateRecord) {
        await client.serviceOrder.update({
            where: {id: mappedOrder.id},
            data: {pdfUrl: relativePath},
        });
    }

    return {buffer, relativePath};
};

const sanitizeLineItems = (lineItems = []) => {
    const result = lineItems.map((item, index) => {

        const name = String(item?.name ?? '').trim();
        if (!name) {
            throw new AppError(`Articolul #${index + 1} nu are nume. Va rugam adaugati o descriere pentru fiecare articol.`, 400);
        }

        // Support new separate quantities for hardware and labor
        let hardwareQuantity = 1;
        let laborQuantity = 1;

        if (item?.hardwareQuantity !== undefined || item?.laborQuantity !== undefined) {
            // New format with separate quantities
            const hardwareQtyValue = toNumeric(item?.hardwareQuantity);
            hardwareQuantity = hardwareQtyValue === null ? 1 : Math.max(0, hardwareQtyValue);

            const laborQtyValue = toNumeric(item?.laborQuantity);
            laborQuantity = laborQtyValue === null ? 1 : Math.max(0, laborQtyValue);

        } else if (item?.quantity !== undefined) {
            // Legacy format - use same quantity for both
            const quantityValue = toNumeric(item?.quantity);
            const quantity = quantityValue === null ? 1 : Math.max(1, quantityValue);
            hardwareQuantity = quantity;
            laborQuantity = quantity;
        }

        // Support both old format (unitPrice) and new format (hardwarePrice + laborPrice)
        let hardwarePrice = 0;
        let laborPrice = 0;

        if (item?.hardwarePrice !== undefined || item?.laborPrice !== undefined) {
            // New format
            const hardwarePriceValue = toNumeric(item?.hardwarePrice);
            hardwarePrice = hardwarePriceValue === null ? 0 : hardwarePriceValue;

            const laborPriceValue = toNumeric(item?.laborPrice);
            laborPrice = laborPriceValue === null ? 0 : laborPriceValue;

            if (hardwarePrice < 0) {
                throw new AppError(`Articolul "${name}" trebuie sa aiba un pret pentru piese pozitiv sau zero.`, 400);
            }
            if (laborPrice < 0) {
                throw new AppError(`Articolul "${name}" trebuie sa aiba un pret pentru manopera pozitiv sau zero.`, 400);
            }
        } else {
            // Old format - convert unitPrice to hardwarePrice for backward compatibility
            const unitPriceValue = toNumeric(item?.unitPrice);
            hardwarePrice = unitPriceValue === null ? 0 : unitPriceValue;

            if (hardwarePrice < 0) {
                throw new AppError(`Articolul "${name}" trebuie sa aiba un pret unitar pozitiv sau zero.`, 400);
            }
        }

        // Calculate total using separate quantities
        const totalPrice = roundCurrency((hardwareQuantity * hardwarePrice) + (laborQuantity * laborPrice));

        const sanitized = {
            name,
            description: item?.description ? String(item.description).trim() : null,
            quantity: Math.max(hardwareQuantity, laborQuantity), // Legacy field for backward compatibility
            hardwareQuantity,
            laborQuantity,
            hardwarePrice: roundCurrency(hardwarePrice),
            laborPrice: roundCurrency(laborPrice),
            totalPrice,
            hardwareUnit: item?.hardwareUnit ? String(item.hardwareUnit).trim() : null,
            laborUnit: item?.laborUnit ? String(item.laborUnit).trim() : null,
        };

        return sanitized;
    });

    return result;
};

const calculateTotals = (sanitizedLineItems = [], taxInput, companySettings = null) => {
    const subtotal = roundCurrency(
        sanitizedLineItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)
    );

    let tax = 0;
    // Apply TVA from company settings if enabled (same logic as invoice service)
    if (companySettings && companySettings.tvaEnabled) {
        const tvaPercentage = Number(companySettings.tvaPercentage) || 0;
        tax = roundCurrency(subtotal * (tvaPercentage / 100));
    } else {
        const taxValue = toNumeric(taxInput);
        tax = roundCurrency(Math.max(taxValue ?? 0, 0));
    }

    const total = roundCurrency(subtotal + tax);
    return {subtotal, tax, total};
};

const normalizeMetadata = (metadata) => {
    if (typeof metadata === 'undefined') return undefined;
    if (metadata === null) return null;
    if (typeof metadata !== 'object' || Array.isArray(metadata)) {
        throw new AppError('Metadata must be an object', 400);
    }
    return metadata;
};

const resolveStatus = (requestedStatus, existingStatus) => {
    const current = existingStatus ? existingStatus.toString().toUpperCase() : undefined;
    const desired = (requestedStatus ?? current ?? 'DRAFT').toString().toUpperCase();
    if (!VALID_STATUSES.includes(desired)) {
        throw new AppError(`Invalid service order status "${requestedStatus}"`, 400);
    }

    if (current) {
        if (IMMUTABLE_STATUSES.has(current) && desired !== current) {
            throw new AppError(`Service order is already ${current.toLowerCase()} and cannot change status`, 409);
        }
        if (!STATUS_TRANSITIONS[current].has(desired)) {
            throw new AppError(`Cannot transition service order from ${current.toLowerCase()} to ${desired.toLowerCase()}`, 409);
        }
    }

    return desired;
};

const mapExistingLineItems = (existingLineItems = []) =>
    existingLineItems.map((item) => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice || 0),
    }));

const sanitizePayload = (payload = {}, existing, companySettings = null) => {
    const lineItemsProvided = Object.prototype.hasOwnProperty.call(payload, 'lineItems');
    const sourceLineItems = lineItemsProvided
        ? Array.isArray(payload.lineItems)
            ? payload.lineItems
            : []
        : mapExistingLineItems(existing?.lineItems);

    const sanitizedItems = sanitizeLineItems(sourceLineItems);
    if (sanitizedItems.length === 0) {
        throw new AppError('Comanda de service trebuie sa contina cel putin un articol. Va rugam adaugati piese sau manopera.', 400);
    }
    const totals = calculateTotals(sanitizedItems, payload.tax, companySettings);
    let status;
    try {
        status = resolveStatus(payload.status, existing?.status);
    } catch (error) {
        // Improve error message for status validation
        if (error.message.includes('Invalid service order status')) {
            throw new AppError('Status invalid pentru comanda de service. Statusuri permise: DRAFT, GENERATED, SENT, SIGNED, CANCELLED', 400);
        }
        if (error.message.includes('cannot change status')) {
            throw new AppError('Nu se poate schimba statusul unei comenzi finalizate sau anulate.', 409);
        }
        if (error.message.includes('Cannot transition')) {
            throw new AppError('Tranzitie de status invalida. Verificati statusul curent si statusul dorit.', 409);
        }
        throw error;
    }

    return {
        status,
        notes: payload?.notes ? String(payload.notes).trim() : null,
        metadata: normalizeMetadata(payload.metadata),
        totals,
        sanitizedItems,
    };
};

const getServiceOrder = async (prisma, appointmentId) => {
    const order = await prisma.serviceOrder.findUnique({
        where: {appointmentId},
        include: includeConfig,
    });

    return mapServiceOrder(order);
};

const generateServiceOrderPdf = async (prisma, appointmentId, {refresh = false} = {}) => {
    const order = await prisma.serviceOrder.findUnique({
        where: {appointmentId},
        include: includeConfig,
    });

    if (!order) {
        throw new AppError('Service order not found', 404);
    }

    if (!refresh && order.pdfUrl && (await exists(order.pdfUrl))) {
        const buffer = await readFile(order.pdfUrl);
        const filename = buildDownloadFilename(order);
        return {buffer, filename};
    }

    const mapped = mapServiceOrder(order);
    const relativePath = order.pdfUrl || buildRelativePdfPath(order.appointmentId, order.orderNumber, order.id);
    const companySettings = await getCompanySettings(order.organizationId);
    const {buffer, relativePath: storedPath} = await persistPdfForOrder({
        mappedOrder: mapped,
        relativePath,
        previousPath: order.pdfUrl,
        updateRecord: !order.pdfUrl || order.pdfUrl !== relativePath,
        companySettings,
        client: prisma,
    });
    mapped.pdfUrl = `/files/${storedPath.replace(/\\/g, '/')}`;

    // Update service order's updatedAt timestamp to bust frontend cache
    await prisma.serviceOrder.update({
        where: { appointmentId },
        data: { updatedAt: new Date() },
    });

    const filename = buildDownloadFilename(order);
    return {buffer, filename};
};

const upsertServiceOrder = async (prisma, appointmentId, payload, options = {}) => {
    const {tx, skipBroadcast = false, onResult, organizationId} = options;
    const client = tx || prisma;

    // Build where clause with organizationId if provided (needed for transaction queries)
    const where = organizationId
        ? { id: appointmentId, organizationId }
        : { id: appointmentId };

    const appointment = await client.appointment.findFirst({
        where,
        include: {
            assignees: true,
        },
    });

    if (!appointment) {
        throw new AppError('Appointment not found', 404);
    }

    const existing = await client.serviceOrder.findUnique({
        where: {appointmentId},
        include: {lineItems: true},
    });

    const orderNumber = existing?.orderNumber || (await generateOrderNumber(client, appointment.organizationId));
    const relativePdfPath = buildRelativePdfPath(appointmentId, orderNumber, existing?.id);
    const companySettings = await getCompanySettings(organizationId);
    const {status, notes, metadata, totals, sanitizedItems} = sanitizePayload(payload, existing, companySettings);

    const order = await client.serviceOrder.upsert({
        where: {appointmentId},
        create: {
            appointmentId,
            organizationId: appointment.organizationId,
            orderNumber,
            status,
            subtotal: totals.subtotal,
            tax: totals.tax,
            total: totals.total,
            notes,
            metadata,
            pdfUrl: relativePdfPath,
            lineItems: {
                create: sanitizedItems.map((item) => ({
                    name: item.name,
                    description: item.description,
                    quantity: item.quantity,
                    hardwareQuantity: item.hardwareQuantity,
                    laborQuantity: item.laborQuantity,
                    hardwarePrice: item.hardwarePrice,
                    laborPrice: item.laborPrice,
                    totalPrice: item.totalPrice,
                    hardwareUnit: item.hardwareUnit,
                    laborUnit: item.laborUnit,
                })),
            },
        },
        update: {
            status,
            notes,
            metadata,
            subtotal: totals.subtotal,
            tax: totals.tax,
            total: totals.total,
            pdfUrl: relativePdfPath,
            lineItems: {
                deleteMany: {},
                create: sanitizedItems.map((item) => ({
                    name: item.name,
                    description: item.description,
                    quantity: item.quantity,
                    hardwareQuantity: item.hardwareQuantity,
                    laborQuantity: item.laborQuantity,
                    hardwarePrice: item.hardwarePrice,
                    laborPrice: item.laborPrice,
                    totalPrice: item.totalPrice,
                    hardwareUnit: item.hardwareUnit,
                    laborUnit: item.laborUnit,
                })),
            },
        },
        include: includeConfig,
    });

    // Update appointment payment fields if advance payment exists and total changed
    const currentAdvance = Number(appointment.advancePayment || 0);
    const oldTotal = Number(existing?.total || 0);
    const newTotal = Number(totals.total);

    let orderWithLatestAppointment = order;

    if (currentAdvance > 0 && oldTotal !== newTotal) {
        const newRemainingBalance = roundCurrency(newTotal - currentAdvance);
        let newPaymentStatus = 'UNPAID';

        if (currentAdvance > 0) {
            if (newRemainingBalance <= 0) {
                newPaymentStatus = 'PAID';
            } else {
                newPaymentStatus = 'PARTIAL';
            }
        }

        await client.appointment.update({
            where: {id: appointmentId},
            data: {
                remainingBalance: newRemainingBalance,
                paymentStatus: newPaymentStatus,
                finalPaidAt: newPaymentStatus === 'PAID' ? (appointment.finalPaidAt || new Date()) : null,
            },
        });

        // Refetch the order to get updated appointment payment data
        const refetchWhere = organizationId
            ? { appointmentId, organizationId }
            : { appointmentId };
        orderWithLatestAppointment = await client.serviceOrder.findFirst({
            where: refetchWhere,
            include: includeConfig,
        });
    }

    if (!orderWithLatestAppointment) {
        throw new AppError('Failed to retrieve service order after creation', 500);
    }

    const mapped = mapServiceOrder(orderWithLatestAppointment);
    const action = existing ? 'updated' : 'created';

    // Generate PDF asynchronously — don't block the response on PDF generation
    mapped.pdfUrl = `/files/${relativePdfPath.replace(/\\/g, '/')}`;

    persistPdfForOrder({
        mappedOrder: mapped,
        relativePath: relativePdfPath,
        previousPath: existing?.pdfUrl,
        updateRecord: false,
        companySettings,
        client,
    }).catch((err) => {
        logger.error('Failed to generate service order PDF (will retry on next view)', {
            serviceOrderId: mapped.id,
            error: err.message,
        });
    });

    if (typeof onResult === 'function') {
        onResult(mapped, action);
    }

    if (!skipBroadcast) {
        broadcastServiceOrder(action, mapped);
    }

    return mapped;
};

module.exports = {
    getServiceOrder,
    generateServiceOrderPdf,
    upsertServiceOrder,
};
