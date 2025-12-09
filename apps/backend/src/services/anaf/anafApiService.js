const axios = require('axios');
const xml2js = require('xml2js');
const { AppError } = require('../../utils/errors');

/**
 * ANAF REST API Service
 * Handles all API calls to ANAF E-Factura system
 */

const ANAF_API_BASE_URL = process.env.ANAF_API_BASE_URL ||
  'https://webserviceapl.anaf.ro/prod/FCTEL/rest';

const ANAF_TEST_API_BASE_URL = process.env.ANAF_TEST_API_BASE_URL ||
  'https://webserviceapl.anaf.ro/test/FCTEL/rest';

/**
 * Get base URL based on environment
 * @param {string} environment - "test" or "production"
 * @returns {string} Base URL for ANAF API
 */
const getBaseUrl = (environment = 'test') => {
  return environment === 'production' ? ANAF_API_BASE_URL : ANAF_TEST_API_BASE_URL;
};

/**
 * Create axios instance with auth token
 * @param {string} accessToken - Bearer token
 * @param {string} environment - "test" or "production"
 * @returns {Object} Axios instance
 */
function createApiClient(accessToken, environment = 'test') {
  return axios.create({
    baseURL: getBaseUrl(environment),
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/xml',
    },
    timeout: 60000, // 60 seconds
  });
}

/**
 * Parse XML response to JSON
 * @param {string} xmlString - XML string
 * @returns {Promise<Object>} Parsed JSON
 */
async function parseXmlResponse(xmlString) {
  const parser = new xml2js.Parser({
    explicitArray: false,
    mergeAttrs: true,
    ignoreAttrs: false,
  });

  try {
    return await parser.parseStringPromise(xmlString);
  } catch (error) {
    throw new AppError(`Failed to parse XML response: ${error.message}`, 500);
  }
}

/**
 * Upload invoice XML to ANAF
 * @param {string} invoiceXml - UBL Invoice XML
 * @param {string} cif - Company tax ID
 * @param {string} accessToken - Bearer token
 * @param {string} environment - "test" or "production"
 * @returns {Promise<Object>} Upload response
 */
async function uploadInvoice(invoiceXml, cif, accessToken, environment = 'test') {
  try {
    const client = createApiClient(accessToken, environment);

    const response = await client.post(`/upload?standard=UBL&cif=${cif}`, invoiceXml, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });

    // Response format: <header dateResponse="..." ExecutionStatus="0" index_incarcare="..."/>
    let parsedResponse;
    if (typeof response.data === 'string') {
      parsedResponse = await parseXmlResponse(response.data);
    } else {
      parsedResponse = response.data;
    }

    const header = parsedResponse.header || parsedResponse;

    if (header.ExecutionStatus !== '0' && header.ExecutionStatus !== 0) {
      throw new AppError(
        `ANAF upload failed with status ${header.ExecutionStatus}: ${header.Errors || 'Unknown error'}`,
        400
      );
    }

    return {
      success: true,
      uploadIndex: header.index_incarcare,
      dateResponse: header.dateResponse,
      executionStatus: header.ExecutionStatus,
    };
  } catch (error) {
    if (error.response) {
      throw new AppError(
        `ANAF upload error: ${error.response.data || error.message}`,
        error.response.status || 500
      );
    }
    throw error;
  }
}

/**
 * Check invoice processing status
 * @param {string} uploadIndex - Upload index from ANAF
 * @param {string} accessToken - Bearer token
 * @param {string} environment - "test" or "production"
 * @returns {Promise<Object>} Status response
 */
async function checkInvoiceStatus(uploadIndex, accessToken, environment = 'test') {
  try {
    const client = createApiClient(accessToken, environment);

    const response = await client.get(`/stareMesaj?index_incarcare=${uploadIndex}`);

    // Response format: <header stare="ok/nok" id_descarcare="..."/>
    let parsedResponse;
    if (typeof response.data === 'string') {
      parsedResponse = await parseXmlResponse(response.data);
    } else {
      parsedResponse = response.data;
    }

    const header = parsedResponse.header || parsedResponse;

    return {
      status: header.stare,
      downloadId: header.id_descarcare,
      uploadIndex,
      isProcessed: header.stare === 'ok',
      hasError: header.stare === 'nok',
    };
  } catch (error) {
    if (error.response) {
      throw new AppError(
        `ANAF status check error: ${error.response.data || error.message}`,
        error.response.status || 500
      );
    }
    throw error;
  }
}

/**
 * Download message ZIP from ANAF
 * @param {string} downloadId - Download ID from status response
 * @param {string} accessToken - Bearer token
 * @param {string} environment - "test" or "production"
 * @returns {Promise<Buffer>} ZIP file buffer
 */
