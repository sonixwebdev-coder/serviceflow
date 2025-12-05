/**
 * Export Service
 * Handles data export for all entities in multiple formats
 */

const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');
const { validateFormat, generateFilename, getEntityNameRO, formatDate, formatDateTime, formatCurrency, getStatusLabelRO, applyFilters } = require('../utils/export/exportUtils');
const { exportEntityToCSV } = require('../utils/export/csvExporter');
const { exportEntityToExcel, fieldConfigToColumns } = require('../utils/export/excelExporter');
const { exportEntityToJSON } = require('../utils/export/jsonExporter');
const { exportEntityToPDF } = require('../utils/export/pdfExporter');
const { exportEntitiesToZip } = require('../utils/export/zipExporter');
const { FIELD_CONFIGS } = require('../utils/export/csvExporter');

// Maximum number of records to export in a single request (security limit)
const MAX_EXPORT_RECORDS = 10000;

/**
 * Check if user has permission to export entity data
 */
const checkExportPermission = (userId, userRoles, entityType, filters = {}) => {
  // Explicit validation
  if (!userId || typeof userId !== 'string') {
    throw new AppError('Invalid user authentication', 401);
  }

  if (!Array.isArray(userRoles) || userRoles.length === 0) {
    throw new AppError('User has no assigned roles', 403);
  }

  // Handle both string array and object array formats
  const roleKeys = userRoles.map(r => {
    if (typeof r === 'string') return r;
    return r.role?.key || r.key;
  }).filter(Boolean);

  if (roleKeys.length === 0) {
    throw new AppError('No valid roles found for user', 403);
  }

  const isAdmin = roleKeys.includes('admin');
  const isManager = roleKeys.includes('manager');

  // Explicit permission matrix - exports are admin-only
  const ENTITY_PERMISSIONS = {
    'appointments': ['admin'],
    'invoices': ['admin'],
    'clients': ['admin'],
    'users': ['admin'],
    'leaveRequests': ['admin'],
    'timeTracking': ['admin'],
    'tasks': ['admin'],
  };

  const allowedRoles = ENTITY_PERMISSIONS[entityType];

  if (!allowedRoles) {
    throw new AppError('Invalid entity type for export', 400);
  }

  const hasPermission = roleKeys.some(role => allowedRoles.includes(role));

  if (!hasPermission) {
    throw new AppError('Insufficient permissions to export this entity', 403);
  }

  // Determine if user filter should be applied
  const restrictedEntities = ['users', 'leaveRequests', 'timeTracking', 'tasks'];
  const shouldFilterToUser = restrictedEntities.includes(entityType) && !isAdmin && !isManager;

  return {
    canExport: true,
    applyUserFilter: shouldFilterToUser,
    userId: shouldFilterToUser ? userId : null
  };
};

/**
 * Transform appointment data for export
 */
const transformAppointmentData = (appointments) => {
  return appointments.map(appt => ({
    id: appt.id,
    title: appt.title || '',
    description: appt.description || '',
    status: getStatusLabelRO(appt.status),
    scheduledStart: formatDateTime(appt.scheduledStart),
    scheduledEnd: formatDateTime(appt.scheduledEnd),
    location: appt.location || '',
    'client.name': appt.client
      ? (appt.client.type === 'SRL'
        ? appt.client.companyName
        : `${appt.client.firstName || ''} ${appt.client.lastName || ''}`.trim())
      : '',
    'client.phone': appt.client?.phone || '',
    'client.email': appt.client?.email || '',
    'vehicle.plateNumber': appt.vehicle?.plateNumber || '',
    'vehicle.make': appt.vehicle?.make || '',
    'vehicle.model': appt.vehicle?.model || '',
    'createdBy.name': appt.createdBy
      ? `${appt.createdBy.firstName || ''} ${appt.createdBy.lastName || ''}`.trim()
      : '',
    createdAt: formatDateTime(appt.createdAt),
    updatedAt: formatDateTime(appt.updatedAt),
  }));
};

/**
 * Export appointments
 */
