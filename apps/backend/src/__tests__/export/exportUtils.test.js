/**
 * Unit Tests for Export Utilities
 * Tests common utility functions used across all export formats
 */

const {
  sanitizeForExport,
  formatDate,
  formatDateTime,
  formatCurrency,
  formatNumber,
  flattenObject,
  applyFilters,
  generateFilename,
  getEntityNameRO,
  validateFormat,
  getContentType,
  getStatusLabelRO,
  chunkArray,
  VALID_FORMATS,
} = require('../../utils/export/exportUtils');

describe('Export Utils - sanitizeForExport', () => {
  it('returns empty string for null values', () => {
    expect(sanitizeForExport(null)).toBe('');
  });

  it('returns empty string for undefined values', () => {
    expect(sanitizeForExport(undefined)).toBe('');
  });

  it('converts numbers to strings', () => {
    expect(sanitizeForExport(123)).toBe('123');
    expect(sanitizeForExport(0)).toBe('0');
    expect(sanitizeForExport(-45.67)).toBe('-45.67');
  });

  it('returns strings as-is', () => {
    expect(sanitizeForExport('test')).toBe('test');
    expect(sanitizeForExport('')).toBe('');
  });

  it('converts booleans to strings', () => {
    expect(sanitizeForExport(true)).toBe('true');
    expect(sanitizeForExport(false)).toBe('false');
  });

  it('stringifies objects', () => {
    const obj = { key: 'value', nested: { foo: 'bar' } };
    expect(sanitizeForExport(obj)).toBe(JSON.stringify(obj));
  });

  it('preserves Date objects as strings', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    expect(sanitizeForExport(date)).toBe(date.toString());
  });

  it('handles arrays as strings', () => {
    expect(sanitizeForExport([1, 2, 3])).toBe('[1,2,3]');
  });
});

describe('Export Utils - formatDate', () => {
  it('formats valid dates in Romanian locale', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const formatted = formatDate(date);
    // Romanian format: DD.MM.YYYY
    expect(formatted).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });

  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('returns empty string for invalid dates', () => {
    expect(formatDate('invalid-date')).toBe('');
    expect(formatDate('not a date')).toBe('');
  });

  it('handles date strings', () => {
    const result = formatDate('2024-12-25');
    expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });

  it('handles ISO date strings', () => {
    const result = formatDate('2024-03-15T14:30:00.000Z');
    expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });
});

describe('Export Utils - formatDateTime', () => {
  it('formats valid dates with time in Romanian locale', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const formatted = formatDateTime(date);
    // Romanian format: DD.MM.YYYY HH:MM
    expect(formatted).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
  });

  it('returns empty string for null', () => {
    expect(formatDateTime(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDateTime(undefined)).toBe('');
  });

  it('returns empty string for invalid dates', () => {
    expect(formatDateTime('invalid-date')).toBe('');
  });

  it('handles date strings with time', () => {
    const result = formatDateTime('2024-03-15T14:30:00.000Z');
    expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
  });
});

describe('Export Utils - formatCurrency', () => {
  it('formats positive numbers with 2 decimals', () => {
    expect(formatCurrency(100)).toBe('100.00');
    expect(formatCurrency(123.456)).toBe('123.46');
    expect(formatCurrency(0.99)).toBe('0.99');
  });

  it('formats negative numbers', () => {
    expect(formatCurrency(-50.5)).toBe('-50.50');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('0.00');
  });

  it('returns 0.00 for null', () => {
    expect(formatCurrency(null)).toBe('0.00');
  });

  it('returns 0.00 for undefined', () => {
    expect(formatCurrency(undefined)).toBe('0.00');
  });

  it('returns 0.00 for empty string', () => {
    expect(formatCurrency('')).toBe('0.00');
  });

  it('returns 0.00 for invalid numbers', () => {
    expect(formatCurrency('not a number')).toBe('0.00');
    expect(formatCurrency(NaN)).toBe('0.00');
    expect(formatCurrency(Infinity)).toBe('0.00');
  });

  it('handles string numbers', () => {
    expect(formatCurrency('123.45')).toBe('123.45');
  });

  it('handles very large numbers', () => {
    expect(formatCurrency(999999.99)).toBe('999999.99');
  });

  it('handles very small numbers', () => {
    expect(formatCurrency(0.001)).toBe('0.00');
  });
});

