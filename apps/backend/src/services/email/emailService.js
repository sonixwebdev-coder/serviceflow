const nodemailer = require('nodemailer');
const Handlebars = require('handlebars');
const Brevo = require('@getbrevo/brevo');
const logger = require('../../utils/logger');
const { getRedisClient, isAvailable: isRedisAvailable } = require('../../lib/redis');

// Per-org email rate limit: 100 emails per hour
const EMAIL_RATE_LIMIT = 100;
const EMAIL_RATE_WINDOW = 3600; // 1 hour in seconds

// Create reusable transporter for SMTP
let transporter = null;

// Create Brevo API instance
let brevoApiInstance = null;

/**
 * Check if Brevo is configured
 */
const isBrevoConfigured = () => {
  return Boolean(process.env.BREVO_API_KEY);
};

/**
 * Initialize Brevo API client
 */
const initBrevo = () => {
  if (brevoApiInstance) return brevoApiInstance;

  if (!process.env.BREVO_API_KEY) {
    return null;
  }

  const apiInstance = new Brevo.TransactionalEmailsApi();
  // The enum value for apiKey is 0 (Brevo.TransactionalEmailsApiApiKeys.apiKey = 0)
  apiInstance.setApiKey(0, process.env.BREVO_API_KEY);
  brevoApiInstance = apiInstance;

  logger.info('Email service: Brevo API initialized');
  return brevoApiInstance;
};

/**
 * Initialize the SMTP transporter (fallback)
 */
const initTransporter = () => {
  if (transporter) return transporter;

  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  };

  // Only create transporter if credentials are configured
  if (!config.auth.user || !config.auth.pass) {
    logger.warn('Email service: SMTP credentials not configured. Emails will be logged but not sent.');
    return null;
  }

  transporter = nodemailer.createTransport(config);
  return transporter;
};

/**
 * Send email via Brevo API
 */
const sendViaBrevo = async (to, subject, html, text) => {
  const api = initBrevo();
  if (!api) {
    throw new Error('Brevo API not initialized');
  }

  const sendSmtpEmail = new Brevo.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = html;
  if (text) {
    sendSmtpEmail.textContent = text;
  }
  sendSmtpEmail.sender = {
    name: process.env.EMAIL_FROM_NAME || 'ForjaIt',
    email: process.env.EMAIL_FROM || process.env.BREVO_SENDER_EMAIL || 'noreply@example.com',
  };
  sendSmtpEmail.to = [{ email: to }];

  try {
    const response = await api.sendTransacEmail(sendSmtpEmail);
    logger.info(`Email sent via Brevo to ${to}, messageId: ${response.body?.messageId || response.messageId}`);
    return response;
  } catch (error) {
    // Extract meaningful error from Brevo response
    const errorMessage = error.body?.message || error.response?.body?.message || error.message || 'Unknown Brevo error';
    const errorCode = error.body?.code || error.response?.body?.code || error.status || 'UNKNOWN';
    logger.error(`Brevo API error: ${errorCode} - ${errorMessage}`, {
      to,
      subject,
      errorBody: error.body || error.response?.body,
    });
    throw new Error(`Brevo API error (${errorCode}): ${errorMessage}`);
  }
};

/**
 * Send email via SMTP (nodemailer)
 */
const sendViaSMTP = async (to, subject, html, text) => {
  initTransporter();

  if (!transporter) {
    throw new Error('SMTP transporter not initialized');
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text,
  };

  const info = await transporter.sendMail(mailOptions);
  logger.info(`Email sent via SMTP: ${info.messageId} to ${to}`);
  return info;
};

/**
 * Compile a Handlebars template
 * @param {string} templateString - The template string
 * @param {Object} data - Data to inject into template
 * @returns {string} Compiled template
 */
const compileTemplate = (templateString, data) => {
  const template = Handlebars.compile(templateString);
  return template(data);
};

/**
 * System templates - hardcoded, not editable by organization admins
 * Used for CRM system emails (password reset, onboarding, etc.)
 */