const exportAppointments = async (format, filters = {}, userId, userRoles) => {
  const normalizedFormat = validateFormat(format);
  const permission = checkExportPermission(userId, userRoles, 'appointments', filters);

  if (!permission.canExport) {
    throw new AppError('You do not have permission to export appointments', 403);
  }

  // Build query filters
  const where = {};

  if (filters.status) {
    where.status = filters.status.toUpperCase();
  }

  if (filters.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters.startDate || filters.endDate) {
    where.scheduledStart = {};
    if (filters.startDate) {
      where.scheduledStart.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.scheduledStart.lte = new Date(filters.endDate);
    }
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  // Fetch data with limit to prevent memory exhaustion
  let appointments;
  try {
    appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: true,
        vehicle: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { scheduledStart: 'desc' },
      take: MAX_EXPORT_RECORDS,
    });
  } catch (error) {
    // Log the real error internally
    console.error('Export query failed:', {
      entityType: 'appointments',
      userId,
      error: error.message,
      stack: error.stack
    });

    // Return sanitized error to client
    throw new AppError(
      'Unable to retrieve data for export. Please try again or contact support if the problem persists.',
      500
    );
  }

  if (appointments.length === 0) {
    throw new AppError('No appointments found matching the criteria', 404);
  }

  // Warn if hitting the record limit
  if (appointments.length >= MAX_EXPORT_RECORDS) {
    throw new AppError(
      `Export limited to ${MAX_EXPORT_RECORDS} records. Please use date filters or other criteria to reduce the dataset.`,
      400
    );
  }

  // Transform data
  const transformedData = transformAppointmentData(appointments);

  // Generate export based on format
  let buffer;
  const filename = generateFilename(getEntityNameRO('appointments'), normalizedFormat);

  switch (normalizedFormat) {
    case 'csv':
      buffer = exportEntityToCSV('appointments', transformedData);
      break;
    case 'excel':
      buffer = await exportEntityToExcel('appointments', transformedData);
      break;
    case 'json':
      buffer = exportEntityToJSON('appointments', appointments);
      break;
    case 'pdf':
      const columns = fieldConfigToColumns(FIELD_CONFIGS.appointments).slice(0, 8); // Limit columns for PDF
      buffer = await exportEntityToPDF('appointments', transformedData, columns);
      break;
    default:
      throw new AppError(`Unsupported format: ${format}`, 400);
  }

  return { buffer, filename, contentType: getContentType(normalizedFormat) };
};

/**
 * Transform invoice data for export
 */
const transformInvoiceData = (invoices) => {
  return invoices.map(inv => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber || '',
    'client.name': inv.client
      ? (inv.client.type === 'SRL'
        ? inv.client.companyName
        : `${inv.client.firstName || ''} ${inv.client.lastName || ''}`.trim())
      : '',
    'client.vatNumber': inv.client?.vatNumber || '',
    status: getStatusLabelRO(inv.status),
    issueDate: formatDate(inv.issueDate),
    dueDate: formatDate(inv.dueDate),
    subtotal: formatCurrency(inv.subtotal),
    tax: formatCurrency(inv.tax),
    total: formatCurrency(inv.total),
    sentAt: inv.sentAt ? formatDateTime(inv.sentAt) : '',
    paidAt: inv.paidAt ? formatDateTime(inv.paidAt) : '',
    notes: inv.notes || '',
  }));
};

/**
 * Export invoices
 */
