const {
  subDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  format,
  differenceInDays,
} = require('date-fns');

/**
 * Get revenue trends over time
 * @param {Object} prisma - Tenant-scoped Prisma client
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Revenue data grouped by period
 */
const getRevenueTrends = async (
  prisma,
  { startDate, endDate, groupBy = 'day', locationFilter = {} } = {}
) => {
  const now = new Date();
  const start = startDate ? new Date(startDate) : subDays(now, 30);
  const end = endDate ? new Date(endDate) : now;

  // Build base where clause with location filter for invoices (via appointment)
  const baseWhere = {
    status: 'PAID',
  };

  // Apply location filter through appointment relation if provided
  if (locationFilter && Object.keys(locationFilter).length > 0) {
    baseWhere.appointment = locationFilter;
  }

  // Get paid invoices within the date range
  // Use OR logic: paidAt in range, OR status PAID with issueDate in range (fallback for older records)
  const invoices = await prisma.invoice.findMany({
    where: {
      ...baseWhere,
      OR: [
        {
          paidAt: {
            gte: startOfDay(start),
            lte: endOfDay(end),
          },
        },
        {
          paidAt: null,
          issueDate: {
            gte: startOfDay(start),
            lte: endOfDay(end),
          },
        },
      ],
    },
    select: {
      id: true,
      total: true,
      paidAt: true,
      issueDate: true,
    },
    orderBy: {
      paidAt: 'asc',
    },
    take: 5000,
  });

  // Group invoices by period
  const groupedRevenue = {};
  const dateFormat =
    groupBy === 'month' ? 'yyyy-MM' : groupBy === 'week' ? 'yyyy-ww' : 'yyyy-MM-dd';

  invoices.forEach((invoice) => {
    // Use paidAt if available, otherwise fall back to issueDate
    const dateToUse = invoice.paidAt || invoice.issueDate;
    const periodKey = format(new Date(dateToUse), dateFormat);
    if (!groupedRevenue[periodKey]) {
      groupedRevenue[periodKey] = { period: periodKey, revenue: 0, count: 0 };
    }
    groupedRevenue[periodKey].revenue += Number(invoice.total) || 0;
    groupedRevenue[periodKey].count += 1;
  });

  // Calculate totals
  const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  const totalInvoices = invoices.length;

  // Get previous period for comparison
  const daysDiff = differenceInDays(end, start);
  const prevStart = subDays(start, daysDiff);
  const prevEnd = subDays(end, daysDiff);

  const prevInvoices = await prisma.invoice.findMany({
    where: {
      ...baseWhere,
      OR: [
        {
          paidAt: {
            gte: startOfDay(prevStart),
            lte: endOfDay(prevEnd),
          },
        },
        {
          paidAt: null,
          issueDate: {
            gte: startOfDay(prevStart),
            lte: endOfDay(prevEnd),
          },
        },
      ],
    },
    select: {
      total: true,
    },
    take: 5000,
  });

  const prevRevenue = prevInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  return {
    data: Object.values(groupedRevenue).sort((a, b) => a.period.localeCompare(b.period)),
    summary: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalInvoices,
      previousPeriodRevenue: Math.round(prevRevenue * 100) / 100,
      revenueChange: Math.round(revenueChange * 100) / 100,
    },
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
      groupBy,
    },
  };
};

/**
 * Get appointment statistics
 * @param {Object} prisma - Tenant-scoped Prisma client
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Appointment metrics
 */
