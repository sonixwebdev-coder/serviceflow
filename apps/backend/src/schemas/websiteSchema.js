const { z } = require('zod');

// ─── Helpers ────────────────────────────────────────────

// Strip all HTML tags from a string (for plain-text fields)
const stripHtml = (str) => (str ? str.replace(/<[^>]*>/g, '').trim() : str);

// Helper to transform empty strings to undefined for optional fields
const optionalString = (maxLength) =>
  z.string().max(maxLength).optional().transform((val) => (val === '' ? undefined : val));

// Safe URL validator: only allows http(s), mailto, tel - rejects javascript:, data:, vbscript:
const isSafeUrl = (urlString) => {
  if (!urlString) return true;
  // Relative paths and anchors are allowed
  if (urlString.startsWith('/') || urlString.startsWith('#')) return true;
  try {
    const url = new URL(urlString);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol);
  } catch {
    return false;
  }
};

const optionalUrl = () =>
  z.string().optional().transform((val) => (val === '' ? undefined : val))
    .pipe(z.string().url().optional())
    .refine((val) => isSafeUrl(val), { message: 'URL-ul contine un protocol nepermis' });

// Safe URL for links (allows relative paths + safe protocols)
const safeLinkUrl = () =>
  z.string().max(500).optional()
    .refine((val) => isSafeUrl(val), { message: 'Link-ul contine un protocol nepermis' });

// Safe image URL: only http(s) or server-relative paths (uploaded files), blocks localhost and private IPs
const safeImageUrl = () =>
  z.string().optional()
    .transform((val) => (val === '' ? undefined : val))
    .refine((val) => {
      if (!val) return true;
      // Allow relative paths (uploaded files stored on the server)
      if (val.startsWith('/')) return true;
      try {
        const url = new URL(val);
        if (!['http:', 'https:'].includes(url.protocol)) return false;
        const h = url.hostname.toLowerCase();
        if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h.endsWith('.local')) return false;
        if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(h)) return false;
        return true;
      } catch {
        return false;
      }
    }, { message: 'URL-ul imaginii nu este valid sau este blocat' });

// ─── Reserved subdomains ────────────────────────────────

const RESERVED_SUBDOMAINS = [
  'www', 'api', 'admin', 'mail', 'smtp', 'ftp', 'blog', 'shop',
  'portal', 'dashboard', 'app', 'staging', 'dev', 'test', 'demo',
  'support', 'help', 'status', 'cdn', 'static', 'assets', 'files',
  'upload', 'download', 'webmail', 'cpanel', 'secure', 'ssl',
  'ns1', 'ns2', 'mx', 'pop', 'imap', 'calendar', 'docs',
];

const subdomainSchema = z.string()
  .min(3, 'Subdomain-ul trebuie sa aiba minim 3 caractere')
  .max(50, 'Subdomain-ul poate avea maxim 50 de caractere')
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Subdomain-ul poate contine doar litere mici, cifre si liniute')
  .refine((val) => !val.includes('--'), { message: 'Subdomain-ul nu poate contine liniute consecutive' })
  .refine((val) => !RESERVED_SUBDOMAINS.includes(val.toLowerCase()), { message: 'Acest subdomain este rezervat' });

// ─── Branding ───────────────────────────────────────────

const brandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  fontFamily: z.string().max(100).optional(),
  logoUrl: safeImageUrl(),
  faviconUrl: safeImageUrl(),
}).optional();

// ─── SEO ────────────────────────────────────────────────

const seoDefaultsSchema = z.object({
  title: z.string().max(70).optional().transform((val) => val ? stripHtml(val) : val),
  description: z.string().max(160).optional().transform((val) => val ? stripHtml(val) : val),
  keywords: z.array(z.string().max(50).transform(stripHtml)).optional(),
  ogImage: safeImageUrl(),
}).optional();

// ─── Integrations & Theme ───────────────────────────────

