/**
 * Excel Export Utilities
 * Generates XLSX files with proper formatting and Romanian locale
 */

const ExcelJS = require('exceljs');
const { getPlatformConfig } = require('../../config/platform');
const {
  formatDate,
  formatDateTime,
  getStatusLabelRO,
  sanitizeForFormulaInjection,
} = require('./exportUtils');
const { FIELD_CONFIGS } = require('./csvExporter');

/**
 * Export data to Excel format
 * @param {Array} data - Array of objects to export
 * @param {Object} options - Export options
 * @param {Array} options.columns - Column configuration [{header, key, width}]
 * @param {String} options.sheetName - Worksheet name
 * @param {String} options.title - Title to display at top of sheet
 * @returns {Buffer} Excel file as buffer
 */
const exportToExcel = async (data, options = {}) => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Data must be a non-empty array');
  }

  const { columns, sheetName = 'Date', title = null, includeMetadata = true } = options;

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  workbook.creator = getPlatformConfig().name;
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet(sheetName);

  let startRow = 1;

  // Add title if provided
  if (title) {
    const titleRow = worksheet.addRow([title]);
    titleRow.font = { size: 16, bold: true, color: { argb: 'FF175FA9' } };
    titleRow.alignment = { horizontal: 'center' };
    worksheet.mergeCells(`A1:${String.fromCharCode(65 + columns.length - 1)}1`);
    startRow = 2;

    // Add blank row after title
    worksheet.addRow([]);
    startRow = 3;
  }

  // Add metadata (export date, record count)
  if (includeMetadata) {
    const metadataRow = worksheet.addRow([
      `Export data: ${formatDateTime(new Date())} | Total inregistrari: ${data.length}`,
    ]);
    metadataRow.font = { size: 10, italic: true, color: { argb: 'FF666666' } };
    worksheet.mergeCells(`A${startRow}:${String.fromCharCode(65 + columns.length - 1)}${startRow}`);
    startRow++;

    // Add blank row after metadata
    worksheet.addRow([]);
    startRow++;
  }

  // Configure keys and widths without ExcelJS' `header` option. Assigning
  // headers through worksheet.columns always writes row 1 and would overwrite
  // the title and metadata rows above it.
  worksheet.columns = columns.map((col) => ({
    key: col.key || col.value,
    width: col.width || 15,
  }));

  // Populate and style the actual header row.
  const headerRow = worksheet.getRow(startRow);
  columns.forEach((column, index) => {
    headerRow.getCell(index + 1).value =
      column.header || column.label || column.key || column.value;
  });
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF175FA9' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 20;

  // Add borders to header
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Add data rows
  data.forEach((item, index) => {
    const rowData = {};
    columns.forEach((col) => {
      const key = col.key || col.value;
      let value = getNestedValue(item, key);

      // Format based on column type
      if (col.type === 'date' && value) {
        value = formatDate(value);
      } else if (col.type === 'datetime' && value) {
        value = formatDateTime(value);
      } else if (col.type === 'currency' && value !== null && value !== undefined) {
        value = parseFloat(value);
      } else if (col.type === 'number' && value !== null && value !== undefined) {
        value = parseFloat(value);
      } else if (col.type === 'status' && value) {
        value = getStatusLabelRO(value);
      } else if (value === null || value === undefined) {
        value = '';
      }

      // Sanitize string values to prevent formula injection
      // Only sanitize if not a number type (currency/number are safe)
      if (typeof value === 'string' && col.type !== 'currency' && col.type !== 'number') {
        value = sanitizeForFormulaInjection(value);
      }

      rowData[key] = value;
    });

    const row = worksheet.addRow(rowData);

    // Alternate row colors explicitly so spreadsheet viewers render the
    // banding consistently after serialization.
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: index % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF' },
    };

    // Add borders
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      };

      // Format currency cells
      columns.forEach((col, colIndex) => {
        if (col.type === 'currency' && cell.col === colIndex + 1) {
          cell.numFmt = '#,##0.00 "lei"';
          cell.alignment = { horizontal: 'right' };
        } else if (col.type === 'number' && cell.col === colIndex + 1) {
          cell.numFmt = '#,##0.00';
          cell.alignment = { horizontal: 'right' };
        }
      });
    });
  });

  // Auto-fit columns (with max width)
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: false }, (cell) => {
      const columnLength = cell.value ? String(cell.value).length : 0;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.min(Math.max(maxLength + 2, 10), 50);
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

/**
 * Get nested value from object using dot notation
 */
const getNestedValue = (obj, path) => {
  if (!path) return obj;

  return path.split('.').reduce((current, key) => {
    return current?.[key];
  }, obj);
};

/**
 * Convert field config to Excel columns
 */
const fieldConfigToColumns = (fieldConfig) => {
  return fieldConfig.map((field) => {
    const column = {
      header: field.label,
      key: field.value,
      width: 15,
    };

    // Determine column type based on field name
    const fieldName = field.value.toLowerCase();
    if (fieldName.includes('status')) {
      column.type = 'status';
    } else if (
      fieldName.includes('price') ||
      fieldName.includes('total') ||
      fieldName.includes('subtotal') ||
      fieldName.includes('tax')
    ) {
      column.type = 'currency';
    } else if (
      fieldName.includes('quantity') ||
      fieldName.includes('hours') ||
      fieldName.includes('minutes') ||
      fieldName.includes('days')
    ) {
      column.type = 'number';
    } else if (
      fieldName.includes('datetime') ||
      fieldName.includes('timestamp') ||
      fieldName.includes('time')
    ) {
      column.type = 'datetime';
    } else if (fieldName.includes('date') || fieldName.endsWith('at')) {
      column.type = 'date';
    }

    return column;
  });
};

/**
 * Export entity data to Excel with predefined configuration
 */
const exportEntityToExcel = async (entityType, data, customColumns = null) => {
  const fieldConfig = FIELD_CONFIGS[entityType];

  if (!fieldConfig && !customColumns) {
    throw new Error(`No field configuration found for entity type: ${entityType}`);
  }

  const columns = customColumns || fieldConfigToColumns(fieldConfig, entityType);

  // Generate title
  const titleMap = {
    appointments: 'Export Programari',
    invoices: 'Export Facturi',
    clients: 'Export Clienti',
    users: 'Export Angajati',
    leaveRequests: 'Export Cereri Concediu',
    timeTracking: 'Export Pontaj',
    tasks: 'Export Sarcini',
  };

  const title = titleMap[entityType] || 'Export Date';

  return exportToExcel(data, {
    columns,
    sheetName: titleMap[entityType] || 'Date',
    title,
    includeMetadata: true,
  });
};

/**
 * Export multiple entities to a single Excel file with multiple sheets
 */
const exportMultipleEntitiesToExcel = async (entities) => {
  if (!Array.isArray(entities) || entities.length === 0) {
    throw new Error('Entities must be a non-empty array');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = getPlatformConfig().name;
  workbook.created = new Date();
  workbook.modified = new Date();

  for (const entity of entities) {
    const { name, data, columns, sheetName } = entity;

    if (!data || data.length === 0) {
      continue; // Skip empty entities
    }

    const worksheet = workbook.addWorksheet(sheetName || name);

    // Add title
    const titleRow = worksheet.addRow([name]);
    titleRow.font = { size: 16, bold: true, color: { argb: 'FF175FA9' } };
    titleRow.alignment = { horizontal: 'center' };
    worksheet.mergeCells(`A1:${String.fromCharCode(65 + columns.length - 1)}1`);

    // Add blank row
    worksheet.addRow([]);

    // Add metadata
    const metadataRow = worksheet.addRow([
      `Export data: ${formatDateTime(new Date())} | Total: ${data.length}`,
    ]);
    metadataRow.font = { size: 10, italic: true, color: { argb: 'FF666666' } };
    worksheet.mergeCells(`A3:${String.fromCharCode(65 + columns.length - 1)}3`);

    // Add blank row
    worksheet.addRow([]);

    // Configure keys and widths without overwriting the title row.
    worksheet.columns = columns.map((column) => ({
      key: column.key,
      width: column.width,
    }));

    // Populate and style header row
    const headerRow = worksheet.getRow(5);
    columns.forEach((column, index) => {
      headerRow.getCell(index + 1).value = column.header || column.label || column.key;
    });
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF175FA9' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Add data
    data.forEach((item, index) => {
      const rowData = {};
      columns.forEach((col) => {
        rowData[col.key] = getNestedValue(item, col.key) ?? '';
      });

      const row = worksheet.addRow(rowData);

      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8F9FA' },
        };
      }
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: false }, (cell) => {
        const columnLength = cell.value ? String(cell.value).length : 0;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = {
  exportToExcel,
  exportEntityToExcel,
  exportMultipleEntitiesToExcel,
  getNestedValue,
  fieldConfigToColumns,
};
