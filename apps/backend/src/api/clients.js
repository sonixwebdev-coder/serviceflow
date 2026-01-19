const express = require('express');
const multer = require('multer');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  createClientSchema,
  updateClientSchema,
  listClientQuerySchema,
} = require('../schemas/clientSchema');
const { listClients, createClient, getClientById, updateClient, searchClients } = require('../services/clientService');
const { importClientsFromCSV, generateCSVTemplate } = require('../services/clientImportService');
const { logFromRequest, ENTITY_TYPES, getActionDescription } = require('../services/auditLogService');
const { ok, created } = require('../utils/http');
const { AppError } = require('../utils/errors');
const prisma = require('../../lib/prisma');

const router = express.Router();

// Configure multer for CSV file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept CSV files
    if (file.mimetype === 'text/csv' ||
        file.mimetype === 'application/csv' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new AppError('Doar fisiere CSV sunt permise', 400), false);
    }
  },
});

// Download CSV import template
router.get(
  '/import/template',
  authenticate,
  asyncHandler(async (req, res) => {
    const template = generateCSVTemplate();

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="template_import_clienti.csv"');

    return res.send(template);
  })
);

// Import clients from CSV
router.post(
  '/import',
  authenticate,
  authorize({ roles: ['admin', 'manager', 'sales'] }),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('Niciun fisier incarcat', 400);
    }

    // Get isOnline override from query parameter
    const options = {
      organizationId: req.user.organizationId,
    };
    if (req.query.isOnline !== undefined) {
      options.isOnlineOverride = req.query.isOnline === 'true';
    }

    const results = await importClientsFromCSV(req.file.buffer, options);

    return ok(res, results, `Import finalizat: ${results.successful} clienti adaugati`);
  })
);

router.get(
  '/search',
  authenticate,
  asyncHandler(async (req, res) => {
    const { q, limit } = req.query;
    const results = await searchClients(req.tenantPrisma, q, { limit: limit ? parseInt(limit) : 20 });
    return ok(res, results);
  })
);

router.get(
  '/',
  authenticate,
  validate(listClientQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await listClients(req.tenantPrisma, req.query);
    return ok(res, result);
  })
);

router.post(
  '/',
  authenticate,
  authorize({ roles: ['admin', 'manager', 'sales'] }),
  validate(createClientSchema),
  asyncHandler(async (req, res) => {
    const client = await createClient(req.tenantPrisma, req.body);

    // Log audit action
    const clientName = client.type === 'PF'
      ? `${client.firstName || ''} ${client.lastName || ''}`.trim()
      : client.companyName;
    await logFromRequest(req, {
      action: 'CREATE',
      entityType: ENTITY_TYPES.CLIENT,
      entityId: client.id,
      description: getActionDescription('CREATE', ENTITY_TYPES.CLIENT, clientName),
      metadata: { clientType: client.type },
    });

    return created(res, client, 'Client created successfully');
  })
);

router.get(
  '/:clientId',
  authenticate,
  asyncHandler(async (req, res) => {
    const client = await getClientById(req.tenantPrisma, req.params.clientId);
    return ok(res, client);
  })
);

router.patch(
  '/:clientId',
  authenticate,
  authorize({ roles: ['admin', 'manager', 'sales'] }),
  validate(updateClientSchema),
  asyncHandler(async (req, res) => {
    const client = await updateClient(req.tenantPrisma, req.params.clientId, req.body);

    // Log audit action
    const clientName = client.type === 'PF'
      ? `${client.firstName || ''} ${client.lastName || ''}`.trim()
      : client.companyName;
    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: ENTITY_TYPES.CLIENT,
      entityId: client.id,
      description: getActionDescription('UPDATE', ENTITY_TYPES.CLIENT, clientName),
      metadata: { updatedFields: Object.keys(req.body) },
    });

    return ok(res, client, 'Client updated successfully');
  })
);

router.delete(
  '/:clientId',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  asyncHandler(async (req, res) => {
    // Get client info before deletion for audit log
    const client = await req.tenantPrisma.client.findUnique({
      where: { id: req.params.clientId },
    });

    await req.tenantPrisma.client.delete({
      where: { id: req.params.clientId },
    });

    // Log audit action
    if (client) {
      const clientName = client.type === 'PF'
        ? `${client.firstName || ''} ${client.lastName || ''}`.trim()
        : client.companyName;
      await logFromRequest(req, {
        action: 'DELETE',
        entityType: ENTITY_TYPES.CLIENT,
        entityId: req.params.clientId,
        description: getActionDescription('DELETE', ENTITY_TYPES.CLIENT, clientName),
        metadata: { deletedClient: { id: client.id, name: clientName } },
      });
    }

    return ok(res, null, 'Client deleted successfully');
  })
);

module.exports = router;