const integrationsSchema = z.object({
  googleAnalyticsId: z.string().max(50).regex(/^(G-|UA-|GT-)?[A-Z0-9-]*$/i).optional(),
  facebookPixelId: z.string().max(50).regex(/^\d*$/).optional(),
}).optional();

const themeSchema = z.object({
  name: z.string().max(50).optional(),
  mode: z.enum(['light', 'dark', 'auto']).optional(),
  borderRadius: z.enum(['none', 'sm', 'md', 'lg', 'full']).optional(),
  header: z.object({
    showBookingButton: z.boolean().optional(),
    bookingButtonText: z.string().max(30).optional(),
    sticky: z.boolean().optional(),
  }).optional(),
  footer: z.object({
    showContact: z.boolean().optional(),
    showHours: z.boolean().optional(),
    showQuickLinks: z.boolean().optional(),
    showAbout: z.boolean().optional(),
    showSocialLinks: z.boolean().optional(),
    socialLinks: z.object({
      facebook: safeLinkUrl(),
      instagram: safeLinkUrl(),
      tiktok: safeLinkUrl(),
      youtube: safeLinkUrl(),
    }).optional(),
    copyrightText: z.string().max(200).optional(),
  }).optional(),
}).optional();

// ─── Block Settings (common) ────────────────────────────

const blockSettingsSchema = z.object({
  backgroundColor: z.string().max(50).optional(),
  textColor: z.string().max(50).optional(),
  padding: z.object({
    top: z.number().min(0).max(200).optional(),
    bottom: z.number().min(0).max(200).optional(),
    left: z.number().min(0).max(200).optional(),
    right: z.number().min(0).max(200).optional(),
  }).optional(),
  margin: z.object({
    top: z.number().min(0).max(200).optional(),
    bottom: z.number().min(0).max(200).optional(),
  }).optional(),
  maxWidth: z.enum(['sm', 'md', 'lg', 'xl', 'full']).optional(),
  alignment: z.enum(['left', 'center', 'right']).optional(),
}).optional();

// ─── Block Type Schemas ─────────────────────────────────

const heroBlockSchema = z.object({
  title: z.string().max(200).optional().transform((val) => val ? stripHtml(val) : val),
  subtitle: z.string().max(500).optional().transform((val) => val ? stripHtml(val) : val),
  backgroundImage: safeImageUrl(),
  backgroundOverlay: z.number().min(0).max(1).optional(),
  ctaText: z.string().max(50).optional().transform((val) => val ? stripHtml(val) : val),
  ctaLink: safeLinkUrl(),
  ctaStyle: z.enum(['primary', 'secondary', 'outline']).optional(),
  secondaryCtaText: z.string().max(50).optional().transform((val) => val ? stripHtml(val) : val),
  secondaryCtaLink: safeLinkUrl(),
  layout: z.enum(['centered', 'left', 'right']).optional(),
  height: z.enum(['small', 'medium', 'large', 'full']).optional(),
});

const textBlockSchema = z.object({
  content: z.string().max(10000).optional()
    .refine((val) => {
      if (!val) return true;
      // Reject script tags, event handlers, and dangerous protocols in content
      const dangerous = /<script|<iframe|<embed|<object|javascript:|vbscript:|data:text\/html/i;
      return !dangerous.test(val);
    }, { message: 'Continutul contine elemente HTML nepermise' }),
  format: z.enum(['prose', 'heading', 'quote']).optional(),
});

const imageBlockSchema = z.object({
  src: safeImageUrl(),
  alt: z.string().max(200).optional().transform((val) => val ? stripHtml(val) : val),
  caption: z.string().max(500).optional().transform((val) => val ? stripHtml(val) : val),
  width: z.enum(['small', 'medium', 'large', 'full']).optional(),
  aspectRatio: z.enum(['auto', '1:1', '4:3', '16:9', '21:9']).optional(),
  link: safeLinkUrl(),
});