const SYSTEM_TEMPLATES = {
  'crm-password-reset': {
    subject: 'Resetare parola - ForjaIt',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; background: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
    .warning { color: #ef4444; font-size: 12px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Resetare Parola</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{userName}}!</p>
      <p>Am primit o cerere de resetare a parolei pentru contul tau ForjaIt.</p>
      <div class="info">
        <p>Click pe butonul de mai jos pentru a-ti reseta parola:</p>
        <a href="{{resetLink}}" class="button">Reseteaza Parola</a>
        <p class="warning">Acest link expira in {{expiresIn}}.</p>
      </div>
      <p>Daca nu ai solicitat resetarea parolei, ignora acest email.</p>
    </div>
    <div class="footer">
      <p>ForjaIt - Platformă de management</p>
      <p>Acest email a fost trimis automat. Te rugăm să nu răspunzi la acest mesaj.</p>
    </div>
  </div>
</body>
</html>
`,
  },
  'org-suspended': {
    subject: 'Contul organizatiei tale a fost dezactivat',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; background: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Cont Dezactivat</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{userName}}!</p>
      <p>Contul organizatiei <strong>{{organizationName}}</strong> a fost dezactivat.</p>
      <div class="info">
        <p><strong>Motiv:</strong> {{reason}}</p>
      </div>
      <p>Pentru reactivare, te rugam sa ne contactezi sau sa actualizezi metoda de plata:</p>
      <div style="text-align: center;">
        <a href="{{billingUrl}}" class="button">Gestioneaza Abonamentul</a>
      </div>
    </div>
    <div class="footer">
      <p>ForjaIt - Platforma de management</p>
      <p>Acest email a fost trimis automat. Te rugam sa nu raspunzi la acest mesaj.</p>
    </div>
  </div>
</body>
</html>
`,
  },
  'org-idle-warning': {
    subject: 'Contul tau ForjaIt este inactiv',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; background: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Cont Inactiv</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{userName}}!</p>
      <p>Am observat ca nu ai mai folosit contul organizatiei <strong>{{organizationName}}</strong> de peste {{idleDays}} de zile.</p>
      <div class="info">
        <p>Contul tau este in continuare activ, dar datele acumulate pot fi curatate conform politicii de retentie a planului tau (<strong>{{plan}}</strong>).</p>
      </div>
      <p>Autentifica-te pentru a-ti mentine contul activ:</p>
      <div style="text-align: center;">
        <a href="{{loginUrl}}" class="button">Acceseaza ForjaIt</a>
      </div>
    </div>
    <div class="footer">
      <p>ForjaIt - Platforma de management</p>
      <p>Acest email a fost trimis automat. Te rugam sa nu raspunzi la acest mesaj.</p>
    </div>
  </div>
</body>
</html>
`,
  },
  'trial-ending': {
    subject: 'Perioada de proba expira in {{daysLeft}} zile',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; background: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
    .days { font-size: 32px; font-weight: bold; color: #f59e0b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Perioada de Proba Expira</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{userName}}!</p>
      <p>Perioada de proba pentru organizatia <strong>{{organizationName}}</strong> expira in curand.</p>
      <div class="info">
        <p class="days">{{daysLeft}} zile ramase</p>
        <p>Plan curent: <strong>{{plan}}</strong></p>
        <p>Data expirare: <strong>{{trialEndDate}}</strong></p>
      </div>
      <p>Pentru a continua sa folosesti toate functiile, alege un plan de abonament:</p>
      <div style="text-align: center;">
        <a href="{{billingUrl}}" class="button">Alege un Plan</a>
      </div>
      <p style="margin-top: 15px; font-size: 13px; color: #6b7280;">Dupa expirare, contul va fi trecut pe planul gratuit cu functionalitati limitate.</p>
    </div>
    <div class="footer">
      <p>ForjaIt - Platforma de management</p>
    </div>
  </div>
</body>
</html>
`,
  },
  'subscription-activated': {
    subject: 'Abonamentul tau ForjaIt a fost activat!',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; background: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
    .plan { font-size: 24px; font-weight: bold; color: #22c55e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Abonament Activat!</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{userName}}!</p>
      <p>Abonamentul pentru organizatia <strong>{{organizationName}}</strong> a fost activat cu succes.</p>
      <div class="info">
        <p class="plan">{{plan}}</p>
        <p>Suma: <strong>{{amount}}</strong></p>
        <p>Urmatoarea factura: <strong>{{nextBillingDate}}</strong></p>
      </div>
      <p>Acum ai acces la toate functiile incluse in planul tau. Poti gestiona abonamentul oricand:</p>
      <div style="text-align: center;">
        <a href="{{billingUrl}}" class="button">Gestioneaza Abonamentul</a>
      </div>
    </div>
    <div class="footer">
      <p>ForjaIt - Platforma de management</p>
    </div>
  </div>
</body>
</html>
`,
  },
  'subscription-cancelled': {
    subject: 'Abonamentul tau ForjaIt a fost anulat',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; background: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Abonament Anulat</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{userName}}!</p>
      <p>Abonamentul pentru organizatia <strong>{{organizationName}}</strong> a fost anulat.</p>
      <div class="info">
        <p>Contul tau a fost trecut pe planul <strong>FREE</strong> cu functionalitati limitate.</p>
        <p>Datele tale sunt in siguranta, dar unele functii avansate nu vor mai fi disponibile.</p>
      </div>
      <p>Daca doresti sa reactivezi abonamentul, poti face asta oricand:</p>
      <div style="text-align: center;">
        <a href="{{billingUrl}}" class="button">Reaboneaza-te</a>
      </div>
    </div>
    <div class="footer">
      <p>ForjaIt - Platforma de management</p>
    </div>
  </div>
</body>
</html>
`,
  },
  'subscription-renewed': {
    subject: 'Plata abonamentului ForjaIt procesata cu succes',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .amount { font-size: 24px; font-weight: bold; color: #22c55e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Plata Procesata</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{userName}}!</p>
      <p>Plata pentru abonamentul organizatiei <strong>{{organizationName}}</strong> a fost procesata cu succes.</p>
      <div class="info">
        <p class="amount">{{amount}}</p>
        <p>Plan: <strong>{{plan}}</strong></p>
        <p>Urmatoarea plata: <strong>{{nextBillingDate}}</strong></p>
      </div>
    </div>
    <div class="footer">
      <p>ForjaIt - Platforma de management</p>
    </div>
  </div>
</body>
</html>
`,
  },
  'trial-expired': {
    subject: 'Perioada de proba a expirat',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; background: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Perioada de Proba a Expirat</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{userName}}!</p>
      <p>Perioada de proba pentru organizatia <strong>{{organizationName}}</strong> a expirat.</p>
      <div class="info">
        <p>Pentru a continua sa folosesti platforma, te rugam sa alegi un plan de abonament.</p>
        <p style="font-size: 13px; color: #6b7280;">Datele tale sunt in siguranta si vor fi disponibile dupa activarea abonamentului.</p>
      </div>
      <div style="text-align: center;">
        <a href="{{billingUrl}}" class="button">Alege un Plan</a>
      </div>
    </div>
    <div class="footer">
      <p>ForjaIt - Platforma de management</p>
    </div>
  </div>
</body>
</html>
`,
  },
  'payment-required': {
    subject: 'Plata abonamentului nu a putut fi procesata',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; background: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Plata Necesara</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{userName}}!</p>
      <p>Plata pentru abonamentul organizatiei <strong>{{organizationName}}</strong> nu a putut fi procesata.</p>
      <div class="info">
        <p>Te rugam sa actualizezi metoda de plata pentru a evita intreruperea serviciului.</p>
        <p style="font-size: 13px; color: #6b7280;">Daca plata nu este procesata in termen de 3 incercari, contul va fi suspendat.</p>
      </div>
      <div style="text-align: center;">
        <a href="{{billingUrl}}" class="button">Actualizeaza Plata</a>
      </div>
    </div>
    <div class="footer">
      <p>ForjaIt - Platforma de management</p>
    </div>
  </div>
</body>
</html>
`,
  },
  'crm-welcome': {
    subject: 'Bine ai venit in ForjaIt!',
    bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bine ai venit!</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{userName}}!</p>
      <p>Contul tau ForjaIt a fost creat cu succes.</p>
      <div class="info">
        <p><strong>Email:</strong> {{email}}</p>
        {{#if organizationName}}<p><strong>Organizatie:</strong> {{organizationName}}</p>{{/if}}
      </div>
      <p>Poti accesa platforma folosind butonul de mai jos:</p>
      <div style="text-align: center;">
        <a href="{{loginUrl}}" class="button">Acceseaza ForjaIt</a>
      </div>
      <p style="margin-top: 20px;">Daca ai intrebari sau ai nevoie de ajutor, echipa noastra de suport iti sta la dispozitie.</p>
    </div>
    <div class="footer">
      <p>ForjaIt - Platformă de management</p>
      <p>Acest email a fost trimis automat. Te rugăm să nu răspunzi la acest mesaj.</p>
    </div>
  </div>
</body>
</html>
`,
  },
};

/**
 * Send a system email (CRM-level, not organization-specific)
 * Uses hardcoded templates that cannot be modified by organization admins
 * Does not log to database - used for system emails like CRM password reset, onboarding
 *
 * @param {string} templateName - Name of the system template
 * @param {Object} templateData - Data to inject into template
 * @param {string} to - Recipient email address
 * @returns {Promise<Object>} Send result
 */
const sendSystemEmail = async (templateName, templateData, to) => {
  const template = SYSTEM_TEMPLATES[templateName];

  if (!template) {
    throw new Error(`System template "${templateName}" not found`);
  }

  const subject = compileTemplate(template.subject, templateData);
  const html = compileTemplate(template.bodyHtml, templateData);

  // Check if any email provider is configured
  const brevoConfigured = isBrevoConfigured();
  const smtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD);

  if (!brevoConfigured && !smtpConfigured) {
    logger.info(`System email: Would send to ${to} with subject "${subject}" (No email provider configured)`);
    return { success: true, simulated: true };
  }

  // Use Brevo if configured, otherwise fall back to SMTP
  if (brevoConfigured) {
    await sendViaBrevo(to, subject, html);
  } else {
    await sendViaSMTP(to, subject, html);
  }

  logger.info(`System email sent to ${to}: ${templateName}`);
  return { success: true };
};

