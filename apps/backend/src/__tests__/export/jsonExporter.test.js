/**
 * Unit Tests for JSON Exporter
 * Tests JSON generation with metadata and proper structure
 */

const {
  exportToJSON,
  exportEntityToJSON,
  exportMultipleEntitiesToJSON,
} = require('../../utils/export/jsonExporter');

describe('JSON Exporter - exportToJSON', () => {
  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  ];

  it('exports data to JSON format', () => {
    const buffer = exportToJSON(mockData);
    expect(buffer).toBeInstanceOf(Buffer);

    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.data).toEqual(mockData);
  });

  it('includes metadata by default', () => {
    const buffer = exportToJSON(mockData);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed).toHaveProperty('metadata');
    expect(parsed.metadata).toHaveProperty('exportDate');
    expect(parsed.metadata).toHaveProperty('entityType');
    expect(parsed.metadata).toHaveProperty('totalRecords', 2);
    expect(parsed.metadata).toHaveProperty('generatedBy', 'ViperX CRM');
  });

  it('excludes metadata when includeMetadata=false', () => {
    const buffer = exportToJSON(mockData, { includeMetadata: false });
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toEqual(mockData);
  });

  it('pretty prints JSON by default', () => {
    const buffer = exportToJSON(mockData);
    const jsonString = buffer.toString('utf8');

    // Pretty printed JSON should have indentation
    expect(jsonString).toContain('\n');
    expect(jsonString).toContain('  ');
  });

  it('minifies JSON when prettyPrint=false', () => {
    const buffer = exportToJSON(mockData, { prettyPrint: false });
    const jsonString = buffer.toString('utf8');

    // Minified JSON should not have unnecessary whitespace
    expect(jsonString).not.toMatch(/\n\s+/);
  });

  it('includes custom entity type in metadata', () => {
    const buffer = exportToJSON(mockData, { entityType: 'users' });
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.metadata.entityType).toBe('users');
  });

  it('handles empty arrays', () => {
    const buffer = exportToJSON([]);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.data).toEqual([]);
    expect(parsed.metadata.totalRecords).toBe(0);
  });

  it('throws error for non-array input', () => {
    expect(() => exportToJSON(null)).toThrow('Data must be an array');
    expect(() => exportToJSON({})).toThrow('Data must be an array');
    expect(() => exportToJSON('string')).toThrow('Data must be an array');
  });

  it('handles circular references', () => {
    const obj1 = { id: 1, name: 'Object 1' };
    const obj2 = { id: 2, name: 'Object 2', ref: obj1 };
    obj1.ref = obj2; // Create circular reference

    const dataWithCircular = [obj1, obj2];

    const buffer = exportToJSON(dataWithCircular);
    const jsonString = buffer.toString('utf8');

    expect(jsonString).toContain('[Circular Reference]');
    expect(() => JSON.parse(jsonString)).not.toThrow();
  });

  it('preserves nested objects', () => {
    const nestedData = [
      {
        id: 1,
        user: {
          name: 'John',
          contact: {
            email: 'john@example.com',
            phone: '+40712345678',
          },
        },
      },
    ];

    const buffer = exportToJSON(nestedData);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.data[0].user.contact.email).toBe('john@example.com');
  });

  it('handles Date objects', () => {
    const dataWithDates = [
      {
        id: 1,
        createdAt: new Date('2024-01-15T10:30:00Z'),
      },
    ];

    const buffer = exportToJSON(dataWithDates);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.data[0].createdAt).toBe('2024-01-15T10:30:00.000Z');
  });

  it('handles null and undefined values', () => {
    const dataWithNulls = [
      { id: 1, name: 'John', email: null, phone: undefined },
    ];

    const buffer = exportToJSON(dataWithNulls);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.data[0].email).toBeNull();
    expect(parsed.data[0]).not.toHaveProperty('phone'); // undefined is removed by JSON.stringify
  });

  it('handles arrays in data', () => {
    const dataWithArrays = [
      { id: 1, tags: ['tag1', 'tag2', 'tag3'] },
    ];

    const buffer = exportToJSON(dataWithArrays);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.data[0].tags).toEqual(['tag1', 'tag2', 'tag3']);
  });

  it('handles boolean values', () => {
    const dataWithBooleans = [
      { id: 1, isActive: true, isDeleted: false },
    ];

    const buffer = exportToJSON(dataWithBooleans);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.data[0].isActive).toBe(true);
    expect(parsed.data[0].isDeleted).toBe(false);
  });

  it('handles numeric zero', () => {
    const dataWithZeros = [
      { id: 0, count: 0, price: 0.0 },
    ];

    const buffer = exportToJSON(dataWithZeros);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.data[0].id).toBe(0);
    expect(parsed.data[0].count).toBe(0);
  });

  it('handles large datasets', () => {
    const largeData = Array(10000).fill(null).map((_, i) => ({
      id: i,
      name: `User ${i}`,
    }));

    const buffer = exportToJSON(largeData);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(100000);
  });

  it('handles Romanian characters', () => {
    const romanianData = [
      { name: 'Ștefan Țăran', city: 'București' },
    ];

    const buffer = exportToJSON(romanianData);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.data[0].name).toBe('Ștefan Țăran');
    expect(parsed.data[0].city).toBe('București');
  });

  it('handles special characters', () => {
    const dataWithSpecial = [
      { text: 'Line1\nLine2\tTab', quotes: 'Has "quotes"' },
    ];

    const buffer = exportToJSON(dataWithSpecial);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.data[0].text).toBe('Line1\nLine2\tTab');
    expect(parsed.data[0].quotes).toBe('Has "quotes"');
  });
});