const buttonBlockSchema = z.object({
  text: z.string().max(50).optional().transform((val) => val ? stripHtml(val) : val),
  link: safeLinkUrl(),
  style: z.enum(['primary', 'secondary', 'outline', 'ghost']).optional(),
  size: z.enum(['sm', 'md', 'lg']).optional(),
  icon: z.string().max(50).regex(/^[a-zA-Z]*$/).optional(),
  openInNewTab: z.boolean().optional(),
});

const servicesGridBlockSchema = z.object({
  title: z.string().max(200).optional().transform((val) => val ? stripHtml(val) : val),
  subtitle: z.string().max(500).optional().transform((val) => val ? stripHtml(val) : val),
  autoSync: z.boolean().optional(),
  services: z.array(z.object({
    id: z.string().optional(),
    name: z.string().max(200).optional().transform((val) => val ? stripHtml(val) : val),
    description: z.string().max(1000).optional().transform((val) => val ? stripHtml(val) : val),
    price: z.string().max(50).optional(),
    duration: z.string().max(50).optional(),
    image: safeImageUrl(),
  })).max(100).optional(),
  columns: z.number().min(1).max(4).optional(),
  showPrices: z.boolean().optional(),
  showDuration: z.boolean().optional(),
  showBookButton: z.boolean().optional(),
});

const teamGridBlockSchema = z.object({
  title: z.string().max(200).optional().transform((val) => val ? stripHtml(val) : val),
  subtitle: z.string().max(500).optional().transform((val) => val ? stripHtml(val) : val),
  autoSync: z.boolean().optional(),
  members: z.array(z.object({
    id: z.string().optional(),
    name: z.string().max(200).optional().transform((val) => val ? stripHtml(val) : val),
    role: z.string().max(100).optional().transform((val) => val ? stripHtml(val) : val),
    bio: z.string().max(1000).optional().transform((val) => val ? stripHtml(val) : val),
    image: safeImageUrl(),
    socialLinks: z.object({
      facebook: safeLinkUrl(),
      instagram: safeLinkUrl(),
      linkedin: safeLinkUrl(),
    }).optional(),
  })).max(50).optional(),
  columns: z.number().min(1).max(4).optional(),
  showBio: z.boolean().optional(),
  showSocial: z.boolean().optional(),
});

const locationsMapBlockSchema = z.object({
  title: z.string().max(200).optional().transform((val) => val ? stripHtml(val) : val),
  subtitle: z.string().max(500).optional().transform((val) => val ? stripHtml(val) : val),
  autoSync: z.boolean().optional(),
  locations: z.array(z.object({
    id: z.string().optional(),
    name: z.string().max(200).optional().transform((val) => val ? stripHtml(val) : val),
    address: z.string().max(500).optional().transform((val) => val ? stripHtml(val) : val),
    phone: z.string().max(50).optional(),
    email: z.string().max(200).optional(),
    hours: z.record(z.any()).optional(),
    coordinates: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }).optional(),
  })).max(50).optional(),
  showMap: z.boolean().optional(),
  showHours: z.boolean().optional(),
  showContact: z.boolean().optional(),
});

const bookingWidgetBlockSchema = z.object({
  title: z.string().max(200).optional().transform((val) => val ? stripHtml(val) : val),
  subtitle: z.string().max(500).optional().transform((val) => val ? stripHtml(val) : val),
  showServices: z.boolean().optional(),
  showEmployee: z.boolean().optional(),
  compactMode: z.boolean().optional(),
});

