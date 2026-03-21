const { AppError } = require('../utils/errors');
const { getPlanLimit } = require('../utils/planLimits');
const { createNotification } = require('./notificationService');
const { sendPushToUser } = require('./pushNotificationService');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

/**
 * Invalidate all public caches for a website
 */
const invalidateWebsiteCache = async (subdomain) => {
  if (subdomain) await cache.del(`website:subdomain:${subdomain}`);
};

/**
 * Generate a URL-safe slug from a string
 */
function generateSlug(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Check if a subdomain is available
 */
const isSubdomainAvailable = async (prisma, subdomain, excludeWebsiteId = null) => {
  const where = { subdomain };
  if (excludeWebsiteId) {
    where.id = { not: excludeWebsiteId };
  }

  const existing = await prisma.website.findFirst({
    where,
    select: { id: true },
  });

  return !existing;
};


// ============== Website CRUD ==============

/**
 * Build the public URL for a website
 */
function buildWebsiteUrl(website) {
  const baseUrl = process.env.WEBSITE_BASE_URL;
  if (baseUrl) {
    return `${baseUrl}/${website.subdomain}`;
  }
  return `https://${website.subdomain}.forja.it.com`;
}

/**
 * Get website for an organization
 */
const getWebsite = async (prisma, organizationId) => {
  const website = await prisma.website.findUnique({
    where: { organizationId },
    include: {
      pages: {
        orderBy: { sortOrder: 'asc' },
      },
      _count: {
        select: {
          pages: true,
          leads: true,
        },
      },
    },
  });

  if (!website) return null;

  return { ...website, url: buildWebsiteUrl(website) };
};

/**
 * Create a website for an organization
 */
const createWebsite = async (prisma, data, organizationId) => {
  // Check if website already exists
  const existing = await prisma.website.findUnique({
    where: { organizationId },
  });

  if (existing) {
    throw new AppError('Organizatia are deja un website', 409);
  }

  try {
    const website = await prisma.website.create({
      data: {
        organizationId,
        subdomain: data.subdomain,
        branding: data.branding || {},
        seoDefaults: data.seoDefaults || {},
        templateId: data.templateId,
        theme: data.theme || {},
        integrations: data.integrations || {},
        showBranding: data.showBranding !== false,
      },
      include: {
        _count: {
          select: {
            pages: true,
            leads: true,
          },
        },
      },
    });

    // Create default home page only when no template is selected
    // (templates provide their own pages including home)
    if (!data.templateId) {
      await prisma.websitePage.create({
        data: {
          websiteId: website.id,
          slug: 'home',
          title: 'Acasa',
          pageType: 'HOME',
          content: [],
          isPublished: true,
          sortOrder: 0,
        },
      });
    }

    return { ...website, url: buildWebsiteUrl(website) };
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('Subdomain-ul nu este disponibil', 409);
    }
    throw error;
  }
};

/**
 * Update website settings
 */
const updateWebsite = async (prisma, websiteId, data, organizationId) => {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
  });

  if (!website) {
    throw new AppError('Website-ul nu a fost gasit', 404);
  }

  if (website.organizationId !== organizationId) {
    throw new AppError('Nu aveti permisiunea de a modifica acest website', 403);
  }

  // Check subdomain availability if changed
  if (data.subdomain && data.subdomain !== website.subdomain) {
    const isAvailable = await isSubdomainAvailable(prisma, data.subdomain, websiteId);
    if (!isAvailable) {
      throw new AppError('Subdomain-ul nu este disponibil', 409);
    }
  }

  // Check branding removal permission
  if (data.showBranding === false) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    });

    const canRemoveBranding = getPlanLimit(org.plan, 'removeBranding');
    if (!canRemoveBranding) {
      throw new AppError('Planul dvs. nu permite eliminarea brand-ului ForjaIt', 403);
    }
  }

  try {
    const updatedWebsite = await prisma.website.update({
      where: { id: websiteId },
      data: {
        subdomain: data.subdomain,
        branding: data.branding,
        seoDefaults: data.seoDefaults,
        templateId: data.templateId,
        theme: data.theme,
        integrations: data.integrations,
        showBranding: data.showBranding,
        isPublished: data.isPublished,
        publishedAt: data.isPublished && !website.isPublished ? new Date() : undefined,
      },
      include: {
        pages: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            pages: true,
            leads: true,
          },
        },
      },
    });

    // Invalidate public caches
    await invalidateWebsiteCache(website.subdomain);

    return { ...updatedWebsite, url: buildWebsiteUrl(updatedWebsite) };
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('Subdomain-ul nu este disponibil', 409);
    }
    throw error;
  }
};

