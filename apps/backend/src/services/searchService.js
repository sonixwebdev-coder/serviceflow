const logger = require('../utils/logger');

/**
 * Search across all entities
 * @param {Object} prisma - Tenant-scoped Prisma client
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results grouped by entity type
 */
const globalSearch = async (prisma, { query, limit = 5, types = null, locationFilter = {} } = {}) => {
  if (!query || query.trim().length < 2) {
    return { results: [], total: 0 };
  }

  const searchTerm = query.trim().toLowerCase();
  const searchTypes = types ? types.split(',') : ['clients', 'appointments', 'tasks', 'invoices', 'users'];

  const results = {};
  let totalCount = 0;

  // Search in parallel
  const searches = [];

  if (searchTypes.includes('clients')) {
    searches.push(
      searchClients(prisma, searchTerm, limit, locationFilter).then((items) => {
        results.clients = items;
        totalCount += items.length;
      })
    );
  }

  if (searchTypes.includes('appointments')) {
    searches.push(
      searchAppointments(prisma, searchTerm, limit, locationFilter).then((items) => {
        results.appointments = items;
        totalCount += items.length;
      })
    );
  }

  if (searchTypes.includes('tasks')) {
    searches.push(
      searchTasks(prisma, searchTerm, limit, locationFilter).then((items) => {
        results.tasks = items;
        totalCount += items.length;
      })
    );
  }

  if (searchTypes.includes('invoices')) {
    searches.push(
      searchInvoices(prisma, searchTerm, limit, locationFilter).then((items) => {
        results.invoices = items;
        totalCount += items.length;
      })
    );
  }

  if (searchTypes.includes('users')) {
    searches.push(
      searchUsers(prisma, searchTerm, limit).then((items) => {
        results.users = items;
        totalCount += items.length;
      })
    );
  }

  await Promise.all(searches);

  return {
    results,
    total: totalCount,
    query,
  };
};

/**
 * Search clients
 */
const searchClients = async (prisma, query, limit = 5, locationFilter = {}) => {
  const whereConditions = [];

  // Apply location filter
  if (locationFilter && Object.keys(locationFilter).length > 0) {
    whereConditions.push(locationFilter);
  }

  // Add search condition
  whereConditions.push({
    OR: [
      { firstName: { contains: query, mode: 'insensitive' } },
      { lastName: { contains: query, mode: 'insensitive' } },
      { companyName: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
      { phone: { contains: query, mode: 'insensitive' } },
      { fidelityCardSerie: { contains: query, mode: 'insensitive' } },
    ],
  });

  const where = whereConditions.length > 1 ? { AND: whereConditions } : whereConditions[0];

  const clients = await prisma.client.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyName: true,
      type: true,
      email: true,
      phone: true,
    },
    take: limit,
    orderBy: { updatedAt: 'desc' },
  });

  return clients.map((client) => ({
    id: client.id,
    type: 'client',
    title:
      client.type === 'SRL'
        ? client.companyName
        : `${client.firstName || ''} ${client.lastName || ''}`.trim(),
    subtitle: client.email || client.phone || '',
    metadata: { clientType: client.type },
    url: `/crm/clients?clientId=${client.id}`,
  }));
};

/**
 * Search appointments
 */
const searchAppointments = async (prisma, query, limit = 5, locationFilter = {}) => {
  const whereConditions = [];

  // Apply location filter
  if (locationFilter && Object.keys(locationFilter).length > 0) {
    whereConditions.push(locationFilter);
  }

  // Add search condition
  whereConditions.push({
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { location: { contains: query, mode: 'insensitive' } },
      { client: { firstName: { contains: query, mode: 'insensitive' } } },
      { client: { lastName: { contains: query, mode: 'insensitive' } } },
      { client: { companyName: { contains: query, mode: 'insensitive' } } },
    ],
  });

  const where = whereConditions.length > 1 ? { AND: whereConditions } : whereConditions[0];

  const appointments = await prisma.appointment.findMany({
    where,
    select: {
      id: true,
      title: true,
      status: true,
      scheduledStart: true,
      client: {
        select: {
          firstName: true,
          lastName: true,
          companyName: true,
          type: true,
        },
      },
    },
    take: limit,
    orderBy: { scheduledStart: 'desc' },
  });

  return appointments.map((apt) => {
    const clientName =
      apt.client?.type === 'SRL'
        ? apt.client.companyName
        : `${apt.client?.firstName || ''} ${apt.client?.lastName || ''}`.trim();

    return {
      id: apt.id,
      type: 'appointment',
      title: apt.title || 'Programare',
      subtitle: `${clientName} - ${new Date(apt.scheduledStart).toLocaleDateString('ro-RO')}`,
      metadata: { status: apt.status },
      url: `/crm/appointments?appointmentId=${apt.id}`,
    };
  });
};

/**
 * Search tasks
 */