const contactFormBlockSchema = z.object({
  title: z.string().max(200).optional().transform((val) => val ? stripHtml(val) : val),
  subtitle: z.string().max(500).optional().transform((val) => val ? stripHtml(val) : val),
  fields: z.array(z.object({
    key: z.string().max(50).regex(/^[a-zA-Z0-9_]+$/),
    label: z.string().max(100).transform(stripHtml),
    type: z.enum(['text', 'email', 'phone', 'textarea', 'select']),
    required: z.boolean().optional(),
    options: z.array(z.string().max(100).transform(stripHtml)).max(50).optional(),
  })).max(20).optional(),
  submitText: z.string().max(50).optional().transform((val) => val ? stripHtml(val) : val),
  successMessage: z.string().max(500).optional().transform((val) => val ? stripHtml(val) : val),
  showPhone: z.boolean().optional(),
  showAddress: z.boolean().optional(),
  showMap: z.boolean().optional(),
});

const galleryBlockSchema = z.object({
  title: z.string().max(200).optional().transform((val) => val ? stripHtml(val) : val),
  subtitle: z.string().max(500).optional().transform((val) => val ? stripHtml(val) : val),
  images: z.array(z.object({
    src: safeImageUrl(),
    alt: z.string().max(200).optional().transform((val) => val ? stripHtml(val) : val),
    caption: z.string().max(500).optional().transform((val) => val ? stripHtml(val) : val),
    category: z.string().max(100).optional().transform((val) => val ? stripHtml(val) : val),
  })).max(100).optional(),
  columns: z.number().min(1).max(6).optional(),
  layout: z.enum(['grid', 'masonry', 'carousel']).optional(),
  showLightbox: z.boolean().optional(),
  showCategories: z.boolean().optional(),
});

const testimonialsBlockSchema = z.object({
  title: z.string().max(200).optional().transform((val) => val ? stripHtml(val) : val),
  subtitle: z.string().max(500).optional().transform((val) => val ? stripHtml(val) : val),
  testimonials: z.array(z.object({
    author: z.string().max(200).optional().transform((val) => val ? stripHtml(val) : val),
    role: z.string().max(100).optional().transform((val) => val ? stripHtml(val) : val),
    content: z.string().max(1000).optional().transform((val) => val ? stripHtml(val) : val),
    rating: z.number().min(1).max(5).optional(),
    image: safeImageUrl(),
    date: z.string().max(20).optional(),
  })).max(50).optional(),
  layout: z.enum(['grid', 'carousel', 'list']).optional(),
  showRating: z.boolean().optional(),
  showDate: z.boolean().optional(),
});

const dividerBlockSchema = z.object({
  style: z.enum(['line', 'dots', 'space']).optional(),
  thickness: z.enum(['thin', 'medium', 'thick']).optional(),
});

const spacerBlockSchema = z.object({
  height: z.number().min(10).max(500).optional(),
});

const faqBlockSchema = z.object({
  title: z.string().max(200).optional().transform((val) => val ? stripHtml(val) : val),
  subtitle: z.string().max(500).optional().transform((val) => val ? stripHtml(val) : val),
  items: z.array(z.object({
    question: z.string().max(500).transform(stripHtml),
    answer: z.string().max(2000).transform(stripHtml),
  })).max(50).optional(),
  allowMultiple: z.boolean().optional(),
});

const statsBlockSchema = z.object({
  title: z.string().max(200).optional().transform((val) => val ? stripHtml(val) : val),
  subtitle: z.string().max(500).optional().transform((val) => val ? stripHtml(val) : val),
  stats: z.array(z.object({
    value: z.string().max(50).transform(stripHtml),
    label: z.string().max(200).transform(stripHtml),
    description: z.string().max(500).optional().transform((val) => val ? stripHtml(val) : val),
  })).max(20).optional(),
  columns: z.number().min(2).max(4).optional(),
});

const videoBlockSchema = z.object({
  title: z.string().max(200).optional().transform((val) => val ? stripHtml(val) : val),
  subtitle: z.string().max(500).optional().transform((val) => val ? stripHtml(val) : val),
  url: safeLinkUrl(),
  thumbnail: safeImageUrl(),
  aspectRatio: z.enum(['16:9', '4:3', '1:1', '21:9']).optional(),
  autoplay: z.boolean().optional(),
});

