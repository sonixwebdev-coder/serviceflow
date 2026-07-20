const { AppError } = require('../utils/errors');
const { broadcastServiceOrder } = require('../realtime/events');
const { buildServiceOrderPdf } = require('../utils/pdf');
const { writeFile, readFile, removeFile, exists } = require('../utils/storage');
const { getCompanySettings } = require('./companySettingService');
const logger = require('../utils/logger');
const {
  buildDownloadFilename,
  buildRelativePdfPath,
  generateOrderNumber,
  includeConfig,
  mapServiceOrder,
  roundCurrency,
  sanitizePayload,
} = require('./serviceOrder/serviceOrderDomain');

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
      where: { id: mappedOrder.id },
      data: { pdfUrl: relativePath },
    });
  }

  return { buffer, relativePath };
};

const getServiceOrder = async (prisma, appointmentId) => {
  const order = await prisma.serviceOrder.findUnique({
    where: { appointmentId },
    include: includeConfig,
  });

  return mapServiceOrder(order);
};

const generateServiceOrderPdf = async (prisma, appointmentId, { refresh = false } = {}) => {
  const order = await prisma.serviceOrder.findUnique({
    where: { appointmentId },
    include: includeConfig,
  });

  if (!order) {
    throw new AppError('Service order not found', 404);
  }

  if (!refresh && order.pdfUrl && (await exists(order.pdfUrl))) {
    const buffer = await readFile(order.pdfUrl);
    const filename = buildDownloadFilename(order);
    return { buffer, filename };
  }

  const mapped = mapServiceOrder(order);
  const relativePath =
    order.pdfUrl || buildRelativePdfPath(order.appointmentId, order.orderNumber, order.id);
  const companySettings = await getCompanySettings(order.organizationId);
  const { buffer, relativePath: storedPath } = await persistPdfForOrder({
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
  return { buffer, filename };
};

const upsertServiceOrder = async (prisma, appointmentId, payload, options = {}) => {
  const { tx, skipBroadcast = false, onResult, organizationId } = options;
  const client = tx || prisma;

  // Build where clause with organizationId if provided (needed for transaction queries)
  const where = organizationId ? { id: appointmentId, organizationId } : { id: appointmentId };

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
    where: { appointmentId },
    include: { lineItems: true },
  });

  const orderNumber =
    existing?.orderNumber || (await generateOrderNumber(client, appointment.organizationId));
  const relativePdfPath = buildRelativePdfPath(appointmentId, orderNumber, existing?.id);
  const companySettings = await getCompanySettings(organizationId);
  const { status, notes, metadata, totals, sanitizedItems } = sanitizePayload(
    payload,
    existing,
    companySettings
  );

  const order = await client.serviceOrder.upsert({
    where: { appointmentId },
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
      where: { id: appointmentId },
      data: {
        remainingBalance: newRemainingBalance,
        paymentStatus: newPaymentStatus,
        finalPaidAt: newPaymentStatus === 'PAID' ? appointment.finalPaidAt || new Date() : null,
      },
    });

    // Refetch the order to get updated appointment payment data
    const refetchWhere = organizationId ? { appointmentId, organizationId } : { appointmentId };
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

  // Generate PDF asynchronously - don't block the response on PDF generation
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
