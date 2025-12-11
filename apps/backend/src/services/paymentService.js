const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');

/**
 * Create a new payment
 * @param {Object} data - Payment data
 * @param {string} data.appointmentId - Appointment ID
 * @param {string} data.invoiceId - Invoice ID (optional)
 * @param {number} data.amount - Payment amount
 * @param {string} data.paymentMethod - Payment method (CASH, CARD, BANK_TRANSFER, OTHER)
 * @param {Date} data.paymentDate - Payment date
 * @param {string} data.reference - Payment reference
 * @param {string} data.notes - Payment notes
 * @param {string} data.createdById - User who created the payment
 * @param {Object} options - Options
 * @param {Object} options.tx - Transaction client
 * @returns {Promise<Object>} Created payment
 */
const createPayment = async (data, options = {}) => {
  const { tx } = options;
  const client = tx || prisma;

  const {
    appointmentId,
    invoiceId,
    amount,
    paymentMethod = 'CASH',
    paymentDate = new Date(),
    reference,
    notes,
    createdById,
  } = data;

  // Validate appointment exists
  const appointment = await client.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  // Validate invoice if provided
  if (invoiceId) {
    const invoice = await client.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    // Ensure invoice belongs to the same appointment
    if (invoice.appointmentId !== appointmentId) {
      throw new AppError('Invoice does not belong to this appointment', 400);
    }
  }

  // Create payment with rounded amount (2 decimal places)
  const roundedAmount = Math.round(Number(amount) * 100) / 100;

  const payment = await client.payment.create({
    data: {
      appointmentId,
      invoiceId,
      amount: roundedAmount,
      paymentMethod,
      paymentDate,
      reference,
      notes,
      createdById,
    },
    include: {
      appointment: true,
      invoice: true,
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  // Update appointment payment status
  await updateAppointmentPaymentStatus(appointmentId, { tx: client });

  // Update invoice payment status if payment is linked to invoice
  if (invoiceId) {
    await updateInvoicePaymentStatus(invoiceId, { tx: client });
  }

  return payment;
};

/**
 * Get all payments for an appointment
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<Array>} List of payments
 */
const getPaymentsByAppointment = async (appointmentId) => {
  const payments = await prisma.payment.findMany({
    where: { appointmentId },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { paymentDate: 'desc' },
  });

  return payments;
};

/**
 * Get all payments for an invoice
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Array>} List of payments
 */
const getPaymentsByInvoice = async (invoiceId) => {
  const payments = await prisma.payment.findMany({
    where: { invoiceId },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { paymentDate: 'desc' },
  });

  return payments;
};

/**
 * Calculate total paid amount for an appointment
 * @param {string} appointmentId - Appointment ID
 * @param {Object} options - Options
 * @param {Object} options.tx - Transaction client
 * @returns {Promise<number>} Total paid amount
 */
const calculateTotalPaid = async (appointmentId, options = {}) => {
  const { tx } = options;
  const client = tx || prisma;

  const result = await client.payment.aggregate({
    where: { appointmentId },
    _sum: {
      amount: true,
    },
  });

  return Number(result._sum.amount || 0);
};

/**
 * Update appointment payment status based on payments
 * @param {string} appointmentId - Appointment ID
 * @param {Object} options - Options
 * @param {Object} options.tx - Transaction client
 * @returns {Promise<Object>} Updated appointment
 */
const updateAppointmentPaymentStatus = async (appointmentId, options = {}) => {
  const { tx } = options;
  const client = tx || prisma;

  // Get appointment with service order to calculate total
  const appointment = await client.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      serviceOrder: {
        include: {
          lineItems: true,
        },
      },
    },
  });

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  // Calculate total from service order
  let total = 0;
  if (appointment.serviceOrder?.lineItems) {
    total = appointment.serviceOrder.lineItems.reduce((sum, item) => {
      const hardwareTotal = Number(item.hardwareQuantity || 0) * Number(item.hardwarePrice || 0);
      const laborTotal = Number(item.laborQuantity || 0) * Number(item.laborPrice || 0);
      return sum + hardwareTotal + laborTotal;
    }, 0);
    total += Number(appointment.serviceOrder.tax || 0);
  }

  // Calculate total paid
  const totalPaid = await calculateTotalPaid(appointmentId, { tx: client });

  // Calculate remaining balance
  const remainingBalance = Math.round((total - totalPaid) * 100) / 100;

  // Determine payment status
  let paymentStatus = 'UNPAID';
  if (totalPaid > 0) {
    paymentStatus = remainingBalance <= 0 ? 'PAID' : 'PARTIAL';
  }

  // Get payment dates
  const payments = await client.payment.findMany({
    where: { appointmentId },
    orderBy: { paymentDate: 'asc' },
  });

  const advancePaidAt = payments.length > 0 ? payments[0].paymentDate : null;
  const finalPaidAt = paymentStatus === 'PAID' && payments.length > 0
    ? payments[payments.length - 1].paymentDate
    : null;

  // Update appointment
  const updated = await client.appointment.update({
    where: { id: appointmentId },
    data: {
      advancePayment: totalPaid,
      remainingBalance,
      paymentStatus,
      advancePaidAt,
      finalPaidAt,
    },
  });

  return updated;
};