const pricingTableBlockSchema = z.object({
  title: z.string().max(200).optional().transform((val) => val ? stripHtml(val) : val),
  subtitle: z.string().max(500).optional().transform((val) => val ? stripHtml(val) : val),
  plans: z.array(z.object({
    name: z.string().max(100).transform(stripHtml),
    description: z.string().max(500).optional().transform((val) => val ? stripHtml(val) : val),
    price: z.string().max(50).transform(stripHtml),
    currency: z.string().max(10).optional().transform((val) => val ? stripHtml(val) : val),
    period: z.string().max(50).optional().transform((val) => val ? stripHtml(val) : val),
    featured: z.boolean().optional(),
    features: z.array(z.union([
      z.string().max(200).transform(stripHtml),
      z.object({
        text: z.string().max(200).transform(stripHtml),
        included: z.boolean().optional(),
      }),
    ])).max(30).optional(),
    ctaText: z.string().max(50).optional().transform((val) => val ? stripHtml(val) : val),
    ctaLink: safeLinkUrl(),
  })).max(10).optional(),
  showCta: z.boolean().optional(),
  ctaText: z.string().max(50).optional().transform((val) => val ? stripHtml(val) : val),
});

// ─── Block Schema (union) ───────────────────────────────

const MAX_BLOCKS_PER_PAGE = 50;

const blockSchema = z.object({
  id: z.string().max(100),
  type: z.enum([
    'hero', 'text', 'image', 'button', 'services-grid', 'team-grid',
    'locations-map', 'booking-widget', 'contact-form', 'gallery',
    'testimonials', 'divider', 'spacer', 'faq', 'stats', 'video',
    'pricing-table'
  ]),
  data: z.record(z.any()).refine((val) => {
    // Limit block data size to 50KB
    return JSON.stringify(val).length <= 50000;
  }, { message: 'Datele blocului depasesc limita de 50KB' }),
  settings: blockSettingsSchema,
});

// ─── Page SEO ───────────────────────────────────────────

const pageSeoSchema = z.object({
  title: z.string().max(70).optional().transform((val) => val ? stripHtml(val) : val),
  description: z.string().max(160).optional().transform((val) => val ? stripHtml(val) : val),
  keywords: z.array(z.string().max(50).transform(stripHtml)).optional(),
  ogImage: safeImageUrl(),
  canonicalUrl: optionalUrl(),
  noIndex: z.boolean().optional(),
}).optional();

// ─── Sync Config ────────────────────────────────────────

const syncConfigSchema = z.object({
  source: z.enum(['services', 'team', 'locations']).optional(),
  filters: z.record(z.any()).optional(),
  updateFrequency: z.enum(['realtime', 'hourly', 'daily']).optional(),
}).optional();

// ════════════════════════════════════════════════════════
// Website Schemas
// ════════════════════════════════════════════════════════

const createWebsiteSchema = z.object({
  subdomain: subdomainSchema,
  branding: brandingSchema,
  seoDefaults: seoDefaultsSchema,
  templateId: z.string().max(50).optional(),
  theme: themeSchema,
  integrations: integrationsSchema,
  showBranding: z.boolean().optional(),
});

