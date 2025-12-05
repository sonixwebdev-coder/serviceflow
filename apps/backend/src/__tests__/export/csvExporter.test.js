/**
 * Unit Tests for CSV Exporter
 * Tests CSV generation with proper formatting and Romanian locale
 */

const {
  exportToCSV,
  exportEntityToCSV,
  getFieldConfig,
  FIELD_CONFIGS,
} = require('../../utils/export/csvExporter');

describe('CSV Exporter - exportToCSV', () => {
  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25 },
  ];

  it('exports simple data to CSV', () => {
    const buffer = exportToCSV(mockData);
    expect(buffer).toBeInstanceOf(Buffer);

    const csvString = buffer.toString('utf8');
    expect(csvString).toContain('John Doe');
    expect(csvString).toContain('jane@example.com');
  });

  it('includes UTF-8 BOM for Excel compatibility', () => {
    const buffer = exportToCSV(mockData);
    // UTF-8 BOM is EF BB BF
    expect(buffer[0]).toBe(0xEF);
    expect(buffer[1]).toBe(0xBB);
    expect(buffer[2]).toBe(0xBF);
  });

  it('includes header row', () => {
    const buffer = exportToCSV(mockData);
    const csvString = buffer.toString('utf8');
    const lines = csvString.split('\n');

    // First line (after BOM) should contain headers
    expect(lines[0]).toContain('id');
    expect(lines[0]).toContain('name');
    expect(lines[0]).toContain('email');
  });

  it('exports with custom field configuration', () => {
    const fields = [
      { label: 'ID', value: 'id' },
      { label: 'Nume', value: 'name' },
    ];

    const buffer = exportToCSV(mockData, { fields });
    const csvString = buffer.toString('utf8');

    expect(csvString).toContain('ID');
    expect(csvString).toContain('Nume');
    expect(csvString).not.toContain('email');
  });

  it('flattens nested objects when flatten=true', () => {
    const nestedData = [
      {
        id: 1,
        user: { name: 'John', contact: { email: 'john@example.com' } },
      },
    ];

    const buffer = exportToCSV(nestedData, { flatten: true });
    const csvString = buffer.toString('utf8');

    expect(csvString).toContain('user.name');
    expect(csvString).toContain('user.contact.email');
  });

  it('does not flatten when flatten=false', () => {
    const nestedData = [
      {
        id: 1,
        user: { name: 'John' },
      },
    ];

    const buffer = exportToCSV(nestedData, { flatten: false });
    const csvString = buffer.toString('utf8');

    // With flatten=false, nested objects are stringified
    expect(csvString).toContain('{');
  });

  it('throws error for empty array', () => {
    expect(() => exportToCSV([])).toThrow('Data must be a non-empty array');
  });

  it('throws error for non-array input', () => {
    expect(() => exportToCSV(null)).toThrow('Data must be a non-empty array');
    expect(() => exportToCSV({})).toThrow('Data must be a non-empty array');
    expect(() => exportToCSV('string')).toThrow('Data must be a non-empty array');
  });

  it('escapes special characters properly', () => {
    const dataWithSpecialChars = [
      { id: 1, description: 'Text with "quotes" and, commas' },
    ];

    const buffer = exportToCSV(dataWithSpecialChars);
    const csvString = buffer.toString('utf8');

    // Quotes should be escaped with double quotes
    expect(csvString).toContain('""quotes""');
  });

  it('handles null and undefined values', () => {
    const dataWithNulls = [
      { id: 1, name: 'John', email: null, phone: undefined },
    ];

    const buffer = exportToCSV(dataWithNulls);
    const csvString = buffer.toString('utf8');

    expect(csvString).toContain('John');
    // Should not throw error
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles large datasets', () => {
    const largeData = Array(10000).fill(null).map((_, i) => ({
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
    }));

    const buffer = exportToCSV(largeData);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(100000); // Should be substantial
  });

  it('handles Romanian characters', () => {
    const romanianData = [
      { name: 'Ștefan Țăran', city: 'București', description: 'Întâlnire importantă' },
    ];

    const buffer = exportToCSV(romanianData);
    const csvString = buffer.toString('utf8');

    expect(csvString).toContain('Ștefan');
    expect(csvString).toContain('București');
    expect(csvString).toContain('Întâlnire');
  });
});

