/**
 * PDF Export Utilities
 * Generates PDF files with table layouts using existing PDF utilities
 */

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const path = require('path');
const { formatDate, formatDateTime, formatCurrency, getStatusLabelRO } = require('./exportUtils');

let unicodeFontAvailable = false;

const setUnicodeSupport = (enabled) => {
  unicodeFontAvailable = Boolean(enabled);
};

const sanitizeForPdf = (value) => {
  if (value === undefined || value === null) return '';
  if (unicodeFontAvailable) {
    return String(value);
  }
  return String(value)
    .replace(/[șş]/g, 's')
    .replace(/[ȘŞ]/g, 'S')
    .replace(/[țţ]/g, 't')
    .replace(/[ȚŢ]/g, 'T')
    .replace(/ă/g, 'a')
    .replace(/Ă/g, 'A')
    .replace(/î/g, 'i')
    .replace(/Î/g, 'I')
    .replace(/â/g, 'a')
    .replace(/Â/g, 'A');
};

const loadFontBytes = (filePath) => {
  if (!filePath) return null;
  try {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(__dirname, '../../../', filePath);
    if (!fs.existsSync(resolved)) {
      return null;
    }
    return fs.readFileSync(resolved);
  } catch (error) {
    return null;
  }
};

const resolveFontBytes = (envKey, defaultRelativePath) => {
  const fromEnv = process.env[envKey];
  if (fromEnv) {
    const bytes = loadFontBytes(fromEnv);
    if (bytes) return bytes;
  }
  return loadFontBytes(defaultRelativePath);
};

const embedFonts = async (pdfDoc) => {
  const regularBytes = resolveFontBytes(
    'PDF_FONT_REGULAR_PATH',
    'assets/fonts/static/NotoSans-Regular.ttf'
  );
  const boldBytes = resolveFontBytes(
    'PDF_FONT_BOLD_PATH',
    'assets/fonts/static/NotoSans-Bold.ttf'
  );

  if (regularBytes && boldBytes) {
    try {
      pdfDoc.registerFontkit(fontkit);
      const regular = await pdfDoc.embedFont(regularBytes, { subset: false });
      const bold = await pdfDoc.embedFont(boldBytes, { subset: false });
      setUnicodeSupport(true);
      return { regular, bold };
    } catch (error) {
      // Fallback to Helvetica
    }
  }

  setUnicodeSupport(false);
  return {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };
};

const createPageContext = (pdfDoc) => {
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
  return {
    page,
    width: page.getWidth(),
    height: page.getHeight(),
    margin: 40,
    cursor: page.getHeight() - 40,
  };
};

const ensureSpace = (context, height, pdfDoc) => {
  if (context.cursor - height < context.margin) {
    const nextPage = createPageContext(pdfDoc);
    context.page = nextPage.page;
    context.width = nextPage.width;
    context.height = nextPage.height;
    context.cursor = nextPage.cursor;
  }
};

/**
 * Draw table header
 */
const drawTableHeader = (context, columns, fonts, pdfDoc) => {
  const { page, margin } = context;
  const tableWidth = context.width - margin * 2;
  const rowHeight = 24;

  ensureSpace(context, rowHeight + 10, pdfDoc);

  // Header background
  page.drawRectangle({
    x: margin,
    y: context.cursor - rowHeight,
    width: tableWidth,
    height: rowHeight,
    color: rgb(0.15, 0.15, 0.15), // Dark gray/black for professional appearance
  });

  // Calculate column widths
  const totalWeight = columns.reduce((sum, col) => sum + (col.width || 1), 0);
  let cursorX = margin;

  columns.forEach((col) => {
    const colWidth = (tableWidth * (col.width || 1)) / totalWeight;
    const text = sanitizeForPdf(col.header || col.label);

    page.drawText(text, {
      x: cursorX + 5,
      y: context.cursor - 16,
      size: 10,
      font: fonts.bold,
      color: rgb(1, 1, 1),
    });

    cursorX += colWidth;
  });

  context.cursor -= rowHeight;
};

/**
 * Draw table row
 */