/**
 * Delete website
 */
const deleteWebsite = async (prisma, websiteId, organizationId) => {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
  });

  if (!website) {
    throw new AppError('Website-ul nu a fost gasit', 404);
  }

  if (website.organizationId !== organizationId) {
    throw new AppError('Nu aveti permisiunea de a sterge acest website', 403);
  }

  await prisma.website.delete({
    where: { id: websiteId },
  });

  // Invalidate public caches
  await invalidateWebsiteCache(website.subdomain);

  return { message: 'Website-ul a fost sters cu succes' };
};

// ============== Page CRUD ==============

/**
 * List pages for a website
 */
const listPages = async (prisma, websiteId, query = {}) => {
  const { pageType, isPublished, page = 1, limit = 50 } = query;
  const take = Math.min(limit, 100);
  const skip = (page - 1) * take;

  const where = { websiteId };

  if (pageType) {
    where.pageType = pageType;
  }

  if (isPublished !== undefined) {
    where.isPublished = isPublished === 'true' || isPublished === true;
  }

  const [items, total] = await Promise.all([
    prisma.websitePage.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      skip,
      take,
    }),
    prisma.websitePage.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit: take,
      total,
      pages: Math.ceil(total / take) || 1,
    },
  };
};

/**
 * Get a page by ID
 */
const getPageById = async (prisma, pageId, organizationId = null) => {
  const page = await prisma.websitePage.findUnique({
    where: { id: pageId },
    include: {
      website: {
        select: {
          id: true,
          subdomain: true,
          branding: true,
          seoDefaults: true,
          organizationId: true,
        },
      },
    },
  });

  if (!page) {
    throw new AppError('Pagina nu a fost gasita', 404);
  }

  if (organizationId && page.website.organizationId !== organizationId) {
    throw new AppError('Pagina nu a fost gasita', 404);
  }

  return page;
};

/**
 * Get a page by slug
 */
const getPageBySlug = async (prisma, websiteId, slug) => {
  const page = await prisma.websitePage.findUnique({
    where: {
      websiteId_slug: {
        websiteId,
        slug,
      },
    },
  });

  if (!page) {
    throw new AppError('Pagina nu a fost gasita', 404);
  }

  return page;
};

/**
 * Create a new page
 */
const createPage = async (prisma, websiteId, data, organizationId) => {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    include: {
      organization: {
        select: { plan: true },
      },
      _count: {
        select: { pages: true },
      },
    },
  });

  if (!website) {
    throw new AppError('Website-ul nu a fost gasit', 404);
  }

  if (website.organizationId !== organizationId) {
    throw new AppError('Nu aveti permisiunea de a modifica acest website', 403);
  }

  // Check page limit
  const maxPages = getPlanLimit(website.organization.plan, 'maxWebsitePages');
  if (website._count.pages >= maxPages) {
    throw new AppError(
      `Limita de pagini a fost atinsa pentru planul ${website.organization.plan}. Upgrade pentru a adauga mai multe pagini.`,
      403
    );
  }

  // Generate slug if not provided
  const slug = data.slug || generateSlug(data.title);

  try {
    const page = await prisma.websitePage.create({
      data: {
        websiteId,
        slug,
        title: data.title,
        pageType: data.pageType || 'CUSTOM',
        content: data.content || [],
        seo: data.seo || {},
        isPublished: data.isPublished || false,
        sortOrder: data.sortOrder ?? website._count.pages,
        autoSync: data.autoSync || false,
        syncConfig: data.syncConfig || {},
      },
    });

    return page;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('O pagina cu acest slug exista deja', 409);
    }
    throw error;
  }
};

