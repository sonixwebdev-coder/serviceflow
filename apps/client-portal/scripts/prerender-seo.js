/**
 * Post-build SEO prerender script for client-portal.
 *
 * For each public route, this script:
 * 1. Injects correct <title>, <meta>, OG tags into <head>
 * 2. Overrides robots meta per route (marketplace = indexable)
 * 3. Injects JSON-LD structured data and semantic body HTML
 * 4. Generates sitemap.xml and robots.txt
 *
 * Usage: node scripts/prerender-seo.js
 * Runs automatically via: npm run build
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const PLATFORM_NAME = process.env.VITE_PLATFORM_NAME || 'ServiceFlow';
const CONTACT_EMAIL = process.env.VITE_PLATFORM_CONTACT_EMAIL || 'contact@example.com';
const SITE = (process.env.VITE_CLIENT_PORTAL_URL || 'http://localhost:5174').replace(/\/+$/, '');

const applyBranding = (value) => {
  if (typeof value === 'string') {
    return value
      .replaceAll('ServiceFlow', PLATFORM_NAME)
      .replaceAll('contact@example.com', CONTACT_EMAIL);
  }
  if (Array.isArray(value)) return value.map(applyBranding);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, applyBranding(item)])
    );
  }
  return value;
};

const ROUTE_DEFINITIONS = [
  {
    path: '/',
    title: 'ServiceFlow - Programeaza-te online in 30 de secunde | Fara telefon',
    description:
      'Gaseste furnizori de servicii, programeaza online si tine evidenta programarilor si facturilor intr-un singur loc. 100% gratuit.',
    canonical: `${SITE}/`,
    robots: 'index, follow',
    og: {
      title: 'ServiceFlow - Programeaza-te in 30 de secunde, fara telefon',
      description:
        'Alegi serviciul, alegi ora, confirmi. Programari, facturi si comunicare - totul intr-un singur portal gratuit.',
    },
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'ServiceFlow Portal',
      url: SITE,
      description:
        'Portal de programari online - gaseste furnizori de servicii, programeaza si gestioneaza programari si facturi.',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE}/marketplace?search={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    body: `
      <header><nav aria-label="Navigare principala"><a href="/">ServiceFlow</a><a href="/marketplace">Descopera</a><a href="/login">Autentificare</a></nav></header>
      <main>
        <h1>Programeaza-te online in 30 de secunde</h1>
        <p>Gaseste furnizori de servicii verificati, programeaza online si tine evidenta programarilor si facturilor intr-un singur loc. 100% gratuit.</p>
        <a href="/marketplace">Descopera servicii</a>
        <a href="/login">Autentificare</a>
      </main>`,
    sitemap: { priority: '1.0', changefreq: 'weekly' },
  },
  {
    path: '/marketplace',
    title: 'Descopera servicii - Programari online | ServiceFlow',
    description:
      'Gaseste serviciul potrivit si programeaza online in cateva secunde. Companii verificate din auto, beauty, IT, servicii la domiciliu si digital.',
    canonical: `${SITE}/marketplace`,
    robots: 'index, follow',
    og: {
      title: 'Descopera servicii si programeaza online - ServiceFlow',
      description:
        'Cauta printre companiile verificate si programeaza online. Service auto, saloane, reparatii, agentii digitale si multe altele.',
    },
    schema: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Marketplace ServiceFlow - Servicii cu programare online',
      url: `${SITE}/marketplace`,
      description:
        'Director de companii cu programare online din Romania. Categorii: auto, beauty & wellness, IT & electronice, servicii digitale, home services.',
      isPartOf: { '@type': 'WebSite', name: 'ServiceFlow Portal', url: SITE },
    },
    body: `
      <main>
        <h1>Gaseste serviciul potrivit</h1>
        <p>Cauta printre companiile verificate si programeaza online, in cateva secunde.</p>
        <h2>Categorii disponibile</h2>
        <ul>
          <li><strong>Auto</strong> - Service, ITP, vulcanizare, detailing, spalatorie</li>
          <li><strong>Beauty & Wellness</strong> - Salon, frizerie, cosmetica, manichiura, spa</li>
          <li><strong>Servicii Digitale</strong> - Agentii web, design, marketing, consultanta</li>
          <li><strong>Home Services</strong> - Instalatii, electrician, HVAC, curatenie</li>
          <li><strong>IT & Electronice</strong> - Reparatii telefoane, PC, laptop, GSM</li>
        </ul>
        <p>Programeaza-te online, 24/7. Fara telefon, fara asteptare.</p>
      </main>`,
    sitemap: { priority: '0.9', changefreq: 'daily' },
  },
  {
    path: '/privacy',
    title: 'Politica de Confidentialitate - ServiceFlow',
    description:
      'Afla cum ServiceFlow colecteaza, prelucreaza si protejeaza datele personale si ce optiuni de acces sunt disponibile.',
    canonical: `${SITE}/privacy`,
    robots: 'index, follow',
    body: `
      <main>
        <h1>Politica de Confidentialitate</h1>
        <p>Instanta este administrata de operatorul care ofera accesul. Operatorul stabileste scopurile, temeiurile si perioadele de pastrare aplicabile.</p>
      </main>`,
    sitemap: { priority: '0.3', changefreq: 'yearly' },
  },
  {
    path: '/terms',
    title: 'Termeni si Conditii - ServiceFlow',
    description:
      'Termenii si conditiile de utilizare a platformei ServiceFlow. Drepturi, obligatii si reguli pentru utilizarea serviciului de programari online.',
    canonical: `${SITE}/terms`,
    robots: 'index, follow',
    body: `
      <main>
        <h1>Termeni si Conditii</h1>
        <p>Acesti termeni descriu regulile generale ale instalarii. Conditiile comerciale si identitatea legala trebuie comunicate de operator.</p>
      </main>`,
    sitemap: { priority: '0.3', changefreq: 'yearly' },
  },
  {
    path: '/contact',
    title: 'Contact - ServiceFlow',
    description:
      'Ai o intrebare sau nevoie de ajutor? Trimite-ne un mesaj si iti raspundem in cel mai scurt timp.',
    canonical: `${SITE}/contact`,
    robots: 'index, follow',
    body: `
      <main>
        <h1>Contact</h1>
        <p>Ai o intrebare sau nevoie de ajutor? Trimite-ne un mesaj si iti raspundem in cel mai scurt timp.</p>
        <p>Email: <a href="mailto:contact@example.com">contact@example.com</a></p>
      </main>`,
    sitemap: { priority: '0.5', changefreq: 'monthly' },
  },
  {
    path: '/login',
    title: 'Autentificare - ServiceFlow Portal',
    description:
      'Conecteaza-te la portalul ServiceFlow pentru a vedea programarile, facturile si a comunica cu furnizorii de servicii.',
    canonical: `${SITE}/login`,
    robots: 'noindex, follow',
    body: `
      <main>
        <h1>Autentificare</h1>
        <p>Conecteaza-te la portalul tau ServiceFlow.</p>
      </main>`,
    sitemap: false,
  },
];

const ROUTES = applyBranding(ROUTE_DEFINITIONS);

// ---------------------------------------------------------------------------
// Inject SEO into a single HTML file
// ---------------------------------------------------------------------------
function injectSEO(html, route) {
  let out = html;

  // <title>
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`);

  // <meta name="description">
  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${route.description}" />`
  );

  // <meta name="robots"> — override per route
  if (route.robots) {
    out = out.replace(
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
      `<meta name="robots" content="${route.robots}" />`
    );
  }

  // <link rel="canonical">
  if (route.canonical) {
    // Add canonical if not present, or replace existing
    if (out.includes('rel="canonical"')) {
      out = out.replace(
        /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
        `<link rel="canonical" href="${route.canonical}" />`
      );
    } else {
      out = out.replace(
        '</head>',
        `  <link rel="canonical" href="${route.canonical}" />\n  </head>`
      );
    }
  }

  // Open Graph
  const og = route.og || {};
  const ogTitle = og.title || route.title;
  const ogDesc = og.description || route.description;
  const ogUrl = route.canonical;

  out = out.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${ogTitle}" />`
  );
  out = out.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${ogDesc}" />`
  );
  if (ogUrl) {
    // Add og:url if not present, or replace existing
    if (out.match(/<meta\s+property="og:url"/)) {
      out = out.replace(
        /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
        `<meta property="og:url" content="${ogUrl}" />`
      );
    } else {
      out = out.replace(
        /<meta\s+property="og:locale"/,
        `<meta property="og:url" content="${ogUrl}" />\n    <meta property="og:locale"`
      );
    }
  }

  // hreflang per route
  const pageUrl = route.canonical || `${SITE}${route.path}`;
  out = out.replace(
    /<link\s+rel="alternate"\s+hreflang="ro"\s+href="[^"]*"\s*\/?>/,
    `<link rel="alternate" hreflang="ro" href="${pageUrl}" />`
  );
  out = out.replace(
    /<link\s+rel="alternate"\s+hreflang="x-default"\s+href="[^"]*"\s*\/?>/,
    `<link rel="alternate" hreflang="x-default" href="${pageUrl}" />`
  );

  // JSON-LD
  if (route.schema) {
    const schemas = Array.isArray(route.schema) ? route.schema : [route.schema];
    const jsonLd = schemas
      .map((s) => `  <script type="application/ld+json">${JSON.stringify(s)}</script>`)
      .join('\n');
    out = out.replace('</head>', `${jsonLd}\n  </head>`);
  }

  // Semantic body HTML
  if (route.body) {
    out = out.replace(
      '<div id="root"></div>',
      `<div id="root"></div>
    <div id="seo-content" style="display:none" aria-hidden="true">${route.body}
    </div>
    <noscript>
      <div style="max-width:800px;margin:0 auto;padding:2rem;font-family:system-ui,sans-serif">${route.body}
      </div>
    </noscript>`
    );
  }

  return out;
}

// ---------------------------------------------------------------------------
// Generate prerendered HTML files
// ---------------------------------------------------------------------------
const baseHtml = readFileSync(join(DIST, 'index.html'), 'utf-8');

for (const route of ROUTES) {
  const rendered = injectSEO(baseHtml, route);

  if (route.path === '/') {
    writeFileSync(join(DIST, 'index.html'), rendered);
    console.log(`  / -> dist/index.html`);
  } else {
    const dir = join(DIST, route.path);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), rendered);
    console.log(`  ${route.path} -> dist${route.path}/index.html`);
  }
}

// ---------------------------------------------------------------------------
// Generate sitemap.xml
// ---------------------------------------------------------------------------
const today = new Date().toISOString().split('T')[0];
const sitemapUrls = ROUTES.filter((r) => r.sitemap !== false).map((r) => {
  const sm = r.sitemap || {};
  const priority = sm.priority || '0.5';
  const freq = sm.changefreq || 'monthly';
  return `  <url>
    <loc>${SITE}${r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.join('\n')}
</urlset>`;

writeFileSync(join(DIST, 'sitemap.xml'), sitemap);
console.log('  sitemap.xml generated');

// ---------------------------------------------------------------------------
// Generate robots.txt
// ---------------------------------------------------------------------------
const robots = `User-agent: *
Allow: /
Allow: /marketplace
Allow: /privacy
Allow: /terms
Allow: /contact

Disallow: /dashboard
Disallow: /appointments
Disallow: /invoices
Disallow: /profile
Disallow: /discover
Disallow: /loyalty
Disallow: /chat
Disallow: /forgot-password

Sitemap: ${SITE}/sitemap.xml
`;

writeFileSync(join(DIST, 'robots.txt'), robots);
console.log('  robots.txt generated');

console.log(`\nPrerendered ${ROUTES.length} routes + sitemap.xml + robots.txt`);