const getAppointmentStats = async (prisma, { startDate, endDate, locationFilter = {} } = {}) => {
  const now = new Date();
  const start = startDate ? new Date(startDate) : subDays(now, 30);
  const end = endDate ? new Date(endDate) : now;

  // Build where clause with location filter
  const baseWhere = {
    scheduledStart: {
      gte: startOfDay(start),
      lte: endOfDay(end),
    },
  };

  // Apply location filter
  if (locationFilter && Object.keys(locationFilter).length > 0) {
    Object.assign(baseWhere, locationFilter);
  }

  // Get appointments within the date range
  const appointments = await prisma.appointment.findMany({
    where: baseWhere,
    select: {
      id: true,
      status: true,
      scheduledStart: true,
      paymentStatus: true,
    },
    take: 10000,
  });

  // Count by status
  const statusCounts = {
    PENDING: 0,
    PREZENTAT: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  appointments.forEach((apt) => {
    if (Object.prototype.hasOwnProperty.call(statusCounts, apt.status)) {
      statusCounts[apt.status]++;
    }
  });

  const total = appointments.length;
  const completed = statusCounts.COMPLETED;
  const cancelled = statusCounts.CANCELLED;
  const inProgress = statusCounts.IN_PROGRESS + statusCounts.PREZENTAT + statusCounts.PENDING;

  // Calculate completion rate (excluding cancelled)
  const nonCancelled = total - cancelled;
  const completionRate = nonCancelled > 0 ? (completed / nonCancelled) * 100 : 0;
  const cancellationRate = total > 0 ? (cancelled / total) * 100 : 0;

  // Get daily breakdown for chart
  const dailyData = {};
  appointments.forEach((apt) => {
    const day = format(new Date(apt.scheduledStart), 'yyyy-MM-dd');
    if (!dailyData[day]) {
      dailyData[day] = { date: day, total: 0, completed: 0, cancelled: 0 };
    }
    dailyData[day].total++;
    if (apt.status === 'COMPLETED') dailyData[day].completed++;
    if (apt.status === 'CANCELLED') dailyData[day].cancelled++;
  });

  // Get previous period for comparison
  const daysDiff = differenceInDays(end, start);
  const prevStart = subDays(start, daysDiff);
  const prevEnd = subDays(end, daysDiff);

  const prevWhere = {
    scheduledStart: {
      gte: startOfDay(prevStart),
      lte: endOfDay(prevEnd),
    },
  };
  if (locationFilter && Object.keys(locationFilter).length > 0) {
    Object.assign(prevWhere, locationFilter);
  }

  const prevAppointments = await prisma.appointment.count({
    where: prevWhere,
  });

  const appointmentChange =
    prevAppointments > 0 ? ((total - prevAppointments) / prevAppointments) * 100 : 0;

  return {
    data: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
    summary: {
      total,
      completed,
      cancelled,
      inProgress,
      completionRate: Math.round(completionRate * 100) / 100,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      previousPeriodTotal: prevAppointments,
      appointmentChange: Math.round(appointmentChange * 100) / 100,
    },
    byStatus: statusCounts,
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
  };
};

/**
 * Get client acquisition metrics
 * @param {Object} prisma - Tenant-scoped Prisma client
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Client growth data
 */
const getClientAcquisition = async (
  prisma,
  { startDate, endDate, groupBy = 'day', locationFilter = {} } = {}
) => {
  const now = new Date();
  const start = startDate ? new Date(startDate) : subDays(now, 30);
  const end = endDate ? new Date(endDate) : now;

  // Build where clause with location filter
  const baseWhere = {
    createdAt: {
      gte: startOfDay(start),
      lte: endOfDay(end),
    },
  };

  // Apply location filter
  if (locationFilter && Object.keys(locationFilter).length > 0) {
    Object.assign(baseWhere, locationFilter);
  }

  // Get new clients within the date range
  const clients = await prisma.client.findMany({
    where: baseWhere,
    select: {
      id: true,
      createdAt: true,
      type: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: 5000,
  });

  // Group by period
  const groupedClients = {};
  const dateFormat =
    groupBy === 'month' ? 'yyyy-MM' : groupBy === 'week' ? 'yyyy-ww' : 'yyyy-MM-dd';

  clients.forEach((client) => {
    const periodKey = format(new Date(client.createdAt), dateFormat);
    if (!groupedClients[periodKey]) {
      groupedClients[periodKey] = { period: periodKey, newClients: 0, pf: 0, srl: 0 };
    }
    groupedClients[periodKey].newClients++;
    if (client.type === 'PF') groupedClients[periodKey].pf++;
    if (client.type === 'SRL') groupedClients[periodKey].srl++;
  });

  // Get total client count (with location filter)
  const totalClientWhere =
    locationFilter && Object.keys(locationFilter).length > 0 ? locationFilter : undefined;
  const totalClients = await prisma.client.count({ where: totalClientWhere });

  // Get previous period for comparison
  const daysDiff = differenceInDays(end, start);
  const prevStart = subDays(start, daysDiff);
  const prevEnd = subDays(end, daysDiff);

  const prevWhere = {
    createdAt: {
      gte: startOfDay(prevStart),
      lte: endOfDay(prevEnd),
    },
  };
  if (locationFilter && Object.keys(locationFilter).length > 0) {
    Object.assign(prevWhere, locationFilter);
  }

  const prevClients = await prisma.client.count({
    where: prevWhere,
  });

  const newClientsCount = clients.length;
  const growthRate = prevClients > 0 ? ((newClientsCount - prevClients) / prevClients) * 100 : 0;

  // Client type breakdown
  const typeBreakdown = {
    PF: clients.filter((c) => c.type === 'PF').length,
    SRL: clients.filter((c) => c.type === 'SRL').length,
  };

  return {
    data: Object.values(groupedClients).sort((a, b) => a.period.localeCompare(b.period)),
    summary: {
      totalClients,
      newClients: newClientsCount,
      previousPeriodNew: prevClients,
      growthRate: Math.round(growthRate * 100) / 100,
    },
    byType: typeBreakdown,
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
      groupBy,
    },
  };
};

/**
 * Get invoice aging report
 * @param {Object} prisma - Tenant-scoped Prisma client
 * @returns {Promise<Object>} Invoice aging buckets
 */
const getInvoiceAging = async (prisma, { locationFilter = {} } = {}) => {
  const now = new Date();

  // Build where clause with location filter
  const invoiceWhere = {
    status: {
      in: ['GENERATED', 'SENT', 'OVERDUE'],
    },
  };
  if (locationFilter && Object.keys(locationFilter).length > 0) {
    invoiceWhere.appointment = locationFilter;
  }

  // Get all unpaid/overdue invoices
  const invoices = await prisma.invoice.findMany({
    where: invoiceWhere,
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      dueDate: true,
      status: true,
      issueDate: true,
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
          type: true,
        },
      },
    },
    orderBy: {
      dueDate: 'asc',
    },
    take: 500,
  });

  // Categorize into aging buckets
  const buckets = {
    current: { label: 'Curente', invoices: [], total: 0 },
    overdue30: { label: '1-30 zile intarziere', invoices: [], total: 0 },
    overdue60: { label: '31-60 zile intarziere', invoices: [], total: 0 },
    overdue90: { label: '61-90 zile intarziere', invoices: [], total: 0 },
    overdue90plus: { label: '90+ zile intarziere', invoices: [], total: 0 },
  };

  invoices.forEach((invoice) => {
    const dueDate = new Date(invoice.dueDate);
    const daysOverdue = differenceInDays(now, dueDate);
    const amount = Number(invoice.total) || 0;

    const invoiceData = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      total: amount,
      dueDate: invoice.dueDate,
      daysOverdue: Math.max(0, daysOverdue),
      client: invoice.client,
    };

    if (daysOverdue <= 0) {
      buckets.current.invoices.push(invoiceData);
      buckets.current.total += amount;
    } else if (daysOverdue <= 30) {
      buckets.overdue30.invoices.push(invoiceData);
      buckets.overdue30.total += amount;
    } else if (daysOverdue <= 60) {
      buckets.overdue60.invoices.push(invoiceData);
      buckets.overdue60.total += amount;
    } else if (daysOverdue <= 90) {
      buckets.overdue90.invoices.push(invoiceData);
      buckets.overdue90.total += amount;
    } else {
      buckets.overdue90plus.invoices.push(invoiceData);
      buckets.overdue90plus.total += amount;
    }
  });

  // Round totals
  Object.keys(buckets).forEach((key) => {
    buckets[key].total = Math.round(buckets[key].total * 100) / 100;
    buckets[key].count = buckets[key].invoices.length;
  });

  const totalOutstanding = Object.values(buckets).reduce((sum, b) => sum + b.total, 0);
  const totalOverdue = totalOutstanding - buckets.current.total;

  return {
    buckets,
    summary: {
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      totalInvoices: invoices.length,
      overdueInvoices: invoices.length - buckets.current.invoices.length,
    },
  };
};