/**
 * Bulk upsert pages (used by template application).
 * Validates ALL new pages fit within the plan limit BEFORE creating any.
 */
const bulkUpsertPages = async (prisma, websiteId, pages, organizationId) => {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    include: {
      organization: { select: { plan: true } },
      pages: { select: { id: true, slug: true } },
    },
  });

  if (!website) {
    throw new AppError('Website-ul nu a fost gasit', 404);
  }
  if (website.organizationId !== organizationId) {
    throw new AppError('Nu aveti permisiunea de a modifica acest website', 403);
  }

  const existingSlugs = new Set(website.pages.map((p) => p.slug));
  const newPages = pages.filter((p) => {
    const slug = p.slug || generateSlug(p.title);
    return !existingSlugs.has(slug);
  });

  // Validate plan limit for ALL new pages upfront
  const maxPages = getPlanLimit(website.organization.plan, 'maxWebsitePages');
  const totalAfter = website.pages.length + newPages.length;
  if (totalAfter > maxPages) {
    const available = Math.max(0, maxPages - website.pages.length);
    throw new AppError(
      `Planul ${website.organization.plan} permite maxim ${maxPages} pagini (ai ${website.pages.length}, template-ul necesita ${newPages.length} noi). Upgrade pentru mai multe pagini.`,
      403
    );
  }

  // All-or-nothing: upsert in a transaction
  const existingBySlug = Object.fromEntries(website.pages.map((p) => [p.slug, p]));

  return prisma.$transaction(async (tx) => {
    const results = [];
    for (let i = 0; i < pages.length; i++) {
      const pageData = pages[i];
      const slug = pageData.slug || generateSlug(pageData.title);
      const existing = existingBySlug[slug];

      if (existing) {
        const updated = await tx.websitePage.update({
          where: { id: existing.id },
          data: {
            title: pageData.title,
            content: pageData.content || [],
          },
        });
        results.push(updated);
      } else {
        const created = await tx.websitePage.create({
          data: {
            websiteId,
            slug,
            title: pageData.title,
            pageType: pageData.pageType || 'CUSTOM',
            content: pageData.content || [],
            seo: pageData.seo || {},
            isPublished: pageData.isPublished || false,
            sortOrder: pageData.sortOrder ?? website.pages.length + i,
            autoSync: pageData.autoSync || false,
            syncConfig: pageData.syncConfig || {},
          },
        });
        results.push(created);
      }
    }
    return results;
  });
};

/**
 * Update a page
 */
const updatePage = async (prisma, pageId, data, organizationId) => {
  const page = await prisma.websitePage.findUnique({
    where: { id: pageId },
    include: {
      website: {
        select: {
          organizationId: true,
          subdomain: true,
        },
      },
    },
  });

  if (!page) {
    throw new AppError('Pagina nu a fost gasita', 404);
  }

  if (page.website.organizationId !== organizationId) {
    throw new AppError('Nu aveti permisiunea de a modifica aceasta pagina', 403);
  }

  try {
    const updatedPage = await prisma.websitePage.update({
      where: { id: pageId },
      data: {
        slug: data.slug,
        title: data.title,
        pageType: data.pageType,
        content: data.content,
        seo: data.seo,
        isPublished: data.isPublished,
        sortOrder: data.sortOrder,
        autoSync: data.autoSync,
        syncConfig: data.syncConfig,
      },
    });

    // Invalidate page and website caches
    await cache.del(`website:${page.websiteId}:page:${page.slug}`);
    if (data.slug && data.slug !== page.slug) {
      await cache.del(`website:${page.websiteId}:page:${data.slug}`);
    }
    await invalidateWebsiteCache(page.website.subdomain);

    return updatedPage;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('O pagina cu acest slug exista deja', 409);
    }
    throw error;
  }
};

