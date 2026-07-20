const { z } = require('zod');

// Common date validation
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .optional();

// UUID validation
const uuidSchema = z.string().uuid('Invalid UUID format').optional();

// Export format validation
const formatSchema = z
  .enum(['csv', 'excel', 'json', 'xml'], {
    errorMap: () => ({ message: 'Format must be one of: csv, excel, json, xml' }),
  })
  .optional()
  .default('excel');

// Status enums for different entities
const appointmentStatusSchema = z
  .enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'])
  .optional();
const invoiceStatusSchema = z
  .enum(['DRAFT', 'GENERATED', 'SENT', 'PREZENTAT', 'PAID', 'OVERDUE', 'CANCELLED'])
  .optional();
const leaveRequestStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional();
const taskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional();

// Search term validation (prevent injection)
const searchSchema = z.string().max(200, 'Search term too long').optional();

// Export filter schemas for each entity
const exportAppointmentsSchema = z
  .object({
    format: formatSchema,
    status: appointmentStatusSchema,
    clientId: uuidSchema,
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    search: searchSchema,
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'startDate must be before or equal to endDate',
      path: ['endDate'],
    }
  );

const exportInvoicesSchema = z
  .object({
    format: formatSchema,
    status: invoiceStatusSchema,
    clientId: uuidSchema,
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    search: searchSchema,
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'startDate must be before or equal to endDate',
      path: ['endDate'],
    }
  );

const exportClientsSchema = z.object({
  format: formatSchema,
  type: z.enum(['PF', 'SRL']).optional(),
  search: searchSchema,
});

const exportUsersSchema = z.object({
  format: formatSchema,
  isActive: z.enum(['true', 'false']).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR']).optional(),
  search: searchSchema,
});

const exportLeaveRequestsSchema = z
  .object({
    format: formatSchema,
    status: leaveRequestStatusSchema,
    employeeId: uuidSchema,
    leaveType: z.string().optional(),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'startDate must be before or equal to endDate',
      path: ['endDate'],
    }
  );

const exportTimeTrackingSchema = z
  .object({
    format: formatSchema,
    employeeId: uuidSchema,
    startDate: dateStringSchema,
    endDate: dateStringSchema,
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'startDate must be before or equal to endDate',
      path: ['endDate'],
    }
  );

const exportTasksSchema = z.object({
  format: formatSchema,
  status: taskStatusSchema,
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  taskType: z.enum(['REPAIR', 'MAINTENANCE', 'INSPECTION', 'DIAGNOSTIC']).optional(),
  search: searchSchema,
});

module.exports = {
  exportAppointmentsSchema,
  exportInvoicesSchema,
  exportClientsSchema,
  exportUsersSchema,
  exportLeaveRequestsSchema,
  exportTimeTrackingSchema,
  exportTasksSchema,
};