const exportInvoices = async (format, filters = {}, userId, userRoles) => {
  const normalizedFormat = validateFormat(format);
  const permission = checkExportPermission(userId, userRoles, 'invoices', filters);

  if (!permission.canExport) {
    throw new AppError('You do not have permission to export invoices', 403);
  }

  const where = {};

  if (filters.status) {
    where.status = filters.status.toUpperCase();
  }

  if (filters.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters.startDate || filters.endDate) {
    where.issueDate = {};
    if (filters.startDate) {
      where.issueDate.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.issueDate.lte = new Date(filters.endDate);
    }
  }

  if (filters.search) {
    where.invoiceNumber = {
      contains: filters.search,
      mode: 'insensitive',
    };
  }

  let invoices;
  try {
    invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: true,
        appointment: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { issueDate: 'desc' },
      take: MAX_EXPORT_RECORDS,
    });
  } catch (error) {
    // Log the real error internally
    console.error('Export query failed:', {
      entityType: 'invoices',
      userId,
      error: error.message,
      stack: error.stack
    });

    // Return sanitized error to client
    throw new AppError(
      'Unable to retrieve data for export. Please try again or contact support if the problem persists.',
      500
    );
  }

  if (invoices.length === 0) {
    throw new AppError('No invoices found matching the criteria', 404);
  }

  if (invoices.length >= MAX_EXPORT_RECORDS) {
    throw new AppError(
      `Export limited to ${MAX_EXPORT_RECORDS} records. Please use date filters or other criteria to reduce the dataset.`,
      400
    );
  }

  const transformedData = transformInvoiceData(invoices);

  let buffer;
  const filename = generateFilename(getEntityNameRO('invoices'), normalizedFormat);

  switch (normalizedFormat) {
    case 'csv':
      buffer = exportEntityToCSV('invoices', transformedData);
      break;
    case 'excel':
      buffer = await exportEntityToExcel('invoices', transformedData);
      break;
    case 'json':
      buffer = exportEntityToJSON('invoices', invoices);
      break;
    case 'pdf':
      const columns = fieldConfigToColumns(FIELD_CONFIGS.invoices);
      buffer = await exportEntityToPDF('invoices', transformedData, columns);
      break;
    default:
      throw new AppError(`Unsupported format: ${format}`, 400);
  }

  return { buffer, filename, contentType: getContentType(normalizedFormat) };
};

/**
 * Transform client data for export
 */
const transformClientData = (clients) => {
  return clients.map(client => ({
    id: client.id,
    type: client.type === 'SRL' ? 'Firma' : 'Persoana Fizica',
    firstName: client.firstName || '',
    lastName: client.lastName || '',
    companyName: client.companyName || '',
    contactName: client.contactName || '',
    phone: client.phone || '',
    email: client.email || '',
    vatNumber: client.vatNumber || '',
    registrationNumber: client.registrationNumber || '',
    notes: client.notes || '',
    createdAt: formatDateTime(client.createdAt),
  }));
};

/**
 * Export clients
 */
const exportClients = async (format, filters = {}, userId, userRoles) => {
  const normalizedFormat = validateFormat(format);
  const permission = checkExportPermission(userId, userRoles, 'clients', filters);

  if (!permission.canExport) {
    throw new AppError('You do not have permission to export clients', 403);
  }

  const where = {};

  if (filters.type) {
    where.type = filters.type.toUpperCase();
  }

  // Filter by isOnline status (for separating online vs offline clients)
  if (filters.isOnline !== undefined && filters.isOnline !== null) {
    // Handle both boolean and string values
    const isOnlineValue = filters.isOnline === 'true' || filters.isOnline === true;
    where.isOnline = isOnlineValue;
  }

  if (filters.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { companyName: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { phone: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  let clients;
  try {
    clients = await prisma.client.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { lastName: 'asc' },
        { companyName: 'asc' },
      ],
      take: MAX_EXPORT_RECORDS,
    });
  } catch (error) {
    // Log the real error internally
    console.error('Export query failed:', {
      entityType: 'clients',
      userId,
      error: error.message,
      stack: error.stack
    });

    // Return sanitized error to client
    throw new AppError(
      'Unable to retrieve data for export. Please try again or contact support if the problem persists.',
      500
    );
  }

  if (clients.length === 0) {
    throw new AppError('No clients found matching the criteria', 404);
  }

  if (clients.length >= MAX_EXPORT_RECORDS) {
    throw new AppError(
      `Export limited to ${MAX_EXPORT_RECORDS} records. Please use filters to reduce the dataset.`,
      400
    );
  }

  const transformedData = transformClientData(clients);

  let buffer;
  const filename = generateFilename(getEntityNameRO('clients'), normalizedFormat);

  switch (normalizedFormat) {
    case 'csv':
      buffer = exportEntityToCSV('clients', transformedData);
      break;
    case 'excel':
      buffer = await exportEntityToExcel('clients', transformedData);
      break;
    case 'json':
      buffer = exportEntityToJSON('clients', clients);
      break;
    case 'pdf':
      const columns = fieldConfigToColumns(FIELD_CONFIGS.clients).slice(0, 8);
      buffer = await exportEntityToPDF('clients', transformedData, columns);
      break;
    default:
      throw new AppError(`Unsupported format: ${format}`, 400);
  }

  return { buffer, filename, contentType: getContentType(normalizedFormat) };
};

