const cron = require('node-cron');
const prisma = require('../../lib/prisma');
const { createTenantPrisma } = require('../lib/tenantPrisma');
const { sendInvoiceOverdueEmail, sendAppointmentReminder } = require('../services/email/emailService');
const { getCompanySettings } = require('../services/companySettingService');
const logger = require('../utils/logger');

let jobs = {};
const running = {};

/**
 * Daily at 9 AM: check for overdue invoices and mark them + notify clients
 */
function scheduleInvoiceOverdueCheck() {
  const job = cron.schedule('0 9 * * *', async () => {
    if (running.invoiceOverdue) return;
    running.invoiceOverdue = true;
    try {
      const now = new Date();

      // Find all SENT invoices past their due date
      const overdueInvoices = await prisma.invoice.findMany({
        where: {
          status: 'SENT',
          dueDate: { lt: now },
        },
        include: {
          client: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              companyName: true,
              type: true,
            },
          },
          organization: {
            select: { id: true },
          },
        },
      });

      if (overdueInvoices.length === 0) return;

      let markedCount = 0;
      let emailsSent = 0;

      for (const invoice of overdueInvoices) {
        try {
          // Mark as OVERDUE
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'OVERDUE' },
          });
          markedCount++;

          // Send email to client
          if (invoice.client?.email && invoice.organizationId) {
            const daysOverdue = Math.ceil((now - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24));
            const tenantPrisma = createTenantPrisma(invoice.organizationId);
            const companySettings = await getCompanySettings(invoice.organizationId);

            await sendInvoiceOverdueEmail(tenantPrisma, {
              invoice,
              client: invoice.client,
              daysOverdue,
              companySettings,
              organizationId: invoice.organizationId,
            });
            emailsSent++;
          }
        } catch (err) {
          logger.error(`[Notifications] Failed to process overdue invoice ${invoice.invoiceNumber}:`, err.message);
        }
      }

      if (markedCount > 0) {
        logger.info(`[Notifications] Marked ${markedCount} invoices as overdue, sent ${emailsSent} emails`);
      }
    } catch (err) {
      logger.error('[Notifications] Invoice overdue check failed:', err.message);
    } finally {
      running.invoiceOverdue = false;
    }
  }, { scheduled: false });

  jobs.invoiceOverdue = job;
  return job;
}

/**
 * Daily at 8 AM: send appointment reminders for tomorrow's appointments
 */
function scheduleAppointmentReminders() {
  const job = cron.schedule('0 8 * * *', async () => {
    if (running.appointmentReminders) return;
    running.appointmentReminders = true;
    try {
      const now = new Date();
      const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);

      // Find all appointments scheduled for tomorrow that aren't cancelled
      const appointments = await prisma.appointment.findMany({
        where: {
          scheduledStart: {
            gte: tomorrowStart,
            lte: tomorrowEnd,
          },
          status: {
            notIn: ['CANCELLED'],
          },
        },
        include: {
          client: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              companyName: true,
              type: true,
            },
          },
        },
      });

      if (appointments.length === 0) return;

      let emailsSent = 0;

      for (const appointment of appointments) {
        try {
          if (!appointment.client?.email || !appointment.organizationId) continue;

          const tenantPrisma = createTenantPrisma(appointment.organizationId);
          const companySettings = await getCompanySettings(appointment.organizationId);

          await sendAppointmentReminder(tenantPrisma, {
            appointment,
            client: appointment.client,
            companySettings,
            organizationId: appointment.organizationId,
          });
          emailsSent++;
        } catch (err) {
          logger.error(`[Notifications] Failed to send reminder for appointment ${appointment.id}:`, err.message);
        }
      }

      if (emailsSent > 0) {
        logger.info(`[Notifications] Sent ${emailsSent} appointment reminders for tomorrow (${appointments.length} total appointments)`);
      }
    } catch (err) {
      logger.error('[Notifications] Appointment reminder check failed:', err.message);
    } finally {
      running.appointmentReminders = false;
    }
  }, { scheduled: false });

  jobs.appointmentReminders = job;
  return job;
}

function startAllJobs() {
  scheduleInvoiceOverdueCheck();
  scheduleAppointmentReminders();

  Object.values(jobs).forEach((job) => job.start());
  logger.info('[Notifications] All notification jobs started');
}

function stopAllJobs() {
  Object.values(jobs).forEach((job) => job.stop());
  jobs = {};
}

function getJobsStatus() {
  return {
    invoiceOverdue: jobs.invoiceOverdue ? 'running' : 'stopped',
    appointmentReminders: jobs.appointmentReminders ? 'running' : 'stopped',
  };
}

module.exports = {
  startAllJobs,
  stopAllJobs,
  getJobsStatus,
};
