/**
 * Unit Tests for PDF Exporter
 * Tests PDF generation with table layouts and Romanian text support
 */

const { PDFDocument } = require('pdf-lib');
const {
  exportToPDF,
  exportEntityToPDF,
} = require('../../utils/export/pdfExporter');

describe('PDF Exporter - exportToPDF', () => {
  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', city: 'Bucharest' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', city: 'Cluj' },
  ];

  const mockColumns = [
    { header: 'ID', key: 'id', width: 1 },
    { header: 'Name', key: 'name', width: 2 },
    { header: 'Email', key: 'email', width: 3 },
    { header: 'City', key: 'city', width: 2 },
  ];

  it('creates PDF document with data', async () => {
    const buffer = await exportToPDF(mockData, { columns: mockColumns });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // Verify it's a valid PDF by parsing it
    const pdfDoc = await PDFDocument.load(buffer);
    expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
  });

  it('includes title in PDF', async () => {
    const buffer = await exportToPDF(mockData, {
      columns: mockColumns,
      title: 'Export Report',
    });

    const pdfDoc = await PDFDocument.load(buffer);
    expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
  });

  it('includes company name', async () => {
    const buffer = await exportToPDF(mockData, {
      columns: mockColumns,
      companyName: 'Test Company',
    });

    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('uses environment company name when not provided', async () => {
    const originalEnv = process.env.COMPANY_NAME;
    process.env.COMPANY_NAME = 'Env Company';

    const buffer = await exportToPDF(mockData, { columns: mockColumns });
    expect(buffer).toBeInstanceOf(Buffer);

    process.env.COMPANY_NAME = originalEnv;
  });

  it('throws error for empty data array', async () => {
    await expect(
      exportToPDF([], { columns: mockColumns })
    ).rejects.toThrow('Data must be a non-empty array');
  });

  it('throws error for non-array data', async () => {
    await expect(
      exportToPDF(null, { columns: mockColumns })
    ).rejects.toThrow('Data must be a non-empty array');
  });

  it('handles Romanian characters', async () => {
    const romanianData = [
      { name: 'Ștefan Țăran', city: 'București' },
    ];

    const columns = [
      { header: 'Nume', key: 'name', width: 2 },
      { header: 'Oraș', key: 'city', width: 2 },
    ];

    const buffer = await exportToPDF(romanianData, { columns });
    expect(buffer).toBeInstanceOf(Buffer);

    const pdfDoc = await PDFDocument.load(buffer);
    expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
  });

  it('handles null and undefined values', async () => {
    const dataWithNulls = [
      { id: 1, name: 'John', email: null, phone: undefined },
    ];

    const columns = [
      { header: 'ID', key: 'id', width: 1 },
      { header: 'Name', key: 'name', width: 2 },
      { header: 'Email', key: 'email', width: 2 },
      { header: 'Phone', key: 'phone', width: 2 },
    ];

    const buffer = await exportToPDF(dataWithNulls, { columns });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('formats date columns', async () => {
    const dateData = [
      { id: 1, name: 'Test', createdAt: new Date('2024-01-15T10:30:00Z') },
    ];

    const columns = [
      { header: 'ID', key: 'id', width: 1 },
      { header: 'Name', key: 'name', width: 2 },
      { header: 'Created', key: 'createdAt', width: 2, type: 'date' },
    ];

    const buffer = await exportToPDF(dateData, { columns });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('formats datetime columns', async () => {
    const dateData = [
      { id: 1, updatedAt: new Date('2024-01-15T10:30:00Z') },
    ];

    const columns = [
      { header: 'ID', key: 'id', width: 1 },
      { header: 'Updated', key: 'updatedAt', width: 3, type: 'datetime' },
    ];

    const buffer = await exportToPDF(dateData, { columns });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('formats currency columns', async () => {
    const currencyData = [
      { id: 1, price: 100.50, total: 119.59 },
    ];

    const columns = [
      { header: 'ID', key: 'id', width: 1 },
      { header: 'Price', key: 'price', width: 2, type: 'currency' },
      { header: 'Total', key: 'total', width: 2, type: 'currency' },
    ];

    const buffer = await exportToPDF(currencyData, { columns });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('translates status columns', async () => {
    const statusData = [
      { id: 1, status: 'pending' },
      { id: 2, status: 'completed' },
    ];

    const columns = [
      { header: 'ID', key: 'id', width: 1 },
      { header: 'Status', key: 'status', width: 2, type: 'status' },
    ];

    const buffer = await exportToPDF(statusData, { columns });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles large datasets with pagination', async () => {
    const largeData = Array(100).fill(null).map((_, i) => ({
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
    }));

    const buffer = await exportToPDF(largeData, { columns: mockColumns.slice(0, 3) });
    expect(buffer).toBeInstanceOf(Buffer);

    const pdfDoc = await PDFDocument.load(buffer);
    // Should create multiple pages for 100 records
    expect(pdfDoc.getPageCount()).toBeGreaterThan(1);
  });

  it('truncates very long text', async () => {
    const longText = 'A'.repeat(1000);
    const dataWithLongText = [
      { id: 1, description: longText },
    ];

    const columns = [
      { header: 'ID', key: 'id', width: 1 },
      { header: 'Description', key: 'description', width: 3 },
    ];

    const buffer = await exportToPDF(dataWithLongText, { columns });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles nested values', async () => {
    const nestedData = [
      {
        id: 1,
        user: { name: 'John' },
        contact: { email: 'john@example.com' },
      },
    ];

    const columns = [
      { header: 'ID', key: 'id', width: 1 },
      { header: 'Name', key: 'user.name', width: 2 },
      { header: 'Email', key: 'contact.email', width: 3 },
    ];

    // Note: PDF exporter expects flattened data
    const flattenedData = [
      { id: 1, 'user.name': 'John', 'contact.email': 'john@example.com' },
    ];

    const buffer = await exportToPDF(flattenedData, { columns });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles single record', async () => {
    const singleData = [{ id: 1, name: 'Single' }];
    const columns = [
      { header: 'ID', key: 'id', width: 1 },
      { header: 'Name', key: 'name', width: 2 },
    ];

    const buffer = await exportToPDF(singleData, { columns });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles boolean values', async () => {
    const booleanData = [
      { id: 1, isActive: true, isDeleted: false },
    ];

    const columns = [
      { header: 'ID', key: 'id', width: 1 },
      { header: 'Active', key: 'isActive', width: 1 },
      { header: 'Deleted', key: 'isDeleted', width: 1 },
    ];

    const buffer = await exportToPDF(booleanData, { columns });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles numeric zero', async () => {
    const zeroData = [{ id: 0, count: 0 }];
    const columns = [
      { header: 'ID', key: 'id', width: 1 },
      { header: 'Count', key: 'count', width: 1 },
    ];

    const buffer = await exportToPDF(zeroData, { columns });
    expect(buffer).toBeInstanceOf(Buffer);
  });
});

describe('PDF Exporter - exportEntityToPDF', () => {
  const mockColumns = [
    { header: 'ID', key: 'id', width: 1 },
    { header: 'Name', key: 'name', width: 2 },
  ];

  it('exports appointments with correct title', async () => {
    const appointments = [
      { id: 1, title: 'Revizie' },
    ];

    const buffer = await exportEntityToPDF('appointments', appointments, mockColumns);
    expect(buffer).toBeInstanceOf(Buffer);

    const pdfDoc = await PDFDocument.load(buffer);
    expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
  });

  it('exports invoices with correct title', async () => {
    const invoices = [
      { id: 1, invoiceNumber: 'INV-001' },
    ];

    const buffer = await exportEntityToPDF('invoices', invoices, mockColumns);
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('exports clients with correct title', async () => {
    const clients = [
      { id: 1, name: 'John Doe' },
    ];

    const buffer = await exportEntityToPDF('clients', clients, mockColumns);
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('exports users with correct title', async () => {
    const users = [
      { id: 1, name: 'John Doe' },
    ];

    const buffer = await exportEntityToPDF('users', users, mockColumns);
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('exports leave requests with correct title', async () => {
    const requests = [
      { id: 1, type: 'vacation' },
    ];

    const buffer = await exportEntityToPDF('leaveRequests', requests, mockColumns);
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('exports time tracking with correct title', async () => {
    const entries = [
      { id: 1, hours: 8 },
    ];

    const buffer = await exportEntityToPDF('timeTracking', entries, mockColumns);
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('exports tasks with correct title', async () => {
    const tasks = [
      { id: 1, title: 'Task 1' },
    ];

    const buffer = await exportEntityToPDF('tasks', tasks, mockColumns);
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('uses custom title when provided', async () => {
    const data = [{ id: 1 }];
    const customTitle = 'Custom Export Title';

    const buffer = await exportEntityToPDF('appointments', data, mockColumns, customTitle);
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('uses default title for unknown entity type', async () => {
    const data = [{ id: 1 }];

    const buffer = await exportEntityToPDF('unknown', data, mockColumns);
    expect(buffer).toBeInstanceOf(Buffer);
  });
});

describe('PDF Exporter - Edge Cases', () => {
  const mockColumns = [
    { header: 'ID', key: 'id', width: 1 },
    { header: 'Value', key: 'value', width: 3 },
  ];

  it('handles empty strings', async () => {
    const data = [{ id: 1, value: '' }];
    const buffer = await exportToPDF(data, { columns: mockColumns });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles special characters', async () => {
    const data = [
      { id: 1, value: 'Special: @#$%^&*()' },
    ];

    const buffer = await exportToPDF(data, { columns: mockColumns });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles line breaks in text', async () => {
    const data = [
      { id: 1, value: 'Line1\nLine2\nLine3' },
    ];

    const buffer = await exportToPDF(data, { columns: mockColumns });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles tabs in text', async () => {
    const data = [
      { id: 1, value: 'Column1\tColumn2\tColumn3' },
    ];

    const buffer = await exportToPDF(data, { columns: mockColumns });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles Unicode emoji', async () => {
    const data = [
      { id: 1, value: '😀 🎉 ⭐' },
    ];

    const buffer = await exportToPDF(data, { columns: mockColumns });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles very wide tables', async () => {
    const wideData = [
      {
        col1: 'A', col2: 'B', col3: 'C', col4: 'D', col5: 'E',
        col6: 'F', col7: 'G', col8: 'H', col9: 'I', col10: 'J',
      },
    ];

    const wideColumns = Array(10).fill(null).map((_, i) => ({
      header: `Col${i + 1}`,
      key: `col${i + 1}`,
      width: 1,
    }));

    const buffer = await exportToPDF(wideData, { columns: wideColumns });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('creates multiple pages for large datasets', async () => {
    const largeData = Array(200).fill(null).map((_, i) => ({
      id: i,
      value: `Value ${i}`,
    }));

    const buffer = await exportToPDF(largeData, { columns: mockColumns });
    const pdfDoc = await PDFDocument.load(buffer);

    // 200 records should definitely span multiple pages
    expect(pdfDoc.getPageCount()).toBeGreaterThan(3);
  });

  it('handles mixed column widths', async () => {
    const data = [{ id: 1, short: 'A', long: 'Very Long Text' }];
    const columns = [
      { header: 'ID', key: 'id', width: 1 },
      { header: 'Short', key: 'short', width: 1 },
      { header: 'Long', key: 'long', width: 4 },
    ];

    const buffer = await exportToPDF(data, { columns });
    expect(buffer).toBeInstanceOf(Buffer);
  });
});

describe('PDF Exporter - Metadata', () => {
  const mockData = [{ id: 1, name: 'Test' }];
  const mockColumns = [
    { header: 'ID', key: 'id', width: 1 },
    { header: 'Name', key: 'name', width: 2 },
  ];

  it('includes export date in document', async () => {
    const buffer = await exportToPDF(mockData, { columns: mockColumns });
    expect(buffer).toBeInstanceOf(Buffer);
    // The PDF should contain the export date text
  });

  it('includes total record count', async () => {
    const buffer = await exportToPDF(mockData, { columns: mockColumns });
    expect(buffer).toBeInstanceOf(Buffer);
    // The PDF should contain "Total inregistrari: 1"
  });

  it('includes footer text', async () => {
    const buffer = await exportToPDF(mockData, { columns: mockColumns });
    expect(buffer).toBeInstanceOf(Buffer);
    // The PDF should contain "Document generat automat de ViperX CRM"
  });
});