/**
 * Transform user data for export
 */
const transformUserData = (users) => {
  return users.map(user => ({
    id: user.id,
    email: user.email || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    phoneNumber: user.phoneNumber || '',
    dateOfBirth: user.dateOfBirth ? formatDate(user.dateOfBirth) : '',
    employmentType: user.employmentType || '',
    hourlyRate: user.hourlyRate ? formatCurrency(user.hourlyRate) : '',
    hireDate: user.hireDate ? formatDate(user.hireDate) : '',
    isActive: user.isActive ? 'Da' : 'Nu',
    role: user.roles?.map(r => r.role?.name).join(', ') || '',
  }));
};

/**
 * Export users/employees
 */
const exportUsers = async (format, filters = {}, userId, userRoles) => {
  const normalizedFormat = validateFormat(format);
  const permission = checkExportPermission(userId, userRoles, 'users', filters);

  if (!permission.canExport) {
    throw new AppError('You do not have permission to export users', 403);
  }

  const where = {};

  // If user can only export their own data
  if (permission.applyUserFilter) {
    where.id = userId;
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive === 'true' || filters.isActive === true;
  }

  if (filters.employmentType) {
    where.employmentType = filters.employmentType.toUpperCase();
  }

  if (filters.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  let users;
  try {
    users = await prisma.user.findMany({
      where,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
      take: MAX_EXPORT_RECORDS,
    });
  } catch (error) {
    // Log the real error internally
    console.error('Export query failed:', {
      entityType: 'users',
      userId,
      error: error.message,
      stack: error.stack
    });

    // Return sanitized error to client
    throw new AppError(
      'Unable to retrieve data for export. Please try again or contact support if the problem persists.',
      500
    );
  }

  if (users.length === 0) {
    throw new AppError('No users found matching the criteria', 404);
  }

  if (users.length >= MAX_EXPORT_RECORDS) {
    throw new AppError(
      `Export limited to ${MAX_EXPORT_RECORDS} records. Please use filters to reduce the dataset.`,
      400
    );
  }

  const transformedData = transformUserData(users);

  let buffer;
  const filename = generateFilename(getEntityNameRO('users'), normalizedFormat);

  switch (normalizedFormat) {
    case 'csv':
      buffer = exportEntityToCSV('users', transformedData);
      break;
    case 'excel':
      buffer = await exportEntityToExcel('users', transformedData);
      break;
    case 'json':
      // Remove sensitive data from JSON export
      const sanitizedUsers = users.map(u => {
        const { password, ...rest } = u;
        return rest;
      });
      buffer = exportEntityToJSON('users', sanitizedUsers);
      break;
    case 'pdf':
      const columns = fieldConfigToColumns(FIELD_CONFIGS.users).filter(c =>
        !c.key.includes('password')
      );
      buffer = await exportEntityToPDF('users', transformedData, columns);
      break;
    default:
      throw new AppError(`Unsupported format: ${format}`, 400);
  }

  return { buffer, filename, contentType: getContentType(normalizedFormat) };
};

/**
 * Transform leave request data for export
 */
const transformLeaveRequestData = (requests) => {
  return requests.map(req => ({
    id: req.id,
    'employee.name': req.employee
      ? `${req.employee.firstName || ''} ${req.employee.lastName || ''}`.trim()
      : '',
    leaveType: getStatusLabelRO(req.leaveType),
    status: getStatusLabelRO(req.status),
    startDate: formatDate(req.startDate),
    endDate: formatDate(req.endDate),
    totalDays: req.totalDays || 0,
    reason: req.reason || '',
    'reviewer.name': req.reviewer
      ? `${req.reviewer.firstName || ''} ${req.reviewer.lastName || ''}`.trim()
      : '',
    reviewNotes: req.reviewNotes || '',
    reviewedAt: req.reviewedAt ? formatDateTime(req.reviewedAt) : '',
    createdAt: formatDateTime(req.createdAt),
  }));
};

/**
 * Export leave requests
 */
const exportLeaveRequests = async (format, filters = {}, userId, userRoles) => {
  const normalizedFormat = validateFormat(format);
  const permission = checkExportPermission(userId, userRoles, 'leaveRequests', filters);

  if (!permission.canExport) {
    throw new AppError('You do not have permission to export leave requests', 403);
  }

  const where = {};

  if (permission.applyUserFilter) {
    where.employeeId = userId;
  }

  // Explicit data ownership check
  if (permission.applyUserFilter && filters.employeeId) {
    // Verify user can only access their own data
    if (filters.employeeId !== userId) {
      throw new AppError('You can only export your own leave requests', 403);
    }
  }

  if (filters.status) {
    where.status = filters.status.toUpperCase();
  }

  if (filters.leaveType) {
    where.leaveType = filters.leaveType.toUpperCase();
  }

  if (filters.startDate || filters.endDate) {
    where.startDate = {};
    if (filters.startDate) {
      where.startDate.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.startDate.lte = new Date(filters.endDate);
    }
  }

  let requests;
  try {
    requests = await prisma.timeOffRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
      take: MAX_EXPORT_RECORDS,
    });
  } catch (error) {
    // Log the real error internally
    console.error('Export query failed:', {
      entityType: 'leaveRequests',
      userId,
      error: error.message,
      stack: error.stack
    });

    // Return sanitized error to client
    throw new AppError(
      'Unable to retrieve data for export. Please try again or contact support if the problem persists.',
      500
    );
  }

  if (requests.length === 0) {
    throw new AppError('No leave requests found matching the criteria', 404);
  }

  if (requests.length >= MAX_EXPORT_RECORDS) {
    throw new AppError(
      `Export limited to ${MAX_EXPORT_RECORDS} records. Please use date filters or other criteria to reduce the dataset.`,
      400
    );
  }

  const transformedData = transformLeaveRequestData(requests);

  let buffer;
  const filename = generateFilename(getEntityNameRO('leave-requests'), normalizedFormat);

  switch (normalizedFormat) {
    case 'csv':
      buffer = exportEntityToCSV('leaveRequests', transformedData);
      break;
    case 'excel':
      buffer = await exportEntityToExcel('leaveRequests', transformedData);
      break;
    case 'json':
      buffer = exportEntityToJSON('leaveRequests', requests);
      break;
    case 'pdf':
      const columns = fieldConfigToColumns(FIELD_CONFIGS.leaveRequests);
      buffer = await exportEntityToPDF('leaveRequests', transformedData, columns);
      break;
    default:
      throw new AppError(`Unsupported format: ${format}`, 400);
  }

  return { buffer, filename, contentType: getContentType(normalizedFormat) };
};

