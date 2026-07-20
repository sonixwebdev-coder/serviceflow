/**
 * API Tests for Export Endpoints
 * Tests REST API endpoints for export functionality
 */

const request = require('supertest');
const express = require('express');
const exportsRouter = require('../../api/exports');
const { AppError } = require('../../utils/errors');
const exportService = require('../../services/exportService');

// Mock dependencies
jest.mock('../../services/exportService');
jest.mock('../../middleware/authenticate', () => (req, res, next) => {
  req.user = { id: 'test-user', email: 'test@example.com', roles: ['admin'] };
  req.tenantPrisma = {};
  next();
});

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/exports', exportsRouter);

// Error handler
app.use((err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
    });
  }
  res.status(500).json({
    success: false,
    message: err.message,
  });
});

describe('Export API - GET /api/exports/appointments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports appointments in CSV format', async () => {
    const mockBuffer = Buffer.from('id,title\n1,Test', 'utf8');
    exportService.exportAppointments.mockResolvedValue({
      buffer: mockBuffer,
      filename: 'appointments.csv',
      contentType: 'text/csv; charset=utf-8',
    });

    const response = await request(app).get('/api/exports/appointments?format=csv').expect(200);

    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.headers['content-disposition']).toContain('appointments.csv');
  });

  it('exports appointments in Excel format', async () => {
    const mockBuffer = Buffer.from('mock-excel-data', 'utf8');
    exportService.exportAppointments.mockResolvedValue({
      buffer: mockBuffer,
      filename: 'appointments.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const response = await request(app).get('/api/exports/appointments?format=excel').expect(200);

    expect(response.headers['content-type']).toContain('spreadsheetml');
  });

  it('passes filter parameters to service', async () => {
    exportService.exportAppointments.mockResolvedValue({
      buffer: Buffer.from('data'),
      filename: 'test.csv',
      contentType: 'text/csv',
    });

    await request(app)
      .get('/api/exports/appointments?format=csv&status=COMPLETED&startDate=2024-01-01')
      .expect(200);

    expect(exportService.exportAppointments).toHaveBeenCalledWith(
      expect.any(Object),
      'csv',
      expect.objectContaining({
        status: 'COMPLETED',
        startDate: '2024-01-01',
      }),
      expect.any(String),
      expect.anything()
    );
  });

  it('returns 400 for invalid format', async () => {
    await request(app).get('/api/exports/appointments?format=invalid').expect(400);
  });

  it('returns 404 when no data found', async () => {
    exportService.exportAppointments.mockRejectedValue(
      new AppError('No appointments found matching the criteria', 404)
    );

    await request(app).get('/api/exports/appointments?format=csv').expect(404);
  });

  it('sets cache control headers', async () => {
    exportService.exportAppointments.mockResolvedValue({
      buffer: Buffer.from('data'),
      filename: 'test.csv',
      contentType: 'text/csv',
    });

    const response = await request(app).get('/api/exports/appointments?format=csv').expect(200);

    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.headers['pragma']).toBe('no-cache');
  });
});

describe('Export API - GET /api/exports/invoices', () => {
  it('exports invoices with filters', async () => {
    exportService.exportInvoices.mockResolvedValue({
      buffer: Buffer.from('data'),
      filename: 'invoices.csv',
      contentType: 'text/csv',
    });

    await request(app).get('/api/exports/invoices?format=csv&status=PAID').expect(200);

    expect(exportService.exportInvoices).toHaveBeenCalledWith(
      expect.any(Object),
      'csv',
      expect.objectContaining({ status: 'PAID' }),
      expect.any(String),
      expect.anything()
    );
  });
});

describe('Export API - GET /api/exports/clients', () => {
  it('exports clients with type filter', async () => {
    exportService.exportClients.mockResolvedValue({
      buffer: Buffer.from('{"data":[]}'),
      filename: 'clients.json',
      contentType: 'application/json',
    });

    await request(app).get('/api/exports/clients?format=json&type=PF').expect(200);

    expect(exportService.exportClients).toHaveBeenCalledWith(
      expect.any(Object),
      'json',
      expect.objectContaining({ type: 'PF' }),
      expect.any(String),
      expect.anything()
    );
  });
});