describe('CSV Exporter - getFieldConfig', () => {
  it('returns field config for appointments', () => {
    const config = getFieldConfig('appointments');
    expect(config).toBeDefined();
    expect(Array.isArray(config)).toBe(true);
    expect(config.length).toBeGreaterThan(0);
    expect(config[0]).toHaveProperty('label');
    expect(config[0]).toHaveProperty('value');
  });

  it('returns field config for invoices', () => {
    const config = getFieldConfig('invoices');
    expect(config).toBeDefined();
    expect(config.some(f => f.label === 'Numar factura')).toBe(true);
  });

  it('returns field config for clients', () => {
    const config = getFieldConfig('clients');
    expect(config).toBeDefined();
    expect(config.some(f => f.label === 'Email')).toBe(true);
  });

  it('returns field config for users', () => {
    const config = getFieldConfig('users');
    expect(config).toBeDefined();
    expect(config.some(f => f.label === 'Email')).toBe(true);
  });

  it('returns field config for leaveRequests', () => {
    const config = getFieldConfig('leaveRequests');
    expect(config).toBeDefined();
    expect(config.some(f => f.label === 'Tip concediu')).toBe(true);
  });

  it('returns field config for timeTracking', () => {
    const config = getFieldConfig('timeTracking');
    expect(config).toBeDefined();
    expect(config.some(f => f.label === 'Intrare')).toBe(true);
  });

  it('returns field config for tasks', () => {
    const config = getFieldConfig('tasks');
    expect(config).toBeDefined();
    expect(config.some(f => f.label === 'Titlu')).toBe(true);
  });

  it('returns null for unknown entity type', () => {
    const config = getFieldConfig('unknown');
    expect(config).toBeNull();
  });
});

describe('CSV Exporter - exportEntityToCSV', () => {
  it('exports appointments with predefined config', () => {
    const appointments = [
      {
        id: 1,
        title: 'Revizie anuală',
        description: 'Verificare completă',
        status: 'completed',
        scheduledStart: '2024-01-15T10:00:00Z',
        scheduledEnd: '2024-01-15T12:00:00Z',
        location: 'Service 1',
        client: { name: 'John Doe' },
        vehicle: { plateNumber: 'B-123-ABC' },
        createdBy: { name: 'Admin User' },
        createdAt: '2024-01-10T09:00:00Z',
      },
    ];

    const buffer = exportEntityToCSV('appointments', appointments);
    const csvString = buffer.toString('utf8');

    expect(csvString).toContain('Titlu');
    expect(csvString).toContain('Status');
    expect(csvString).toContain('Revizie anuală');
  });

  it('exports invoices with predefined config', () => {
    const invoices = [
      {
        id: 1,
        invoiceNumber: 'INV-001',
        client: { name: 'Client ABC' },
        status: 'paid',
        issueDate: '2024-01-15',
        dueDate: '2024-02-15',
        subtotal: 100,
        tax: 19,
        total: 119,
      },
    ];

    const buffer = exportEntityToCSV('invoices', invoices);
    const csvString = buffer.toString('utf8');

    expect(csvString).toContain('Numar factura');
    expect(csvString).toContain('INV-001');
  });

  it('exports clients with predefined config', () => {
    const clients = [
      {
        id: 1,
        type: 'PF',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+40712345678',
        email: 'john@example.com',
        createdAt: '2024-01-10',
      },
    ];

    const buffer = exportEntityToCSV('clients', clients);
    const csvString = buffer.toString('utf8');

    expect(csvString).toContain('Prenume');
    expect(csvString).toContain('John');
  });

  it('uses custom fields when provided', () => {
    const data = [{ id: 1, name: 'Test' }];
    const customFields = [{ label: 'Custom ID', value: 'id' }];

    const buffer = exportEntityToCSV('appointments', data, customFields);
    const csvString = buffer.toString('utf8');

    expect(csvString).toContain('Custom ID');
  });

  it('uses auto-detection for unknown entity types', () => {
    const data = [{ id: 1, name: 'Test', value: 'Something' }];

    const buffer = exportEntityToCSV('unknown_type', data);
    const csvString = buffer.toString('utf8');

    expect(csvString).toContain('id');
    expect(csvString).toContain('name');
    expect(csvString).toContain('value');
  });

  it('handles nested client data in appointments', () => {
    const appointments = [
      {
        id: 1,
        title: 'Test',
        'client.name': 'John Doe',
        'client.phone': '+40712345678',
        'vehicle.plateNumber': 'B-123-ABC',
      },
    ];

    const buffer = exportEntityToCSV('appointments', appointments);
    const csvString = buffer.toString('utf8');

    expect(csvString).toContain('John Doe');
    expect(csvString).toContain('B-123-ABC');
  });
});

