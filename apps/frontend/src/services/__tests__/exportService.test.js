/**
 * Integration Tests for Frontend Export Service
 * Tests API client and file download functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportAppointments,
  exportInvoices,
  exportClients,
  exportUsers,
  exportLeaveRequests,
  exportTimeTracking,
  exportAllData,
  downloadFile,
} from '../exportService';
import API from '../../utils/api';

// Mock the API module
vi.mock('../../utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Export Service - API Calls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportAppointments', () => {
    it('calls correct endpoint with format parameter', async () => {
      const mockBlob = new Blob(['data'], { type: 'text/csv' });
      API.get.mockResolvedValue({ data: mockBlob });

      await exportAppointments('csv');

      expect(API.get).toHaveBeenCalledWith(
        expect.stringContaining('/exports/appointments?format=csv'),
        expect.objectContaining({ responseType: 'blob' })
      );
    });

    it('includes filter parameters in query string', async () => {
      const mockBlob = new Blob(['data'], { type: 'text/csv' });
      API.get.mockResolvedValue({ data: mockBlob });

      const filters = {
        status: 'completed',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      await exportAppointments('excel', filters);

      expect(API.get).toHaveBeenCalledWith(
        expect.stringContaining('format=excel'),
        expect.any(Object)
      );
      expect(API.get).toHaveBeenCalledWith(
        expect.stringContaining('status=completed'),
        expect.any(Object)
      );
      expect(API.get).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2024-01-01'),
        expect.any(Object)
      );
    });

    it('omits null and undefined filter values', async () => {
      const mockBlob = new Blob(['data'], { type: 'text/csv' });
      API.get.mockResolvedValue({ data: mockBlob });

      const filters = {
        status: 'completed',
        clientId: null,
        search: undefined,
        startDate: '',
      };

      await exportAppointments('csv', filters);

      const callUrl = API.get.mock.calls[0][0];
      expect(callUrl).toContain('status=completed');
      expect(callUrl).not.toContain('clientId');
      expect(callUrl).not.toContain('search');
      expect(callUrl).not.toContain('startDate');
    });

    it('returns blob data', async () => {
      const mockBlob = new Blob(['data'], { type: 'text/csv' });
      API.get.mockResolvedValue({ data: mockBlob });

      const result = await exportAppointments('csv');

      expect(result).toBe(mockBlob);
    });

    it('handles API errors', async () => {
      API.get.mockRejectedValue(new Error('Network error'));

      await expect(exportAppointments('csv')).rejects.toThrow('Network error');
    });
  });

  describe('exportInvoices', () => {
    it('calls correct endpoint', async () => {
      const mockBlob = new Blob(['data'], { type: 'application/json' });
      API.get.mockResolvedValue({ data: mockBlob });

      await exportInvoices('json', { status: 'paid' });

      expect(API.get).toHaveBeenCalledWith(
        expect.stringContaining('/exports/invoices'),
        expect.objectContaining({ responseType: 'blob' })
      );
    });

    it('passes filters correctly', async () => {
      const mockBlob = new Blob(['data']);
      API.get.mockResolvedValue({ data: mockBlob });

      await exportInvoices('csv', {
        status: 'paid',
        clientId: 5,
        startDate: '2024-01-01',
      });

      const callUrl = API.get.mock.calls[0][0];
      expect(callUrl).toContain('status=paid');
      expect(callUrl).toContain('clientId=5');
      expect(callUrl).toContain('startDate=2024-01-01');
    });
  });

  describe('exportClients', () => {
    it('calls correct endpoint', async () => {
      const mockBlob = new Blob(['data']);
      API.get.mockResolvedValue({ data: mockBlob });

      await exportClients('excel', { type: 'PF' });

      expect(API.get).toHaveBeenCalledWith(
        expect.stringContaining('/exports/clients'),
        expect.objectContaining({ responseType: 'blob' })
      );
    });
  });

  describe('exportUsers', () => {
    it('calls correct endpoint', async () => {
      const mockBlob = new Blob(['data']);
      API.get.mockResolvedValue({ data: mockBlob });

      await exportUsers('pdf', { isActive: true });

      expect(API.get).toHaveBeenCalledWith(
        expect.stringContaining('/exports/users'),
        expect.objectContaining({ responseType: 'blob' })
      );
    });
  });

  describe('exportLeaveRequests', () => {
    it('calls correct endpoint', async () => {
      const mockBlob = new Blob(['data']);
      API.get.mockResolvedValue({ data: mockBlob });

      await exportLeaveRequests('csv', { status: 'approved' });

      expect(API.get).toHaveBeenCalledWith(
        expect.stringContaining('/exports/leave-requests'),
        expect.objectContaining({ responseType: 'blob' })
      );
    });
  });

  describe('exportTimeTracking', () => {
    it('calls correct endpoint', async () => {
      const mockBlob = new Blob(['data']);
      API.get.mockResolvedValue({ data: mockBlob });

      await exportTimeTracking('excel', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(API.get).toHaveBeenCalledWith(
        expect.stringContaining('/exports/time-tracking'),
        expect.objectContaining({ responseType: 'blob' })
      );
    });
  });

  describe('exportAllData', () => {
    it('calls correct endpoint with extended timeout', async () => {
      const mockBlob = new Blob(['zip data'], { type: 'application/zip' });
      API.post.mockResolvedValue({ data: mockBlob });

      await exportAllData();

      expect(API.post).toHaveBeenCalledWith(
        '/exports/all-data',
        {},
        expect.objectContaining({
          responseType: 'blob',
          timeout: 120000,
        })
      );
    });

    it('returns ZIP blob', async () => {
      const mockBlob = new Blob(['zip data'], { type: 'application/zip' });
      API.post.mockResolvedValue({ data: mockBlob });

      const result = await exportAllData();

      expect(result).toBe(mockBlob);
      expect(result.type).toBe('application/zip');
    });
  });
});

describe('Export Service - downloadFile', () => {
  beforeEach(() => {
    // Mock DOM methods
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
  });

  it('creates blob URL', () => {
    const blob = new Blob(['data'], { type: 'text/csv' });
    downloadFile(blob, 'test.csv');

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
  });

  it('creates download link with correct attributes', () => {
    const blob = new Blob(['data'], { type: 'text/csv' });
    const filename = 'test-export.csv';

    downloadFile(blob, filename);

    // Check that a link was created and appended
    expect(document.body.appendChild).toHaveBeenCalled();
  });

  it('triggers download click', () => {
    const blob = new Blob(['data'], { type: 'text/csv' });
    const mockClick = vi.fn();

    // Mock createElement to return a link with click method
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tag) => {
      const element = originalCreateElement.call(document, tag);
      if (tag === 'a') {
        element.click = mockClick;
      }
      return element;
    });

    downloadFile(blob, 'test.csv');

    expect(mockClick).toHaveBeenCalled();

    // Restore
    document.createElement = originalCreateElement;
  });

  it('removes link after download', () => {
    const blob = new Blob(['data'], { type: 'text/csv' });
    downloadFile(blob, 'test.csv');

    expect(document.body.removeChild).toHaveBeenCalled();
  });

  it('revokes blob URL after download', () => {
    const blob = new Blob(['data'], { type: 'text/csv' });
    downloadFile(blob, 'test.csv');

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('handles various file types', () => {
    const fileTypes = [
      { blob: new Blob(['csv'], { type: 'text/csv' }), filename: 'data.csv' },
      {
        blob: new Blob(['excel'], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        filename: 'data.xlsx',
      },
      { blob: new Blob(['json'], { type: 'application/json' }), filename: 'data.json' },
      { blob: new Blob(['pdf'], { type: 'application/pdf' }), filename: 'data.pdf' },
      { blob: new Blob(['zip'], { type: 'application/zip' }), filename: 'data.zip' },
    ];

    fileTypes.forEach(({ blob, filename }) => {
      vi.clearAllMocks();
      downloadFile(blob, filename);

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  it('handles filenames with special characters', () => {
    const blob = new Blob(['data'], { type: 'text/csv' });
    const filename = 'Programări-2024-01-15_10-30-45.csv';

    expect(() => downloadFile(blob, filename)).not.toThrow();
  });

  it('handles filenames with Romanian characters', () => {
    const blob = new Blob(['data'], { type: 'text/csv' });
    const filename = 'Cereri_Concediu_2024.csv';

    expect(() => downloadFile(blob, filename)).not.toThrow();
  });
});

describe('Export Service - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles 404 errors', async () => {
    API.get.mockRejectedValue({
      response: { status: 404, data: { message: 'No data found' } },
    });

    await expect(exportAppointments('csv')).rejects.toThrow();
  });

  it('handles 403 authorization errors', async () => {
    API.get.mockRejectedValue({
      response: { status: 403, data: { message: 'Forbidden' } },
    });

    await expect(exportUsers('csv')).rejects.toThrow();
  });

  it('handles 500 server errors', async () => {
    API.get.mockRejectedValue({
      response: { status: 500, data: { message: 'Internal server error' } },
    });

    await expect(exportAppointments('csv')).rejects.toThrow();
  });

  it('handles network errors', async () => {
    API.get.mockRejectedValue(new Error('Network Error'));

    await expect(exportAppointments('csv')).rejects.toThrow('Network Error');
  });

  it('handles timeout errors', async () => {
    API.post.mockRejectedValue(new Error('timeout'));

    await expect(exportAllData()).rejects.toThrow('timeout');
  });
});

describe('Export Service - Query Parameter Serialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    API.get.mockResolvedValue({ data: new Blob(['data']) });
  });

  it('serializes boolean values', async () => {
    await exportUsers('csv', { isActive: true });

    const callUrl = API.get.mock.calls[0][0];
    expect(callUrl).toContain('isActive=true');
  });

  it('serializes numeric values', async () => {
    await exportInvoices('csv', { clientId: 123 });

    const callUrl = API.get.mock.calls[0][0];
    expect(callUrl).toContain('clientId=123');
  });

  it('serializes date strings', async () => {
    await exportAppointments('csv', {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    });

    const callUrl = API.get.mock.calls[0][0];
    expect(callUrl).toContain('startDate=2024-01-01');
    expect(callUrl).toContain('endDate=2024-12-31');
  });

  it('serializes search strings with special characters', async () => {
    await exportClients('csv', { search: 'test & search' });

    const callUrl = API.get.mock.calls[0][0];
    // URLSearchParams should encode special characters
    expect(callUrl).toContain('search=');
  });

  it('handles empty filters object', async () => {
    await exportAppointments('csv', {});

    const callUrl = API.get.mock.calls[0][0];
    expect(callUrl).toBe('/exports/appointments?format=csv');
  });
});