const searchTasks = async (prisma, query, limit = 5, locationFilter = {}) => {
  const whereConditions = [];

  // Apply location filter
  if (locationFilter && Object.keys(locationFilter).length > 0) {
    whereConditions.push(locationFilter);
  }

  // Add search condition
  whereConditions.push({
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { customerName: { contains: query, mode: 'insensitive' } },
    ],
  });

  const where = whereConditions.length > 1 ? { AND: whereConditions } : whereConditions[0];

  const tasks = await prisma.task.findMany({
    where,
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
    },
    take: limit,
    orderBy: { updatedAt: 'desc' },
  });

  return tasks.map((task) => ({
    id: task.id,
    type: 'task',
    title: task.title,
    subtitle: task.dueDate
      ? `Scadenta: ${new Date(task.dueDate).toLocaleDateString('ro-RO')}`
      : `Prioritate: ${task.priority}`,
    metadata: { status: task.status, priority: task.priority },
    url: `/tasks?taskId=${task.id}`,
  }));
};

/**
 * Search invoices
 */
const searchInvoices = async (prisma, query, limit = 5, locationFilter = {}) => {
  const whereConditions = [];

  // Apply location filter through appointment relation
  if (locationFilter && Object.keys(locationFilter).length > 0) {
    whereConditions.push({ appointment: locationFilter });
  }

  // Add search condition
  whereConditions.push({
    OR: [
      { invoiceNumber: { contains: query, mode: 'insensitive' } },
      { client: { firstName: { contains: query, mode: 'insensitive' } } },
      { client: { lastName: { contains: query, mode: 'insensitive' } } },
      { client: { companyName: { contains: query, mode: 'insensitive' } } },
    ],
  });

  const where = whereConditions.length > 1 ? { AND: whereConditions } : whereConditions[0];

  const invoices = await prisma.invoice.findMany({
    where,
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      status: true,
      client: {
        select: {
          firstName: true,
          lastName: true,
          companyName: true,
          type: true,
        },
      },
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return invoices.map((invoice) => {
    const clientName =
      invoice.client?.type === 'SRL'
        ? invoice.client.companyName
        : `${invoice.client?.firstName || ''} ${invoice.client?.lastName || ''}`.trim();

    return {
      id: invoice.id,
      type: 'invoice',
      title: `Factura #${invoice.invoiceNumber}`,
      subtitle: `${clientName} - ${Number(invoice.total).toFixed(2)} RON`,
      metadata: { status: invoice.status },
      url: `/crm/invoices?invoiceId=${invoice.id}`,
    };
  });
};

/**
 * Search users (employees)
 */
const searchUsers = async (prisma, query, limit = 5) => {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
      isActive: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      roles: {
        select: {
          role: {
            select: { name: true },
          },
        },
      },
    },
    take: limit,
    orderBy: { firstName: 'asc' },
  });

  return users.map((user) => ({
    id: user.id,
    type: 'user',
    title: `${user.firstName} ${user.lastName}`,
    subtitle: user.email,
    metadata: { roles: user.roles.map((r) => r.role.name) },
    url: `/employees?userId=${user.id}`,
  }));
};

/**
 * Get quick actions for the command palette
 */
const getQuickActions = () => {
  return [
    {
      id: 'new-appointment',
      type: 'action',
      title: 'Programare noua',
      subtitle: 'Creeaza o programare noua',
      icon: 'calendar',
      action: 'CREATE_APPOINTMENT',
      url: '/crm/appointments?action=create',
    },
    {
      id: 'new-client',
      type: 'action',
      title: 'Client nou',
      subtitle: 'Adauga un client nou',
      icon: 'user-plus',
      action: 'CREATE_CLIENT',
      url: '/crm/clients?action=create',
    },
    {
      id: 'new-task',
      type: 'action',
      title: 'Task nou',
      subtitle: 'Creeaza un task nou',
      icon: 'clipboard',
      action: 'CREATE_TASK',
      url: '/tasks?action=create',
    },
    {
      id: 'new-invoice',
      type: 'action',
      title: 'Factura noua',
      subtitle: 'Emite o factura noua',
      icon: 'file-text',
      action: 'CREATE_INVOICE',
      url: '/crm/invoices?action=create',
    },
  ];
};

/**
 * Get navigation shortcuts
 */
const getNavigationShortcuts = () => {
  return [
    { id: 'nav-dashboard', type: 'navigation', title: 'Tablou de bord', url: '/dashboard', icon: 'layout-dashboard' },
    { id: 'nav-clients', type: 'navigation', title: 'Clienti', url: '/crm/clients', icon: 'users' },
    { id: 'nav-appointments', type: 'navigation', title: 'Programari', url: '/crm/appointments', icon: 'calendar' },
    { id: 'nav-invoices', type: 'navigation', title: 'Facturi', url: '/crm/invoices', icon: 'file-text' },
    { id: 'nav-tasks', type: 'navigation', title: 'Task-uri', url: '/tasks', icon: 'clipboard-list' },
    { id: 'nav-chat', type: 'navigation', title: 'Chat', url: '/chat', icon: 'message-square' },
    { id: 'nav-analytics', type: 'navigation', title: 'Statistici', url: '/analytics', icon: 'bar-chart' },
    { id: 'nav-activity', type: 'navigation', title: 'Activitate', url: '/activity', icon: 'activity' },
    { id: 'nav-profile', type: 'navigation', title: 'Profil', url: '/profile', icon: 'user' },
  ];
};

module.exports = {
  globalSearch,
  searchClients,
  searchAppointments,
  searchTasks,
  searchInvoices,
  searchUsers,
  getQuickActions,
  getNavigationShortcuts,
};