/**
 * Get dashboard overview metrics
 * @param {Object} prisma - Tenant-scoped Prisma client
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Dashboard overview
 */
const getDashboardOverview = async (prisma, { locationFilter = {} } = {}) => {
  const now = new Date();
  const startOfToday = startOfDay(now);
  const endOfToday = endOfDay(now);
  const startOfThisMonth = startOfMonth(now);
  const endOfThisMonth = endOfMonth(now);
  const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
  const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });

  // Last month dates for comparison
  const startOfLastMonth = startOfMonth(subDays(startOfThisMonth, 1));
  const endOfLastMonth = endOfMonth(startOfLastMonth);

  // Build location-filtered where clauses
  const clientWhere =
    locationFilter && Object.keys(locationFilter).length > 0 ? locationFilter : undefined;
  const appointmentWhere = (dateFilter) => {
    const where = { ...dateFilter };
    if (locationFilter && Object.keys(locationFilter).length > 0) {
      Object.assign(where, locationFilter);
    }
    return where;
  };
  const taskWhere = (statusFilter) => {
    const where = { ...statusFilter };
    if (locationFilter && Object.keys(locationFilter).length > 0) {
      Object.assign(where, locationFilter);
    }
    return where;
  };
  const invoiceWhere = (baseFilter) => {
    const where = { ...baseFilter };
    if (locationFilter && Object.keys(locationFilter).length > 0) {
      where.appointment = locationFilter;
    }
    return where;
  };

  // Run all queries in parallel
  const [
    totalClients,
    todayAppointments,
    weekAppointments,
    monthRevenue,
    lastMonthRevenue,
    paidInvoicesThisMonth,
    pendingInvoicesAmount,
    pendingInvoices,
    overdueInvoices,
    activeTasks,
  ] = await Promise.all([
    // Total clients
    prisma.client.count({ where: clientWhere }),

    // Today's appointments
    prisma.appointment.count({
      where: appointmentWhere({
        scheduledStart: {
          gte: startOfToday,
          lte: endOfToday,
        },
      }),
    }),

    // This week's appointments
    prisma.appointment.count({
      where: appointmentWhere({
        scheduledStart: {
          gte: startOfThisWeek,
          lte: endOfThisWeek,
        },
      }),
    }),

    // This month's revenue (from paid invoices)
    // Use OR logic: paidAt in range, OR status PAID with issueDate in range (fallback for older records)
    prisma.invoice.aggregate({
      where: invoiceWhere({
        status: 'PAID',
        OR: [
          {
            paidAt: {
              gte: startOfThisMonth,
              lte: endOfThisMonth,
            },
          },
          {
            paidAt: null,
            issueDate: {
              gte: startOfThisMonth,
              lte: endOfThisMonth,
            },
          },
        ],
      }),
      _sum: {
        total: true,
      },
    }),

    // Last month's revenue (for comparison)
    prisma.invoice.aggregate({
      where: invoiceWhere({
        status: 'PAID',
        OR: [
          {
            paidAt: {
              gte: startOfLastMonth,
              lte: endOfLastMonth,
            },
          },
          {
            paidAt: null,
            issueDate: {
              gte: startOfLastMonth,
              lte: endOfLastMonth,
            },
          },
        ],
      }),
      _sum: {
        total: true,
      },
    }),

    // Count of paid invoices this month
    prisma.invoice.count({
      where: invoiceWhere({
        status: 'PAID',
        OR: [
          {
            paidAt: {
              gte: startOfThisMonth,
              lte: endOfThisMonth,
            },
          },
          {
            paidAt: null,
            issueDate: {
              gte: startOfThisMonth,
              lte: endOfThisMonth,
            },
          },
        ],
      }),
    }),

    // Pending invoices total amount (unpaid)
    prisma.invoice.aggregate({
      where: invoiceWhere({
        status: {
          in: ['GENERATED', 'SENT', 'OVERDUE'],
        },
      }),
      _sum: {
        total: true,
      },
    }),

    // Pending invoices count
    prisma.invoice.count({
      where: invoiceWhere({
        status: {
          in: ['GENERATED', 'SENT'],
        },
      }),
    }),

    // Overdue invoices
    prisma.invoice.count({
      where: invoiceWhere({
        status: 'OVERDUE',
      }),
    }),

    // Active tasks
    prisma.task.count({
      where: taskWhere({
        status: {
          in: ['TODO', 'IN_PROGRESS'],
        },
      }),
    }),
  ]);

  const thisMonthTotal = Math.round((Number(monthRevenue._sum.total) || 0) * 100) / 100;
  const lastMonthTotal = Math.round((Number(lastMonthRevenue._sum.total) || 0) * 100) / 100;
  const pendingTotal = Math.round((Number(pendingInvoicesAmount._sum.total) || 0) * 100) / 100;

  // Calculate percentage change
  let changePercent = null;
  if (lastMonthTotal > 0) {
    changePercent =
      Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 * 10) / 10;
  } else if (thisMonthTotal > 0) {
    changePercent = 100; // If last month was 0, show 100% increase
  }

  return {
    clients: {
      total: totalClients,
    },
    appointments: {
      today: todayAppointments,
      thisWeek: weekAppointments,
    },
    revenue: {
      thisMonth: thisMonthTotal,
      lastMonth: lastMonthTotal,
      changePercent,
      paidInvoices: paidInvoicesThisMonth,
      pendingTotal,
    },
    invoices: {
      pending: pendingInvoices,
      overdue: overdueInvoices,
    },
    tasks: {
      active: activeTasks,
    },
  };
};

