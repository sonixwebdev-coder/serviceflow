/**
 * Client Import Service
 * Handles CSV import for clients with validation, duplicate detection, and error handling
 */

const Papa = require('papaparse');
const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');

/**
 * Normalize Romanian phone number
 * Accepts formats: 07XX XXX XXX, +4 07XX XXX XXX, 004 07XX XXX XXX
 * Returns normalized format: 07XXXXXXXX
 */
const normalizePhoneNumber = (phone) => {
  if (!phone) return null;

  // Remove all spaces, dashes, parentheses, dots
  let normalized = phone.replace(/[\s\-().]/g, '');

  // Remove country code variants
  if (normalized.startsWith('+40')) {
    normalized = '0' + normalized.substring(3);
  } else if (normalized.startsWith('0040')) {
    normalized = '0' + normalized.substring(4);
  } else if (normalized.startsWith('40') && normalized.length === 11) {
    normalized = '0' + normalized.substring(2);
  }

  return normalized;
};

/**
 * Validate Romanian phone number
 * Must be 10 digits starting with 07
 */
const validatePhoneNumber = (phone) => {
  if (!phone) return null;

  const normalized = normalizePhoneNumber(phone);

  // Romanian mobile: 07XX XXX XXX (10 digits)
  // Romanian landline: 02X XXX XXXX or 03X XXX XXXX (10 digits)
  if (!/^0[2-7]\d{8}$/.test(normalized)) {
    return 'Numar de telefon invalid (format valabil: 07XXXXXXXX)';
  }

  return null;
};

/**
 * Validate email address
 */
const validateEmail = (email) => {
  if (!email) return null;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Adresa de email invalida';
  }

  return null;
};

/**
 * Validate Romanian CUI (VAT number)
 * Format: RO12345678 or just 12345678
 */
const validateCUI = (cui) => {
  if (!cui) return null;

  // Remove RO prefix if present
  let normalized = cui.trim().toUpperCase().replace(/^RO/, '');

  // Must be between 2 and 10 digits
  if (!/^\d{2,10}$/.test(normalized)) {
    return 'CUI invalid (format valabil: RO12345678 sau 12345678)';
  }

  return null;
};

/**
 * Sanitize value to prevent formula injection
 */
const sanitizeValue = (value) => {
  if (!value) return value;

  const stringValue = String(value).trim();

  // Prevent formula injection
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r', '\n'];
  if (dangerousChars.some(char => stringValue.startsWith(char))) {
    return `'${stringValue}`;
  }

  return stringValue;
};

/**
 * Normalize CSV header names to match expected format
 */
const normalizeHeaders = (headers) => {
  const headerMap = {
    'tip': 'type',
    'prenume': 'firstName',
    'nume': 'lastName',
    'companie': 'companyName',
    'persoana contact': 'contactName',
    'persoana de contact': 'contactName',
    'telefon': 'phone',
    'email': 'email',
    'cui': 'vatNumber',
    'nr. reg. com.': 'registrationNumber',
    'nr. reg. com': 'registrationNumber',
    'nr reg com': 'registrationNumber',
    'numar registrul comertului': 'registrationNumber',
    'adresa': 'address',
    'observatii': 'notes',
    'note': 'notes',
    'online': 'isOnline',
    'isonline': 'isOnline',
    'client online': 'isOnline',
  };

  return headers.map(header => {
    const normalized = header.toLowerCase().trim();
    return headerMap[normalized] || header;
  });
};

/**
 * Parse CSV file
 */
const parseCSV = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const fileContent = fileBuffer.toString('utf8');

    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        // Normalize header names
        const normalized = normalizeHeaders([header])[0];
        return normalized;
      },
      complete: (results) => {
        if (results.errors.length > 0) {
          const errorMessages = results.errors.map(err =>
            `Row ${err.row}: ${err.message}`
          ).join('; ');
          reject(new Error(`Erori la parsarea CSV: ${errorMessages}`));
        } else {
          resolve(results.data);
        }
      },
      error: (error) => {
        reject(new Error(`Eroare la citirea fisierului CSV: ${error.message}`));
      },
    });
  });
};

/**
 * Validate a single client row
 */