/**
 * Delete a page
 */
const deletePage = async (prisma, pageId, organizationId) => {
  const page = await prisma.websitePage.findUnique({
    where: { id: pageId },
    include: {
      website: {
        select: {
          organizationId: true,
          subdomain: true,
        },
      },
    },
  });

  if (!page) {
    throw new AppError('Pagina nu a fost gasita', 404);
  }

  if (page.website.organizationId !== organizationId) {
    throw new AppError('Nu aveti permisiunea de a sterge aceasta pagina', 403);
  }

  // Don't allow deleting the home page
  if (page.pageType === 'HOME') {
    throw new AppError('Nu se poate sterge pagina principala', 400);
  }

  await prisma.websitePage.delete({
    where: { id: pageId },
  });

  // Invalidate caches
  await cache.del(`website:${page.websiteId}:page:${page.slug}`);
  await invalidateWebsiteCache(page.website.subdomain);

  return { message: 'Pagina a fost stearsa cu succes' };
};

/**
 * Reorder pages
 */
const reorderPages = async (prisma, websiteId, pageIds, organizationId) => {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
  });

  if (!website) {
    throw new AppError('Website-ul nu a fost gasit', 404);
  }

  if (website.organizationId !== organizationId) {
    throw new AppError('Nu aveti permisiunea de a modifica acest website', 403);
  }

  // Verify all submitted pageIds belong to this website
  const existingPages = await prisma.websitePage.findMany({
    where: { id: { in: pageIds }, websiteId },
    select: { id: true },
  });

  if (existingPages.length !== pageIds.length) {
    throw new AppError('Unul sau mai multe ID-uri de pagina sunt invalide', 400);
  }

  // Update sort order atomically in a single transaction
  await prisma.$transaction(
    pageIds.map((pageId, index) =>
      prisma.websitePage.update({
        where: { id: pageId },
        data: { sortOrder: index },
      })
    )
  );

  // Invalidate website cache (page order changed)
  await invalidateWebsiteCache(website.subdomain);

  return { message: 'Ordinea paginilor a fost actualizata' };
};

// ============== Lead CRUD ==============

/**
 * List leads for a website
 */
const listLeads = async (prisma, websiteId, query = {}) => {
  const { status, source, search, page = 1, limit = 50 } = query;
  const take = Math.min(limit, 100);
  const skip = (page - 1) * take;

  const where = { websiteId };

  if (status) {
    where.status = status;
  }

  if (source) {
    where.source = source;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.websiteLead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.websiteLead.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit: take,
      total,
      pages: Math.ceil(total / take) || 1,
    },
  };
};

/**
 * Get a lead by ID
 */
const getLeadById = async (prisma, leadId, organizationId = null) => {
  const lead = await prisma.websiteLead.findUnique({
    where: { id: leadId },
    include: organizationId ? { website: { select: { organizationId: true } } } : undefined,
  });

  if (!lead) {
    throw new AppError('Lead-ul nu a fost gasit', 404);
  }

  if (organizationId && lead.website.organizationId !== organizationId) {
    throw new AppError('Lead-ul nu a fost gasit', 404);
  }

  return lead;
};

/**
 * Create a new lead (public endpoint)
 */