/**
 * Update invoice payment status based on payments
 * @param {string} invoiceId - Invoice ID
 * @param {Object} options - Options
 * @param {Object} options.tx - Transaction client
 * @returns {Promise<Object>} Updated invoice
 */
const updateInvoicePaymentStatus = async (invoiceId, options = {}) => {
  const { tx } = options;
  const client = tx || prisma;

  // Get invoice
  const invoice = await client.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  // Calculate total paid for this invoice's appointment
  const totalPaid = await calculateTotalPaid(invoice.appointmentId, { tx: client });

  // Calculate remaining balance
  const total = Number(invoice.total);
  const remainingBalance = Math.round((total - totalPaid) * 100) / 100;

  // Determine payment status
  let paymentStatus = 'UNPAID';
  if (totalPaid > 0) {
    paymentStatus = remainingBalance <= 0 ? 'PAID' : 'PARTIAL';
  }

  // Get payment dates from appointment payments
  const payments = await client.payment.findMany({
    where: { appointmentId: invoice.appointmentId },
    orderBy: { paymentDate: 'asc' },
  });

  const advancePaidAt = payments.length > 0 ? payments[0].paymentDate : null;
  const finalPaidAt = paymentStatus === 'PAID' && payments.length > 0
    ? payments[payments.length - 1].paymentDate
    : null;

  // Update invoice
  const updated = await client.invoice.update({
    where: { id: invoiceId },
    data: {
      advancePayment: totalPaid,
      remainingBalance,
      paymentStatus,
      advancePaidAt,
      finalPaidAt,
      paidAt: paymentStatus === 'PAID' ? finalPaidAt : null,
    },
  });

  return updated;
};

/**
 * Delete a payment
 * @param {string} paymentId - Payment ID
 * @param {Object} options - Options
 * @param {Object} options.tx - Transaction client
 * @returns {Promise<Object>} Deleted payment
 */
const deletePayment = async (paymentId, options = {}) => {
  const { tx } = options;
  const client = tx || prisma;

  const payment = await client.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  const { appointmentId, invoiceId } = payment;

  // Delete payment
  const deleted = await client.payment.delete({
    where: { id: paymentId },
  });

  // Update appointment payment status
  await updateAppointmentPaymentStatus(appointmentId, { tx: client });

  // Update invoice payment status if payment was linked to invoice
  if (invoiceId) {
    await updateInvoicePaymentStatus(invoiceId, { tx: client });
  }

  return deleted;
};

/**
 * Get payment by ID
 * @param {string} paymentId - Payment ID
 * @returns {Promise<Object>} Payment
 */
const getPaymentById = async (paymentId) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      appointment: true,
      invoice: true,
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  return payment;
};

module.exports = {
  createPayment,
  getPaymentsByAppointment,
  getPaymentsByInvoice,
  calculateTotalPaid,
  updateAppointmentPaymentStatus,
  updateInvoicePaymentStatus,
  deletePayment,
  getPaymentById,
};