/**
 * Transform time tracking data for export
 */
const transformTimeTrackingData = (entries) => {
  return entries.map(entry => ({
    id: entry.id,
    'employee.name': entry.employee
      ? `${entry.employee.firstName || ''} ${entry.employee.lastName || ''}`.trim()
      : '',
    clockIn: formatDateTime(entry.clockIn),
    clockOut: entry.clockOut ? formatDateTime(entry.clockOut) : '',
    breakDuration: entry.breakDuration || 0,
    totalMinutes: entry.totalMinutes || 0,
    clockInLocation: entry.clockInLocation || '',
    clockOutLocation: entry.clockOutLocation || '',
    notes: entry.notes || '',
    source: entry.source || '',
  }));
};

/**
 * Export time tracking entries
 */
const exportTimeTracking = async (format, filters = {}, userId, userRoles) => {
  const normalizedFormat = validateFormat(format);
  const permission = checkExportPermission(userId, userRoles, 'timeTracking', filters);

  if (!permission.canExport) {
    throw new AppError('You do not have permission to export time tracking data', 403);
  }

  const where = {};

  if (permission.applyUserFilter) {
    where.employeeId = userId;
  }

  // Explicit data ownership check
  if (permission.applyUserFilter && filters.employeeId) {
    // Verify user can only access their own data
    if (filters.employeeId !== userId) {
      throw new AppError('You can only export your own time tracking data', 403);
    }
  }

  if (filters.employeeId && !permission.applyUserFilter) {
    where.employeeId = filters.employeeId;
  }

  if (filters.startDate || filters.endDate) {
    where.clockIn = {};
    if (filters.startDate) {
      where.clockIn.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.clockIn.lte = new Date(filters.endDate);
    }
  }

  let entries;
  try {
    entries = await prisma.timeEntry.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { clockIn: 'desc' },
      take: MAX_EXPORT_RECORDS,
    });
  } catch (error) {
    // Log the real error internally
    console.error('Export query failed:', {
      entityType: 'timeTracking',
      userId,
      error: error.message,
      stack: error.stack
    });

    // Return sanitized error to client
    throw new AppError(
      'Unable to retrieve data for export. Please try again or contact support if the problem persists.',
      500
    );
  }

  if (entries.length === 0) {
    throw new AppError('No time tracking entries found matching the criteria', 404);
  }

  if (entries.length >= MAX_EXPORT_RECORDS) {
    throw new AppError(
      `Export limited to ${MAX_EXPORT_RECORDS} records. Please use date filters or other criteria to reduce the dataset.`,
      400
    );
  }

  const transformedData = transformTimeTrackingData(entries);

  let buffer;
  const filename = generateFilename(getEntityNameRO('time-tracking'), normalizedFormat);

  switch (normalizedFormat) {
    case 'csv':
      buffer = exportEntityToCSV('timeTracking', transformedData);
      break;
    case 'excel':
      buffer = await exportEntityToExcel('timeTracking', transformedData);
      break;
    case 'json':
      buffer = exportEntityToJSON('timeTracking', entries);
      break;
    case 'pdf':
      const columns = fieldConfigToColumns(FIELD_CONFIGS.timeTracking);
      buffer = await exportEntityToPDF('timeTracking', transformedData, columns);
      break;
    default:
      throw new AppError(`Unsupported format: ${format}`, 400);
  }

  return { buffer, filename, contentType: getContentType(normalizedFormat) };
};