const createLead = async (prisma, websiteId, data) => {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    select: { id: true, isPublished: true, organizationId: true },
  });

  if (!website) {
    throw new AppError('Website-ul nu a fost gasit', 404);
  }

  if (!website.isPublished) {
    throw new AppError('Website-ul nu este publicat', 400);
  }

  const lead = await prisma.websiteLead.create({
    data: {
      websiteId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      message: data.message,
      source: data.source || 'contact-form',
      status: 'NEW',
    },
  });

  // Notify admins/managers about new lead
  try {
    const admins = await prisma.user.findMany({
      where: {
        organizationId: website.organizationId,
        isActive: true,
        roles: { some: { role: { key: { in: ['admin', 'manager'] } } } },
      },
      select: { id: true },
    });
    for (const admin of admins) {
      await createNotification({
        recipientId: admin.id,
        title: 'Lead nou de pe website',
        message: `${data.firstName} ${data.lastName || ''} a trimis un mesaj prin formularul de contact.`.trim(),
        type: 'SYSTEM',
        entityType: 'websiteLead',
        entityId: lead.id,
        organizationId: website.organizationId,
      });
      sendPushToUser(admin.id, {
        title: 'Lead nou de pe website',
        body: `${data.firstName} ${data.lastName || ''} a trimis un mesaj prin formularul de contact.`.trim(),
      }).catch(() => {});
    }
  } catch (err) {
    logger.error('[WEBSITE] Failed to send lead notifications:', err.message);
  }

  return lead;
};

/**
 * Update a lead
 */
const updateLead = async (prisma, leadId, data, organizationId) => {
  const lead = await prisma.websiteLead.findUnique({
    where: { id: leadId },
    include: {
      website: {
        select: {
          organizationId: true,
        },
      },
    },
  });

  if (!lead) {
    throw new AppError('Lead-ul nu a fost gasit', 404);
  }

  if (lead.website.organizationId !== organizationId) {
    throw new AppError('Nu aveti permisiunea de a modifica acest lead', 403);
  }

  const updatedLead = await prisma.websiteLead.update({
    where: { id: leadId },
    data: {
      status: data.status,
      clientId: data.clientId,
    },
  });

  return updatedLead;
};

/**
 * Delete a lead
 */
const deleteLead = async (prisma, leadId, organizationId) => {
  const lead = await prisma.websiteLead.findUnique({
    where: { id: leadId },
    include: {
      website: {
        select: {
          organizationId: true,
        },
      },
    },
  });

  if (!lead) {
    throw new AppError('Lead-ul nu a fost gasit', 404);
  }

  if (lead.website.organizationId !== organizationId) {
    throw new AppError('Nu aveti permisiunea de a sterge acest lead', 403);
  }

  await prisma.websiteLead.delete({
    where: { id: leadId },
  });

  return { message: 'Lead-ul a fost sters cu succes' };
};

/**
 * Create a review (stored as a WebsiteLead with source='review')
 */
const createReview = async (prisma, websiteId, data) => {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    select: { id: true, isPublished: true, organizationId: true },
  });

  if (!website) {
    throw new AppError('Website-ul nu a fost gasit', 404);
  }

  if (!website.isPublished) {
    throw new AppError('Website-ul nu este publicat', 400);
  }

  const lead = await prisma.websiteLead.create({
    data: {
      websiteId,
      firstName: data.name,
      lastName: '',
      email: data.email,
      phone: null,
      message: `[RATING:${data.rating}] ${data.content}`,
      source: 'review',
      status: 'NEW',
    },
  });

  // Notify admins/managers about new review
  try {
    const admins = await prisma.user.findMany({
      where: {
        organizationId: website.organizationId,
        isActive: true,
        roles: { some: { role: { key: { in: ['admin', 'manager'] } } } },
      },
      select: { id: true },
    });
    for (const admin of admins) {
      await createNotification({
        recipientId: admin.id,
        title: 'Recenzie noua de pe website',
        message: `${data.name} a lasat o recenzie cu ${data.rating} stele.`,
        type: 'SYSTEM',
        entityType: 'websiteLead',
        entityId: lead.id,
        organizationId: website.organizationId,
      });
      sendPushToUser(admin.id, {
        title: 'Recenzie noua de pe website',
        body: `${data.name} a lasat o recenzie cu ${data.rating} stele.`,
      }).catch(() => {});
    }
  } catch (err) {
    logger.error('[WEBSITE] Failed to send review notifications:', err.message);
  }

  return lead;
};

/**
 * Approve or reject a review
 */