/**
 * Get top clients by revenue
 * @param {Object} prisma - Tenant-scoped Prisma client
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Top clients
 */
const getTopClients = async (
  prisma,
  { startDate, endDate, limit = 10, locationFilter = {} } = {}
) => {
  const now = new Date();
  const start = startDate ? new Date(startDate) : subDays(now, 90);
  const end = endDate ? new Date(endDate) : now;

  // Build where clause with location filter (via appointment relation)
  const invoiceWhere = {
    paidAt: {
      gte: startOfDay(start),
      lte: endOfDay(end),
    },
    status: 'PAID',
  };
  if (locationFilter && Object.keys(locationFilter).length > 0) {
    invoiceWhere.appointment = locationFilter;
  }

  // Get invoices grouped by client
  const clientRevenue = await prisma.invoice.groupBy({
    by: ['clientId'],
    where: invoiceWhere,
    _sum: {
      total: true,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _sum: {
        total: 'desc',
      },
    },
    take: limit,
  });

  // Get client details
  const clientIds = clientRevenue.map((c) => c.clientId);
  const clients = await prisma.client.findMany({
    where: {
      id: { in: clientIds },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyName: true,
      type: true,
    },
  });

  const clientMap = new Map(clients.map((c) => [c.id, c]));

  return clientRevenue.map((cr) => {
    const client = clientMap.get(cr.clientId);
    return {
      client,
      revenue: Math.round((Number(cr._sum.total) || 0) * 100) / 100,
      invoiceCount: cr._count.id,
    };
  });
};

