const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const { ok } = require('../utils/http');
const logger = require('../utils/logger');
const { sendEmail } = require('../services/email/emailService');
const prisma = require('../../lib/prisma');

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Prea multe mesaje trimise. Incercati din nou peste cateva minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const contactSchema = z.object({
  name: z.string().min(2, 'Numele trebuie sa aiba minim 2 caractere').max(100),
  email: z.string().email('Adresa de email nu este valida'),
  subject: z.string().min(3, 'Subiectul trebuie sa aiba minim 3 caractere').max(200),
  message: z.string().min(10, 'Mesajul trebuie sa aiba minim 10 caractere').max(2000),
});

router.post(
  '/',
  contactLimiter,
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    const { name, email, subject, message } = req.body;

    // Persist the contact message in its own table (separate from CRM tickets)
    await prisma.platformContactMessage.create({
      data: { name, email, subject, message },
    });

    const adminEmail = process.env.PLATFORM_CONTACT_EMAIL || process.env.COMPANY_EMAIL || 'contact@forja.it.com';

    sendEmail(null, {
      to: adminEmail,
      subject: `[Contact ForjaIt] ${subject}`,
      html: `
        <h2>Mesaj nou de pe platforma ForjaIt</h2>
        <p><strong>De la:</strong> ${name} (${email})</p>
        <p><strong>Subiect:</strong> ${subject}</p>
        <hr />
        <p>${message.replace(/\n/g, '<br />')}</p>
      `,
    }).catch((err) => logger.error('[EMAIL] Contact form email failed:', err.message));

    return ok(res, null, 'Mesajul a fost trimis cu succes. Va vom raspunde in cel mai scurt timp.');
  })
);

module.exports = router;
