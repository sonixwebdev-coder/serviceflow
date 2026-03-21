/**
 * CSV Export Utilities
 * Generates CSV files from data arrays with proper Romanian formatting
 */

const { Parser } = require('json2csv');
const { flattenObject, sanitizeForExport, sanitizeForFormulaInjection } = require('./exportUtils');

/**
 * Export data to CSV format
 * @param {Array} data - Array of objects to export
 * @param {Object} options - Export options
 * @param {Array} options.fields - Field configuration [{label, value}]
 * @param {Boolean} options.flatten - Flatten nested objects
 * @returns {Buffer} CSV file as buffer
 */
const exportToCSV = (data, options = {}) => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Data must be a non-empty array');
  }

  const { fields, flatten = true } = options;

  // Flatten nested objects if requested
  const processedData = flatten
    ? data.map(item => flattenObject(item))
    : data;

  // Sanitize all values to prevent formula injection
  const sanitizedData = processedData.map(item => {
    const sanitizedItem = {};
    for (const [key, value] of Object.entries(item)) {
      sanitizedItem[key] = sanitizeForFormulaInjection(value);
    }
    return sanitizedItem;
  });

  // If fields are not provided, auto-generate from first row
  let csvFields = fields;
  if (!csvFields) {
    const firstRow = sanitizedData[0];
    csvFields = Object.keys(firstRow).map(key => ({
      label: key,
      value: key,
    }));
  }

  // Create parser with options
  const parser = new Parser({
    fields: csvFields,
    delimiter: ',',
    quote: '"',
    escapedQuote: '""',
    header: true,
    withBOM: true, // Add BOM for Excel compatibility with UTF-8
  });

  // Generate CSV
  const csv = parser.parse(sanitizedData);

  // Return as buffer
  return Buffer.from(csv, 'utf8');
};

/**
 * Field configurations for different entities
 */