/**
 * Get analytics comparison across all locations
 * Returns key metrics for each location for comparison
 * @param {Object} prisma - Tenant-scoped Prisma client
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Location comparison data
 */
const getLocationComparison = async (prisma, { startDate, endDate } = {}) => {
  const now = new Date();
  const start = startDate ? new Date(startDate) : subDays(now, 30);
  const end = endDate ? new Date(endDate) : now;

  // Get all locations for this organization
  const locations = await prisma.location.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      isPrimary: true,
    },
    orderBy: { name: 'asc' },
  });

  // Batch all metrics in 7 queries total (instead of 7 per location)
  const startOfPeriod = startOfDay(start);
  const endOfPeriod = endOfDay(end);

  const [
    apptCountsByLocation,
    completedApptsByLocation,
    clientCountsByLocation,
    newClientsByLocation,
    taskCountsByLocation,
    completedTasksByLocation,
    revenueByLocation,
  ] = await Promise.all([
    // Total appointments grouped by locationId
    prisma.appointment.groupBy({
      by: ['locationId'],
      where: { scheduledStart: { gte: startOfPeriod, lte: endOfPeriod } },
      _count: { id: true },
    }),

    // Completed appointments grouped by locationId
    prisma.appointment.groupBy({
      by: ['locationId'],
      where: { status: 'COMPLETED', scheduledStart: { gte: startOfPeriod, lte: endOfPeriod } },
      _count: { id: true },
    }),

    // Total clients per location (all time)
    prisma.client.groupBy({
      by: ['locationId'],
      _count: { id: true },
    }),

    // New clients per location in period
    prisma.client.groupBy({
      by: ['locationId'],
      where: { createdAt: { gte: startOfPeriod, lte: endOfPeriod } },
      _count: { id: true },
    }),

    // Total tasks per location in period
    prisma.task.groupBy({
      by: ['locationId'],
      where: { createdAt: { gte: startOfPeriod, lte: endOfPeriod } },
      _count: { id: true },
    }),

    // Completed tasks per location in period
    prisma.task.groupBy({
      by: ['locationId'],
      where: { status: 'COMPLETED', updatedAt: { gte: startOfPeriod, lte: endOfPeriod } },
      _count: { id: true },
    }),

    // Revenue per location via appointment join - aggregate per appointment locationId
    prisma.invoice
      .groupBy({
        by: ['appointmentId'],
        where: {
          status: 'PAID',
          OR: [
            { paidAt: { gte: startOfPeriod, lte: endOfPeriod } },
            { paidAt: null, issueDate: { gte: startOfPeriod, lte: endOfPeriod } },
          ],
        },
        _sum: { total: true },
      })
      .then(async (invoiceSums) => {
        // Resolve locationId for each appointmentId
        const appointmentIds = invoiceSums.map((r) => r.appointmentId).filter(Boolean);
        if (appointmentIds.length === 0) return [];
        const appts = await prisma.appointment.findMany({
          where: { id: { in: appointmentIds } },
          select: { id: true, locationId: true },
          take: 5000,
        });
        const apptLocationMap = Object.fromEntries(appts.map((a) => [a.id, a.locationId]));
        // Aggregate revenue by locationId
        const revenueMap = {};
        for (const row of invoiceSums) {
          const locId = apptLocationMap[row.appointmentId];
          if (!locId) continue;
          revenueMap[locId] = (revenueMap[locId] || 0) + Number(row._sum.total || 0);
        }
        return Object.entries(revenueMap).map(([locationId, revenue]) => ({ locationId, revenue }));
      }),
  ]);

  // Build lookup maps for O(1) access
  const toMap = (arr, key = 'locationId') =>
    Object.fromEntries(arr.map((r) => [r[key], r._count?.id ?? 0]));
  const apptMap = toMap(apptCountsByLocation);
  const completedApptMap = toMap(completedApptsByLocation);
  const clientMap = toMap(clientCountsByLocation);
  const newClientMap = toMap(newClientsByLocation);
  const taskMap = toMap(taskCountsByLocation);
  const completedTaskMap = toMap(completedTasksByLocation);
  const revenueMap = Object.fromEntries(revenueByLocation.map((r) => [r.locationId, r.revenue]));

  const locationMetrics = locations.map((location) => {
    const lid = location.id;
    const appointmentCount = apptMap[lid] ?? 0;
    const completedAppointments = completedApptMap[lid] ?? 0;
    const clientCount = clientMap[lid] ?? 0;
    const newClients = newClientMap[lid] ?? 0;
    const taskCount = taskMap[lid] ?? 0;
    const completedTasks = completedTaskMap[lid] ?? 0;
    const revenue = revenueMap[lid] ?? 0;

    return {
      location: {
        id: location.id,
        name: location.name,
        slug: location.slug,
        isPrimary: location.isPrimary,
      },
      metrics: {
        appointments: {
          total: appointmentCount,
          completed: completedAppointments,
          completionRate:
            appointmentCount > 0 ? Math.round((completedAppointments / appointmentCount) * 100) : 0,
        },
        clients: {
          total: clientCount,
          new: newClients,
        },
        revenue: Math.round(revenue * 100) / 100,
        tasks: {
          total: taskCount,
          completed: completedTasks,
        },
      },
    };
  });

  // Get unassigned records (null locationId) - legacy data
  const [unassignedClients, unassignedNewClients, unassignedTasks] = await Promise.all([
    prisma.client.count({
      where: { locationId: null },
    }),
    prisma.client.count({
      where: {
        locationId: null,
        createdAt: {
          gte: startOfDay(start),
          lte: endOfDay(end),
        },
      },
    }),
    prisma.task.count({
      where: {
        locationId: null,
        createdAt: {
          gte: startOfDay(start),
          lte: endOfDay(end),
        },
      },
    }),
  ]);

  // Calculate totals across all locations
  const totals = locationMetrics.reduce(
    (acc, loc) => ({
      appointments: acc.appointments + loc.metrics.appointments.total,
      completedAppointments: acc.completedAppointments + loc.metrics.appointments.completed,
      clients: acc.clients + loc.metrics.clients.total,
      newClients: acc.newClients + loc.metrics.clients.new,
      revenue: acc.revenue + loc.metrics.revenue,
      tasks: acc.tasks + loc.metrics.tasks.total,
      completedTasks: acc.completedTasks + loc.metrics.tasks.completed,
    }),
    {
      appointments: 0,
      completedAppointments: 0,
      clients: 0,
      newClients: 0,
      revenue: 0,
      tasks: 0,
      completedTasks: 0,
    }
  );

  // Add unassigned to totals
  totals.clients += unassignedClients;
  totals.newClients += unassignedNewClients;
  totals.tasks += unassignedTasks;

  return {
    period: {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    },
    locations: locationMetrics,
    unassigned: {
      clients: {
        total: unassignedClients,
        new: unassignedNewClients,
      },
      tasks: {
        total: unassignedTasks,
      },
    },
    totals: {
      appointments: {
        total: totals.appointments,
        completed: totals.completedAppointments,
        completionRate:
          totals.appointments > 0
            ? Math.round((totals.completedAppointments / totals.appointments) * 100)
            : 0,
      },
      clients: {
        total: totals.clients,
        new: totals.newClients,
      },
      revenue: Math.round(totals.revenue * 100) / 100,
      tasks: {
        total: totals.tasks,
        completed: totals.completedTasks,
      },
    },
  };
};