describe('Export Utils - formatNumber', () => {
  it('formats numbers with default 2 decimals', () => {
    expect(formatNumber(123.456)).toMatch(/123[.,]46/);
  });

  it('formats numbers with custom decimal places', () => {
    expect(formatNumber(123.456, 0)).toMatch(/123/);
    expect(formatNumber(123.456, 3)).toMatch(/123[.,]456/);
  });

  it('returns empty string for null', () => {
    expect(formatNumber(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatNumber(undefined)).toBe('');
  });

  it('returns empty string for invalid numbers', () => {
    expect(formatNumber(NaN)).toBe('');
    expect(formatNumber(Infinity)).toBe('');
  });
});

describe('Export Utils - flattenObject', () => {
  it('flattens nested objects with dot notation', () => {
    const nested = {
      id: 1,
      user: {
        name: 'John',
        contact: {
          email: 'john@example.com',
        },
      },
    };

    const flattened = flattenObject(nested);
    expect(flattened).toEqual({
      id: 1,
      'user.name': 'John',
      'user.contact.email': 'john@example.com',
    });
  });

  it('handles null values', () => {
    const obj = { name: 'John', email: null };
    const flattened = flattenObject(obj);
    expect(flattened).toEqual({ name: 'John', email: '' });
  });

  it('handles undefined values', () => {
    const obj = { name: 'John', email: undefined };
    const flattened = flattenObject(obj);
    expect(flattened).toEqual({ name: 'John', email: '' });
  });

  it('formats Date objects', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const obj = { createdAt: date };
    const flattened = flattenObject(obj);
    expect(flattened.createdAt).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
  });

  it('joins arrays with semicolon', () => {
    const obj = { tags: ['tag1', 'tag2', 'tag3'] };
    const flattened = flattenObject(obj);
    expect(flattened.tags).toBe('tag1; tag2; tag3');
  });

  it('stringifies objects in arrays', () => {
    const obj = { items: [{ id: 1 }, { id: 2 }] };
    const flattened = flattenObject(obj);
    expect(flattened.items).toContain('"id":1');
    expect(flattened.items).toContain('"id":2');
  });

  it('handles empty objects', () => {
    const flattened = flattenObject({});
    expect(flattened).toEqual({});
  });

  it('handles deeply nested objects', () => {
    const deep = {
      level1: {
        level2: {
          level3: {
            value: 'deep',
          },
        },
      },
    };
    const flattened = flattenObject(deep);
    expect(flattened['level1.level2.level3.value']).toBe('deep');
  });
});

