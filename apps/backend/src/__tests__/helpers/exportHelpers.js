/**
 * Test Helpers for Export Tests
 * Provides utility functions for validating export files and mocking services
 */

const ExcelJS = require('exceljs');
const { PDFDocument } = require('pdf-lib');
const AdmZip = require('adm-zip');

/**
 * Mock Prisma client with common export queries
 */
const createMockPrisma = () => {
  return {
    appointment: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    client: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    timeOffRequest: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    timeEntry: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };
};

/**
 * Validate CSV structure and content
 * @param {Buffer} buffer - CSV file buffer
 * @returns {Object} Validation result with { isValid, headers, rowCount, errors }
 */
const validateCSV = (buffer) => {
  const errors = [];
  let headers = [];
  let rowCount = 0;

  try {
    const csvString = buffer.toString('utf8');

    // Check for UTF-8 BOM
    const hasBOM = buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
    if (!hasBOM) {
      errors.push('Missing UTF-8 BOM');
    }

    // Parse CSV lines
    const lines = csvString.trim().split('\n');

    if (lines.length < 1) {
      errors.push('CSV is empty');
      return { isValid: false, headers, rowCount, errors };
    }

    // Extract headers
    headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    rowCount = lines.length - 1; // Exclude header row

    // Validate each data row has same number of columns
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',');
      if (columns.length !== headers.length) {
        errors.push(`Row ${i} has ${columns.length} columns, expected ${headers.length}`);
      }
    }

    return {
      isValid: errors.length === 0,
      headers,
      rowCount,
      errors,
    };
  } catch (error) {
    errors.push(`Failed to parse CSV: ${error.message}`);
    return { isValid: false, headers, rowCount, errors };
  }
};

/**
 * Validate Excel structure and content
 * @param {Buffer} buffer - Excel file buffer
 * @returns {Promise<Object>} Validation result with { isValid, worksheets, errors }
 */
const validateExcel = async (buffer) => {
  const errors = [];
  const worksheets = [];

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    if (workbook.worksheets.length === 0) {
      errors.push('Excel file has no worksheets');
      return { isValid: false, worksheets, errors };
    }

    // Validate each worksheet
    workbook.worksheets.forEach((worksheet, index) => {
      const sheetInfo = {
        name: worksheet.name,
        rowCount: worksheet.rowCount,
        columnCount: worksheet.columnCount,
        hasData: worksheet.rowCount > 1,
      };

      // Check for header row styling
      const headerRow = worksheet.getRow(1);
      const hasHeaderStyle = headerRow.getCell(1).fill?.fgColor?.argb === 'FF175FA9';
      sheetInfo.hasHeaderStyle = hasHeaderStyle;

      worksheets.push(sheetInfo);

      if (worksheet.rowCount === 0) {
        errors.push(`Worksheet "${worksheet.name}" is empty`);
      }
    });

    return {
      isValid: errors.length === 0,
      worksheets,
      errors,
    };
  } catch (error) {
    errors.push(`Failed to parse Excel file: ${error.message}`);
    return { isValid: false, worksheets, errors };
  }
};

/**
 * Validate JSON structure and content
 * @param {Buffer} buffer - JSON file buffer
 * @returns {Object} Validation result with { isValid, data, metadata, errors }
 */
const validateJSON = (buffer) => {
  const errors = [];
  let data = null;
  let metadata = null;

  try {
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    // Check if it's wrapped with metadata
    if (parsed.metadata && parsed.data) {
      metadata = parsed.metadata;
      data = parsed.data;

      // Validate metadata structure
      if (!metadata.exportDate) {
        errors.push('Missing exportDate in metadata');
      }
      if (!metadata.generatedBy) {
        errors.push('Missing generatedBy in metadata');
      }
      if (metadata.totalRecords === undefined) {
        errors.push('Missing totalRecords in metadata');
      }

      // Validate data
      if (!Array.isArray(data)) {
        errors.push('Data should be an array');
      }
    } else if (Array.isArray(parsed)) {
      // Direct array export
      data = parsed;
    } else {
      errors.push('Invalid JSON structure');
    }

    return {
      isValid: errors.length === 0,
      data,
      metadata,
      errors,
    };
  } catch (error) {
    errors.push(`Failed to parse JSON: ${error.message}`);
    return { isValid: false, data, metadata, errors };
  }
};

/**
 * Validate PDF structure and content
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<Object>} Validation result with { isValid, pageCount, errors }
 */
const validatePDF = async (buffer) => {
  const errors = [];
  let pageCount = 0;

  try {
    const pdfDoc = await PDFDocument.load(buffer);
    pageCount = pdfDoc.getPageCount();

    if (pageCount === 0) {
      errors.push('PDF has no pages');
    }

    // Validate PDF is not corrupted
    const pages = pdfDoc.getPages();
    pages.forEach((page, index) => {
      const { width, height } = page.getSize();
      if (width <= 0 || height <= 0) {
        errors.push(`Page ${index + 1} has invalid dimensions`);
      }
    });

    return {
      isValid: errors.length === 0,
      pageCount,
      errors,
    };
  } catch (error) {
    errors.push(`Failed to parse PDF: ${error.message}`);
    return { isValid: false, pageCount, errors };
  }
};