const validateClientRow = (row, rowIndex) => {
  const errors = [];
  const type = (row.type || 'PF').toUpperCase();

  // Validate type
  if (!['PF', 'SRL'].includes(type)) {
    errors.push('Tip invalid (utilizati PF sau SRL)');
  }

  // Type-specific validation
  if (type === 'PF') {
    // Personal clients need at least first name OR last name
    if (!row.firstName && !row.lastName) {
      errors.push('Clientii personali necesita prenume SAU nume');
    }
  } else if (type === 'SRL') {
    // Company clients need company name
    if (!row.companyName) {
      errors.push('Clientii companie necesita numele companiei');
    }
  }

  // At least one contact method required
  if (!row.phone && !row.email) {
    errors.push('Telefon SAU email obligatoriu');
  }

  // Validate phone if provided
  if (row.phone) {
    const phoneError = validatePhoneNumber(row.phone);
    if (phoneError) {
      errors.push(phoneError);
    }
  }

  // Validate email if provided
  if (row.email) {
    const emailError = validateEmail(row.email);
    if (emailError) {
      errors.push(emailError);
    }
  }

  // Validate CUI for SRL if provided
  if (type === 'SRL' && row.vatNumber) {
    const cuiError = validateCUI(row.vatNumber);
    if (cuiError) {
      errors.push(cuiError);
    }
  }

  return errors;
};

/**
 * Check for duplicate client
 * Priority: vatNumber (for SRL) > phone > email
 */
const findDuplicateClient = async (row) => {
  const type = (row.type || 'PF').toUpperCase();

  // For SRL clients, check vatNumber first
  if (type === 'SRL' && row.vatNumber) {
    const normalized = row.vatNumber.trim().toUpperCase().replace(/^RO/, '');
    const existing = await prisma.client.findFirst({
      where: {
        vatNumber: {
          in: [normalized, `RO${normalized}`],
          mode: 'insensitive',
        },
      },
      select: { id: true, type: true, companyName: true, firstName: true, lastName: true },
    });

    if (existing) {
      return {
        found: true,
        reason: `CUI duplicat: ${existing.companyName || existing.firstName + ' ' + existing.lastName}`,
        client: existing,
      };
    }
  }

  // Check phone number
  if (row.phone) {
    const normalized = normalizePhoneNumber(row.phone);
    if (normalized) {
      const existing = await prisma.client.findFirst({
        where: { phone: normalized },
        select: { id: true, type: true, companyName: true, firstName: true, lastName: true },
      });

      if (existing) {
        return {
          found: true,
          reason: `Telefon duplicat: ${existing.companyName || existing.firstName + ' ' + existing.lastName}`,
          client: existing,
        };
      }
    }
  }

  // Check email
  if (row.email) {
    const normalized = row.email.trim().toLowerCase();
    const existing = await prisma.client.findFirst({
      where: {
        email: {
          equals: normalized,
          mode: 'insensitive',
        }
      },
      select: { id: true, type: true, companyName: true, firstName: true, lastName: true },
    });

    if (existing) {
      return {
        found: true,
        reason: `Email duplicat: ${existing.companyName || existing.firstName + ' ' + existing.lastName}`,
        client: existing,
      };
    }
  }

  return { found: false };
};

/**
 * Transform and sanitize row data for database insertion
 * @param {Object} row - Raw CSV row data
 * @param {boolean|null} isOnlineOverride - Optional override for isOnline value
 */
const transformRowData = (row, isOnlineOverride = null) => {
  const type = (row.type || 'PF').toUpperCase();

  // Parse isOnline field (accepts: true/false, da/nu, 1/0, yes/no)
  let isOnline = false;

  // If override is provided, use it; otherwise parse from CSV
  if (isOnlineOverride !== null && isOnlineOverride !== undefined) {
    isOnline = Boolean(isOnlineOverride);
  } else if (row.isOnline) {
    const value = String(row.isOnline).toLowerCase().trim();
    isOnline = ['true', 'da', '1', 'yes'].includes(value);
  }

  return {
    type,
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
    isOnline,
  };
};

