/**
 * Single source of truth for subscription plan definitions.
 *
 * Used by: Preturi (landing), BillingSettings (CRM), Signup, UpgradePrompt.
 * Prices shown here are fallback / display defaults. The BillingSettings page
 * will override them with dynamic values from PlatformSettings when available.
 */

// ---------------------------------------------------------------------------
// Plan names (internal key -> Romanian display name)
// ---------------------------------------------------------------------------
export const PLAN_NAMES = {
  FREE: 'Gratuit',
  STARTER: 'Starter',
  PROFESSIONAL: 'Profesional',
  ENTERPRISE: 'Enterprise',
};

// ---------------------------------------------------------------------------
// Plan ranking (for upgrade / downgrade logic)
// ---------------------------------------------------------------------------
export const PLAN_RANK = { FREE: 0, STARTER: 1, PROFESSIONAL: 2, ENTERPRISE: 3 };

// ---------------------------------------------------------------------------
// Default prices in RON (used when admin hasn't configured display prices)
// ---------------------------------------------------------------------------
export const PLAN_PRICES = {
  FREE: { monthly: 0, annual: 0 },
  STARTER: { monthly: 99, annual: 79 },
  PROFESSIONAL: { monthly: 249, annual: 199 },
  ENTERPRISE: { monthly: 499, annual: 399 },
};

// ---------------------------------------------------------------------------
// Plan quotas / limits (mirrors backend planLimits.js)
// ---------------------------------------------------------------------------
export const PLAN_LIMITS = {
  FREE: {
    locatii: '1',
    utilizatori: '2',
    clienti: '50',
    programari: '100 / luna',
    paginiweb: '1',
  },
  STARTER: {
    locatii: '1',
    utilizatori: '5',
    clienti: '500',
    programari: 'Nelimitate',
    paginiweb: '5',
  },
  PROFESSIONAL: {
    locatii: '3',
    utilizatori: '15',
    clienti: '2,000',
    programari: 'Nelimitate',
    paginiweb: '15',
  },
  ENTERPRISE: {
    locatii: 'Nelimitat',
    utilizatori: 'Nelimitat',
    clienti: 'Nelimitat',
    programari: 'Nelimitate',
    paginiweb: 'Nelimitat',
  },
};

export const LIMIT_LABELS = {
  locatii: 'Locatii',
  utilizatori: 'Utilizatori',
  clienti: 'Clienti',
  programari: 'Programari',
  paginiweb: 'Pagini website',
};

// ---------------------------------------------------------------------------
// Numeric quotas (used by BillingSettings comparison table)
// ---------------------------------------------------------------------------
export const PLAN_QUOTAS = {
  FREE: { users: 2, clients: 50, appointments: 50 },
  STARTER: { users: 5, clients: 500, appointments: 500 },
  PROFESSIONAL: { users: 15, clients: 2000, appointments: 5000 },
  ENTERPRISE: { users: -1, clients: -1, appointments: -1 },
};

// ---------------------------------------------------------------------------
// Feature lists per plan
// ---------------------------------------------------------------------------
export const PLAN_FEATURES = {
  FREE: [
    { text: 'CRM de baza', included: true },
    { text: 'Calendar programari', included: true },
    { text: 'Widget programari publice', included: true },
    { text: 'Facturare de baza (20 / luna)', included: true },
    { text: 'Notificari email', included: true },
    { text: 'Website cu branding ForjaIt', included: true },
    { text: 'Chat cu clientii', included: false },
    { text: 'Portal clienti', included: false },
    { text: 'Management echipa', included: false },
    { text: 'Analytics', included: false },
    { text: 'Export date', included: false },
    { text: 'Google Calendar sync', included: false },
  ],
  STARTER: [
    { text: 'CRM complet (import / export)', included: true },
    { text: 'Programari nelimitate', included: true },
    { text: 'Widget programari publice', included: true },
    { text: 'Facturare completa + PDF', included: true },
    { text: 'Notificari email + push', included: true },
    { text: 'Template-uri website (4 industrii)', included: true },
    { text: 'Chat cu clientii', included: true },
    { text: 'Portal clienti', included: true },
    { text: 'Google Calendar sync', included: true },
    { text: 'Analytics de baza', included: true },
    { text: 'Export CSV', included: true },
    { text: 'Management echipa', included: false },
  ],
  PROFESSIONAL: [
    { text: 'Tot din Starter, plus:', included: true, bold: true },
    { text: 'Multi-locatie (pana la 3)', included: true },
    { text: 'Management echipa complet', included: true },
    { text: 'Pontaj (clock in / out)', included: true },
    { text: 'Cereri concediu cu aprobare', included: true },
    { text: 'Task-uri si todos', included: true },
    { text: 'Website builder complet (15 blocuri)', included: true },
    { text: 'Domeniu custom', included: true },
    { text: 'Stergere branding ForjaIt', included: true },
    { text: 'Comenzi de lucru + PDF', included: true },
    { text: 'Analytics avansat', included: true },
    { text: 'Export CSV / Excel / PDF / JSON', included: true },
  ],
  ENTERPRISE: [
    { text: 'Tot din Profesional, plus:', included: true, bold: true },
    { text: 'Locatii nelimitate', included: true },
    { text: 'Utilizatori nelimitati', included: true },
    { text: 'Export complet de date (ZIP)', included: true },
    { text: 'Suport prioritar dedicat', included: true },
    { text: 'Onboarding personalizat', included: true },
    { text: 'API access (in curand)', included: true },
  ],
};

