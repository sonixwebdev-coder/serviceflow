const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');

const createTicket = async ({ organizationId, createdById, subject, category, message }) => {
  const ticket = await prisma.supportTicket.create({
    data: {
      organizationId,
      createdById,
      subject,
      category,
      messages: {
        create: {
          authorId: createdById,
          authorType: 'ORG_USER',
          content: message,
        },
      },
    },
    include: {
      messages: true,
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  return ticket;
};

const listTickets = async ({
  organizationId,
  page = 1,
  limit = 20,
  status,
  category,
  priority,
  search,
}) => {
  const skip = (page - 1) * limit;

  const where = { organizationId };
  if (status) where.status = status;
  if (category) where.category = category;
  if (priority) where.priority = priority;
  if (search) {
    where.subject = { contains: search, mode: 'insensitive' };
  }

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  return { tickets, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const listAllTickets = async ({ page = 1, limit = 20, status, category, priority, search }) => {
  const skip = (page - 1) * limit;

  const where = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (priority) where.priority = priority;
  if (search) {
    where.subject = { contains: search, mode: 'insensitive' };
  }

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        organization: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  return { tickets, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const getTicket = async (ticketId, { organizationId } = {}) => {
  const where = { id: ticketId };
  if (organizationId) where.organizationId = organizationId;

  const ticket = await prisma.supportTicket.findFirst({
    where,
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!ticket) throw new AppError('Ticket not found', 404);
  return ticket;
};

const updateTicket = async (ticketId, data) => {
  const updateData = { ...data };

  if (data.status === 'CLOSED' || data.status === 'RESOLVED') {
    updateData.closedAt = new Date();
  }

  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: updateData,
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  return ticket;
};

const addMessage = async ({ ticketId, authorId, authorType, content }) => {
  const [message] = await prisma.$transaction([
    prisma.supportMessage.create({
      data: { ticketId, authorId, authorType, content },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    }),
  ]);

  return message;
};

const getTicketStats = async () => {
  const counts = await prisma.supportTicket.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  const stats = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 };
  for (const row of counts) {
    stats[row.status] = row._count.status;
  }

  return stats;
};

module.exports = {
  createTicket,
  listTickets,
  listAllTickets,
  getTicket,
  updateTicket,
  addMessage,
  getTicketStats,
};