describe('JSON Exporter - exportEntityToJSON', () => {
  it('exports entity with metadata', () => {
    const appointments = [
      { id: 1, title: 'Revizie', status: 'completed' },
    ];

    const buffer = exportEntityToJSON('appointments', appointments);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.metadata.entityType).toBe('appointments');
    expect(parsed.data).toEqual(appointments);
  });

  it('exports entity without metadata when specified', () => {
    const invoices = [
      { id: 1, invoiceNumber: 'INV-001' },
    ];

    const buffer = exportEntityToJSON('invoices', invoices, false);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toEqual(invoices);
  });

  it('handles different entity types', () => {
    const entities = ['appointments', 'invoices', 'clients', 'users'];

    entities.forEach(entityType => {
      const data = [{ id: 1, name: 'Test' }];
      const buffer = exportEntityToJSON(entityType, data);
      const jsonString = buffer.toString('utf8');
      const parsed = JSON.parse(jsonString);

      expect(parsed.metadata.entityType).toBe(entityType);
    });
  });

  it('handles empty entity data', () => {
    const buffer = exportEntityToJSON('appointments', []);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.metadata.totalRecords).toBe(0);
    expect(parsed.data).toEqual([]);
  });
});

describe('JSON Exporter - exportMultipleEntitiesToJSON', () => {
  it('exports multiple entities with metadata', () => {
    const entities = [
      { name: 'appointments', data: [{ id: 1, title: 'Test' }] },
      { name: 'invoices', data: [{ id: 1, invoiceNumber: 'INV-001' }] },
    ];

    const buffer = exportMultipleEntitiesToJSON(entities);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed).toHaveProperty('metadata');
    expect(parsed).toHaveProperty('data');
    expect(parsed.data).toHaveProperty('appointments');
    expect(parsed.data).toHaveProperty('invoices');
  });

  it('includes entity summaries in metadata', () => {
    const entities = [
      { name: 'appointments', data: [{ id: 1 }, { id: 2 }] },
      { name: 'invoices', data: [{ id: 1 }] },
    ];

    const buffer = exportMultipleEntitiesToJSON(entities);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.metadata.entities).toHaveLength(2);
    expect(parsed.metadata.entities[0]).toEqual({ name: 'appointments', count: 2 });
    expect(parsed.metadata.entities[1]).toEqual({ name: 'invoices', count: 1 });
  });

  it('handles entities with empty data', () => {
    const entities = [
      { name: 'appointments', data: [] },
      { name: 'invoices', data: [{ id: 1 }] },
    ];

    const buffer = exportMultipleEntitiesToJSON(entities);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.data.appointments).toEqual([]);
    expect(parsed.data.invoices).toHaveLength(1);
  });

  it('handles entities with null data', () => {
    const entities = [
      { name: 'appointments', data: null },
      { name: 'invoices', data: [{ id: 1 }] },
    ];

    const buffer = exportMultipleEntitiesToJSON(entities);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.data.appointments).toEqual([]);
    expect(parsed.metadata.entities[0].count).toBe(0);
  });

  it('throws error for empty entities array', () => {
    expect(() => exportMultipleEntitiesToJSON([])).toThrow('Entities must be a non-empty array');
  });

  it('throws error for non-array entities', () => {
    expect(() => exportMultipleEntitiesToJSON(null)).toThrow('Entities must be a non-empty array');
    expect(() => exportMultipleEntitiesToJSON({})).toThrow('Entities must be a non-empty array');
  });

  it('pretty prints output', () => {
    const entities = [
      { name: 'test', data: [{ id: 1 }] },
    ];

    const buffer = exportMultipleEntitiesToJSON(entities);
    const jsonString = buffer.toString('utf8');

    expect(jsonString).toContain('\n');
    expect(jsonString).toContain('  ');
  });

  it('includes export date and generator', () => {
    const entities = [
      { name: 'test', data: [{ id: 1 }] },
    ];

    const buffer = exportMultipleEntitiesToJSON(entities);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.metadata.exportDate).toBeDefined();
    expect(parsed.metadata.generatedBy).toBe('ViperX CRM');
  });

  it('handles many entities', () => {
    const entities = [
      { name: 'appointments', data: [{ id: 1 }] },
      { name: 'invoices', data: [{ id: 1 }] },
      { name: 'clients', data: [{ id: 1 }] },
      { name: 'users', data: [{ id: 1 }] },
      { name: 'leaveRequests', data: [{ id: 1 }] },
    ];

    const buffer = exportMultipleEntitiesToJSON(entities);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.metadata.entities).toHaveLength(5);
    expect(Object.keys(parsed.data)).toHaveLength(5);
  });
});