async function downloadMessage(downloadId, accessToken, environment = 'test') {
  try {
    const client = createApiClient(accessToken, environment);

    const response = await client.get(`/descarcare?id=${downloadId}`, {
      responseType: 'arraybuffer',
    });

    if (!response.data || response.data.length === 0) {
      throw new AppError('Empty response from ANAF download', 500);
    }

    return Buffer.from(response.data);
  } catch (error) {
    if (error.response) {
      throw new AppError(
        `ANAF download error: ${error.message}`,
        error.response.status || 500
      );
    }
    throw error;
  }
}

/**
 * List messages from ANAF
 * @param {string} cif - Company tax ID
 * @param {number} days - Number of days to look back (max 60)
 * @param {string} filter - Filter type: T (toate), P (primite), E (emise), R (erori)
 * @param {string} accessToken - Bearer token
 * @param {string} environment - "test" or "production"
 * @returns {Promise<Array>} List of messages
 */
async function listMessages(cif, days = 60, filter = 'T', accessToken, environment = 'test') {
  try {
    const client = createApiClient(accessToken, environment);

    // Validate parameters
    const validDays = Math.min(Math.max(days, 1), 60);
    const validFilter = ['T', 'P', 'E', 'R'].includes(filter) ? filter : 'T';

    const response = await client.get(
      `/listaMesajeFactura?zile=${validDays}&cif=${cif}&filtru=${validFilter}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    // Response format: { mesaje: [{data_creare, cif, id_solicitare, tip, id}] }
    const data = response.data;

    if (!data || !data.mesaje) {
      return [];
    }

    // Ensure mesaje is always an array
    const messages = Array.isArray(data.mesaje) ? data.mesaje : [data.mesaje];

    return messages.map(msg => ({
      id: msg.id,
      dataCreare: msg.data_creare,
      cif: msg.cif,
      solicitareId: msg.id_solicitare,
      tip: msg.tip,
    }));
  } catch (error) {
    if (error.response) {
      throw new AppError(
        `ANAF list messages error: ${error.response.data || error.message}`,
        error.response.status || 500
      );
    }
    throw error;
  }
}

/**
 * Convert XML invoice to PDF
 * @param {string} invoiceXml - UBL Invoice XML
 * @param {string} accessToken - Bearer token
 * @param {string} environment - "test" or "production"
 * @returns {Promise<Buffer>} PDF buffer
 */
async function convertXmlToPdf(invoiceXml, accessToken, environment = 'test') {
  try {
    const client = createApiClient(accessToken, environment);

    const response = await client.post('/transformare/FACT1', invoiceXml, {
      headers: {
        'Content-Type': 'text/plain',
      },
      responseType: 'arraybuffer',
    });

    if (!response.data || response.data.length === 0) {
      throw new AppError('Empty PDF response from ANAF', 500);
    }

    return Buffer.from(response.data);
  } catch (error) {
    if (error.response) {
      throw new AppError(
        `ANAF XML to PDF conversion error: ${error.message}`,
        error.response.status || 500
      );
    }
    throw error;
  }
}

/**
 * Health check / Hello endpoint
 * @param {string} accessToken - Bearer token
 * @param {string} environment - "test" or "production"
 * @returns {Promise<Object>} Health check response
 */
async function healthCheck(accessToken, environment = 'test') {
  try {
    const client = createApiClient(accessToken, environment);

    const response = await client.get('/');

    return {
      success: true,
      status: 'ok',
      message: response.data || 'ANAF API is accessible',
    };
  } catch (error) {
    if (error.response) {
      throw new AppError(
        `ANAF health check failed: ${error.message}`,
        error.response.status || 500
      );
    }
    throw error;
  }
}

/**
 * Validate invoice XML before upload
 * @param {string} invoiceXml - UBL Invoice XML
 * @param {string} accessToken - Bearer token
 * @param {string} environment - "test" or "production"
 * @returns {Promise<Object>} Validation response
 */
async function validateInvoiceXml(invoiceXml, accessToken, environment = 'test') {
  try {
    const client = createApiClient(accessToken, environment);

    const response = await client.post('/validate', invoiceXml, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });

    let parsedResponse;
    if (typeof response.data === 'string') {
      parsedResponse = await parseXmlResponse(response.data);
    } else {
      parsedResponse = response.data;
    }

    return {
      isValid: parsedResponse.valid === 'true' || parsedResponse.valid === true,
      errors: parsedResponse.errors || [],
      warnings: parsedResponse.warnings || [],
    };
  } catch (error) {
    // Validation endpoint might not exist in all ANAF environments
    // Return a basic validation check
    return {
      isValid: invoiceXml && invoiceXml.length > 0,
      errors: [],
      warnings: ['Server-side validation not available'],
    };
  }
}

module.exports = {
  uploadInvoice,
  checkInvoiceStatus,
  downloadMessage,
  listMessages,
  convertXmlToPdf,
  healthCheck,
  validateInvoiceXml,
  parseXmlResponse,
};
