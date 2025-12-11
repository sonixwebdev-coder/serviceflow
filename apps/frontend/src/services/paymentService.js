import API from '../utils/api';

/**
 * Record an advance payment for an appointment
 * @param {string} appointmentId - The appointment ID
 * @param {number} amount - The advance payment amount
 * @returns {Promise<Object>} Payment data
 */
export const recordAdvancePayment = async (appointmentId, amount) => {
  const response = await API.post(
    `/appointments/${appointmentId}/payments/advance`,
    { amount }
  );
  return response.data.data;
};

/**
 * Record the final payment for an appointment
 * @param {string} appointmentId - The appointment ID
 * @param {number} amount - The final payment amount
 * @returns {Promise<Object>} Payment data
 */
export const recordFinalPayment = async (appointmentId, amount) => {
  const response = await API.post(
    `/appointments/${appointmentId}/payments/final`,
    { amount }
  );
  return response.data.data;
};

/**
 * Get payment status for an appointment
 * @param {string} appointmentId - The appointment ID
 * @returns {Promise<Object>} Payment status data including status, total, paid, remaining, etc.
 */
export const getPaymentStatus = async (appointmentId) => {
  const response = await API.get(
    `/appointments/${appointmentId}/payment-status`
  );
  return response.data.data;
};

/**
 * Get all payments for an appointment
 * @param {string} appointmentId - The appointment ID
 * @returns {Promise<Array>} Array of payment records
 */
export const getAppointmentPayments = async (appointmentId) => {
  const response = await API.get(
    `/payments/appointment/${appointmentId}`
  );
  return response.data.data;
};

/**
 * Create a new payment
 * @param {Object} paymentData - Payment data
 * @param {string} paymentData.appointmentId - The appointment ID
 * @param {number} paymentData.amount - Payment amount
 * @param {string} paymentData.paymentMethod - Payment method (CASH, CARD, BANK_TRANSFER, OTHER)
 * @param {string} paymentData.notes - Optional notes
 * @param {string} paymentData.reference - Optional reference (receipt number, transaction ID)
 * @returns {Promise<Object>} Created payment record
 */
export const createPayment = async (paymentData) => {
  const response = await API.post('/payments', paymentData);
  return response.data.data;
};

/**
 * Delete a payment (admin only)
 * @param {string} paymentId - The payment ID
 * @returns {Promise<Object>} Deletion result
 */
export const deletePayment = async (paymentId) => {
  const response = await API.delete(`/payments/${paymentId}`);
  return response.data.data;
};

export default {
  recordAdvancePayment,
  recordFinalPayment,
  getPaymentStatus,
  getAppointmentPayments,
  createPayment,
  deletePayment,
};
