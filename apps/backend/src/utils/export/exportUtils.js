/**
 * Common utilities for data export functionality
 * Provides data sanitization, formatting, and transformation helpers
 */

/**
 * Sanitize data for export (remove null/undefined, handle special characters)
 */
const sanitizeForExport = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && !(value instanceof Date)) {
    return JSON.stringify(value);
  }
  return String(value);
};

/**
 * Sanitize values to prevent CSV/Excel formula injection
 * Prepends single quote to values starting with dangerous characters
 * Prevents execution of formulas like =cmd|'/c calc'!A1
 */
const sanitizeForFormulaInjection = (value) => {
  if (value === null || value === undefined) return '';

  const stringValue = String(value);

  // List of characters that can start a formula in Excel/Calc
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r', '\n'];

  // Check if value starts with any dangerous character
  if (dangerousChars.some((char) => stringValue.startsWith(char))) {
    // Prepend single quote to escape the formula
    return `'${stringValue}`;
  }

  return stringValue;
};

/**
 * Format date for Romanian locale
 */
const formatDate = (date) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch (error) {
    return '';
  }
};

/**
 * Format date and time for Romanian locale
 */
const formatDateTime = (date) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch (error) {
    return '';
  }
};

/**
 * Format currency for Romanian locale
 */
const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '0.00';
  const num = Number(value);
  if (!Number.isFinite(num)) return '0.00';
  return num.toFixed(2);
};

/**
 * Format number with Romanian locale (comma as decimal separator)
 */
const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

/**
 * Flatten nested objects for export (convert nested properties to dot notation)
 */
const flattenObject = (obj, prefix = '') => {
  const flattened = {};

  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      flattened[newKey] = '';
    } else if (value instanceof Date) {
      flattened[newKey] = formatDateTime(value);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else if (Array.isArray(value)) {
      flattened[newKey] = value
        .map((item) => (typeof item === 'object' ? JSON.stringify(item) : item))
        .join('; ');
    } else {
      flattened[newKey] = value;
    }
  });

  return flattened;
};

/**
 * Apply filters to data array
 */
const applyFilters = (data, filters = {}) => {
  let filtered = [...data];

  // Date range filter
  if (filters.startDate && filters.dateField) {
    const startDate = new Date(filters.startDate);
    filtered = filtered.filter((item) => {
      const itemDate = new Date(item[filters.dateField]);
      return itemDate >= startDate;
    });
  }

  if (filters.endDate && filters.dateField) {
    const endDate = new Date(filters.endDate);
    filtered = filtered.filter((item) => {
      const itemDate = new Date(item[filters.dateField]);
      return itemDate <= endDate;
    });
  }

  // Status filter
  if (filters.status) {
    filtered = filtered.filter(
      (item) => item.status && item.status.toLowerCase() === filters.status.toLowerCase()
    );
  }

  // Search filter (searches in all string fields)
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filtered = filtered.filter((item) => {
      return Object.values(item).some((value) => {
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm);
        }
        return false;
      });
    });
  }

  return filtered;
};

/**
 * Generate safe filename for export
 */
const generateFilename = (entityName, format, timestamp = new Date()) => {
  const dateStr = timestamp.toISOString().split('T')[0];
  const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '-');
  const sanitized = entityName.toLowerCase().replace(/\s+/g, '-');

  // Map format names to proper file extensions
  const extensionMap = {
    csv: 'csv',
    excel: 'xlsx',
    json: 'json',
    pdf: 'pdf',
    zip: 'zip',
    xml: 'xml',
    'anaf-xml': 'xml',
  };

  const extension = extensionMap[format.toLowerCase()] || format;
  return `${sanitized}_${dateStr}_${timeStr}.${extension}`;
};

/**
 * Translate entity names to Romanian
 */
const ENTITY_NAMES_RO = {
  appointments: 'Programari',
  invoices: 'Facturi',
  clients: 'Clienti',
  users: 'Angajati',
  'leave-requests': 'Cereri_Concediu',
  'time-tracking': 'Pontaj',
  tasks: 'Sarcini',
  'service-orders': 'Comenzi_Service',
};

/**
 * Get Romanian entity name
 */
const getEntityNameRO = (entityKey) => {
  return ENTITY_NAMES_RO[entityKey] || entityKey;
};

/**
 * Validate export format
 */
// Formats supported by every generic entity export. PDF and ANAF XML use
// dedicated endpoints because they have entity-specific document contracts.
const VALID_FORMATS = ['csv', 'excel', 'json', 'xml'];

const validateFormat = (format) => {
  const normalized = (format || '').toLowerCase();
  if (!VALID_FORMATS.includes(normalized)) {
    throw new Error(`Invalid export format: ${format}. Valid formats: ${VALID_FORMATS.join(', ')}`);
  }
  return normalized;
};

/**
 * Get content type for export format
 */
const getContentType = (format) => {
  const contentTypes = {
    csv: 'text/csv; charset=utf-8',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    json: 'application/json; charset=utf-8',
    pdf: 'application/pdf',
    zip: 'application/zip',
    xml: 'application/xml; charset=utf-8',
    'anaf-xml': 'application/xml; charset=utf-8',
  };
  return contentTypes[format] || 'application/octet-stream';
};

/**
 * Normalize status labels to Romanian
 */
const STATUS_LABELS_RO = {
  pending: 'In asteptare',
  approved: 'Aprobat',
  prezentat: 'Prezentat',
  rejected: 'Respins',
  in_progress: 'In lucru',
  completed: 'Finalizat',
  cancelled: 'Anulat',
  draft: 'Ciorna',
  generated: 'Generat',
  sent: 'Trimis',
  paid: 'Platit',
  overdue: 'Intarziat',
  todo: 'De facut',
  vacation: 'Concediu',
  sick: 'Medical',
  personal: 'Personal',
  unpaid: 'Neplatit',
};

const getStatusLabelRO = (status) => {
  if (!status) return '';
  const normalized = status.toLowerCase().replace(/-/g, '_');
  return STATUS_LABELS_RO[normalized] || status;
};

/**
 * Chunk array for batch processing
 */
const chunkArray = (array, chunkSize = 1000) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

module.exports = {
  sanitizeForExport,
  sanitizeForFormulaInjection,
  formatDate,
  formatDateTime,
  formatCurrency,
  formatNumber,
  flattenObject,
  applyFilters,
  generateFilename,
  getEntityNameRO,
  validateFormat,
  getContentType,
  getStatusLabelRO,
  chunkArray,
  VALID_FORMATS,
};