const FIELD_CONFIGS = {
  appointments: [
    { label: 'Titlu', value: 'title' },
    { label: 'Descriere', value: 'description' },
    { label: 'Status', value: 'status' },
    { label: 'Data inceput', value: 'scheduledStart' },
    { label: 'Data sfarsit', value: 'scheduledEnd' },
    { label: 'Locatie', value: 'location' },
    { label: 'Client', value: 'client.name' },
    { label: 'Telefon client', value: 'client.phone' },
    { label: 'Activ', value: 'asset.identifier' },
    { label: 'Producator', value: 'asset.manufacturer' },
    { label: 'Model', value: 'asset.model' },
    { label: 'Asignati', value: 'assignees' },
    { label: 'Status plata', value: 'paymentStatus' },
    { label: 'Avans', value: 'advancePayment' },
    { label: 'Creat de', value: 'createdBy.name' },
    { label: 'Data creare', value: 'createdAt' },
  ],
  invoices: [
    { label: 'Numar factura', value: 'invoiceNumber' },
    { label: 'Client', value: 'client.name' },
    { label: 'CUI Client', value: 'client.vatNumber' },
    { label: 'Status', value: 'status' },
    { label: 'Status plata', value: 'paymentStatus' },
    { label: 'Data emitere', value: 'issueDate' },
    { label: 'Data scadenta', value: 'dueDate' },
    { label: 'Subtotal', value: 'subtotal' },
    { label: 'TVA', value: 'tax' },
    { label: 'Total', value: 'total' },
    { label: 'Avans', value: 'advancePayment' },
    { label: 'Rest de plata', value: 'remainingBalance' },
    { label: 'Reducere fidelitate', value: 'loyaltyDiscount' },
    { label: 'Data trimitere', value: 'sentAt' },
    { label: 'Data plata', value: 'paidAt' },
    { label: 'Observatii', value: 'notes' },
  ],
  clients: [
    // ID field excluded from export as per requirements
    { label: 'Tip', value: 'type' },
    { label: 'Prenume', value: 'firstName' },
    { label: 'Nume', value: 'lastName' },
    { label: 'Companie', value: 'companyName' },
    { label: 'Persoana contact', value: 'contactName' },
    { label: 'Telefon', value: 'phone' },
    { label: 'Email', value: 'email' },
    { label: 'Adresa', value: 'address' },
    { label: 'Client online', value: 'isOnline' },
    { label: 'Card fidelitate', value: 'fidelityCardSerie' },
    { label: 'CUI', value: 'vatNumber' },
    { label: 'Nr. Reg. Com.', value: 'registrationNumber' },
    { label: 'Observatii', value: 'notes' },
    { label: 'Data creare', value: 'createdAt' },
  ],
  users: [
    { label: 'ID', value: 'id' },
    { label: 'Email', value: 'email' },
    { label: 'Prenume', value: 'firstName' },
    { label: 'Nume', value: 'lastName' },
    { label: 'Telefon', value: 'phoneNumber' },
    { label: 'Data nasterii', value: 'dateOfBirth' },
    { label: 'Tip angajare', value: 'employmentType' },
    { label: 'Tarif orar', value: 'hourlyRate' },
    { label: 'Data angajare', value: 'hireDate' },
    { label: 'Activ', value: 'isActive' },
    { label: 'Rol', value: 'role' },
  ],
  leaveRequests: [
    { label: 'ID', value: 'id' },
    { label: 'Angajat', value: 'employee.name' },
    { label: 'Tip concediu', value: 'leaveType' },
    { label: 'Status', value: 'status' },
    { label: 'Data inceput', value: 'startDate' },
    { label: 'Data sfarsit', value: 'endDate' },
    { label: 'Numar zile', value: 'totalDays' },
    { label: 'Motiv', value: 'reason' },
    { label: 'Revizuit de', value: 'reviewer.name' },
    { label: 'Note revizie', value: 'reviewNotes' },
    { label: 'Data revizie', value: 'reviewedAt' },
    { label: 'Data creare', value: 'createdAt' },
  ],
  timeTracking: [
    { label: 'ID', value: 'id' },
    { label: 'Angajat', value: 'employee.name' },
    { label: 'Intrare', value: 'clockIn' },
    { label: 'Iesire', value: 'clockOut' },
    { label: 'Pauza (min)', value: 'breakDuration' },
    { label: 'Total (min)', value: 'totalMinutes' },
    { label: 'Locatie intrare', value: 'clockInLocation' },
    { label: 'Locatie iesire', value: 'clockOutLocation' },
    { label: 'Observatii', value: 'notes' },
    { label: 'Sursa', value: 'source' },
  ],
  tasks: [
    { label: 'Titlu', value: 'title' },
    { label: 'Descriere', value: 'description' },
    { label: 'Tip', value: 'taskType' },
    { label: 'Prioritate', value: 'priority' },
    { label: 'Status', value: 'status' },
    { label: 'Data scadenta', value: 'dueDate' },
    { label: 'Ore estimate', value: 'estimatedHours' },
    { label: 'Procent completare', value: 'completionPercentage' },
    { label: 'Asignati', value: 'assignees' },
    { label: 'Client', value: 'customerName' },
    { label: 'Telefon client', value: 'customerPhone' },
    { label: 'Activ client', value: 'customerVehicle' },
    { label: 'Creat de', value: 'createdBy.name' },
    { label: 'Data creare', value: 'createdAt' },
  ],
};

/**
 * Get field configuration for entity type
 */
const getFieldConfig = (entityType) => {
  return FIELD_CONFIGS[entityType] || null;
};

/**
 * Export entity data to CSV with predefined field configuration
 */
const exportEntityToCSV = (entityType, data, customFields = null) => {
  const fields = customFields || getFieldConfig(entityType);

  if (!fields) {
    // If no predefined config, use auto-detection
    return exportToCSV(data, { flatten: true });
  }

  return exportToCSV(data, { fields, flatten: false });
};

module.exports = {
  exportToCSV,
  exportEntityToCSV,
  getFieldConfig,
  FIELD_CONFIGS,
};
