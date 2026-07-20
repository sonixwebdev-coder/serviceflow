import API from '../utils/api';

/**
 * Get all email templates
 */
export const getTemplates = async () => {
  const response = await API.get('/emails/templates');
  return response.data?.data || response.data;
};

/**
 * Get a specific email template by name
 * @param {string} name - Template name (e.g., 'appointment-reminder')
 */
export const getTemplate = async (name) => {
  const response = await API.get(`/emails/templates/${name}`);
  return response.data?.data || response.data;
};

/**
 * Update an email template
 * @param {string} name - Template name
 * @param {Object} data - Template data
 * @param {string} data.subject - Email subject (supports Handlebars)
 * @param {string} data.bodyHtml - HTML body (supports Handlebars)
 * @param {string} data.bodyText - Plain text body (optional)
 * @param {boolean} data.isActive - Whether template is active
 */
export const updateTemplate = async (name, data) => {
  const response = await API.put(`/emails/templates/${name}`, data);
  return response.data?.data || response.data;
};

/**
 * Send a test email using a template
 * @param {string} templateName - Template name
 * @param {string} toEmail - Recipient email address
 */
export const sendTestEmail = async (templateName, toEmail) => {
  const response = await API.post('/emails/send-test', {
    template: templateName,
    to: toEmail,
  });
  return response.data?.data || response.data;
};

/**
 * Get email logs with pagination and filters
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.status - Filter by status (PENDING, SENDING, SENT, FAILED)
 * @param {string} params.recipientEmail - Filter by recipient email
 */
export const getEmailLogs = async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.status) queryParams.append('status', params.status);
  if (params.recipientEmail) queryParams.append('recipientEmail', params.recipientEmail);

  const response = await API.get(`/emails/logs?${queryParams.toString()}`);
  return response.data?.data || response.data;
};

/**
 * Resend a failed email
 * @param {string} logId - Email log ID
 */
export const resendEmail = async (logId) => {
  const response = await API.post(`/emails/resend/${logId}`);
  return response.data?.data || response.data;
};

// Template variable reference
export const TEMPLATE_VARIABLES = {
  'appointment-reminder': {
    label: 'Reminder Programare',
    description: 'Trimis clientilor inainte de o programare',
    variables: [
      { name: 'clientName', description: 'Numele clientului' },
      { name: 'date', description: 'Data programarii (format: 20 ian. 2026)' },
      { name: 'time', description: 'Ora programarii (format: 10:00)' },
      { name: 'location', description: 'Locatia programarii' },
      { name: 'description', description: 'Descrierea programarii' },
      { name: 'companyName', description: 'Numele companiei tale' },
      { name: 'companyPhone', description: 'Telefonul companiei' },
    ],
  },
  'appointment-confirmation': {
    label: 'Confirmare Programare',
    description: 'Trimis cand o programare este confirmata',
    variables: [
      { name: 'clientName', description: 'Numele clientului' },
      { name: 'date', description: 'Data programarii' },
      { name: 'time', description: 'Ora programarii' },
      { name: 'location', description: 'Locatia programarii' },
      { name: 'description', description: 'Descrierea programarii' },
      { name: 'companyName', description: 'Numele companiei tale' },
      { name: 'companyPhone', description: 'Telefonul companiei' },
    ],
  },
  'appointment-cancelled': {
    label: 'Programare Anulata',
    description: 'Trimis cand o programare este anulata',
    variables: [
      { name: 'clientName', description: 'Numele clientului' },
      { name: 'date', description: 'Data programarii anulate' },
      { name: 'time', description: 'Ora programarii anulate' },
      { name: 'description', description: 'Descrierea programarii' },
      { name: 'reason', description: 'Motivul anularii (optional)' },
      { name: 'companyName', description: 'Numele companiei tale' },
      { name: 'companyPhone', description: 'Telefonul companiei' },
    ],
  },
  'appointment-rescheduled': {
    label: 'Programare Reprogramata',
    description: 'Trimis cand o programare este reprogramata',
    variables: [
      { name: 'clientName', description: 'Numele clientului' },
      { name: 'oldDate', description: 'Data veche a programarii' },
      { name: 'oldTime', description: 'Ora veche a programarii' },
      { name: 'newDate', description: 'Noua data a programarii' },
      { name: 'newTime', description: 'Noua ora a programarii' },
      { name: 'location', description: 'Locatia programarii' },
      { name: 'description', description: 'Descrierea programarii' },
      { name: 'companyName', description: 'Numele companiei tale' },
      { name: 'companyPhone', description: 'Telefonul companiei' },
    ],
  },
  'invoice-created': {
    label: 'Factura Noua',
    description: 'Trimis cand o factura este creata',
    variables: [
      { name: 'clientName', description: 'Numele clientului' },
      { name: 'invoiceNumber', description: 'Numarul facturii' },
      { name: 'issueDate', description: 'Data emiterii' },
      { name: 'dueDate', description: 'Data scadenta' },
      { name: 'total', description: 'Totalul facturii (format: 150,00 RON)' },
      { name: 'pdfUrl', description: 'Link catre PDF-ul facturii' },
      { name: 'companyName', description: 'Numele companiei tale' },
      { name: 'companyPhone', description: 'Telefonul companiei' },
    ],
  },
  welcome: {
    label: 'Bun Venit',
    description: 'Trimis clientilor noi',
    variables: [
      { name: 'clientName', description: 'Numele clientului' },
      { name: 'companyName', description: 'Numele companiei tale' },
      { name: 'companyPhone', description: 'Telefonul companiei' },
    ],
  },
  'password-reset': {
    label: 'Resetare Parola',
    description: 'Trimis cand un client solicita resetarea parolei',
    variables: [
      { name: 'clientName', description: 'Numele clientului' },
      { name: 'resetLink', description: 'Link-ul pentru resetarea parolei' },
      { name: 'expiresIn', description: 'Timpul pana la expirare (ex: 1 ora)' },
      { name: 'companyName', description: 'Numele companiei tale' },
      { name: 'companyPhone', description: 'Telefonul companiei' },
    ],
  },
  'payment-received': {
    label: 'Plata Primita',
    description: 'Trimis cand o plata este inregistrata',
    variables: [
      { name: 'clientName', description: 'Numele clientului' },
      { name: 'invoiceNumber', description: 'Numarul facturii platite' },
      { name: 'amount', description: 'Suma platita (format: 150,00 RON)' },
      { name: 'paymentDate', description: 'Data platii' },
      { name: 'paymentMethod', description: 'Metoda de plata' },
      { name: 'companyName', description: 'Numele companiei tale' },
      { name: 'companyPhone', description: 'Telefonul companiei' },
    ],
  },
};

export default {
  getTemplates,
  getTemplate,
  updateTemplate,
  sendTestEmail,
  getEmailLogs,
  resendEmail,
  TEMPLATE_VARIABLES,
};
