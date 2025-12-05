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

export default {
  recordAdvancePayment,
  recordFinalPayment,
  getPaymentStatus,
};