/**
 * Validate ZIP archive structure and content
 * @param {Buffer} buffer - ZIP file buffer
 * @returns {Object} Validation result with { isValid, files, hasMetadata, errors }
 */
const validateZIP = (buffer) => {
  const errors = [];
  const files = [];
  let hasMetadata = false;

  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    if (zipEntries.length === 0) {
      errors.push('ZIP archive is empty');
      return { isValid: false, files, hasMetadata, errors };
    }

    // List all files
    zipEntries.forEach(entry => {
      files.push({
        name: entry.entryName,
        size: entry.header.size,
        compressedSize: entry.header.compressedSize,
        isDirectory: entry.isDirectory,
      });

      if (entry.entryName === 'metadata.json') {
        hasMetadata = true;

        // Validate metadata content
        try {
          const metadataContent = zip.readAsText('metadata.json');
          const metadata = JSON.parse(metadataContent);

          if (!metadata.exportDate) {
            errors.push('metadata.json missing exportDate');
          }
          if (!metadata.generatedBy) {
            errors.push('metadata.json missing generatedBy');
          }
        } catch (err) {
          errors.push(`Invalid metadata.json: ${err.message}`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      files,
      hasMetadata,
      errors,
    };
  } catch (error) {
    errors.push(`Failed to parse ZIP: ${error.message}`);
    return { isValid: false, files, hasMetadata, errors };
  }
};

/**
 * Generate test file for validation testing
 * @param {string} format - File format (csv, excel, json, pdf, zip)
 * @param {Object} options - Generation options
 * @returns {Promise<Buffer>} Generated file buffer
 */
const generateTestFile = async (format, options = {}) => {
  const { exportToCSV } = require('../../utils/export/csvExporter');
  const { exportToExcel } = require('../../utils/export/excelExporter');
  const { exportToJSON } = require('../../utils/export/jsonExporter');
  const { exportToPDF } = require('../../utils/export/pdfExporter');
  const { createZipArchive } = require('../../utils/export/zipExporter');

  const testData = options.data || [
    { id: 1, name: 'Test 1', value: 100 },
    { id: 2, name: 'Test 2', value: 200 },
  ];

  switch (format) {
    case 'csv':
      return exportToCSV(testData, options);

    case 'excel':
      const columns = options.columns || [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Value', key: 'value', width: 15 },
      ];
      return exportToExcel(testData, { columns });

    case 'json':
      return exportToJSON(testData, options);

    case 'pdf':
      const pdfColumns = options.columns || [
        { header: 'ID', key: 'id', width: 1 },
        { header: 'Name', key: 'name', width: 2 },
        { header: 'Value', key: 'value', width: 2 },
      ];
      return exportToPDF(testData, { columns: pdfColumns });

    case 'zip':
      const files = options.files || [
        { name: 'test1.txt', buffer: Buffer.from('Content 1', 'utf8') },
        { name: 'test2.txt', buffer: Buffer.from('Content 2', 'utf8') },
      ];
      return createZipArchive(files);

    default:
      throw new Error(`Unsupported format: ${format}`);
  }
};

/**
 * Mock Express request object for API tests
 */
const createMockRequest = (options = {}) => {
  return {
    user: options.user || { id: 'user-1', email: 'test@example.com' },
    userRoles: options.userRoles || [],
    query: options.query || {},
    body: options.body || {},
    params: options.params || {},
    headers: options.headers || {},
    exportFormat: options.exportFormat || 'csv',
  };
};

/**
 * Mock Express response object for API tests
 */
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Assert that buffer is valid for given format
 */
const assertValidExportFile = async (buffer, format) => {
  expect(buffer).toBeInstanceOf(Buffer);
  expect(buffer.length).toBeGreaterThan(0);

  switch (format) {
    case 'csv':
      const csvResult = validateCSV(buffer);
      expect(csvResult.isValid).toBe(true);
      if (!csvResult.isValid) {
        console.error('CSV validation errors:', csvResult.errors);
      }
      break;

    case 'excel':
      const excelResult = await validateExcel(buffer);
      expect(excelResult.isValid).toBe(true);
      if (!excelResult.isValid) {
        console.error('Excel validation errors:', excelResult.errors);
      }
      break;

    case 'json':
      const jsonResult = validateJSON(buffer);
      expect(jsonResult.isValid).toBe(true);
      if (!jsonResult.isValid) {
        console.error('JSON validation errors:', jsonResult.errors);
      }
      break;

    case 'pdf':
      const pdfResult = await validatePDF(buffer);
      expect(pdfResult.isValid).toBe(true);
      if (!pdfResult.isValid) {
        console.error('PDF validation errors:', pdfResult.errors);
      }
      break;

    case 'zip':
      const zipResult = validateZIP(buffer);
      expect(zipResult.isValid).toBe(true);
      if (!zipResult.isValid) {
        console.error('ZIP validation errors:', zipResult.errors);
      }
      break;

    default:
      throw new Error(`Unknown format: ${format}`);
  }
};

/**
 * Wait for async operation (useful for testing timeouts)
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  createMockPrisma,
  validateCSV,
  validateExcel,
  validateJSON,
  validatePDF,
  validateZIP,
  generateTestFile,
  createMockRequest,
  createMockResponse,
  assertValidExportFile,
  wait,
};