describe('Export API - GET /api/exports/users', () => {
  it('exports users', async () => {
    exportService.exportUsers.mockResolvedValue({
      buffer: Buffer.from('data'),
      filename: 'users.xml',
      contentType: 'application/xml',
    });

    await request(app).get('/api/exports/users?format=xml').expect(200);
  });

  it('filters by active status', async () => {
    exportService.exportUsers.mockResolvedValue({
      buffer: Buffer.from('data'),
      filename: 'users.csv',
      contentType: 'text/csv',
    });

    await request(app).get('/api/exports/users?format=csv&isActive=true').expect(200);

    expect(exportService.exportUsers).toHaveBeenCalledWith(
      expect.any(Object),
      'csv',
      expect.objectContaining({ isActive: 'true' }),
      expect.any(String),
      expect.anything()
    );
  });
});

describe('Export API - GET /api/exports/leave-requests', () => {
  it('exports leave requests', async () => {
    exportService.exportLeaveRequests.mockResolvedValue({
      buffer: Buffer.from('data'),
      filename: 'leave-requests.csv',
      contentType: 'text/csv',
    });

    await request(app).get('/api/exports/leave-requests?format=csv&status=APPROVED').expect(200);
  });
});

describe('Export API - GET /api/exports/time-tracking', () => {
  it('exports time tracking with date filter', async () => {
    exportService.exportTimeTracking.mockResolvedValue({
      buffer: Buffer.from('data'),
      filename: 'time-tracking.excel',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    await request(app)
      .get('/api/exports/time-tracking?format=excel&startDate=2024-01-01&endDate=2024-01-31')
      .expect(200);

    expect(exportService.exportTimeTracking).toHaveBeenCalledWith(
      expect.any(Object),
      'excel',
      expect.objectContaining({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      }),
      expect.any(String),
      expect.anything()
    );
  });
});

describe('Export API - GET /api/exports/tasks', () => {
  it('exports tasks with multiple filters', async () => {
    exportService.exportTasks.mockResolvedValue({
      buffer: Buffer.from('data'),
      filename: 'tasks.csv',
      contentType: 'text/csv',
    });

    await request(app)
      .get('/api/exports/tasks?format=csv&status=COMPLETED&priority=HIGH')
      .expect(200);

    expect(exportService.exportTasks).toHaveBeenCalledWith(
      expect.any(Object),
      'csv',
      expect.objectContaining({
        status: 'COMPLETED',
        priority: 'HIGH',
      }),
      expect.any(String),
      expect.anything()
    );
  });
});

describe('Export API - POST /api/exports/all-data', () => {
  it('exports all data as ZIP for admin', async () => {
    exportService.exportAllData.mockResolvedValue({
      buffer: Buffer.from('mock-zip-data'),
      filename: 'export_complet.zip',
      contentType: 'application/zip',
    });

    const response = await request(app).post('/api/exports/all-data').expect(200);

    expect(response.headers['content-type']).toContain('application/zip');
    expect(response.headers['content-disposition']).toContain('export_complet.zip');
  });

  it('returns 403 for non-admin users', async () => {
    exportService.exportAllData.mockRejectedValue(
      new AppError('Only administrators can export all data', 403)
    );

    await request(app).post('/api/exports/all-data').expect(403);
  });
});

describe('Export API - GET /api/exports/formats', () => {
  it('returns available export formats', async () => {
    const response = await request(app).get('/api/exports/formats').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.formats).toHaveLength(4);
    expect(response.body.data.formats.map((f) => f.key)).toEqual(
      expect.arrayContaining(['csv', 'excel', 'json', 'xml'])
    );
  });
});

describe('Export API - GET /api/exports/entities', () => {
  it('returns available entities', async () => {
    const response = await request(app).get('/api/exports/entities').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.entities).toBeDefined();
    expect(Array.isArray(response.body.data.entities)).toBe(true);
  });

  it('includes entity information', async () => {
    const response = await request(app).get('/api/exports/entities').expect(200);

    const entities = response.body.data.entities;
    entities.forEach((entity) => {
      expect(entity).toHaveProperty('key');
      expect(entity).toHaveProperty('name');
      expect(entity).toHaveProperty('endpoint');
      expect(entity).toHaveProperty('available');
    });
  });
});

describe('Export API - Error Handling', () => {
  it('handles service errors gracefully', async () => {
    exportService.exportAppointments.mockRejectedValue(new Error('Database connection failed'));

    await request(app).get('/api/exports/appointments?format=csv').expect(500);
  });

  it('validates format parameter', async () => {
    await request(app).get('/api/exports/appointments?format=pdf').expect(400);
  });

  it('uses default format when not specified', async () => {
    exportService.exportAppointments.mockResolvedValue({
      buffer: Buffer.from('data'),
      filename: 'test.excel',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    await request(app).get('/api/exports/appointments').expect(200);

    // Default format should be 'excel'
    expect(exportService.exportAppointments).toHaveBeenCalledWith(
      expect.any(Object),
      'excel',
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });
});
