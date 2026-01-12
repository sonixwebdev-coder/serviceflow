const nodemailer = require('nodemailer');
const Handlebars = require('handlebars');
const logger = require('../../utils/logger');

// Create reusable transporter
let transporter = null;

/**
 * Initialize the email transporter
 */
const initTransporter = () => {
  if (transporter) return transporter;

  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
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
  };

  return templates[templateName] || null;
};

/**
 * Send an email
 * @param {Object} prisma - Tenant-scoped Prisma client
 * @param {Object} options - Email options
 * @returns {Promise<Object>} Email log entry
 */
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
  initTransporter();

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

  // If transporter is not configured, just log and return
  if (!transporter) {
    logger.info(`Email service: Would send email to ${to} with subject "${finalSubject}" (SMTP not configured)`);
    return emailLog;
  }

  try {
    // Send the email
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: finalSubject,
      html: finalHtml,
      text: finalText,
    };

    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: { status: 'SENDING' },
    });

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId} to ${to}`);

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
    companyName: companySettings?.name || 'ServiceFlow',
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
    companyName: companySettings?.name || 'ServiceFlow',
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
    companyName: companySettings?.name || 'ServiceFlow',
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
  const defaultTemplateNames = ['appointment-reminder', 'invoice-created', 'welcome', 'appointment-confirmation'];
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
  sendEmail,
  sendAppointmentReminder,
  sendInvoiceCreatedEmail,
  sendWelcomeEmail,
  getEmailLogs,
  getOrCreateTemplate,
  updateTemplate,
  listTemplates,
  compileTemplate,
};
