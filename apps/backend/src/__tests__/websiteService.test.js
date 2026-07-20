const { buildWebsiteUrl } = require('../utils/websiteUrl');
const cache = require('../utils/cache');
const { updateWebsite } = require('../services/websiteService');

jest.mock('../utils/cache', () => ({
  del: jest.fn(),
}));

jest.mock('../services/notificationService', () => ({
  createNotification: jest.fn(),
}));

jest.mock('../services/pushNotificationService', () => ({
  sendPushToUser: jest.fn(),
}));

describe('buildWebsiteUrl', () => {
  const originalBaseUrl = process.env.WEBSITE_BASE_URL;
  const originalTemplate = process.env.WEBSITE_URL_TEMPLATE;

  afterEach(() => {
    if (originalBaseUrl === undefined) delete process.env.WEBSITE_BASE_URL;
    else process.env.WEBSITE_BASE_URL = originalBaseUrl;

    if (originalTemplate === undefined) delete process.env.WEBSITE_URL_TEMPLATE;
    else process.env.WEBSITE_URL_TEMPLATE = originalTemplate;
  });

  it('uses a path-based website URL by default', () => {
    process.env.WEBSITE_BASE_URL = 'https://sites.example.com/';
    delete process.env.WEBSITE_URL_TEMPLATE;

    expect(buildWebsiteUrl({ subdomain: 'sample-shop' })).toBe(
      'https://sites.example.com/sample-shop'
    );
  });

  it('preserves subdomain deployments through a URL template', () => {
    process.env.WEBSITE_BASE_URL = 'https://sites.example.com';
    process.env.WEBSITE_URL_TEMPLATE = 'https://{subdomain}.example.com';

    expect(buildWebsiteUrl({ subdomain: 'sample-shop' })).toBe('https://sample-shop.example.com');
  });
});

describe('updateWebsite', () => {
  const originalBaseUrl = process.env.WEBSITE_BASE_URL;
  const originalTemplate = process.env.WEBSITE_URL_TEMPLATE;

  afterEach(() => {
    jest.clearAllMocks();

    if (originalBaseUrl === undefined) delete process.env.WEBSITE_BASE_URL;
    else process.env.WEBSITE_BASE_URL = originalBaseUrl;

    if (originalTemplate === undefined) delete process.env.WEBSITE_URL_TEMPLATE;
    else process.env.WEBSITE_URL_TEMPLATE = originalTemplate;
  });

  it('synchronizes the organization profile when a published website subdomain changes', async () => {
    process.env.WEBSITE_BASE_URL = 'https://sites.example.com';
    delete process.env.WEBSITE_URL_TEMPLATE;

    const existingWebsite = {
      id: 'website-1',
      organizationId: 'organization-1',
      subdomain: 'old-name',
      isPublished: true,
    };
    const updatedWebsite = {
      ...existingWebsite,
      subdomain: 'new-name',
      pages: [],
      _count: { pages: 0, leads: 0 },
    };
    const prisma = {
      website: {
        findUnique: jest.fn().mockResolvedValue(existingWebsite),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue(updatedWebsite),
      },
      organizationProfile: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    const result = await updateWebsite(
      prisma,
      existingWebsite.id,
      { subdomain: 'new-name' },
      existingWebsite.organizationId
    );

    expect(prisma.organizationProfile.upsert).toHaveBeenCalledWith({
      where: { organizationId: 'organization-1' },
      create: {
        organizationId: 'organization-1',
        website: 'https://sites.example.com/new-name',
      },
      update: { website: 'https://sites.example.com/new-name' },
    });
    expect(cache.del).toHaveBeenCalledWith('company:settings:organization-1');
    expect(result.url).toBe('https://sites.example.com/new-name');
  });
});