const approveReview = async (prisma, leadId, approved, organizationId) => {
  const lead = await prisma.websiteLead.findUnique({
    where: { id: leadId },
    include: {
      website: {
        select: { organizationId: true, subdomain: true },
      },
    },
  });

  if (!lead) {
    throw new AppError('Lead-ul nu a fost gasit', 404);
  }

  if (lead.website.organizationId !== organizationId) {
    throw new AppError('Nu aveti permisiunea de a modifica acest lead', 403);
  }

  if (lead.source !== 'review') {
    throw new AppError('Acest lead nu este o recenzie', 400);
  }

  const updated = await prisma.websiteLead.update({
    where: { id: leadId },
    data: { isApproved: approved },
  });

  // Invalidate public reviews cache
  await cache.del(`website:reviews:${lead.websiteId}`);

  return updated;
};

/**
 * Get approved reviews for a website (public)
 */
const getApprovedReviews = async (prisma, websiteId) => {
  const cacheKey = `website:reviews:${websiteId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const leads = await prisma.websiteLead.findMany({
    where: {
      websiteId,
      source: 'review',
      isApproved: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      firstName: true,
      message: true,
      createdAt: true,
    },
  });

  const reviews = leads.map((lead) => {
    const match = lead.message?.match(/^\[RATING:(\d)\]\s*(.*)/s);
    return {
      name: lead.firstName,
      rating: match ? parseInt(match[1], 10) : 5,
      content: match ? match[2] : (lead.message || ''),
      createdAt: lead.createdAt,
    };
  });

  await cache.set(cacheKey, reviews, cache.TTL.MEDIUM);
  return reviews;
};

/**
 * Convert lead to client
 */
const convertLeadToClient = async (prisma, leadId, organizationId, locationId = null) => {
  const lead = await prisma.websiteLead.findUnique({
    where: { id: leadId },
    include: {
      website: {
        select: {
          organizationId: true,
        },
      },
    },
  });

  if (!lead) {
    throw new AppError('Lead-ul nu a fost gasit', 404);
  }

  if (lead.website.organizationId !== organizationId) {
    throw new AppError('Nu aveti permisiunea de a modifica acest lead', 403);
  }

  if (lead.clientId) {
    throw new AppError('Lead-ul a fost deja convertit', 400);
  }

  // Check if client with same email exists
  let client = await prisma.client.findFirst({
    where: {
      organizationId,
      email: lead.email,
    },
  });

  if (!client) {
    // Quota check: clients (lead conversion)
    const { checkOrganizationLimits } = require('./organizationService');
    await checkOrganizationLimits(organizationId, 'clients');

    // Create new client
    client = await prisma.client.create({
      data: {
        organizationId,
        locationId: locationId || undefined,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        notes: lead.message,
        type: 'PF',
      },
    });
  }

  // Update lead status
  const updatedLead = await prisma.websiteLead.update({
    where: { id: leadId },
    data: {
      status: 'CONVERTED',
      clientId: client.id,
    },
  });

  return { lead: updatedLead, client };
};

// ============== Public Website Access ==============

/**
 * Get website by subdomain (public)
 */
const getWebsiteBySubdomain = async (prisma, subdomain) => {
  const cacheKey = `website:subdomain:${subdomain}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const website = await prisma.website.findUnique({
    where: { subdomain },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          activitySector: true,
          settings: true,
        },
      },
      pages: {
        where: { isPublished: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          slug: true,
          title: true,
          pageType: true,
          isPublished: true,
          seo: true,
          sortOrder: true,
        },
      },
    },
  });

  if (!website || !website.isPublished) {
    throw new AppError('Website-ul nu a fost gasit', 404);
  }

  // Fetch primary location for contact info
  const primaryLocation = await prisma.location.findFirst({
    where: {
      organizationId: website.organization.id,
      isPrimary: true,
      isActive: true,
    },
    select: {
      phone: true,
      email: true,
      address: true,
      city: true,
      county: true,
      operatingHours: true,
    },
  });

  if (primaryLocation) {
    website.organization.primaryLocation = primaryLocation;
  }

  await cache.set(cacheKey, website, cache.TTL.LONG);
  return website;
};


