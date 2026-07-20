const Papa = require('papaparse');

const HEADER_MAP = {
  tip: 'type',
  prenume: 'firstName',
  nume: 'lastName',
  companie: 'companyName',
  'persoana contact': 'contactName',
  'persoana de contact': 'contactName',
  telefon: 'phone',
  email: 'email',
  cui: 'vatNumber',
  'nr. reg. com.': 'registrationNumber',
  'nr. reg. com': 'registrationNumber',
  'nr reg com': 'registrationNumber',
  'numar registrul comertului': 'registrationNumber',
  adresa: 'address',
  observatii: 'notes',
  note: 'notes',
  online: 'isOnline',
  isonline: 'isOnline',
  'client online': 'isOnline',
};

const normalizePhoneNumber = (phone) => {
  if (!phone) return null;

  let normalized = phone.replace(/[\s\-().]/g, '');
  if (normalized.startsWith('+40')) {
    normalized = `0${normalized.substring(3)}`;
  } else if (normalized.startsWith('0040')) {
    normalized = `0${normalized.substring(4)}`;
  } else if (normalized.startsWith('40') && normalized.length === 11) {
    normalized = `0${normalized.substring(2)}`;
  }

  return normalized;
};

const validatePhoneNumber = (phone) => {
  if (!phone) return null;
  return /^0[2-7]\d{8}$/.test(normalizePhoneNumber(phone))
    ? null
    : 'Numar de telefon invalid (format valabil: 07XXXXXXXX)';
};

const validateEmail = (email) => {
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : 'Adresa de email invalida';
};

const validateCUI = (cui) => {
  if (!cui) return null;
  const normalized = cui.trim().toUpperCase().replace(/^RO/, '');
  return /^\d{2,10}$/.test(normalized)
    ? null
    : 'CUI invalid (format valabil: RO12345678 sau 12345678)';
};

const sanitizeValue = (value) => {
  if (!value) return value;
  const stringValue = String(value).trim();
  return ['=', '+', '-', '@', '\t', '\r', '\n'].some((char) => stringValue.startsWith(char))
    ? `'${stringValue}`
    : stringValue;
};

const normalizeHeaders = (headers) =>
  headers.map((header) => HEADER_MAP[header.toLowerCase().trim()] || header);

const parseCSV = (fileBuffer) =>
  new Promise((resolve, reject) => {
    Papa.parse(fileBuffer.toString('utf8'), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => normalizeHeaders([header])[0],
      complete: (results) => {
        if (results.errors.length === 0) {
          resolve(results.data);
          return;
        }

        const errorMessages = results.errors
          .map((error) => `Row ${error.row}: ${error.message}`)
          .join('; ');
        reject(new Error(`Erori la parsarea CSV: ${errorMessages}`));
      },
      error: (error) => reject(new Error(`Eroare la citirea fisierului CSV: ${error.message}`)),
    });
  });

const validateClientRow = (row) => {
  const errors = [];
  const type = (row.type || 'PF').toUpperCase();

  if (!['PF', 'SRL'].includes(type)) {
    errors.push('Tip invalid (utilizati PF sau SRL)');
  }
  if (type === 'PF' && !row.firstName && !row.lastName) {
    errors.push('Clientii personali necesita prenume SAU nume');
  } else if (type === 'SRL' && !row.companyName) {
    errors.push('Clientii companie necesita numele companiei');
  }
  if (!row.phone && !row.email) {
    errors.push('Telefon SAU email obligatoriu');
  }

  const phoneError = validatePhoneNumber(row.phone);
  const emailError = validateEmail(row.email);
  const cuiError = type === 'SRL' ? validateCUI(row.vatNumber) : null;
  if (phoneError) errors.push(phoneError);
  if (emailError) errors.push(emailError);
  if (cuiError) errors.push(cuiError);

  return errors;
};

const parseOnlineValue = (value) =>
  value ? ['true', 'da', '1', 'yes'].includes(String(value).toLowerCase().trim()) : false;

const transformRowData = (row, isOnlineOverride = null) => ({
  type: (row.type || 'PF').toUpperCase(),
  firstName: row.firstName ? sanitizeValue(row.firstName) : null,
  lastName: row.lastName ? sanitizeValue(row.lastName) : null,
  companyName: row.companyName ? sanitizeValue(row.companyName) : null,
  contactName: row.contactName ? sanitizeValue(row.contactName) : null,
  phone: row.phone ? normalizePhoneNumber(row.phone) : null,
  email: row.email ? row.email.trim().toLowerCase() : null,
  vatNumber: row.vatNumber ? row.vatNumber.trim().toUpperCase().replace(/^RO/, '') : null,
  registrationNumber: row.registrationNumber ? sanitizeValue(row.registrationNumber) : null,
  address: row.address ? sanitizeValue(row.address) : null,
  notes: row.notes ? sanitizeValue(row.notes) : null,
  isOnline:
    isOnlineOverride === null || isOnlineOverride === undefined
      ? parseOnlineValue(row.isOnline)
      : Boolean(isOnlineOverride),
});

const generateCSVTemplate = () => {
  const headers = [
    'Tip',
    'Prenume',
    'Nume',
    'Companie',
    'Persoana contact',
    'Telefon',
    'Email',
    'CUI',
    'Nr. Reg. Com.',
    'Adresa',
    'Online',
    'Observatii',
  ];
  const examples = [
    [
      'PF',
      'Ion',
      'Popescu',
      '',
      '',
      '0721234567',
      'ion@example.com',
      '',
      '',
      'Str. Exemplu 1, Bucuresti',
      'nu',
      'Client fidel',
    ],
    [
      'SRL',
      '',
      '',
      'Auto Service SRL',
      'Maria Ionescu',
      '0723456789',
      'contact@autoservice.ro',
      'RO12345678',
      'J40/1234/2020',
      'Bd. Unirii 10, Bucuresti',
      'nu',
      'Client corporate',
    ],
    [
      'PF',
      'Maria',
      'Ionescu',
      '',
      '',
      '0724567890',
      'maria@example.com',
      '',
      '',
      'Str. Libertatii 5, Cluj',
      'da',
      'Client online disponibil si in magazin',
    ],
  ];
  const csvContent = [
    headers.join(','),
    ...examples.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return Buffer.from(`\ufeff${csvContent}`, 'utf8');
};

module.exports = {
  generateCSVTemplate,
  normalizeHeaders,
  normalizePhoneNumber,
  parseCSV,
  sanitizeValue,
  transformRowData,
  validateCUI,
  validateClientRow,
  validateEmail,
  validatePhoneNumber,
};