// ---------------------------------------------------------------------------
// Flat feature lists (for BillingSettings comparison table)
// ---------------------------------------------------------------------------
export const PLAN_FEATURES_FLAT = {
  FREE: [
    'Gestionare programari',
    'Gestionare clienti',
    'Portal clienti',
  ],
  STARTER: [
    'Gestionare programari',
    'Gestionare clienti',
    'Facturare de baza',
    'Website builder (1 pagina)',
    'Suport email',
    'Program de loialitate',
    'Portal clienti',
  ],
  PROFESSIONAL: [
    'Gestionare programari',
    'Gestionare clienti',
    'Facturare de baza',
    'Website builder complet',
    'Suport prioritar',
    'Program de loialitate',
    'Portal clienti',
    'Integrare Google Calendar',
    'Export date (CSV/Excel)',
  ],
  ENTERPRISE: [
    'Gestionare programari',
    'Gestionare clienti',
    'Facturare de baza',
    'Website builder complet',
    'Suport prioritar',
    'Program de loialitate',
    'Portal clienti',
    'Integrare Google Calendar',
    'Export date (CSV/Excel)',
    'Utilizatori nelimitati',
    'Clienti nelimitati',
    'Programari nelimitate',
  ],
};

// ---------------------------------------------------------------------------
// Tier descriptions & CTA (used by Preturi landing page)
// ---------------------------------------------------------------------------
export const PLAN_TIERS = [
  {
    key: 'FREE',
    name: PLAN_NAMES.FREE,
    price: PLAN_PRICES.FREE,
    description: 'Pentru a testa platforma si a vedea daca ti se potriveste.',
    cta: 'Incepe gratuit',
    ctaStyle: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    highlight: false,
    limits: PLAN_LIMITS.FREE,
    features: PLAN_FEATURES.FREE,
  },
  {
    key: 'STARTER',
    name: PLAN_NAMES.STARTER,
    price: PLAN_PRICES.STARTER,
    description: 'Tot ce ai nevoie ca solo operator sau micro-afacere.',
    cta: 'Incearca 14 zile gratuit',
    ctaStyle: 'bg-primary text-white hover:bg-primary-700',
    highlight: false,
    limits: PLAN_LIMITS.STARTER,
    features: PLAN_FEATURES.STARTER,
  },
  {
    key: 'PROFESSIONAL',
    name: PLAN_NAMES.PROFESSIONAL,
    price: PLAN_PRICES.PROFESSIONAL,
    description: 'Pentru echipe in crestere si afaceri cu mai multe locatii.',
    cta: 'Incearca 14 zile gratuit',
    ctaStyle: 'bg-primary text-white hover:bg-primary-700',
    highlight: true,
    badge: 'Popular',
    limits: PLAN_LIMITS.PROFESSIONAL,
    features: PLAN_FEATURES.PROFESSIONAL,
  },
  {
    key: 'ENTERPRISE',
    name: PLAN_NAMES.ENTERPRISE,
    price: PLAN_PRICES.ENTERPRISE,
    description: 'Fara limite. Pentru lanturi de service si operatiuni mari.',
    cta: 'Contacteaza-ne',
    ctaStyle: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    highlight: false,
    limits: PLAN_LIMITS.ENTERPRISE,
    features: PLAN_FEATURES.ENTERPRISE,
  },
];

// ---------------------------------------------------------------------------
// Signup plan cards (subset used in signup flow)
// ---------------------------------------------------------------------------
export const SIGNUP_PLANS = [
  { key: 'STARTER', name: PLAN_NAMES.STARTER, price: PLAN_PRICES.STARTER.monthly, desc: '5 utilizatori, 500 clienti' },
  { key: 'PROFESSIONAL', name: PLAN_NAMES.PROFESSIONAL, price: PLAN_PRICES.PROFESSIONAL.monthly, desc: '15 utilizatori, 2.000 clienti', recommended: true },
  { key: 'ENTERPRISE', name: PLAN_NAMES.ENTERPRISE, price: PLAN_PRICES.ENTERPRISE.monthly, desc: 'Nelimitat' },
];