describe('CSV Exporter - FIELD_CONFIGS', () => {
  it('contains configurations for all entity types', () => {
    expect(FIELD_CONFIGS).toHaveProperty('appointments');
    expect(FIELD_CONFIGS).toHaveProperty('invoices');
    expect(FIELD_CONFIGS).toHaveProperty('clients');
    expect(FIELD_CONFIGS).toHaveProperty('users');
    expect(FIELD_CONFIGS).toHaveProperty('leaveRequests');
    expect(FIELD_CONFIGS).toHaveProperty('timeTracking');
    expect(FIELD_CONFIGS).toHaveProperty('tasks');
  });

  it('all configs have label and value properties', () => {
    Object.values(FIELD_CONFIGS).forEach(config => {
      expect(Array.isArray(config)).toBe(true);
      config.forEach(field => {
        expect(field).toHaveProperty('label');
        expect(field).toHaveProperty('value');
        expect(typeof field.label).toBe('string');
        expect(typeof field.value).toBe('string');
      });
    });
  });

  it('appointments config has expected fields', () => {
    const config = FIELD_CONFIGS.appointments;
    const labels = config.map(f => f.label);

    expect(labels).toContain('ID');
    expect(labels).toContain('Titlu');
    expect(labels).toContain('Status');
    expect(labels).toContain('Client');
    expect(labels).toContain('Vehicul');
  });

  it('invoices config has expected fields', () => {
    const config = FIELD_CONFIGS.invoices;
    const labels = config.map(f => f.label);

    expect(labels).toContain('Numar factura');
    expect(labels).toContain('Client');
    expect(labels).toContain('Status');
    expect(labels).toContain('Total');
  });

  it('users config does not include password field', () => {
    const config = FIELD_CONFIGS.users;
    const values = config.map(f => f.value);

    expect(values).not.toContain('password');
  });
});

describe('CSV Exporter - Edge Cases', () => {
  it('handles empty strings in data', () => {
    const data = [{ id: 1, name: '', email: '' }];
    const buffer = exportToCSV(data);
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles data with only one record', () => {
    const data = [{ id: 1, name: 'Single Record' }];
    const buffer = exportToCSV(data);
    const csvString = buffer.toString('utf8');

    expect(csvString).toContain('Single Record');
  });

  it('handles very long text fields', () => {
    const longText = 'A'.repeat(10000);
    const data = [{ id: 1, description: longText }];

    const buffer = exportToCSV(data);
    const csvString = buffer.toString('utf8');

    expect(csvString).toContain(longText);
  });

  it('handles special CSV characters in field values', () => {
    const data = [
      {
        id: 1,
        text: 'Line1\nLine2',
        quoted: 'Has "quotes"',
        commas: 'a,b,c',
      },
    ];

    const buffer = exportToCSV(data);
    const csvString = buffer.toString('utf8');

    // Should properly escape these
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles Date objects in data', () => {
    const data = [
      {
        id: 1,
        name: 'Test',
        createdAt: new Date('2024-01-15T10:30:00Z'),
      },
    ];

    const buffer = exportToCSV(data);
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles boolean values', () => {
    const data = [
      { id: 1, isActive: true, isDeleted: false },
    ];

    const buffer = exportToCSV(data);
    const csvString = buffer.toString('utf8');

    expect(csvString).toContain('true');
    expect(csvString).toContain('false');
  });

  it('handles numeric zero values', () => {
    const data = [
      { id: 0, count: 0, price: 0.0 },
    ];

    const buffer = exportToCSV(data);
    const csvString = buffer.toString('utf8');

    expect(csvString).toContain('0');
  });
});