/**
 * Export tasks
 */
const exportTasks = async (format, filters = {}, userId, userRoles) => {
  const normalizedFormat = validateFormat(format);
  const permission = checkExportPermission(userId, userRoles, 'tasks', filters);

  if (!permission.canExport) {
    throw new AppError('You do not have permission to export tasks', 403);
  }

  const where = {};

  if (permission.applyUserFilter) {
    where.assignments = {
      some: {
        userId: userId,
      },
    };
  }

  if (filters.status) {
    where.status = filters.status.toUpperCase();
  }

  if (filters.priority) {
    where.priority = filters.priority.toUpperCase();
  }

  if (filters.taskType) {
    where.taskType = filters.taskType.toUpperCase();
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  let tasks;
  try {
    tasks = await prisma.task.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_EXPORT_RECORDS,
    });
  } catch (error) {
    // Log the real error internally
    console.error('Export query failed:', {
      entityType: 'tasks',
      userId,
      error: error.message,
      stack: error.stack
    });

    // Return sanitized error to client
    throw new AppError(
      'Unable to retrieve data for export. Please try again or contact support if the problem persists.',
      500
    );
  }

  if (tasks.length === 0) {
    throw new AppError('No tasks found matching the criteria', 404);
  }

  if (tasks.length >= MAX_EXPORT_RECORDS) {
    throw new AppError(
      `Export limited to ${MAX_EXPORT_RECORDS} records. Please use filters to reduce the dataset.`,
      400
    );
  }

  const transformedData = tasks.map(task => ({
    id: task.id,
    title: task.title || '',
    description: task.description || '',
    taskType: task.taskType || '',
    priority: task.priority || '',
    status: getStatusLabelRO(task.status),
    dueDate: task.dueDate ? formatDate(task.dueDate) : '',
    estimatedHours: task.estimatedHours || 0,
    completionPercentage: task.completionPercentage || 0,
    customerName: task.customerName || '',
    customerPhone: task.customerPhone || '',
    customerVehicle: task.customerVehicle || '',
    'createdBy.name': task.createdBy
      ? `${task.createdBy.firstName || ''} ${task.createdBy.lastName || ''}`.trim()
      : '',
    createdAt: formatDateTime(task.createdAt),
  }));

  let buffer;
  const filename = generateFilename(getEntityNameRO('tasks'), normalizedFormat);

  switch (normalizedFormat) {
    case 'csv':
      buffer = exportEntityToCSV('tasks', transformedData);
      break;
    case 'excel':
      buffer = await exportEntityToExcel('tasks', transformedData);
      break;
    case 'json':
      buffer = exportEntityToJSON('tasks', tasks);
      break;
    case 'pdf':
      const columns = fieldConfigToColumns(FIELD_CONFIGS.tasks).slice(0, 8);
      buffer = await exportEntityToPDF('tasks', transformedData, columns);
      break;
    default:
      throw new AppError(`Unsupported format: ${format}`, 400);
  }

  return { buffer, filename, contentType: getContentType(normalizedFormat) };
};