/**
 * Send CRM password reset email (system-level, not customizable)
 */
const sendCrmPasswordResetEmail = async ({ email, userName, resetLink, expiresIn }) => {
  if (!email) {
    logger.warn('Cannot send CRM password reset email: no email provided');
    return null;
  }

  const templateData = {
    userName: userName || 'Utilizator',
    resetLink,
    expiresIn: expiresIn || '1 ora',
  };

  return sendSystemEmail('crm-password-reset', templateData, email);
};

/**
 * Send CRM welcome email (system-level, for new company onboarding)
 */
const sendCrmWelcomeEmail = async ({ email, userName, organizationName, loginUrl }) => {
  if (!email) {
    logger.warn('Cannot send CRM welcome email: no email provided');
    return null;
  }

  const templateData = {
    userName: userName || 'Utilizator',
    email,
    organizationName,
    loginUrl: loginUrl || process.env.FRONTEND_URL || 'http://localhost:5173',
  };

  return sendSystemEmail('crm-welcome', templateData, email);
};

/**
 * Send org suspended email to admin
 */
const sendOrgSuspendedEmail = async ({ email, userName, organizationName, reason, billingUrl }) => {
  if (!email) return null;

  return sendSystemEmail('org-suspended', {
    userName: userName || 'Administrator',
    organizationName,
    reason: reason || 'Plata nu a putut fi procesata dupa mai multe incercari.',
    billingUrl: billingUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings/billing`,
  }, email);
};

/**
 * Send idle account warning email to admin
 */
const sendIdleWarningEmail = async ({ email, userName, organizationName, idleDays, plan, loginUrl }) => {
  if (!email) return null;

  return sendSystemEmail('org-idle-warning', {
    userName: userName || 'Administrator',
    organizationName,
    idleDays: idleDays || 180,
    plan: plan || 'FREE',
    loginUrl: loginUrl || process.env.FRONTEND_URL || 'http://localhost:5173',
  }, email);
};

/**
 * Send trial ending warning email to org admin
 */
const sendTrialEndingEmail = async ({ email, userName, organizationName, plan, daysLeft, trialEndDate, billingUrl }) => {
  if (!email) return null;

  return sendSystemEmail('trial-ending', {
    userName: userName || 'Administrator',
    organizationName,
    plan: plan || 'PROFESSIONAL',
    daysLeft: daysLeft || 3,
    trialEndDate: trialEndDate || 'N/A',
    billingUrl: billingUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings/billing`,
  }, email);
};

/**
 * Send subscription activated email to org admin
 */
const sendSubscriptionActivatedEmail = async ({ email, userName, organizationName, plan, amount, nextBillingDate, billingUrl }) => {
  if (!email) return null;

  return sendSystemEmail('subscription-activated', {
    userName: userName || 'Administrator',
    organizationName,
    plan: plan || 'PROFESSIONAL',
    amount: amount || 'N/A',
    nextBillingDate: nextBillingDate || 'N/A',
    billingUrl: billingUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings/billing`,
  }, email);
};

/**
 * Send subscription cancelled email to org admin
 */
const sendSubscriptionCancelledEmail = async ({ email, userName, organizationName, billingUrl }) => {
  if (!email) return null;

  return sendSystemEmail('subscription-cancelled', {
    userName: userName || 'Administrator',
    organizationName,
    billingUrl: billingUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pricing`,
  }, email);
};

/**
 * Send subscription renewed (payment succeeded) email to org admin
 */