describe('Export Utils - applyFilters', () => {
  const mockData = [
    { id: 1, status: 'PENDING', createdAt: new Date('2024-01-15'), name: 'Item One' },
    { id: 2, status: 'COMPLETED', createdAt: new Date('2024-02-20'), name: 'Item Two' },
    { id: 3, status: 'PENDING', createdAt: new Date('2024-03-10'), name: 'Item Three' },
  ];

  it('returns all data when no filters applied', () => {
    const result = applyFilters(mockData, {});
    expect(result).toHaveLength(3);
  });

  it('filters by status', () => {
    const result = applyFilters(mockData, { status: 'pending' });
    expect(result).toHaveLength(2);
    expect(result.every((item) => item.status === 'PENDING')).toBe(true);
  });

  it('filters by start date', () => {
    const result = applyFilters(mockData, {
      startDate: '2024-02-01',
      dateField: 'createdAt',
    });
    expect(result).toHaveLength(2);
  });

  it('filters by end date', () => {
    const result = applyFilters(mockData, {
      endDate: '2024-02-01',
      dateField: 'createdAt',
    });
    expect(result).toHaveLength(1);
  });

  it('filters by date range', () => {
    const result = applyFilters(mockData, {
      startDate: '2024-02-01',
      endDate: '2024-03-01',
      dateField: 'createdAt',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('filters by search term', () => {
    const result = applyFilters(mockData, { search: 'three' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Item Three');
  });

  it('combines multiple filters', () => {
    const result = applyFilters(mockData, {
      status: 'pending',
      search: 'one',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('returns empty array when no matches', () => {
    const result = applyFilters(mockData, { search: 'nonexistent' });
    expect(result).toHaveLength(0);
  });
});

describe('Export Utils - generateFilename', () => {
  it('generates filename with entity name and date', () => {
    const filename = generateFilename('Programari', 'csv');
    expect(filename).toMatch(/^programari_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.csv$/);
  });

  it('handles entity names with spaces', () => {
    const filename = generateFilename('User Reports', 'excel');
    expect(filename).toMatch(/^user-reports_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.xlsx$/);
  });

  it('uses custom timestamp', () => {
    const timestamp = new Date('2024-01-15T10:30:45Z');
    const filename = generateFilename('Test', 'pdf', timestamp);
    expect(filename).toMatch(/^test_2024-01-15_\d{2}-\d{2}-\d{2}\.pdf$/);
  });

  it('handles different formats', () => {
    expect(generateFilename('Test', 'csv')).toContain('.csv');
    expect(generateFilename('Test', 'json')).toContain('.json');
    expect(generateFilename('Test', 'pdf')).toContain('.pdf');
  });
});

describe('Export Utils - getEntityNameRO', () => {
  it('translates entity keys to Romanian', () => {
    expect(getEntityNameRO('appointments')).toBe('Programari');
    expect(getEntityNameRO('invoices')).toBe('Facturi');
    expect(getEntityNameRO('clients')).toBe('Clienti');
    expect(getEntityNameRO('users')).toBe('Angajati');
    expect(getEntityNameRO('leave-requests')).toBe('Cereri_Concediu');
    expect(getEntityNameRO('time-tracking')).toBe('Pontaj');
    expect(getEntityNameRO('tasks')).toBe('Sarcini');
  });

  it('returns original key for unknown entities', () => {
    expect(getEntityNameRO('unknown')).toBe('unknown');
  });
});

describe('Export Utils - validateFormat', () => {
  it('accepts valid formats', () => {
    expect(validateFormat('csv')).toBe('csv');
    expect(validateFormat('excel')).toBe('excel');
    expect(validateFormat('json')).toBe('json');
    expect(validateFormat('xml')).toBe('xml');
  });

  it('normalizes format to lowercase', () => {
    expect(validateFormat('CSV')).toBe('csv');
    expect(validateFormat('Excel')).toBe('excel');
    expect(validateFormat('JSON')).toBe('json');
  });

  it('throws error for invalid formats', () => {
    expect(() => validateFormat('docx')).toThrow('Invalid export format');
    expect(() => validateFormat('doc')).toThrow('Invalid export format');
    expect(() => validateFormat('')).toThrow('Invalid export format');
  });

  it('throws error for null or undefined', () => {
    expect(() => validateFormat(null)).toThrow('Invalid export format');
    expect(() => validateFormat(undefined)).toThrow('Invalid export format');
  });
});

describe('Export Utils - getContentType', () => {
  it('returns correct content type for CSV', () => {
    expect(getContentType('csv')).toBe('text/csv; charset=utf-8');
  });

  it('returns correct content type for Excel', () => {
    expect(getContentType('excel')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  });

  it('returns correct content type for JSON', () => {
    expect(getContentType('json')).toBe('application/json; charset=utf-8');
  });

  it('returns correct content type for PDF', () => {
    expect(getContentType('pdf')).toBe('application/pdf');
  });

  it('returns correct content type for ZIP', () => {
    expect(getContentType('zip')).toBe('application/zip');
  });

  it('returns default for unknown format', () => {
    expect(getContentType('unknown')).toBe('application/octet-stream');
  });
});

describe('Export Utils - getStatusLabelRO', () => {
  it('translates status to Romanian', () => {
    expect(getStatusLabelRO('pending')).toBe('In asteptare');
    expect(getStatusLabelRO('approved')).toBe('Aprobat');
    expect(getStatusLabelRO('rejected')).toBe('Respins');
    expect(getStatusLabelRO('completed')).toBe('Finalizat');
    expect(getStatusLabelRO('cancelled')).toBe('Anulat');
    expect(getStatusLabelRO('paid')).toBe('Platit');
  });

  it('handles uppercase status', () => {
    expect(getStatusLabelRO('PENDING')).toBe('In asteptare');
    expect(getStatusLabelRO('APPROVED')).toBe('Aprobat');
  });

  it('handles status with hyphens', () => {
    expect(getStatusLabelRO('in-progress')).toBe('In lucru');
  });

  it('handles status with underscores', () => {
    expect(getStatusLabelRO('in_progress')).toBe('In lucru');
  });

  it('returns original status for unknown values', () => {
    expect(getStatusLabelRO('unknown_status')).toBe('unknown_status');
  });

  it('returns empty string for null or undefined', () => {
    expect(getStatusLabelRO(null)).toBe('');
    expect(getStatusLabelRO(undefined)).toBe('');
  });
});

describe('Export Utils - chunkArray', () => {
  it('chunks array into specified size', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const chunks = chunkArray(data, 3);
    expect(chunks).toHaveLength(4);
    expect(chunks[0]).toEqual([1, 2, 3]);
    expect(chunks[1]).toEqual([4, 5, 6]);
    expect(chunks[2]).toEqual([7, 8, 9]);
    expect(chunks[3]).toEqual([10]);
  });

  it('uses default chunk size of 1000', () => {
    const data = Array(2500).fill(1);
    const chunks = chunkArray(data);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(1000);
    expect(chunks[1]).toHaveLength(1000);
    expect(chunks[2]).toHaveLength(500);
  });

  it('handles arrays smaller than chunk size', () => {
    const data = [1, 2, 3];
    const chunks = chunkArray(data, 10);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual([1, 2, 3]);
  });

  it('handles empty arrays', () => {
    const chunks = chunkArray([]);
    expect(chunks).toHaveLength(0);
  });
});

describe('Export Utils - VALID_FORMATS constant', () => {
  it('contains all expected formats', () => {
    expect(VALID_FORMATS).toContain('csv');
    expect(VALID_FORMATS).toContain('excel');
    expect(VALID_FORMATS).toContain('json');
    expect(VALID_FORMATS).toContain('xml');
  });

  it('has exactly 4 formats', () => {
    expect(VALID_FORMATS).toHaveLength(4);
  });
});