/**
 * Get payment trends over time (independent of invoices)
 * @param {Object} prisma - Tenant-scoped Prisma client
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Payment data grouped by period
 */
const getPaymentTrends = async (
  prisma,
  { startDate, endDate, groupBy = 'day', locationFilter = {} } = {}
) => {
  const now = new Date();
  const start = startDate ? new Date(startDate) : subDays(now, 30);
  const end = endDate ? new Date(endDate) : now;

  const baseWhere = {
    paymentDate: {
      gte: startOfDay(start),
      lte: endOfDay(end),
    },
  };

  if (locationFilter && Object.keys(locationFilter).length > 0) {
    baseWhere.appointment = locationFilter;
  }

  const payments = await prisma.payment.findMany({
    where: baseWhere,
    select: {
      id: true,
      amount: true,
      paymentDate: true,
    },
    orderBy: {
      paymentDate: 'asc',
    },
    take: 5000,
  });

  const groupedPayments = {};
  const dateFormat =
    groupBy === 'month' ? 'yyyy-MM' : groupBy === 'week' ? 'yyyy-ww' : 'yyyy-MM-dd';

  payments.forEach((payment) => {
    const periodKey = format(new Date(payment.paymentDate), dateFormat);
    if (!groupedPayments[periodKey]) {
      groupedPayments[periodKey] = { period: periodKey, amount: 0, count: 0 };
    }
    groupedPayments[periodKey].amount += Number(payment.amount) || 0;
    groupedPayments[periodKey].count += 1;
  });

  const totalAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalPayments = payments.length;

  // Previous period for comparison
  const daysDiff = differenceInDays(end, start);
  const prevStart = subDays(start, daysDiff);
  const prevEnd = subDays(end, daysDiff);

  const prevWhere = {
    paymentDate: {
      gte: startOfDay(prevStart),
      lte: endOfDay(prevEnd),
    },
  };
  if (locationFilter && Object.keys(locationFilter).length > 0) {
    prevWhere.appointment = locationFilter;
  }

  const prevPayments = await prisma.payment.findMany({
    where: prevWhere,
    select: { amount: true },
    take: 5000,
  });

  const previousPeriodAmount = prevPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const changePercent =
    previousPeriodAmount > 0
      ? ((totalAmount - previousPeriodAmount) / previousPeriodAmount) * 100
      : 0;

  return {
    data: Object.values(groupedPayments).sort((a, b) => a.period.localeCompare(b.period)),
    summary: {
      totalPayments,
      totalAmount: Math.round(totalAmount * 100) / 100,
      previousPeriodAmount: Math.round(previousPeriodAmount * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
    },
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
      groupBy,
    },
  };
};

module.exports = {
  getRevenueTrends,
  getAppointmentStats,
  getClientAcquisition,
  getInvoiceAging,
  getDashboardOverview,
  getTopClients,
  getLocationComparison,
  getPaymentTrends,
};