/**
 * Export all data as ZIP archive (admin only)
 */
const exportAllData = async (userId, userRoles) => {
  const roleKeys = userRoles?.map(r => {
    if (typeof r === 'string') return r;
    return r.role?.key || r.key;
  }).filter(Boolean) || [];
  const isAdmin = roleKeys.includes('admin');

  if (!isAdmin) {
    throw new AppError('Only administrators can export all data', 403);
  }

  const entities = [];

  try {
    // Export each entity
    const exportPromises = [
      exportAppointments('excel', {}, userId, userRoles).then(result => ({
        name: 'Programari',
        fileName: result.filename,
        buffer: result.buffer,
        recordCount: 0,
      })).catch(() => null),

      exportInvoices('excel', {}, userId, userRoles).then(result => ({
        name: 'Facturi',
        fileName: result.filename,
        buffer: result.buffer,
        recordCount: 0,
      })).catch(() => null),

      exportClients('excel', {}, userId, userRoles).then(result => ({
        name: 'Clienti',
        fileName: result.filename,
        buffer: result.buffer,
        recordCount: 0,
      })).catch(() => null),

      exportUsers('excel', {}, userId, userRoles).then(result => ({
        name: 'Angajati',
        fileName: result.filename,
        buffer: result.buffer,
        recordCount: 0,
      })).catch(() => null),

      exportLeaveRequests('excel', {}, userId, userRoles).then(result => ({
        name: 'Cereri_Concediu',
        fileName: result.filename,
        buffer: result.buffer,
        recordCount: 0,
      })).catch(() => null),

      exportTimeTracking('excel', {}, userId, userRoles).then(result => ({
        name: 'Pontaj',
        fileName: result.filename,
        buffer: result.buffer,
        recordCount: 0,
      })).catch(() => null),

      exportTasks('excel', {}, userId, userRoles).then(result => ({
        name: 'Sarcini',
        fileName: result.filename,
        buffer: result.buffer,
        recordCount: 0,
      })).catch(() => null),
    ];

    const results = await Promise.all(exportPromises);

    // Filter out null results (entities with no data)
    results.forEach(result => {
      if (result) {
        entities.push(result);
      }
    });

    if (entities.length === 0) {
      throw new AppError('No data available to export', 404);
    }

    // Create ZIP archive
    const metadata = {
      exportedBy: userId,
      totalEntities: entities.length,
    };

    const zipBuffer = await exportEntitiesToZip(entities, metadata);
    const filename = generateFilename('export_complet', 'zip');

    return {
      buffer: zipBuffer,
      filename,
      contentType: 'application/zip',
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Failed to export all data: ${error.message}`, 500);
  }
};

/**
 * Helper to get content type
 */
const getContentType = (format) => {
  const types = {
    csv: 'text/csv; charset=utf-8',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    json: 'application/json; charset=utf-8',
    pdf: 'application/pdf',
    zip: 'application/zip',
  };
  return types[format] || 'application/octet-stream';
};

module.exports = {
  exportAppointments,
  exportInvoices,
  exportClients,
  exportUsers,
  exportLeaveRequests,
  exportTimeTracking,
  exportTasks,
  exportAllData,
};
