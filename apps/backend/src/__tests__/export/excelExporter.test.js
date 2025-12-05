/**
 * Unit Tests for Excel Exporter
 * Tests Excel workbook generation with styling and formatting
 */

const ExcelJS = require('exceljs');
const {
  exportToExcel,
  exportEntityToExcel,
  getNestedValue,
  fieldConfigToColumns,
} = require('../../utils/export/excelExporter');

describe('Excel Exporter - exportToExcel', () => {
  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', salary: 5000 },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', salary: 6000 },
  ];

  const mockColumns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Salary', key: 'salary', width: 15, type: 'currency' },
  ];

  it('creates Excel workbook with data', async () => {
    const buffer = await exportToExcel(mockData, { columns: mockColumns });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // Verify it's a valid Excel file by parsing it
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(workbook.worksheets.length).toBeGreaterThan(0);
  });

  it('sets workbook metadata', async () => {
    const buffer = await exportToExcel(mockData, { columns: mockColumns });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.creator).toBe('ViperX CRM');
    expect(workbook.created).toBeInstanceOf(Date);
  });

  it('creates worksheet with custom name', async () => {
    const buffer = await exportToExcel(mockData, {
      columns: mockColumns,
      sheetName: 'Test Sheet',
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet('Test Sheet');

    expect(worksheet).toBeDefined();
  });

  it('adds title row when provided', async () => {
    const buffer = await exportToExcel(mockData, {
      columns: mockColumns,
      title: 'Export Report',
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    const titleCell = worksheet.getCell('A1');
    expect(titleCell.value).toBe('Export Report');
  });

  it('includes metadata row', async () => {
    const buffer = await exportToExcel(mockData, {
      columns: mockColumns,
      includeMetadata: true,
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    // Find metadata row (contains "Export data:" and "Total inregistrari:")
    let foundMetadata = false;
    worksheet.eachRow((row, rowNumber) => {
      const cellValue = row.getCell(1).value;
      if (cellValue && String(cellValue).includes('Export data:')) {
        foundMetadata = true;
      }
    });

    expect(foundMetadata).toBe(true);
  });

  it('styles header row with blue background and white text', async () => {
    const buffer = await exportToExcel(mockData, {
      columns: mockColumns,
      includeMetadata: false,
      title: null,
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    const headerRow = worksheet.getRow(1);
    const firstCell = headerRow.getCell(1);

    expect(firstCell.fill.type).toBe('pattern');
    expect(firstCell.fill.fgColor.argb).toBe('FF175FA9');
    expect(firstCell.font.color.argb).toBe('FFFFFFFF');
    expect(firstCell.font.bold).toBe(true);
  });

  it('alternates row colors', async () => {
    const buffer = await exportToExcel(mockData, {
      columns: mockColumns,
      includeMetadata: false,
      title: null,
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    // Row 2 should have light background (even index 0)
    const row2 = worksheet.getRow(2);
    expect(row2.getCell(1).fill.fgColor.argb).toBe('FFF8F9FA');

    // Row 3 should have white background (odd index 1)
    const row3 = worksheet.getRow(3);
    const fill3 = row3.getCell(1).fill;
    // White rows might not have fill or have white fill
    expect(!fill3 || fill3.fgColor?.argb === 'FFFFFFFF').toBe(true);
  });

  it('formats currency columns correctly', async () => {
    const buffer = await exportToExcel(mockData, {
      columns: mockColumns,
      includeMetadata: false,
      title: null,
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    // Check salary column (4th column) formatting
    const salaryCell = worksheet.getRow(2).getCell(4);
    expect(salaryCell.numFmt).toContain('lei');
  });

  it('auto-sizes columns within limits', async () => {
    const buffer = await exportToExcel(mockData, { columns: mockColumns });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    worksheet.columns.forEach(column => {
      expect(column.width).toBeGreaterThanOrEqual(10);
      expect(column.width).toBeLessThanOrEqual(50);
    });
  });

  it('throws error for empty array', async () => {
    await expect(
      exportToExcel([], { columns: mockColumns })
    ).rejects.toThrow('Data must be a non-empty array');
  });

  it('throws error for non-array input', async () => {
    await expect(
      exportToExcel(null, { columns: mockColumns })
    ).rejects.toThrow('Data must be a non-empty array');
  });

  it('handles nested object values', async () => {
    const nestedData = [
      {
        id: 1,
        user: { name: 'John', contact: { email: 'john@example.com' } },
      },
    ];

    const nestedColumns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Name', key: 'user.name', width: 20 },
      { header: 'Email', key: 'user.contact.email', width: 30 },
    ];

    const buffer = await exportToExcel(nestedData, { columns: nestedColumns });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    const nameCell = worksheet.getRow(2).getCell(2);
    expect(nameCell.value).toBe('John');
  });

  it('formats date columns', async () => {
    const dateData = [
      { id: 1, name: 'Test', createdAt: new Date('2024-01-15T10:30:00Z') },
    ];

    const dateColumns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Created', key: 'createdAt', width: 20, type: 'date' },
    ];

    const buffer = await exportToExcel(dateData, { columns: dateColumns });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('formats datetime columns', async () => {
    const dateData = [
      { id: 1, name: 'Test', updatedAt: new Date('2024-01-15T10:30:00Z') },
    ];

    const dateColumns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Updated', key: 'updatedAt', width: 25, type: 'datetime' },
    ];

    const buffer = await exportToExcel(dateData, { columns: dateColumns });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles null and undefined values', async () => {
    const dataWithNulls = [
      { id: 1, name: 'John', email: null, phone: undefined },
    ];

    const columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 20 },
    ];

    const buffer = await exportToExcel(dataWithNulls, { columns });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    const emailCell = worksheet.getRow(2).getCell(3);
    expect(emailCell.value === '' || emailCell.value === null).toBe(true);
  });

  it('handles large datasets', async () => {
    const largeData = Array(5000).fill(null).map((_, i) => ({
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
    }));

    const buffer = await exportToExcel(largeData, { columns: mockColumns.slice(0, 3) });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(100000);
  });

  it('handles Romanian characters', async () => {
    const romanianData = [
      { name: 'Ștefan Țăran', city: 'București' },
    ];

    const columns = [
      { header: 'Nume', key: 'name', width: 20 },
      { header: 'Oraș', key: 'city', width: 20 },
    ];

    const buffer = await exportToExcel(romanianData, { columns });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    const nameCell = worksheet.getRow(2).getCell(1);
    expect(nameCell.value).toBe('Ștefan Țăran');
  });
});

describe('Excel Exporter - getNestedValue', () => {
  const testObject = {
    id: 1,
    name: 'Test',
    user: {
      firstName: 'John',
      lastName: 'Doe',
      contact: {
        email: 'john@example.com',
        phone: '+40712345678',
      },
    },
  };

  it('gets top-level values', () => {
    expect(getNestedValue(testObject, 'id')).toBe(1);
    expect(getNestedValue(testObject, 'name')).toBe('Test');
  });

  it('gets nested values with dot notation', () => {
    expect(getNestedValue(testObject, 'user.firstName')).toBe('John');
    expect(getNestedValue(testObject, 'user.lastName')).toBe('Doe');
  });

  it('gets deeply nested values', () => {
    expect(getNestedValue(testObject, 'user.contact.email')).toBe('john@example.com');
    expect(getNestedValue(testObject, 'user.contact.phone')).toBe('+40712345678');
  });

  it('returns undefined for non-existent paths', () => {
    expect(getNestedValue(testObject, 'nonexistent')).toBeUndefined();
    expect(getNestedValue(testObject, 'user.nonexistent')).toBeUndefined();
    expect(getNestedValue(testObject, 'user.contact.nonexistent')).toBeUndefined();
  });

  it('handles null/undefined in path', () => {
    const objWithNull = { user: null };
    expect(getNestedValue(objWithNull, 'user.name')).toBeUndefined();
  });

  it('handles empty path', () => {
    expect(getNestedValue(testObject, '')).toEqual(testObject);
  });
});

describe('Excel Exporter - fieldConfigToColumns', () => {
  it('converts field config to Excel columns', () => {
    const fieldConfig = [
      { label: 'ID', value: 'id' },
      { label: 'Name', value: 'name' },
      { label: 'Email', value: 'email' },
    ];

    const columns = fieldConfigToColumns(fieldConfig);

    expect(columns).toHaveLength(3);
    expect(columns[0]).toHaveProperty('header', 'ID');
    expect(columns[0]).toHaveProperty('key', 'id');
    expect(columns[0]).toHaveProperty('width', 15);
  });

  it('detects date fields', () => {
    const fieldConfig = [
      { label: 'Created At', value: 'createdAt' },
      { label: 'Updated At', value: 'updatedAt' },
    ];

    const columns = fieldConfigToColumns(fieldConfig);

    expect(columns[0].type).toBe('date');
    expect(columns[1].type).toBe('date');
  });

  it('detects datetime fields', () => {
    const fieldConfig = [
      { label: 'Timestamp', value: 'timestamp' },
    ];

    const columns = fieldConfigToColumns(fieldConfig);

    // Fields with 'time' should be datetime
    expect(['date', 'datetime']).toContain(columns[0].type);
  });

  it('detects currency fields', () => {
    const fieldConfig = [
      { label: 'Price', value: 'price' },
      { label: 'Total', value: 'total' },
      { label: 'Subtotal', value: 'subtotal' },
      { label: 'Tax', value: 'tax' },
    ];

    const columns = fieldConfigToColumns(fieldConfig);

    columns.forEach(col => {
      expect(col.type).toBe('currency');
    });
  });

  it('detects status fields', () => {
    const fieldConfig = [
      { label: 'Status', value: 'status' },
    ];

    const columns = fieldConfigToColumns(fieldConfig);

    expect(columns[0].type).toBe('status');
  });

  it('detects number fields', () => {
    const fieldConfig = [
      { label: 'Quantity', value: 'quantity' },
      { label: 'Hours', value: 'hours' },
      { label: 'Minutes', value: 'minutes' },
      { label: 'Days', value: 'days' },
    ];

    const columns = fieldConfigToColumns(fieldConfig);

    columns.forEach(col => {
      expect(col.type).toBe('number');
    });
  });

  it('handles fields without specific types', () => {
    const fieldConfig = [
      { label: 'Description', value: 'description' },
    ];

    const columns = fieldConfigToColumns(fieldConfig);

    expect(columns[0].type).toBeUndefined();
  });
});

describe('Excel Exporter - exportEntityToExcel', () => {
  it('exports appointments with proper title', async () => {
    const appointments = [
      {
        id: 1,
        title: 'Revizie',
        status: 'completed',
        scheduledStart: '2024-01-15T10:00:00Z',
      },
    ];

    const buffer = await exportEntityToExcel('appointments', appointments);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    expect(worksheet.name).toContain('Programari');
    const titleCell = worksheet.getCell('A1');
    expect(titleCell.value).toContain('Programari');
  });

  it('exports invoices with proper title', async () => {
    const invoices = [
      {
        id: 1,
        invoiceNumber: 'INV-001',
        status: 'paid',
        total: 119,
      },
    ];

    const buffer = await exportEntityToExcel('invoices', invoices);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.worksheets[0].name).toContain('Facturi');
  });

  it('exports clients with proper title', async () => {
    const clients = [
      {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
      },
    ];

    const buffer = await exportEntityToExcel('clients', clients);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.worksheets[0].name).toContain('Clienti');
  });

  it('throws error for unknown entity without custom columns', async () => {
    const data = [{ id: 1 }];

    await expect(
      exportEntityToExcel('unknown_entity', data)
    ).rejects.toThrow('No field configuration found');
  });

  it('uses custom columns when provided', async () => {
    const data = [{ id: 1, custom: 'value' }];
    const customColumns = [
      { header: 'Custom ID', key: 'id', width: 10 },
      { header: 'Custom Field', key: 'custom', width: 20 },
    ];

    const buffer = await exportEntityToExcel('unknown_entity', data, customColumns);
    expect(buffer).toBeInstanceOf(Buffer);
  });
});

describe('Excel Exporter - Edge Cases', () => {
  const mockColumns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Value', key: 'value', width: 20 },
  ];

  it('handles single record', async () => {
    const data = [{ id: 1, value: 'Single' }];
    const buffer = await exportToExcel(data, { columns: mockColumns });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles very long text', async () => {
    const longText = 'A'.repeat(10000);
    const data = [{ id: 1, value: longText }];
    const buffer = await exportToExcel(data, { columns: mockColumns });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles special characters', async () => {
    const data = [
      { id: 1, value: 'Line1\nLine2\tTab' },
    ];
    const buffer = await exportToExcel(data, { columns: mockColumns });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles boolean values', async () => {
    const data = [
      { id: 1, isActive: true, isDeleted: false },
    ];

    const columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Active', key: 'isActive', width: 10 },
      { header: 'Deleted', key: 'isDeleted', width: 10 },
    ];

    const buffer = await exportToExcel(data, { columns });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    expect(worksheet.getRow(2).getCell(2).value).toBe(true);
    expect(worksheet.getRow(2).getCell(3).value).toBe(false);
  });

  it('handles numeric zero', async () => {
    const data = [{ id: 0, value: 0 }];
    const buffer = await exportToExcel(data, { columns: mockColumns });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    expect(worksheet.getRow(2).getCell(1).value).toBe(0);
  });
});