/**
 * Import clients from CSV file
 * @param {Buffer} fileBuffer - CSV file buffer
 * @param {Object} options - Import options
 * @param {boolean} options.isOnlineOverride - Optional override for isOnline status
 * @returns {Object} Import summary with statistics and errors
 */
const importClientsFromCSV = async (fileBuffer, options = {}) => {
  const { isOnlineOverride, organizationId } = options;
  let parsedData;

  try {
    parsedData = await parseCSV(fileBuffer);
  } catch (error) {
    throw new AppError(error.message, 400);
  }

  if (!parsedData || parsedData.length === 0) {
    throw new AppError('Fisierul CSV este gol sau nu contine date valide', 400);
  }

  const results = {
    totalRows: parsedData.length,
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    duplicates: [],
    created: [],
  };

  const validRows = [];

  // Phase 1: Validate all rows
  for (let i = 0; i < parsedData.length; i++) {
    const row = parsedData[i];
    const rowNumber = i + 2; // +2 because row 1 is header and arrays are 0-indexed

    // Skip completely empty rows
    if (!row.type && !row.firstName && !row.lastName && !row.companyName && !row.phone && !row.email) {
      continue;
    }

    const validationErrors = validateClientRow(row, rowNumber);

    if (validationErrors.length > 0) {
      results.failed++;
      results.errors.push({
        row: rowNumber,
        errors: validationErrors,
      });
    } else {
      validRows.push({ row, rowNumber });
    }
  }

  // Phase 2: Check for duplicates and prepare data
  const clientsToCreate = [];

  for (const { row, rowNumber } of validRows) {
    const duplicate = await findDuplicateClient(row);

    if (duplicate.found) {
      results.skipped++;
      results.duplicates.push({
        row: rowNumber,
        reason: duplicate.reason,
      });
    } else {
      const transformedData = transformRowData(row, isOnlineOverride);
      if (organizationId) {
        transformedData.organizationId = organizationId;
      }
      clientsToCreate.push({ data: transformedData, rowNumber });
    }
  }

  // Phase 3: Bulk insert with transaction
  if (clientsToCreate.length > 0) {
    try {
      // Process in chunks to avoid overwhelming the database
      const chunkSize = 100;

      for (let i = 0; i < clientsToCreate.length; i += chunkSize) {
        const chunk = clientsToCreate.slice(i, i + chunkSize);

        await prisma.$transaction(async (tx) => {
          for (const { data, rowNumber } of chunk) {
            try {
              const created = await tx.client.create({
                data,
                select: {
                  id: true,
                  type: true,
                  firstName: true,
                  lastName: true,
                  companyName: true,
                  phone: true,
                  email: true,
                },
              });

              results.successful++;
              results.created.push({
                row: rowNumber,
                client: created,
              });
            } catch (error) {
              results.failed++;
              results.errors.push({
                row: rowNumber,
                errors: [`Eroare la salvare: ${error.message}`],
              });
            }
          }
        }, {
          timeout: 30000, // 30 seconds timeout
        });
      }
    } catch (error) {
      throw new AppError(`Eroare la importul in baza de date: ${error.message}`, 500);
    }
  }

  return results;
};

/**
 * Generate CSV template for import
 */
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
    ['PF', 'Ion', 'Popescu', '', '', '0721234567', 'ion@example.com', '', '', 'Str. Exemplu 1, Bucuresti', 'nu', 'Client fidel'],
    ['SRL', '', '', 'Auto Service SRL', 'Maria Ionescu', '0723456789', 'contact@autoservice.ro', 'RO12345678', 'J40/1234/2020', 'Bd. Unirii 10, Bucuresti', 'nu', 'Client corporate'],
    ['PF', 'Maria', 'Ionescu', '', '', '0724567890', 'maria@example.com', '', '', 'Str. Libertatii 5, Cluj', 'da', 'Client online disponibil si in magazin'],
  ];

  const csvContent = [
    headers.join(','),
    ...examples.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return Buffer.from('\ufeff' + csvContent, 'utf8'); // Add BOM for Excel
};

module.exports = {
  importClientsFromCSV,
  generateCSVTemplate,
  normalizePhoneNumber,
  validatePhoneNumber,
  validateEmail,
  validateCUI,
};