const updateWebsiteSchema = z.object({
  subdomain: subdomainSchema.optional(),
  branding: brandingSchema,
  seoDefaults: seoDefaultsSchema,
  templateId: z.string().max(50).optional(),
  theme: themeSchema,
  integrations: integrationsSchema,
  showBranding: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

// ════════════════════════════════════════════════════════
// Page Schemas
// ════════════════════════════════════════════════════════

const createPageSchema = z.object({
  slug: z.string()
    .min(1, 'Slug-ul este obligatoriu')
    .max(100)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Slug-ul poate contine doar litere mici, cifre si liniute'),
  title: z.string().min(1, 'Titlul paginii este obligatoriu').max(200)
    .transform(stripHtml),
  pageType: z.enum(['HOME', 'SERVICES', 'ABOUT', 'TEAM', 'LOCATIONS', 'GALLERY', 'CONTACT', 'BOOKING', 'CUSTOM']).optional(),
  content: z.array(blockSchema).max(MAX_BLOCKS_PER_PAGE, `Maxim ${MAX_BLOCKS_PER_PAGE} de blocuri per pagina`).optional().default([]),
  seo: pageSeoSchema,
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  autoSync: z.boolean().optional(),
  syncConfig: syncConfigSchema,
});

const updatePageSchema = z.object({
  slug: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Slug-ul poate contine doar litere mici, cifre si liniute')
    .optional(),
  title: z.string().min(1).max(200).transform(stripHtml).optional(),
  pageType: z.enum(['HOME', 'SERVICES', 'ABOUT', 'TEAM', 'LOCATIONS', 'GALLERY', 'CONTACT', 'BOOKING', 'CUSTOM']).optional(),
  content: z.array(blockSchema).max(MAX_BLOCKS_PER_PAGE).optional(),
  seo: pageSeoSchema,
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  autoSync: z.boolean().optional(),
  syncConfig: syncConfigSchema,
});

const listPagesQuerySchema = z.object({
  pageType: z.enum(['HOME', 'SERVICES', 'ABOUT', 'TEAM', 'LOCATIONS', 'GALLERY', 'CONTACT', 'BOOKING', 'CUSTOM']).optional(),
  isPublished: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// ════════════════════════════════════════════════════════
// Lead Schemas
// ════════════════════════════════════════════════════════

const createLeadSchema = z.object({
  firstName: z.string().min(1, 'Prenumele este obligatoriu').max(100).transform(stripHtml),
  lastName: z.string().min(1, 'Numele este obligatoriu').max(100).transform(stripHtml),
  email: z.string().email('Adresa de email invalida')
    .refine((val) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val), {
      message: 'Formatul adresei de email este invalid',
    }),
  phone: z.string().max(20).optional()
    .transform((val) => val ? val.replace(/[^0-9+\-() ]/g, '') : val),
  message: z.string().max(2000).optional().transform((val) => val ? stripHtml(val) : val),
  source: z.string().max(100).optional().transform((val) => val ? stripHtml(val) : val),
});

const createReviewSchema = z.object({
  name: z.string().min(1, 'Numele este obligatoriu').max(100).transform(stripHtml),
  email: z.string().email('Adresa de email invalida')
    .refine((val) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val), {
      message: 'Formatul adresei de email este invalid',
    }),
  content: z.string().min(10, 'Recenzia trebuie sa aiba minim 10 caractere').max(2000).transform(stripHtml),
  rating: z.number().int().min(1, 'Rating-ul trebuie sa fie intre 1 si 5').max(5, 'Rating-ul trebuie sa fie intre 1 si 5'),
});

const updateLeadSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']).optional(),
  clientId: z.string().optional(),
});

const listLeadsQuerySchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']).optional(),
  source: z.enum(['contact-form', 'review']).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

module.exports = {
  // Website schemas
  createWebsiteSchema,
  updateWebsiteSchema,
  // Page schemas
  createPageSchema,
  updatePageSchema,
  listPagesQuerySchema,
  // Lead schemas
  createLeadSchema,
  createReviewSchema,
  updateLeadSchema,
  listLeadsQuerySchema,
  // Block schemas (for reuse)
  blockSchema,
  heroBlockSchema,
  textBlockSchema,
  imageBlockSchema,
  buttonBlockSchema,
  servicesGridBlockSchema,
  teamGridBlockSchema,
  locationsMapBlockSchema,
  bookingWidgetBlockSchema,
  contactFormBlockSchema,
  galleryBlockSchema,
  testimonialsBlockSchema,
  faqBlockSchema,
  statsBlockSchema,
  videoBlockSchema,
  pricingTableBlockSchema,
};
