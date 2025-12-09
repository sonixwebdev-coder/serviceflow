const prisma = require('../../../lib/prisma');
const { AppError } = require('../../utils/errors');
const { getValidToken } = require('./anafOAuthService');
const {
  uploadInvoice,
  checkInvoiceStatus,
  downloadMessage,
  listMessages,
} = require('./anafApiService');
const { buildUBLInvoice, validateXmlStructure, extractErrorMessages } = require('./anafXmlBuilder');
const { writeFile } = require('../../utils/storage');

/**
 * ANAF Invoice Service
 * Business logic for invoice submission and synchronization with ANAF
 */

/**
 * Get ANAF configuration for a company
 * @param {string} companyId - Company ID (optional, gets first active config if not provided)
 * @returns {Promise<Object>} ANAF configuration
 */
async function getAnafConfig(companyId = null) {
  let config;

  if (companyId) {
    config = await prisma.anafConfig.findUnique({
      where: { companyId },
      include: {
        company: true,
        tokens: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  } else {
    // Get first active config
    config = await prisma.anafConfig.findFirst({
      where: { isActive: true },
      include: {
        company: true,
        tokens: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  if (!config) {
    throw new AppError('ANAF configuration not found', 404);
  }

  if (!config.isActive) {
    throw new AppError('ANAF configuration is disabled', 403);
  }

  return config;
}

/**
 * Generate UBL XML for an invoice
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Object>} XML content and metadata
 */
async function generateInvoiceXml(invoiceId) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,
      lineItems: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  // Get company configuration
  const config = await getAnafConfig();
  const company = config.company;

  // Build UBL XML
  const xmlContent = buildUBLInvoice(invoice, company, invoice.client);

  // Validate XML structure
  const validation = await validateXmlStructure(xmlContent);

  if (!validation.isValid) {
    throw new AppError(
      `Invalid XML structure: ${validation.errors.join(', ')}`,
      400
    );
  }

  // Save XML to storage for inspection
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const xmlFilename = `${invoice.invoiceNumber}_${timestamp}.xml`;
  const xmlPath = `anaf-xml/${xmlFilename}`;

  await writeFile(xmlPath, Buffer.from(xmlContent, 'utf-8'));

  return {
    xmlContent,
    validation,
    invoice,
    company,
    xmlPath,
    xmlFilename,
  };
}

/**
 * Submit invoice to ANAF E-Factura
 * @param {string} invoiceId - Invoice ID
 * @param {Object} options - Submission options
 * @returns {Promise<Object>} Submission result
 */
async function submitInvoiceToAnaf(invoiceId, options = {}) {
  const { forceResubmit = false } = options;

  // Check if already submitted
  const existingSync = await prisma.anafInvoiceSync.findUnique({
    where: { invoiceId },
  });

  if (existingSync && !forceResubmit) {
    if (existingSync.status === 'OK') {
      throw new AppError('Invoice already successfully submitted to ANAF', 400);
    }
    if (existingSync.status === 'UPLOADING' || existingSync.status === 'PROCESSING') {
      throw new AppError('Invoice is currently being processed by ANAF', 400);
    }
    if (existingSync.retryCount >= existingSync.maxRetries) {
      throw new AppError('Maximum retry attempts reached. Please check errors and resubmit.', 400);
    }
  }

  // Generate and validate XML
  const { xmlContent, validation, company, xmlPath, xmlFilename } = await generateInvoiceXml(invoiceId);

  // Get config and environment
  const config = await getAnafConfig();
  const environment = config.environment || 'test';
  const token = await getValidToken(config.id);

  // Create or update sync record
  const syncData = {
    status: 'UPLOADING',
    xmlContent,
    errorMessage: null,
    uploadedAt: new Date(),
    retryCount: existingSync ? existingSync.retryCount + 1 : 0,
  };

  const sync = existingSync
    ? await prisma.anafInvoiceSync.update({
        where: { id: existingSync.id },
        data: syncData,
      })
    : await prisma.anafInvoiceSync.create({
        data: {
          ...syncData,
          invoiceId,
        },
      });

  try {
    // Upload to ANAF
    const uploadResult = await uploadInvoice(xmlContent, config.cif, token.accessToken, environment);

    // Update sync record with upload index
    const updatedSync = await prisma.anafInvoiceSync.update({
      where: { id: sync.id },
      data: {
        status: 'UPLOADED',
        uploadIndex: uploadResult.uploadIndex,
        uploadedAt: new Date(),
        responseData: {
          ...uploadResult,
          xmlPath,
          xmlFilename,
        },
      },
    });

    // Immediately check status
    await syncInvoiceStatus(invoiceId);

    return {
      success: true,
      invoiceId,
      uploadIndex: uploadResult.uploadIndex,
      status: 'UPLOADED',
      message: 'Invoice successfully uploaded to ANAF',
      xmlPath,
      xmlFilename,
    };
  } catch (error) {
    // Update sync record with error
    await prisma.anafInvoiceSync.update({
      where: { id: sync.id },
      data: {
        status: 'ERROR',
        errorMessage: error.message,
        lastCheckedAt: new Date(),
      },
    });

    throw error;
  }
}

/**
 * Check and update invoice status from ANAF
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Object>} Status update result
 */
async function syncInvoiceStatus(invoiceId) {
  const sync = await prisma.anafInvoiceSync.findUnique({
    where: { invoiceId },
    include: { invoice: true },
  });

  if (!sync) {
    throw new AppError('Invoice sync record not found', 404);
  }

  if (!sync.uploadIndex) {
    throw new AppError('Invoice not yet uploaded to ANAF', 400);
  }

  if (sync.status === 'OK') {
    return {
      success: true,
      status: sync.status,
      message: 'Invoice already confirmed as OK by ANAF',
    };
  }

  // Get valid token and environment
  const config = await getAnafConfig();
  const environment = config.environment || 'test';
  const token = await getValidToken(config.id);

  try {
    // Check status from ANAF
    const statusResult = await checkInvoiceStatus(sync.uploadIndex, token.accessToken, environment);

    // Update sync record
    const updateData = {
      anafStatus: statusResult.status,
      lastCheckedAt: new Date(),
    };

    if (statusResult.isProcessed) {
      updateData.status = 'OK';
      updateData.downloadId = statusResult.downloadId;
      updateData.processedAt = new Date();
    } else if (statusResult.hasError) {
      updateData.status = 'ERROR';
      updateData.errorMessage = 'ANAF returned error status';
    } else {
      updateData.status = 'PROCESSING';
    }

    const updatedSync = await prisma.anafInvoiceSync.update({
      where: { id: sync.id },
      data: updateData,
    });

    return {
      success: true,
      invoiceId,
      status: updatedSync.status,
      anafStatus: statusResult.status,
      downloadId: statusResult.downloadId,
      isProcessed: statusResult.isProcessed,
    };
  } catch (error) {
    // Update last checked time even on error
    await prisma.anafInvoiceSync.update({
      where: { id: sync.id },
      data: {
        lastCheckedAt: new Date(),
        errorMessage: error.message,
      },
    });

    throw error;
  }
}

/**
 * Retry failed invoice submission
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Object>} Retry result
 */
async function retryFailedInvoice(invoiceId) {
  const sync = await prisma.anafInvoiceSync.findUnique({
    where: { invoiceId },
  });

  if (!sync) {
    throw new AppError('Invoice sync record not found', 404);
  }

  if (sync.status === 'OK') {
    throw new AppError('Invoice already successfully submitted', 400);
  }

  if (sync.retryCount >= sync.maxRetries) {
    throw new AppError(
      `Maximum retry attempts (${sync.maxRetries}) reached. Please review errors and contact support.`,
      400
    );
  }

  // Resubmit
  return await submitInvoiceToAnaf(invoiceId, { forceResubmit: true });
}

/**
 * Download and process messages from ANAF
 * @param {Object} options - Download options
 * @returns {Promise<Object>} Downloaded messages
 */
async function downloadAnafMessages(options = {}) {
  const { days = 7, filter = 'T' } = options;

  const config = await getAnafConfig();
  const environment = config.environment || 'test';
  const token = await getValidToken(config.id);

  // List messages from ANAF
  const messages = await listMessages(config.cif, days, filter, token.accessToken, environment);

  // Store messages in database
  const storedMessages = [];

  for (const msg of messages) {
    // Check if message already exists
    const existing = await prisma.anafMessage.findUnique({
      where: { anafMessageId: msg.id },
    });

    if (!existing) {
      const stored = await prisma.anafMessage.create({
        data: {
          anafMessageId: msg.id,
          cif: msg.cif,
          solicitareId: msg.solicitareId,
          tip: msg.tip,
          dataCreare: msg.dataCreare,
          metadata: msg,
        },
      });
      storedMessages.push(stored);
    }
  }

  return {
    success: true,
    totalMessages: messages.length,
    newMessages: storedMessages.length,
    messages: storedMessages,
  };
}

/**
 * Get sync status for an invoice
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Object>} Sync status
 */
async function getInvoiceSyncStatus(invoiceId) {
  const sync = await prisma.anafInvoiceSync.findUnique({
    where: { invoiceId },
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
          issueDate: true,
          total: true,
          status: true,
        },
      },
    },
  });

  if (!sync) {
    return {
      synced: false,
      message: 'Invoice not submitted to ANAF',
    };
  }

  return {
    synced: true,
    status: sync.status,
    uploadIndex: sync.uploadIndex,
    downloadId: sync.downloadId,
    anafStatus: sync.anafStatus,
    uploadedAt: sync.uploadedAt,
    processedAt: sync.processedAt,
    lastCheckedAt: sync.lastCheckedAt,
    retryCount: sync.retryCount,
    maxRetries: sync.maxRetries,
    errorMessage: sync.errorMessage,
    invoice: sync.invoice,
  };
}

/**
 * Batch sync pending invoices
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync results
 */
async function syncPendingInvoices(options = {}) {
  const { limit = 10 } = options;

  // Find invoices that need status check
  const pendingSyncs = await prisma.anafInvoiceSync.findMany({
    where: {
      status: {
        in: ['UPLOADED', 'PROCESSING'],
      },
      uploadIndex: {
        not: null,
      },
    },
    take: limit,
    orderBy: {
      uploadedAt: 'asc',
    },
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
        },
      },
    },
  });

  const results = {
    checked: 0,
    completed: 0,
    errors: 0,
    details: [],
  };

  for (const sync of pendingSyncs) {
    try {
      const result = await syncInvoiceStatus(sync.invoiceId);
      results.checked++;

      if (result.status === 'OK') {
        results.completed++;
      }

      results.details.push({
        invoiceId: sync.invoiceId,
        invoiceNumber: sync.invoice.invoiceNumber,
        status: result.status,
        success: true,
      });
    } catch (error) {
      results.errors++;
      results.details.push({
        invoiceId: sync.invoiceId,
        invoiceNumber: sync.invoice.invoiceNumber,
        error: error.message,
        success: false,
      });
    }
  }

  return results;
}

module.exports = {
  getAnafConfig,
  generateInvoiceXml,
  submitInvoiceToAnaf,
  syncInvoiceStatus,
  retryFailedInvoice,
  downloadAnafMessages,
  getInvoiceSyncStatus,
  syncPendingInvoices,
};
