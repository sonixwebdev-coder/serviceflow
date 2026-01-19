const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const authenticateClient = require('../../middleware/authenticateClient');
const portalAuthService = require('../../services/portalAuthService');
const prisma = require('../../../lib/prisma');
const { emitToOrganization } = require('../../realtime/emitter');

/**
 * GET /api/portal/profile
 * Get client profile
 */
router.get(
  '/',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        contactName: true,
        type: true,
        email: true,
        phone: true,
        vatNumber: true,
        registrationNumber: true,
        fidelityCardSerie: true,
        createdAt: true,
      },
    });

    res.json(client);
  })
);

/**
 * PUT /api/portal/profile
 * Update client profile (limited fields - only phone is editable from portal)
 */
router.put(
  '/',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const { phone } = req.body;

    const updatedClient = await prisma.client.update({
      where: { id: req.client.id },
      data: {
        ...(phone !== undefined && { phone }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        contactName: true,
        type: true,
        email: true,
        phone: true,
        notes: true,
        vatNumber: true,
        registrationNumber: true,
        fidelityCardSerie: true,
        createdAt: true,
        organizationId: true,
      },
    });

    // Broadcast to CRM for bi-directional sync
    emitToOrganization(updatedClient.organizationId, 'client:updated', {
      id: updatedClient.id,
      firstName: updatedClient.firstName,
      lastName: updatedClient.lastName,
      companyName: updatedClient.companyName,
      email: updatedClient.email,
      phone: updatedClient.phone,
      type: updatedClient.type,
      source: 'portal', // Indicate update came from client portal
    });

    res.json(updatedClient);
  })
);

/**
 * GET /api/portal/profile/assets
 * Get client's assets
 */
router.get(
  '/assets',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const assets = await prisma.asset.findMany({
      where: { clientId: req.client.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        manufacturer: true,
        model: true,
        identifier: true,
        year: true,
        createdAt: true,
      },
    });

    res.json(assets);
  })
);

/**
 * PUT /api/portal/profile/email
 * Update account email
 */
router.put(
  '/email',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Verify current password
    const account = await prisma.clientAccount.findUnique({
      where: { id: req.clientAccount.id },
    });

    const isValid = await portalAuthService.verifyPassword(password, account.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Check if email is already taken
    const existingAccount = await prisma.clientAccount.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingAccount && existingAccount.id !== req.clientAccount.id) {
      return res.status(400).json({ error: 'Email is already in use' });
    }

    // Update email
    await prisma.clientAccount.update({
      where: { id: req.clientAccount.id },
      data: {
        email: email.toLowerCase(),
        isVerified: false,
        verificationToken: portalAuthService.generateToken(),
      },
    });

    res.json({ success: true, message: 'Email updated. Please verify your new email address.' });
  })
);

module.exports = router;
