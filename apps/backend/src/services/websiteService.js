const { AppError } = require('../utils/errors');
const { getPlanLimit } = require('../utils/planLimits');

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

/**
 * Check if a custom domain is available
 */
const isCustomDomainAvailable = async (prisma, customDomain, excludeWebsiteId = null) => {
  if (!customDomain) return true;

  const where = { customDomain };
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
  if (website.customDomain && website.domainVerified) {
    return `https://${website.customDomain}`;
  }
  const baseUrl = process.env.WEBSITE_BASE_URL;
  if (baseUrl) {
    return `${baseUrl}/${website.subdomain}`;
  }
  return `https://${website.subdomain}.serviceflow.ro`;
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

  // Check subdomain availability
  const isAvailable = await isSubdomainAvailable(prisma, data.subdomain);
  if (!isAvailable) {
    throw new AppError('Subdomain-ul nu este disponibil', 409);
  }

  // Check custom domain if provided
  if (data.customDomain) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    });

    const canHaveCustomDomain = getPlanLimit(org.plan, 'customDomain');
    if (!canHaveCustomDomain) {
      throw new AppError('Planul dvs. nu permite domeniu personalizat', 403);
    }

    const isDomainAvailable = await isCustomDomainAvailable(prisma, data.customDomain);
    if (!isDomainAvailable) {
      throw new AppError('Domeniul personalizat nu este disponibil', 409);
    }
  }

  try {
    const website = await prisma.website.create({
      data: {
        organizationId,
        subdomain: data.subdomain,
        customDomain: data.customDomain,
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
      throw new AppError('Subdomain-ul sau domeniul nu este disponibil', 409);
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

  // Check custom domain
  if (data.customDomain !== undefined && data.customDomain !== website.customDomain) {
    if (data.customDomain) {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { plan: true },
      });

      const canHaveCustomDomain = getPlanLimit(org.plan, 'customDomain');
      if (!canHaveCustomDomain) {
        throw new AppError('Planul dvs. nu permite domeniu personalizat', 403);
      }

      const isDomainAvailable = await isCustomDomainAvailable(prisma, data.customDomain, websiteId);
      if (!isDomainAvailable) {
        throw new AppError('Domeniul personalizat nu este disponibil', 409);
      }
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
      throw new AppError('Planul dvs. nu permite eliminarea brand-ului ServiceFlow', 403);
    }
  }

  try {
    const updatedWebsite = await prisma.website.update({
      where: { id: websiteId },
      data: {
        subdomain: data.subdomain,
        customDomain: data.customDomain,
        domainVerified: data.customDomain !== website.customDomain ? false : undefined,
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

    return { ...updatedWebsite, url: buildWebsiteUrl(updatedWebsite) };
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('Subdomain-ul sau domeniul nu este disponibil', 409);
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
const getPageById = async (prisma, pageId) => {
  const page = await prisma.websitePage.findUnique({
    where: { id: pageId },
    include: {
      website: {
        select: {
          id: true,
          subdomain: true,
          branding: true,
          seoDefaults: true,
        },
      },
    },
  });

  if (!page) {
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
 * Update a page
 */
const updatePage = async (prisma, pageId, data, organizationId) => {
  const page = await prisma.websitePage.findUnique({
    where: { id: pageId },
    include: {
      website: {
        select: {
          organizationId: true,
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

  // Update sort order for each page
  await Promise.all(
    pageIds.map((pageId, index) =>
      prisma.websitePage.update({
        where: { id: pageId },
        data: { sortOrder: index },
      })
    )
  );

  return { message: 'Ordinea paginilor a fost actualizata' };
};

// ============== Lead CRUD ==============

/**
 * List leads for a website
 */
const listLeads = async (prisma, websiteId, query = {}) => {
  const { status, search, page = 1, limit = 50 } = query;
  const take = Math.min(limit, 100);
  const skip = (page - 1) * take;

  const where = { websiteId };

  if (status) {
    where.status = status;
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
const getLeadById = async (prisma, leadId) => {
  const lead = await prisma.websiteLead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
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
    select: { id: true, isPublished: true },
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

  return lead;
};

/**
 * Convert lead to client
 */
const convertLeadToClient = async (prisma, leadId, organizationId) => {
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
    // Create new client
    client = await prisma.client.create({
      data: {
        organizationId,
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

  return website;
};

/**
 * Get website by custom domain (public)
 */
const getWebsiteByCustomDomain = async (prisma, customDomain) => {
  const website = await prisma.website.findUnique({
    where: { customDomain },
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

  if (!website || !website.isPublished || !website.domainVerified) {
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

  return website;
};

/**
 * Get public page content
 */
const getPublicPage = async (prisma, websiteId, slug) => {
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
    throw new AppError('Pagina nu a fost gasita', 404);
  }

  return page;
};

/**
 * Get CRM data for auto-sync blocks
 */
const getCrmDataForBlocks = async (prisma, organizationId, dataType) => {
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
 * Verify domain ownership
 */
const verifyDomain = async (prisma, websiteId, domain, organizationId) => {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
  });

  if (!website) {
    throw new AppError('Website-ul nu a fost gasit', 404);
  }

  if (website.organizationId !== organizationId) {
    throw new AppError('Nu aveti permisiunea de a modifica acest website', 403);
  }

  if (website.customDomain !== domain) {
    throw new AppError('Domeniul nu corespunde', 400);
  }

  // In production, this would verify DNS records (CNAME or TXT)
  // For now, we'll just mark it as verified
  const updatedWebsite = await prisma.website.update({
    where: { id: websiteId },
    data: { domainVerified: true },
  });

  return { ...updatedWebsite, url: buildWebsiteUrl(updatedWebsite) };
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

  const baseUrl = website.customDomain && website.domainVerified
    ? `https://${website.customDomain}`
    : `https://${website.subdomain}.serviceflow.ro`;

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
  isCustomDomainAvailable,

  // Pages
  listPages,
  getPageById,
  getPageBySlug,
  createPage,
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

  // Public
  getWebsiteBySubdomain,
  getWebsiteByCustomDomain,
  getPublicPage,
  getCrmDataForBlocks,
  verifyDomain,
  generateSitemapData,
};