describe('JSON Exporter - Edge Cases', () => {
  it('handles very long strings', () => {
    const longString = 'A'.repeat(100000);
    const data = [{ id: 1, text: longString }];

    const buffer = exportToJSON(data);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.data[0].text).toBe(longString);
  });

  it('handles deeply nested objects', () => {
    const deepNested = {
      id: 1,
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                value: 'deep',
              },
            },
          },
        },
      },
    };

    const buffer = exportToJSON([deepNested]);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.data[0].level1.level2.level3.level4.level5.value).toBe('deep');
  });

  it('handles mixed data types', () => {
    const mixedData = [
      {
        string: 'text',
        number: 123,
        float: 45.67,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { key: 'value' },
      },
    ];

    const buffer = exportToJSON(mixedData);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(typeof parsed.data[0].string).toBe('string');
    expect(typeof parsed.data[0].number).toBe('number');
    expect(typeof parsed.data[0].boolean).toBe('boolean');
    expect(parsed.data[0].null).toBeNull();
    expect(Array.isArray(parsed.data[0].array)).toBe(true);
    expect(typeof parsed.data[0].object).toBe('object');
  });

  it('handles single record', () => {
    const data = [{ id: 1, name: 'Single' }];

    const buffer = exportToJSON(data);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.data).toHaveLength(1);
    expect(parsed.metadata.totalRecords).toBe(1);
  });

  it('generates valid UTF-8', () => {
    const unicodeData = [
      { emoji: '😀🎉', chinese: '你好', arabic: 'مرحبا' },
    ];

    const buffer = exportToJSON(unicodeData);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.data[0].emoji).toBe('😀🎉');
    expect(parsed.data[0].chinese).toBe('你好');
    expect(parsed.data[0].arabic).toBe('مرحبا');
  });
});