/**
 * Get public page content
 */
const getPublicPage = async (prisma, websiteId, slug) => {
  const cacheKey = `website:${websiteId}:page:${slug}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const page = await prisma.websitePage.findUnique({
    where: {
      websiteId_slug: {
        websiteId,
        slug,
      },
    },
    include: {
      website: {
        select: {
          branding: true,
          seoDefaults: true,
          theme: true,
          showBranding: true,
          organization: {
            select: {
              id: true,
              name: true,
              activitySector: true,
            },
          },
        },
      },
    },
  });

  if (!page || !page.isPublished) {
    // Fallback: if slug is 'home' and no home page exists, return first published page
    if (slug === 'home') {
      const fallback = await prisma.websitePage.findFirst({
        where: { websiteId, isPublished: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          website: {
            select: {
              branding: true,
              seoDefaults: true,
              theme: true,
              showBranding: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  activitySector: true,
                },
              },
            },
          },
        },
      });
      if (fallback) {
        await cache.set(cacheKey, fallback, cache.TTL.MEDIUM);
        return fallback;
      }
    }
    throw new AppError('Pagina nu a fost gasita', 404);
  }

  await cache.set(cacheKey, page, cache.TTL.MEDIUM);
  return page;
};

/**
 * Get CRM data for auto-sync blocks
 */
const getCrmDataForBlocks = async (prisma, organizationId, dataType) => {
  const cacheKey = `website:crm:${organizationId}:${dataType}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const result = await _fetchCrmData(prisma, organizationId, dataType);
  await cache.set(cacheKey, result, cache.TTL.MEDIUM);
  return result;
};

const _fetchCrmData = async (prisma, organizationId, dataType) => {
  switch (dataType) {
    case 'services':
      // Get services from organization settings
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true },
      });
      return org?.settings?.services || [];

    case 'team':
      // Get active employees
      const users = await prisma.user.findMany({
        where: {
          organizationId,
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          roles: {
            include: {
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });
      return users.map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        role: u.roles[0]?.role?.name || 'Angajat',
        image: u.avatarUrl,
      }));

    case 'locations':
      // Get active locations
      const locations = await prisma.location.findMany({
        where: {
          organizationId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          phone: true,
          email: true,
          operatingHours: true,
        },
      });
      return locations;

    default:
      return [];
  }
};


/**
 * Generate sitemap data
 */
const generateSitemapData = async (prisma, websiteId) => {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    include: {
      pages: {
        where: { isPublished: true },
        select: {
          slug: true,
          updatedAt: true,
          pageType: true,
        },
      },
    },
  });

  if (!website || !website.isPublished) {
    throw new AppError('Website-ul nu a fost gasit', 404);
  }

  const baseUrl = `https://${website.subdomain}.forja.it.com`;

  const urls = website.pages.map(page => ({
    loc: page.slug === 'home' ? baseUrl : `${baseUrl}/${page.slug}`,
    lastmod: page.updatedAt.toISOString().split('T')[0],
    changefreq: page.pageType === 'HOME' ? 'weekly' : 'monthly',
    priority: page.pageType === 'HOME' ? 1.0 : 0.8,
  }));

  return { urls, baseUrl };
};

module.exports = {
  // Website
  getWebsite,
  createWebsite,
  updateWebsite,
  deleteWebsite,
  isSubdomainAvailable,

  // Pages
  listPages,
  getPageById,
  getPageBySlug,
  createPage,
  bulkUpsertPages,
  updatePage,
  deletePage,
  reorderPages,

  // Leads
  listLeads,
  getLeadById,
  createLead,
  createReview,
  updateLead,
  deleteLead,
  convertLeadToClient,
  approveReview,
  getApprovedReviews,

  // Public
  getWebsiteBySubdomain,
  getPublicPage,
  getCrmDataForBlocks,
  generateSitemapData,
};