const drawTableRow = (context, rowData, columns, fonts, isEven) => {
  const { page, margin } = context;
  const tableWidth = context.width - margin * 2;
  const rowHeight = 20;

  // Row background (alternating colors)
  page.drawRectangle({
    x: margin,
    y: context.cursor - rowHeight,
    width: tableWidth,
    height: rowHeight,
    color: isEven ? rgb(0.99, 0.99, 0.99) : rgb(1, 1, 1),
    borderColor: rgb(0.2, 0.2, 0.2), // Dark borders for professional look
    borderWidth: 0.5,
  });

  const totalWeight = columns.reduce((sum, col) => sum + (col.width || 1), 0);
  let cursorX = margin;

  columns.forEach((col) => {
    const colWidth = (tableWidth * (col.width || 1)) / totalWeight;
    let value = rowData[col.key || col.value] ?? '';

    // Format based on type
    if (col.type === 'date' && value) {
      value = formatDate(value);
    } else if (col.type === 'datetime' && value) {
      value = formatDateTime(value);
    } else if (col.type === 'currency' && value !== '') {
      value = formatCurrency(value) + ' lei';
    } else if (col.type === 'status' && value) {
      value = getStatusLabelRO(value);
    }

    const text = sanitizeForPdf(String(value));
    const maxWidth = colWidth - 10;
    const truncated = text.length > 30 ? text.substring(0, 27) + '...' : text;

    page.drawText(truncated, {
      x: cursorX + 5,
      y: context.cursor - 14,
      size: 9,
      font: fonts.regular,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth,
    });

    cursorX += colWidth;
  });

  context.cursor -= rowHeight;
};

/**
 * Export data to PDF table format
 */
const exportToPDF = async (data, options = {}) => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Data must be a non-empty array');
  }

  const {
    columns,
    title = 'Export Date',
    companyName = process.env.COMPANY_NAME || 'ViperX CRM',
  } = options;

  const pdfDoc = await PDFDocument.create();
  const fonts = await embedFonts(pdfDoc);
  const context = createPageContext(pdfDoc);

  // Draw title
  context.page.drawText(sanitizeForPdf(companyName), {
    x: context.margin,
    y: context.cursor,
    size: 18,
    font: fonts.bold,
    color: rgb(0.2, 0.2, 0.2), // Professional black/dark gray
  });
  context.cursor -= 30;

  context.page.drawText(sanitizeForPdf(title), {
    x: context.margin,
    y: context.cursor,
    size: 14,
    font: fonts.bold,
    color: rgb(0, 0, 0),
  });
  context.cursor -= 20;

  // Draw export info
  context.page.drawText(sanitizeForPdf(`Data export: ${formatDateTime(new Date())}`), {
    x: context.margin,
    y: context.cursor,
    size: 9,
    font: fonts.regular,
    color: rgb(0.4, 0.4, 0.4),
  });
  context.cursor -= 12;

  context.page.drawText(sanitizeForPdf(`Total inregistrari: ${data.length}`), {
    x: context.margin,
    y: context.cursor,
    size: 9,
    font: fonts.regular,
    color: rgb(0.4, 0.4, 0.4),
  });
  context.cursor -= 20;

  // Draw separator
  context.page.drawLine({
    start: { x: context.margin, y: context.cursor },
    end: { x: context.width - context.margin, y: context.cursor },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.2), // Professional black/dark gray
  });
  context.cursor -= 15;

  // Draw table header
  drawTableHeader(context, columns, fonts, pdfDoc);

  // Draw data rows
  data.forEach((item, index) => {
    const spaceNeeded = 20;
    ensureSpace(context, spaceNeeded, pdfDoc);

    // If new page was created, redraw header
    if (context.cursor > context.height - 100) {
      drawTableHeader(context, columns, fonts, pdfDoc);
    }

    drawTableRow(context, item, columns, fonts, index % 2 === 0);
  });

  // Draw footer
  context.cursor -= 20;
  context.page.drawLine({
    start: { x: context.margin, y: context.cursor },
    end: { x: context.width - context.margin, y: context.cursor },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  context.cursor -= 10;

  context.page.drawText(sanitizeForPdf('Document generat automat de ViperX CRM'), {
    x: context.margin,
    y: context.cursor,
    size: 8,
    font: fonts.regular,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

/**
 * Export entity data to PDF
 */
const exportEntityToPDF = async (entityType, data, columns, customTitle = null) => {
  const titleMap = {
    appointments: 'Export Programari',
    invoices: 'Export Facturi',
    clients: 'Export Clienti',
    users: 'Export Angajati',
    leaveRequests: 'Export Cereri Concediu',
    timeTracking: 'Export Pontaj',
    tasks: 'Export Sarcini',
  };

  const title = customTitle || titleMap[entityType] || 'Export Date';

  return exportToPDF(data, { columns, title });
};

module.exports = {
  exportToPDF,
  exportEntityToPDF,
};
