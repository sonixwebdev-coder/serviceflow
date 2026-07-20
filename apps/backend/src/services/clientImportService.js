/**
 * Client Import Service
 * Handles CSV import for clients with validation, duplicate detection, and error handling.
 */

const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');
const {
  generateCSVTemplate,
  normalizePhoneNumber,
  parseCSV,
  transformRowData,
  validateCUI,
  validateClientRow,
  validateEmail,
  validatePhoneNumber,
} = require('./clientImport/clientImportCsv');

const CLIENT_IDENTITY_SELECT = {
  id: true,
  type: true,
  companyName: true,
  firstName: true,
  lastName: true,
};

const formatDuplicate = (field, existing) => ({
  found: true,
  reason: `${field} duplicat: ${
    existing.companyName || `${existing.firstName} ${existing.lastName}`
  }`,
  client: existing,
});

/**
 * Check for a duplicate client, prioritizing VAT number, phone, then email.
 */
const findDuplicateClient = async (row) => {
  const type = (row.type || 'PF').toUpperCase();

  if (type === 'SRL' && row.vatNumber) {
    const normalized = row.vatNumber.trim().toUpperCase().replace(/^RO/, '');
    const existing = await prisma.client.findFirst({
      where: {
        vatNumber: {
          in: [normalized, `RO${normalized}`],
          mode: 'insensitive',
        },
      },
      select: CLIENT_IDENTITY_SELECT,
    });
    if (existing) return formatDuplicate('CUI', existing);
  }

  if (row.phone) {
    const normalized = normalizePhoneNumber(row.phone);
    if (normalized) {
      const existing = await prisma.client.findFirst({
        where: { phone: normalized },
        select: CLIENT_IDENTITY_SELECT,
      });
      if (existing) return formatDuplicate('Telefon', existing);
    }
  }

  if (row.email) {
    const existing = await prisma.client.findFirst({
      where: {
        email: {
          equals: row.email.trim().toLowerCase(),
          mode: 'insensitive',
        },
      },
      select: CLIENT_IDENTITY_SELECT,
    });
    if (existing) return formatDuplicate('Email', existing);
  }

  return { found: false };
};

const validateRows = (parsedData, results) => {
  const validRows = [];

  for (let index = 0; index < parsedData.length; index += 1) {
    const row = parsedData[index];
    const rowNumber = index + 2;
    if (
      !row.type &&
      !row.firstName &&
      !row.lastName &&
      !row.companyName &&
      !row.phone &&
      !row.email
    ) {
      continue;
    }

    const errors = validateClientRow(row);
    if (errors.length) {
      results.failed += 1;
      results.errors.push({ row: rowNumber, errors });
    } else {
      validRows.push({ row, rowNumber });
    }
  }

  return validRows;
};

const prepareClients = async (validRows, results, isOnlineOverride, organizationId) => {
  const clientsToCreate = [];

  for (const { row, rowNumber } of validRows) {
    const duplicate = await findDuplicateClient(row);
    if (duplicate.found) {
      results.skipped += 1;
      results.duplicates.push({ row: rowNumber, reason: duplicate.reason });
      continue;
    }

    const data = transformRowData(row, isOnlineOverride);
    if (organizationId) data.organizationId = organizationId;
    clientsToCreate.push({ data, rowNumber });
  }

  return clientsToCreate;
};

const createClientChunk = async (chunk, results) => {
  await prisma.$transaction(
    async (transaction) => {
      for (const { data, rowNumber } of chunk) {
        try {
          const client = await transaction.client.create({
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
          results.successful += 1;
          results.created.push({ row: rowNumber, client });
        } catch (error) {
          results.failed += 1;
          results.errors.push({ row: rowNumber, errors: [`Eroare la salvare: ${error.message}`] });
        }
      }
    },
    { timeout: 30000 }
  );
};

const getClientQuota = async (organizationId) => {
  if (!organizationId) return Infinity;

  const { getRemainingQuota } = require('./organizationService');
  const quota = await getRemainingQuota(organizationId, 'clients');
  if (quota.remaining === 0) {
    throw new AppError(
      `Ati atins limita de clienti (${quota.limit}). Upgradati planul sau achizitionati un pachet suplimentar.`,
      403
    );
  }
  return quota.remaining;
};

const importClientsFromCSV = async (fileBuffer, options = {}) => {
  let parsedData;
  try {
    parsedData = await parseCSV(fileBuffer);
  } catch (error) {
    throw new AppError(error.message, 400);
  }
  if (!parsedData?.length) {
    throw new AppError('Fisierul CSV este gol sau nu contine date valide', 400);
  }

  const { isOnlineOverride, organizationId } = options;
  const quotaRemaining = await getClientQuota(organizationId);
  const results = {
    totalRows: parsedData.length,
    successful: 0,
    failed: 0,
    skipped: 0,
    quotaLimited: 0,
    errors: [],
    duplicates: [],
    created: [],
  };
  const validRows = validateRows(parsedData, results);
  const clientsToCreate = await prepareClients(
    validRows,
    results,
    isOnlineOverride,
    organizationId
  );

  if (quotaRemaining !== Infinity && clientsToCreate.length > quotaRemaining) {
    results.quotaLimited = clientsToCreate.length - quotaRemaining;
    clientsToCreate.splice(quotaRemaining);
  }

  try {
    for (let index = 0; index < clientsToCreate.length; index += 100) {
      await createClientChunk(clientsToCreate.slice(index, index + 100), results);
    }
  } catch (error) {
    throw new AppError(`Eroare la importul in baza de date: ${error.message}`, 500);
  }

  return results;
};

module.exports = {
  importClientsFromCSV,
  generateCSVTemplate,
  normalizePhoneNumber,
  validatePhoneNumber,
  validateEmail,
  validateCUI,
};