const sendSubscriptionRenewedEmail = async ({ email, userName, organizationName, plan, amount, nextBillingDate }) => {
  if (!email) return null;

  return sendSystemEmail('subscription-renewed', {
    userName: userName || 'Administrator',
    organizationName,
    plan: plan || 'PROFESSIONAL',
    amount: amount || 'N/A',
    nextBillingDate: nextBillingDate || 'N/A',
  }, email);
};

/**
 * Send trial expired email to org admin
 */
const sendTrialExpiredEmail = async ({ email, userName, organizationName, billingUrl }) => {
  if (!email) return null;

  return sendSystemEmail('trial-expired', {
    userName: userName || 'Administrator',
    organizationName,
    billingUrl: billingUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings/billing`,
  }, email);
};

/**
 * Send payment required email to org admin (payment failure warning)
 */
const sendPaymentRequiredEmail = async ({ email, userName, organizationName, billingUrl }) => {
  if (!email) return null;

  return sendSystemEmail('payment-required', {
    userName: userName || 'Administrator',
    organizationName,
    billingUrl: billingUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings/billing`,
  }, email);
};

/**
 * Get default templates for different email types
 * @param {string} templateName - Name of the template
 * @returns {Object} Template with subject and body
 */
const getDefaultTemplate = (templateName) => {
  const templates = {
    'appointment-reminder': {
      subject: 'Reminder: Programare pe {{date}}',
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Reminder Programare</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{clientName}}!</p>
      <p>Iti reamintim ca ai o programare:</p>
      <div class="info">
        <p><strong>Data:</strong> {{date}}</p>
        <p><strong>Ora:</strong> {{time}}</p>
        {{#if location}}<p><strong>Locatie:</strong> {{location}}</p>{{/if}}
        {{#if description}}<p><strong>Detalii:</strong> {{description}}</p>{{/if}}
      </div>
      <p>Te asteptam!</p>
    </div>
    <div class="footer">
      <p>{{companyName}}</p>
      {{#if companyPhone}}<p>{{companyPhone}}</p>{{/if}}
    </div>
  </div>
</body>
</html>
`,
    },
    'invoice-created': {
      subject: 'Factura #{{invoiceNumber}} - {{companyName}}',
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .amount { font-size: 24px; color: #4f46e5; font-weight: bold; }
    .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Factura Noua</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{clientName}}!</p>
      <p>A fost emisa o noua factura pentru serviciile prestate:</p>
      <div class="info">
        <p><strong>Numar factura:</strong> #{{invoiceNumber}}</p>
        <p><strong>Data emitere:</strong> {{issueDate}}</p>
        <p><strong>Data scadenta:</strong> {{dueDate}}</p>
        <p class="amount">Total: {{total}} RON</p>
      </div>
      {{#if pdfUrl}}<p><a href="{{pdfUrl}}" class="button">Descarca Factura</a></p>{{/if}}
    </div>
    <div class="footer">
      <p>{{companyName}}</p>
      {{#if companyPhone}}<p>{{companyPhone}}</p>{{/if}}
    </div>
  </div>
</body>
</html>
`,
    },
    'email-verification': {
      subject: 'Verificare adresa de email - {{companyName}}',
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Verificare Email</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{clientName}}!</p>
      <p>Iti multumim pentru inregistrare. Te rugam sa iti confirmi adresa de email apasand butonul de mai jos:</p>
      <p style="text-align: center;">
        <a href="{{verificationLink}}" class="button">Confirma adresa de email</a>
      </p>
      <p style="margin-top: 20px; font-size: 13px; color: #6b7280;">Daca butonul nu functioneaza, copiaza si lipeste acest link in browser: <br><a href="{{verificationLink}}">{{verificationLink}}</a></p>
    </div>
    <div class="footer">
      <p>{{companyName}}</p>
      {{#if companyPhone}}<p>{{companyPhone}}</p>{{/if}}
    </div>
  </div>
</body>
</html>
`,
    },
    'welcome': {
      subject: 'Bine ai venit la {{companyName}}!',
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bine ai venit!</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{clientName}}!</p>
      <p>Ne bucuram sa te avem ca si client! Iti multumim ca ai ales serviciile noastre.</p>
      <p>Daca ai intrebari sau ai nevoie de ajutor, nu ezita sa ne contactezi.</p>
    </div>
    <div class="footer">
      <p>{{companyName}}</p>
      {{#if companyPhone}}<p>{{companyPhone}}</p>{{/if}}
    </div>
  </div>
</body>
</html>
`,
    },
    'appointment-confirmation': {
      subject: 'Confirmare programare - {{date}}',
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Programare Confirmata</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{clientName}}!</p>
      <p>Programarea ta a fost confirmata cu succes:</p>
      <div class="info">
        <p><strong>Data:</strong> {{date}}</p>
        <p><strong>Ora:</strong> {{time}}</p>
        {{#if location}}<p><strong>Locatie:</strong> {{location}}</p>{{/if}}
        {{#if description}}<p><strong>Servicii:</strong> {{description}}</p>{{/if}}
      </div>
      <p>Te asteptam!</p>
    </div>
    <div class="footer">
      <p>{{companyName}}</p>
      {{#if companyPhone}}<p>{{companyPhone}}</p>{{/if}}
    </div>
  </div>
</body>
</html>
`,
    },
    'password-reset': {
      subject: 'Resetare parola - {{companyName}}',
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
    .warning { color: #ef4444; font-size: 12px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Resetare Parola</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{clientName}}!</p>
      <p>Am primit o cerere de resetare a parolei pentru contul tau.</p>
      <div class="info">
        <p>Click pe butonul de mai jos pentru a-ti reseta parola:</p>
        <a href="{{resetLink}}" class="button">Reseteaza Parola</a>
        <p class="warning">Acest link expira in {{expiresIn}}.</p>
      </div>
      <p>Daca nu ai solicitat resetarea parolei, ignora acest email.</p>
    </div>
    <div class="footer">
      <p>{{companyName}}</p>
      {{#if companyPhone}}<p>{{companyPhone}}</p>{{/if}}
    </div>
  </div>
</body>
</html>
`,
    },
    'appointment-cancelled': {
      subject: 'Programare anulata - {{date}}',
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Programare Anulata</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{clientName}}!</p>
      <p>Ne pare rau sa te informam ca programarea ta a fost anulata:</p>
      <div class="info">
        <p><strong>Data:</strong> {{date}}</p>
        <p><strong>Ora:</strong> {{time}}</p>
        {{#if location}}<p><strong>Locatie:</strong> {{location}}</p>{{/if}}
        {{#if cancellationReason}}<p><strong>Motiv:</strong> {{cancellationReason}}</p>{{/if}}
      </div>
      <p>Te rugam sa ne contactezi pentru a reprograma.</p>
    </div>
    <div class="footer">
      <p>{{companyName}}</p>
      {{#if companyPhone}}<p>{{companyPhone}}</p>{{/if}}
    </div>
  </div>
</body>
</html>
`,
    },
    'appointment-rescheduled': {
      subject: 'Programare reprogramata - {{newDate}}',
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .old { text-decoration: line-through; color: #9ca3af; }
    .new { color: #22c55e; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Programare Reprogramata</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{clientName}}!</p>
      <p>Programarea ta a fost reprogramata:</p>
      <div class="info">
        <p><strong>Data veche:</strong> <span class="old">{{oldDate}} la {{oldTime}}</span></p>
        <p><strong>Data noua:</strong> <span class="new">{{newDate}} la {{newTime}}</span></p>
        {{#if location}}<p><strong>Locatie:</strong> {{location}}</p>{{/if}}
      </div>
      <p>Te asteptam la noua data!</p>
    </div>
    <div class="footer">
      <p>{{companyName}}</p>
      {{#if companyPhone}}<p>{{companyPhone}}</p>{{/if}}
    </div>
  </div>
</body>
</html>
`,
    },
    'loyalty-points-earned': {
      subject: 'Ai castigat {{points}} puncte de fidelitate!',
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #8b5cf6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .points { font-size: 32px; color: #8b5cf6; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Puncte de Fidelitate</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{clientName}}!</p>
      <p>Ai castigat puncte de fidelitate pentru plata ta:</p>
      <div class="info">
        <p class="points">+{{points}} puncte</p>
        <p>Plata: {{amount}} RON</p>
        <p><strong>Total puncte:</strong> {{totalPoints}}</p>
      </div>
      <p>Continua sa acumulezi puncte pentru recompense mai bune!</p>
    </div>
    <div class="footer">
      <p>{{companyName}}</p>
    </div>
  </div>
</body>
</html>
`,
    },
    'loyalty-tier-upgrade': {
      subject: 'Felicitari! Ai avansat la nivelul {{tierName}}!',
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .tier { font-size: 28px; font-weight: bold; color: #f59e0b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nivel Nou Deblocat!</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{clientName}}!</p>
      <p>Felicitari! Ai avansat de la {{previousTier}} la un nivel superior:</p>
      <div class="info">
        <p class="tier">{{tierName}}</p>
        <p>Bucura-te de beneficii mai mari la fiecare vizita!</p>
      </div>
    </div>
    <div class="footer">
      <p>{{companyName}}</p>
    </div>
  </div>
</body>
</html>
`,
    },
    'loyalty-reward-available': {
      subject: 'Ai o recompensa disponibila!',
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .reward { font-size: 20px; font-weight: bold; color: #22c55e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Recompensa Disponibila!</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{clientName}}!</p>
      <p>Ai acumulat {{visitCount}} vizite si ai deblocat o recompensa:</p>
      <div class="info">
        <p class="reward">{{rewardDescription}}</p>
      </div>
      <p>Te asteptam!</p>
    </div>
    <div class="footer">
      <p>{{companyName}}</p>
    </div>
  </div>
</body>
</html>
`,
    },
    'invoice-overdue': {
      subject: 'Factura #{{invoiceNumber}} este restanta - {{companyName}}',
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .amount { font-size: 24px; color: #ef4444; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Factura Restanta</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{clientName}}!</p>
      <p>Factura urmatoare a depasit termenul de plata:</p>
      <div class="info">
        <p><strong>Numar factura:</strong> #{{invoiceNumber}}</p>
        <p><strong>Data scadenta:</strong> {{dueDate}}</p>
        <p><strong>Zile intarziere:</strong> {{daysOverdue}}</p>
        <p class="amount">Total: {{total}} RON</p>
      </div>
      <p>Te rugam sa efectuezi plata cat mai curand posibil.</p>
    </div>
    <div class="footer">
      <p>{{companyName}}</p>
      {{#if companyPhone}}<p>{{companyPhone}}</p>{{/if}}
    </div>
  </div>
</body>
</html>
`,
    },
    'task-assigned': {
      subject: 'Task nou asignat: {{taskTitle}}',
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
    .priority { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .priority-high { background: #fee2e2; color: #dc2626; }
    .priority-medium { background: #fef3c7; color: #d97706; }
    .priority-low { background: #dcfce7; color: #16a34a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Task Nou Asignat</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{userName}}!</p>
      <p>Ti-a fost asignat un task nou:</p>
      <div class="info">
        <p><strong>{{taskTitle}}</strong></p>
        {{#if taskDescription}}<p>{{taskDescription}}</p>{{/if}}
        {{#if priority}}<p>Prioritate: <span class="priority priority-{{priorityClass}}">{{priority}}</span></p>{{/if}}
        {{#if dueDate}}<p><strong>Termen:</strong> {{dueDate}}</p>{{/if}}
        {{#if assignedBy}}<p><strong>Asignat de:</strong> {{assignedBy}}</p>{{/if}}
      </div>
      <div style="text-align: center;">
        <a href="{{taskUrl}}" class="button">Vezi Task-ul</a>
      </div>
    </div>
    <div class="footer">
      <p>{{companyName}}</p>
    </div>
  </div>
</body>
</html>
`,
    },
    'payment-received': {
      subject: 'Confirmare plata - {{companyName}}',
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .amount { font-size: 24px; color: #22c55e; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Plata Confirmata</h1>
    </div>
    <div class="content">
      <p>Buna ziua, {{clientName}}!</p>
      <p>Am primit plata ta cu succes:</p>
      <div class="info">
        <p class="amount">{{amount}} RON</p>
        <p><strong>Data:</strong> {{paymentDate}}</p>
        <p><strong>Metoda:</strong> {{paymentMethod}}</p>
        {{#if invoiceNumber}}<p><strong>Factura:</strong> #{{invoiceNumber}}</p>{{/if}}
      </div>
      <p>Iti multumim!</p>
    </div>
    <div class="footer">
      <p>{{companyName}}</p>
      {{#if companyPhone}}<p>{{companyPhone}}</p>{{/if}}
    </div>
  </div>
</body>
</html>
`,
    },
  };

  return templates[templateName] || null;
};

/**
 * Send an email
 * @param {Object} prisma - Tenant-scoped Prisma client
 * @param {Object} options - Email options
 * @returns {Promise<Object>} Email log entry
 */
const EMAIL_REGEX = /^[^\s@<>()[\]\\,;:]+@[^\s@<>()[\]\\,;:]+\.[^\s@<>()[\]\\,;:]+$/;

const sendEmail = async (prisma, {
  to,
  subject,
  html,
  text,
  template,
  templateData,
  recipientType = 'CLIENT',
  recipientId = null,
  organizationId,
}) => {
  // Validate email to prevent header injection and bad addresses
  if (!to || typeof to !== 'string' || !EMAIL_REGEX.test(to) || to.includes('\n') || to.includes('\r')) {
    logger.warn('Email rejected: invalid recipient address', { to, template });
    return null;
  }

  // Per-org email rate limiting (Redis-based, best-effort)
  if (organizationId && isRedisAvailable()) {
    try {
      const redis = getRedisClient();
      const rateKey = `email:rate:${organizationId}`;
      const count = await redis.incr(rateKey);
      if (count === 1) {
        await redis.expire(rateKey, EMAIL_RATE_WINDOW);
      }
      if (count > EMAIL_RATE_LIMIT) {
        logger.warn('Email rate limit exceeded', { organizationId, count, limit: EMAIL_RATE_LIMIT });
        return null;
      }
    } catch (err) {
      // Don't block emails if rate limiting fails
      logger.warn('Email rate limit check failed', { error: err.message });
    }
  }

  let finalSubject = subject;
  let finalHtml = html;
  let finalText = text;

  // If using a template, get it from database or use default
  if (template) {
    let templateRecord = null;

    // Try to get custom template from database
    if (organizationId) {
      templateRecord = await prisma.emailTemplate.findUnique({
        where: {
          organizationId_name: {
            organizationId,
            name: template,
          },
        },
      });
    }

    // Fall back to default template if no custom one exists
    if (!templateRecord) {
      const defaultTemplate = getDefaultTemplate(template);
      if (defaultTemplate) {
        templateRecord = {
          subject: defaultTemplate.subject,
          bodyHtml: defaultTemplate.bodyHtml,
          bodyText: defaultTemplate.bodyText,
        };
      }
    }

    if (templateRecord && templateData) {
      finalSubject = compileTemplate(templateRecord.subject, templateData);
      finalHtml = compileTemplate(templateRecord.bodyHtml, templateData);
      if (templateRecord.bodyText) {
        finalText = compileTemplate(templateRecord.bodyText, templateData);
      }
    }
  }

  // Create email log entry
  const emailLog = await prisma.emailLog.create({
    data: {
      organizationId,
      recipientEmail: to,
      recipientType,
      recipientId,
      subject: finalSubject,
      template: template || 'custom',
      body: finalHtml,
      status: 'PENDING',
    },
  });

  // Check if any email provider is configured
  const brevoConfigured = isBrevoConfigured();
  const smtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD);

  if (!brevoConfigured && !smtpConfigured) {
    logger.info(`Email service: Would send email to ${to} with subject "${finalSubject}" (No email provider configured)`);
    return emailLog;
  }

  try {
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: { status: 'SENDING' },
    });

    // Use Brevo if configured, otherwise fall back to SMTP
    if (brevoConfigured) {
      await sendViaBrevo(to, finalSubject, finalHtml, finalText);
    } else {
      await sendViaSMTP(to, finalSubject, finalHtml, finalText);
    }

    // Update log with success
    const updatedLog = await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    return updatedLog;
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);

    // Update log with failure
    const updatedLog = await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'FAILED',
        errorMessage: error.message,
      },
    });

    return updatedLog;
  }
};

/**
 * Send appointment reminder email
 */
const sendAppointmentReminder = async (prisma, { appointment, client, companySettings, organizationId }) => {
  if (!client?.email) {
    logger.warn(`Cannot send appointment reminder: client has no email`);
    return null;
  }

  const clientName = client.type === 'SRL'
    ? client.companyName
    : `${client.firstName || ''} ${client.lastName || ''}`.trim();

  const templateData = {
    clientName: clientName || 'Client',
    date: new Date(appointment.scheduledStart).toLocaleDateString('ro-RO'),
    time: new Date(appointment.scheduledStart).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
    location: appointment.location,
    description: appointment.description,
    companyName: companySettings?.name || 'ForjaIt',
    companyPhone: companySettings?.phone,
  };

  return sendEmail(prisma, {
    to: client.email,
    template: 'appointment-reminder',
    templateData,
    recipientType: 'CLIENT',
    recipientId: client.id,
    organizationId,
  });
};

/**
 * Send invoice created email
 */
const sendInvoiceCreatedEmail = async (prisma, { invoice, client, companySettings, organizationId }) => {
  if (!client?.email) {
    logger.warn(`Cannot send invoice email: client has no email`);
    return null;
  }

  const clientName = client.type === 'SRL'
    ? client.companyName
    : `${client.firstName || ''} ${client.lastName || ''}`.trim();

  const templateData = {
    clientName: clientName || 'Client',
    invoiceNumber: invoice.invoiceNumber,
    issueDate: new Date(invoice.issueDate).toLocaleDateString('ro-RO'),
    dueDate: new Date(invoice.dueDate).toLocaleDateString('ro-RO'),
    total: Number(invoice.total).toFixed(2),
    pdfUrl: invoice.pdfUrl,
    companyName: companySettings?.name || 'ForjaIt',
    companyPhone: companySettings?.phone,
  };

  return sendEmail(prisma, {
    to: client.email,
    template: 'invoice-created',
    templateData,
    recipientType: 'CLIENT',
    recipientId: client.id,
    organizationId,
  });
};

/**
 * Send welcome email to new client
 */
const sendVerificationEmail = async (prisma, { email, clientName, verificationLink, companySettings, organizationId }) => {
  if (!email) {
    logger.warn(`Cannot send verification email: no email provided`);
    return null;
  }

  const templateData = {
    clientName: clientName || 'Client',
    verificationLink,
    companyName: companySettings?.name || 'ForjaIt',
    companyPhone: companySettings?.phone,
  };

  return sendEmail(prisma, {
    to: email,
    template: 'email-verification',
    templateData,
    recipientType: 'CLIENT',
    organizationId,
  });
};

const sendWelcomeEmail = async (prisma, { client, companySettings, organizationId }) => {
  if (!client?.email) {
    logger.warn(`Cannot send welcome email: client has no email`);
    return null;
  }

  const clientName = client.type === 'SRL'
    ? client.companyName
    : `${client.firstName || ''} ${client.lastName || ''}`.trim();

  const templateData = {
    clientName: clientName || 'Client',
    companyName: companySettings?.name || 'ForjaIt',
    companyPhone: companySettings?.phone,
  };

  return sendEmail(prisma, {
    to: client.email,
    template: 'welcome',
    templateData,
    recipientType: 'CLIENT',
    recipientId: client.id,
    organizationId,
  });
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (prisma, { email, clientName, resetLink, expiresIn, companySettings, organizationId }) => {
  if (!email) {
    logger.warn(`Cannot send password reset email: no email provided`);
    return null;
  }

  const templateData = {
    clientName: clientName || 'Client',
    resetLink,
    expiresIn: expiresIn || '1 ora',
    companyName: companySettings?.name || 'ForjaIt',
    companyPhone: companySettings?.phone,
  };

  return sendEmail(prisma, {
    to: email,
    template: 'password-reset',
    templateData,
    recipientType: 'CLIENT',
    organizationId,
  });
};

/**
 * Send appointment cancelled email
 */
const sendAppointmentCancelledEmail = async (prisma, { appointment, client, cancellationReason, companySettings, organizationId }) => {
  if (!client?.email) {
    logger.warn(`Cannot send appointment cancelled email: client has no email`);
    return null;
  }

  const clientName = client.type === 'SRL'
    ? client.companyName
    : `${client.firstName || ''} ${client.lastName || ''}`.trim();

  const appointmentDate = new Date(appointment.scheduledStart);

  const templateData = {
    clientName: clientName || 'Client',
    date: appointmentDate.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: appointmentDate.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
    location: appointment.location,
    cancellationReason: cancellationReason || appointment.cancellationReason,
    companyName: companySettings?.name || 'ForjaIt',
    companyPhone: companySettings?.phone,
  };

  return sendEmail(prisma, {
    to: client.email,
    template: 'appointment-cancelled',
    templateData,
    recipientType: 'CLIENT',
    recipientId: client.id,
    organizationId,
  });
};

/**
 * Send appointment rescheduled email
 */
const sendAppointmentRescheduledEmail = async (prisma, { appointment, client, oldDate, oldTime, companySettings, organizationId }) => {
  if (!client?.email) {
    logger.warn(`Cannot send appointment rescheduled email: client has no email`);
    return null;
  }

  const clientName = client.type === 'SRL'
    ? client.companyName
    : `${client.firstName || ''} ${client.lastName || ''}`.trim();

  const newDate = new Date(appointment.scheduledStart);

  const templateData = {
    clientName: clientName || 'Client',
    oldDate: oldDate || 'N/A',
    oldTime: oldTime || 'N/A',
    newDate: newDate.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' }),
    newTime: newDate.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
    location: appointment.location,
    companyName: companySettings?.name || 'ForjaIt',
    companyPhone: companySettings?.phone,
  };

  return sendEmail(prisma, {
    to: client.email,
    template: 'appointment-rescheduled',
    templateData,
    recipientType: 'CLIENT',
    recipientId: client.id,
    organizationId,
  });
};

/**
 * Send invoice overdue email to client
 */
const sendInvoiceOverdueEmail = async (prisma, { invoice, client, daysOverdue, companySettings, organizationId }) => {
  if (!client?.email) {
    logger.warn('Cannot send invoice overdue email: client has no email');
    return null;
  }

  const clientName = client.type === 'SRL'
    ? client.companyName
    : `${client.firstName || ''} ${client.lastName || ''}`.trim();

  const templateData = {
    clientName: clientName || 'Client',
    invoiceNumber: invoice.invoiceNumber,
    dueDate: new Date(invoice.dueDate).toLocaleDateString('ro-RO'),
    daysOverdue: daysOverdue || 1,
    total: Number(invoice.total).toFixed(2),
    companyName: companySettings?.name || 'ForjaIt',
    companyPhone: companySettings?.phone,
  };

  return sendEmail(prisma, {
    to: client.email,
    template: 'invoice-overdue',
    templateData,
    recipientType: 'CLIENT',
    recipientId: client.id,
    organizationId,
  });
};

/**
 * Send task assigned email to CRM user
 */
const sendTaskAssignedEmail = async (prisma, { user, task, assignedBy, companySettings, organizationId }) => {
  if (!user?.email) {
    logger.warn('Cannot send task assigned email: user has no email');
    return null;
  }

  const priorityLabels = { HIGH: 'Ridicata', MEDIUM: 'Medie', LOW: 'Scazuta', URGENT: 'Urgenta' };
  const priorityClasses = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low', URGENT: 'high' };

  const templateData = {
    userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Coleg',
    taskTitle: task.title,
    taskDescription: task.description || null,
    priority: priorityLabels[task.priority] || task.priority,
    priorityClass: priorityClasses[task.priority] || 'medium',
    dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString('ro-RO') : null,
    assignedBy: assignedBy || null,
    taskUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tasks`,
    companyName: companySettings?.name || 'ForjaIt',
  };

  return sendEmail(prisma, {
    to: user.email,
    template: 'task-assigned',
    templateData,
    recipientType: 'USER',
    recipientId: user.id,
    organizationId,
  });
};

/**
 * Send payment received email
 */
const sendPaymentReceivedEmail = async (prisma, { client, amount, paymentDate, paymentMethod, invoiceNumber, companySettings, organizationId }) => {
  if (!client?.email) {
    logger.warn(`Cannot send payment received email: client has no email`);
    return null;
  }

  const clientName = client.type === 'SRL'
    ? client.companyName
    : `${client.firstName || ''} ${client.lastName || ''}`.trim();

  const paymentMethods = {
    CASH: 'Numerar',
    CARD: 'Card',
    TRANSFER: 'Transfer bancar',
    OTHER: 'Alta metoda',
  };

  const templateData = {
    clientName: clientName || 'Client',
    amount: typeof amount === 'number' ? amount.toFixed(2) : amount,
    paymentDate: paymentDate instanceof Date
      ? paymentDate.toLocaleDateString('ro-RO')
      : new Date(paymentDate).toLocaleDateString('ro-RO'),
    paymentMethod: paymentMethods[paymentMethod] || paymentMethod,
    invoiceNumber,
    companyName: companySettings?.name || 'ForjaIt',
    companyPhone: companySettings?.phone,
  };

  return sendEmail(prisma, {
    to: client.email,
    template: 'payment-received',
    templateData,
    recipientType: 'CLIENT',
    recipientId: client.id,
    organizationId,
  });
};

/**
 * Get email logs
 */
const getEmailLogs = async (prisma, { page = 1, limit = 50, status, recipientEmail } = {}) => {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (recipientEmail) {
    where.recipientEmail = { contains: recipientEmail, mode: 'insensitive' };
  }

  const [items, total] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.emailLog.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get or create email template
 */
const getOrCreateTemplate = async (prisma, { organizationId, name }) => {
  let template = await prisma.emailTemplate.findUnique({
    where: {
      organizationId_name: { organizationId, name },
    },
  });

  if (!template) {
    const defaultTemplate = getDefaultTemplate(name);
    if (defaultTemplate) {
      template = await prisma.emailTemplate.create({
        data: {
          organizationId,
          name,
          subject: defaultTemplate.subject,
          bodyHtml: defaultTemplate.bodyHtml,
          isActive: true,
        },
      });
    }
  }

  return template;
};

/**
 * Update email template
 */
const updateTemplate = async (prisma, { organizationId, name, subject, bodyHtml, bodyText, isActive }) => {
  return prisma.emailTemplate.upsert({
    where: {
      organizationId_name: { organizationId, name },
    },
    update: {
      subject,
      bodyHtml,
      bodyText,
      isActive,
    },
    create: {
      organizationId,
      name,
      subject,
      bodyHtml,
      bodyText,
      isActive: isActive !== false,
    },
  });
};

/**
 * List all templates for an organization
 */
const listTemplates = async (prisma) => {
  const customTemplates = await prisma.emailTemplate.findMany({
    orderBy: { name: 'asc' },
  });

  // Get all default template names
  const defaultTemplateNames = [
    'email-verification',
    'appointment-reminder',
    'appointment-confirmation',
    'appointment-cancelled',
    'appointment-rescheduled',
    'invoice-created',
    'invoice-overdue',
    'welcome',
    'password-reset',
    'payment-received',
    'task-assigned',
    'loyalty-points-earned',
    'loyalty-tier-upgrade',
    'loyalty-reward-available',
  ];
  const customTemplateNames = new Set(customTemplates.map((t) => t.name));

  // Include default templates that aren't customized
  const templates = [...customTemplates];

  for (const name of defaultTemplateNames) {
    if (!customTemplateNames.has(name)) {
      const defaultTemplate = getDefaultTemplate(name);
      if (defaultTemplate) {
        templates.push({
          id: null,
          name,
          subject: defaultTemplate.subject,
          bodyHtml: defaultTemplate.bodyHtml,
          isActive: true,
          isDefault: true,
        });
      }
    }
  }

  return templates.sort((a, b) => a.name.localeCompare(b.name));
};

module.exports = {
  // Organization-level emails (customizable templates)
  sendEmail,
  sendAppointmentReminder,
  sendInvoiceCreatedEmail,
  sendInvoiceOverdueEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendAppointmentCancelledEmail,
  sendAppointmentRescheduledEmail,
  sendPaymentReceivedEmail,
  sendTaskAssignedEmail,
  // CRM system emails (hardcoded templates, not customizable)
  sendSystemEmail,
  sendCrmPasswordResetEmail,
  sendCrmWelcomeEmail,
  sendOrgSuspendedEmail,
  sendIdleWarningEmail,
  sendTrialEndingEmail,
  sendSubscriptionActivatedEmail,
  sendSubscriptionCancelledEmail,
  sendSubscriptionRenewedEmail,
  sendTrialExpiredEmail,
  sendPaymentRequiredEmail,
  // Template management
  getEmailLogs,
  getOrCreateTemplate,
  updateTemplate,
  listTemplates,
  compileTemplate,
};
