const { subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, differenceInDays } = require('date-fns');

/**
 * Get revenue trends over time
 * @param {Object} prisma - Tenant-scoped Prisma client
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Revenue data grouped by period
 */
const getRevenueTrends = async (prisma, { startDate, endDate, groupBy = 'day' } = {}) => {
  const now = new Date();
  const start = startDate ? new Date(startDate) : subDays(now, 30);
  const end = endDate ? new Date(endDate) : now;

  // Get paid invoices within the date range
  // Use OR logic: paidAt in range, OR status PAID with issueDate in range (fallback for older records)
  const invoices = await prisma.invoice.findMany({
    where: {
      status: 'PAID',
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
  });

  // Group invoices by period
  const groupedRevenue = {};
  const dateFormat = groupBy === 'month' ? 'yyyy-MM' : groupBy === 'week' ? 'yyyy-ww' : 'yyyy-MM-dd';

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
      status: 'PAID',
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
const getAppointmentStats = async (prisma, { startDate, endDate } = {}) => {
  const now = new Date();
  const start = startDate ? new Date(startDate) : subDays(now, 30);
  const end = endDate ? new Date(endDate) : now;

  // Get appointments within the date range
  const appointments = await prisma.appointment.findMany({
    where: {
      scheduledStart: {
        gte: startOfDay(start),
        lte: endOfDay(end),
      },
    },
    select: {
      id: true,
      status: true,
      scheduledStart: true,
      paymentStatus: true,
    },
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
    if (statusCounts.hasOwnProperty(apt.status)) {
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

  const prevAppointments = await prisma.appointment.count({
    where: {
      scheduledStart: {
        gte: startOfDay(prevStart),
        lte: endOfDay(prevEnd),
      },
    },
  });

  const appointmentChange = prevAppointments > 0 ? ((total - prevAppointments) / prevAppointments) * 100 : 0;

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
const getClientAcquisition = async (prisma, { startDate, endDate, groupBy = 'day' } = {}) => {
  const now = new Date();
  const start = startDate ? new Date(startDate) : subDays(now, 30);
  const end = endDate ? new Date(endDate) : now;

  // Get new clients within the date range
  const clients = await prisma.client.findMany({
    where: {
      createdAt: {
        gte: startOfDay(start),
        lte: endOfDay(end),
      },
    },
    select: {
      id: true,
      createdAt: true,
      type: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Group by period
  const groupedClients = {};
  const dateFormat = groupBy === 'month' ? 'yyyy-MM' : groupBy === 'week' ? 'yyyy-ww' : 'yyyy-MM-dd';

  clients.forEach((client) => {
    const periodKey = format(new Date(client.createdAt), dateFormat);
    if (!groupedClients[periodKey]) {
      groupedClients[periodKey] = { period: periodKey, newClients: 0, pf: 0, srl: 0 };
    }
    groupedClients[periodKey].newClients++;
    if (client.type === 'PF') groupedClients[periodKey].pf++;
    if (client.type === 'SRL') groupedClients[periodKey].srl++;
  });

  // Get total client count
  const totalClients = await prisma.client.count();

  // Get previous period for comparison
  const daysDiff = differenceInDays(end, start);
  const prevStart = subDays(start, daysDiff);
  const prevEnd = subDays(end, daysDiff);

  const prevClients = await prisma.client.count({
    where: {
      createdAt: {
        gte: startOfDay(prevStart),
        lte: endOfDay(prevEnd),
      },
    },
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
const getInvoiceAging = async (prisma) => {
  const now = new Date();

  // Get all unpaid/overdue invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      status: {
        in: ['GENERATED', 'SENT', 'OVERDUE'],
      },
    },
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
 * @returns {Promise<Object>} Dashboard overview
 */
const getDashboardOverview = async (prisma) => {
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
    prisma.client.count(),

    // Today's appointments
    prisma.appointment.count({
      where: {
        scheduledStart: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    }),

    // This week's appointments
    prisma.appointment.count({
      where: {
        scheduledStart: {
          gte: startOfThisWeek,
          lte: endOfThisWeek,
        },
      },
    }),

    // This month's revenue (from paid invoices)
    // Use OR logic: paidAt in range, OR status PAID with issueDate in range (fallback for older records)
    prisma.invoice.aggregate({
      where: {
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
      },
      _sum: {
        total: true,
      },
    }),

    // Last month's revenue (for comparison)
    prisma.invoice.aggregate({
      where: {
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
      },
      _sum: {
        total: true,
      },
    }),

    // Count of paid invoices this month
    prisma.invoice.count({
      where: {
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
      },
    }),

    // Pending invoices total amount (unpaid)
    prisma.invoice.aggregate({
      where: {
        status: {
          in: ['GENERATED', 'SENT', 'OVERDUE'],
        },
      },
      _sum: {
        total: true,
      },
    }),

    // Pending invoices count
    prisma.invoice.count({
      where: {
        status: {
          in: ['GENERATED', 'SENT'],
        },
      },
    }),

    // Overdue invoices
    prisma.invoice.count({
      where: {
        status: 'OVERDUE',
      },
    }),

    // Active tasks
    prisma.task.count({
      where: {
        status: {
          in: ['TODO', 'IN_PROGRESS'],
        },
      },
    }),
  ]);

  const thisMonthTotal = Math.round((Number(monthRevenue._sum.total) || 0) * 100) / 100;
  const lastMonthTotal = Math.round((Number(lastMonthRevenue._sum.total) || 0) * 100) / 100;
  const pendingTotal = Math.round((Number(pendingInvoicesAmount._sum.total) || 0) * 100) / 100;

  // Calculate percentage change
  let changePercent = null;
  if (lastMonthTotal > 0) {
    changePercent = Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 * 10) / 10;
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
const getTopClients = async (prisma, { startDate, endDate, limit = 10 } = {}) => {
  const now = new Date();
  const start = startDate ? new Date(startDate) : subDays(now, 90);
  const end = endDate ? new Date(endDate) : now;

  // Get invoices grouped by client
  const clientRevenue = await prisma.invoice.groupBy({
    by: ['clientId'],
    where: {
      paidAt: {
        gte: startOfDay(start),
        lte: endOfDay(end),
      },
      status: 'PAID',
    },
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

module.exports = {
  getRevenueTrends,
  getAppointmentStats,
  getClientAcquisition,
  getInvoiceAging,
  getDashboardOverview,
  getTopClients,
};
