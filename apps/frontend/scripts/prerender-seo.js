/**
 * Post-build SEO prerender script.
 *
 * For each public route, this script:
 * 1. Injects correct <title>, <meta>, OG, Twitter, and hreflang tags into <head>
 * 2. Injects JSON-LD structured data into <head>
 * 3. Injects semantic HTML content into <body> (hidden div + noscript fallback)
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
const SITE = 'https://app.forja.it.com';
const OG_IMAGE = `${SITE}/og-image.png`;

// ---------------------------------------------------------------------------
// Route definitions — each route gets its own prerendered index.html
// ---------------------------------------------------------------------------
const ROUTES = [
  {
    path: '/',
    title: 'ForjaIt - Clientii se programeaza singuri | Programari, CRM, Facturare',
    description: 'O singura platforma care inlocuieste agenda, Excel-ul si WhatsApp-ul. Programari online, CRM, facturare, website builder si portal clienti. 14 zile gratuit.',
    canonical: `${SITE}/`,
    og: {
      title: 'ForjaIt - Clientii se programeaza singuri. Tu te ocupi de business.',
      description: 'Programari online, CRM, facturare si website - o singura platforma pentru afaceri de servicii. 14 zile gratuit.',
    },
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'ForjaIt',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: SITE,
        description: 'Platforma de management pentru afaceri de servicii din Romania - programari online, CRM, facturare, website builder si portal clienti.',
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'RON',
          lowPrice: '0',
          highPrice: '249',
          offerCount: '4',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'ForjaIt',
        url: SITE,
        logo: `${SITE}/favicon-512x512.png`,
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'support@forja.it.com',
          contactType: 'customer support',
          availableLanguage: 'Romanian',
        },
        sameAs: [],
      },
    ],
    body: `
      <header><nav aria-label="Navigare principala"><a href="/">ForjaIt</a><a href="/pricing">Preturi</a><a href="/signup">Inregistrare</a><a href="/login">Autentificare</a></nav></header>
      <main>
        <h1>Clientii se programeaza singuri. Tu te ocupi de business.</h1>
        <p>O singura platforma care inlocuieste agenda, Excel-ul si WhatsApp-ul. Programari online, CRM, facturare, website builder si portal clienti.</p>

        <h2>Totul intr-un singur loc</h2>
        <ul>
          <li><strong>Programari online</strong> - Clientii aleg ora, tu primesti confirmarea. Fara telefoane, fara pierderi. Calendar inteligent pe locatii si angajati.</li>
          <li><strong>CRM si fisa client</strong> - Istoric complet, note, preferinte. Cunosti fiecare client ca pe primul. Import rapid din Excel.</li>
          <li><strong>Facturare automata</strong> - Genereaza facturi in 2 secunde direct din programare. Trimite-le pe email sau descarca PDF.</li>
          <li><strong>Website builder</strong> - Site profesional fara cunostinte tehnice. SEO inclus, domeniu personalizat. Drag & drop.</li>
          <li><strong>Portal clienti</strong> - Fiecare client are un portal unde isi vede programarile, facturile si comunica cu tine.</li>
          <li><strong>Chat integrat</strong> - Comunicare in timp real cu clientii. Totul salvat, nimic pierdut.</li>
          <li><strong>Echipa</strong> - Task-uri, pontaj, concedii, roluri. Nu mai pierzi timp cu "cine face ce azi?"</li>
        </ul>

        <h2>Functioneaza pentru orice afacere de servicii</h2>
        <ul>
          <li>Service auto, ITP, vulcanizare, detailing</li>
          <li>Salon, frizerie, cosmetica, manichiura, spa</li>
          <li>Agentii web, design, marketing, consultanta</li>
          <li>Instalatii, electrician, HVAC, curatenie</li>
          <li>Reparatii telefoane, PC, laptop, GSM</li>
        </ul>

        <p>14 zile gratuit pe orice plan. Fara card de credit. Fara obligatii.</p>
        <a href="/signup">Activeaza contul gratuit</a>
        <a href="/pricing">Vezi preturile</a>
      </main>
      <footer>
        <p>&copy; ForjaIt - Platforma de management pentru afaceri de servicii din Romania</p>
        <nav aria-label="Pagini legale"><a href="/privacy">Confidentialitate</a> <a href="/terms">Termeni si Conditii</a></nav>
      </footer>`,
    sitemap: { priority: '1.0', changefreq: 'weekly' },
  },
  {
    path: '/pricing',
    title: 'Preturi ForjaIt - Planuri de la 0 RON/luna | Fara contract',
    description: 'Planuri flexibile pentru orice afacere de servicii. Starter 99 RON/luna, Professional 249 RON/luna. 14 zile gratuit, fara card de credit.',
    canonical: `${SITE}/pricing`,
    og: {
      title: 'Preturi ForjaIt - Costa mai putin decat un client pierdut',
      description: 'Planuri de la 0 RON/luna. 14 zile gratuit pe orice plan. Fara contract, fara penalizari.',
    },
    schema: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Cat costa ForjaIt?', acceptedAnswer: { '@type': 'Answer', text: 'Planul Gratuit: 0 RON/luna (1 utilizator, 50 clienti). Starter: 99 RON/luna (5 utilizatori, 500 clienti). Professional: 249 RON/luna (15 utilizatori, nelimitat). Enterprise: pret personalizat. Toate planurile includ 14 zile gratuit.' } },
        { '@type': 'Question', name: 'Pot schimba planul oricand?', acceptedAnswer: { '@type': 'Answer', text: 'Da. Poti face upgrade sau downgrade oricand. La upgrade, diferenta se calculeaza pro-rata.' } },
        { '@type': 'Question', name: 'Ce se intampla dupa cele 14 zile gratuite?', acceptedAnswer: { '@type': 'Answer', text: 'Daca nu alegi un plan platit, contul revine automat la planul Gratuit. Nu pierzi datele, doar accesul la functiile premium.' } },
        { '@type': 'Question', name: 'Exista contracte pe termen lung?', acceptedAnswer: { '@type': 'Answer', text: 'Nu. Toate planurile sunt fara angajament. Plata anuala ofera o reducere de 20%, dar poti anula oricand.' } },
      ],
    },
    body: `
      <header><nav aria-label="Navigare principala"><a href="/">ForjaIt</a><a href="/pricing">Preturi</a><a href="/signup">Inregistrare</a></nav></header>
      <main>
        <h1>Costa mai putin decat un client pierdut.</h1>
        <p>Alege planul care ti se potriveste. 14 zile gratuit pe orice plan. Schimba sau anuleaza oricand.</p>

        <h2>Planuri disponibile</h2>
        <section>
          <h3>Gratuit - 0 RON/luna</h3>
          <p>Pentru freelanceri la inceput. 1 utilizator, 50 clienti, 30 programari/luna.</p>
        </section>
        <section>
          <h3>Starter - 99 RON/luna</h3>
          <p>Pentru afaceri in crestere. 5 utilizatori, 500 clienti, 300 programari/luna. Website builder inclus.</p>
        </section>
        <section>
          <h3>Professional - 249 RON/luna</h3>
          <p>Cel mai popular. 15 utilizatori, clienti nelimitati, programari nelimitate. Toate functionalitatile incluse.</p>
        </section>
        <section>
          <h3>Enterprise - Pret personalizat</h3>
          <p>Pentru echipe mari. Utilizatori nelimitati, suport dedicat, SLA garantat.</p>
        </section>

        <h2>Toate planurile includ</h2>
        <ul>
          <li>Securitate - Criptare HTTPS, parole bcrypt, 2FA optional, GDPR compliant</li>
          <li>14 zile trial - Testeaza orice plan platit gratuit, fara card bancar</li>
          <li>Fara angajament - Anuleaza oricand, fara penalizari sau contracte</li>
          <li>Suport - Email si chat integrat</li>
        </ul>
        <a href="/signup">Activeaza contul gratuit</a>
      </main>`,
    sitemap: { priority: '0.9', changefreq: 'weekly' },
  },
  {
    path: '/signup',
    title: 'Inregistrare - Creeaza cont ForjaIt gratuit | 14 zile trial',
    description: 'Creeaza cont gratuit ForjaIt in 2 minute. Programari online, CRM, facturare si website builder. 14 zile trial pe orice plan, fara card de credit.',
    canonical: `${SITE}/signup`,
    body: `
      <main>
        <h1>Creeaza cont gratuit</h1>
        <p>Inregistreaza-te in 2 minute. 14 zile gratuit pe orice plan, fara card de credit.</p>
        <p>Deja ai cont? <a href="/login">Autentificare</a></p>
      </main>`,
    sitemap: { priority: '0.8', changefreq: 'monthly' },
  },
  {
    path: '/login',
    title: 'Autentificare - ForjaIt',
    description: 'Conecteaza-te la contul tau ForjaIt. Acceseaza programari, clienti, facturi si toate instrumentele de management.',
    canonical: `${SITE}/login`,
    robots: 'noindex, follow',
    body: `
      <main>
        <h1>Autentificare</h1>
        <p>Conecteaza-te la contul tau ForjaIt.</p>
        <p>Nu ai cont? <a href="/signup">Creeaza cont gratuit</a></p>
      </main>`,
    sitemap: false,
  },
  {
    path: '/forgot-password',
    title: 'Recuperare parola - ForjaIt',
    description: 'Reseteaza parola contului tau ForjaIt. Vei primi un email cu un link de resetare.',
    canonical: `${SITE}/forgot-password`,
    robots: 'noindex, nofollow',
    body: `
      <main>
        <h1>Recuperare parola</h1>
        <p>Introdu adresa de email pentru a primi un link de resetare a parolei.</p>
      </main>`,
    sitemap: false,
  },
  {
    path: '/privacy',
    title: 'Politica de Confidentialitate - ForjaIt',
    description: 'Politica de confidentialitate ForjaIt. Cum colectam, stocam si protejam datele tale personale. Conform GDPR si Legii nr. 190/2018.',
    canonical: `${SITE}/privacy`,
    body: `
      <main>
        <h1>Politica de Confidentialitate</h1>
        <p>Ultima actualizare: 8 martie 2026</p>
        <p>Aceasta politica descrie cum ForjaIt colecteaza, stocheaza si protejeaza datele tale personale, in conformitate cu Regulamentul General privind Protectia Datelor (GDPR) si Legea nr. 190/2018.</p>
        <h2>Date colectate</h2>
        <p>Colectam date de identificare (nume, email, telefon), date de cont, date de utilizare si date tehnice.</p>
        <h2>Drepturile tale</h2>
        <p>Ai dreptul de acces, rectificare, stergere, portabilitate si opozitie conform GDPR.</p>
        <h2>Contact</h2>
        <p>Pentru orice intrebari legate de datele personale, ne poti contacta la <a href="mailto:support@forja.it.com">support@forja.it.com</a>.</p>
      </main>`,
    sitemap: { priority: '0.3', changefreq: 'yearly' },
  },
  {
    path: '/terms',
    title: 'Termeni si Conditii - ForjaIt',
    description: 'Termenii si conditiile de utilizare a platformei ForjaIt. Informatii despre drepturi, obligatii si politicile de utilizare.',
    canonical: `${SITE}/terms`,
    body: `
      <main>
        <h1>Termeni si Conditii</h1>
        <p>Ultima actualizare: 8 martie 2026</p>
        <p>Acesti Termeni si Conditii reglementeaza utilizarea platformei ForjaIt. Prin accesarea si utilizarea platformei, acceptati acesti termeni.</p>
        <h2>Utilizarea platformei</h2>
        <p>ForjaIt este o platforma digitala care faciliteaza conexiunea intre furnizori de servicii si clienti prin instrumente de programari, CRM, facturare si comunicare.</p>
        <h2>Contact</h2>
        <p>Pentru orice intrebari, ne poti contacta la <a href="mailto:support@forja.it.com">support@forja.it.com</a>.</p>
      </main>`,
    sitemap: { priority: '0.3', changefreq: 'yearly' },
  },
];

// ---------------------------------------------------------------------------
// Inject SEO into a single HTML file
// ---------------------------------------------------------------------------
function injectSEO(html, route) {
  let out = html;

  // --- <title> ---
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`);

  // --- <meta name="description"> ---
  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${route.description}" />`
  );

  // --- <meta name="robots"> (allow per-route override) ---
  if (route.robots) {
    out = out.replace(
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
      `<meta name="robots" content="${route.robots}" />`
    );
  }

  // --- <link rel="canonical"> ---
  if (route.canonical) {
    out = out.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${route.canonical}" />`
    );
  }

  // --- Open Graph ---
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
    out = out.replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:url" content="${ogUrl}" />`
    );
  }

  // --- Twitter ---
  out = out.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${ogTitle}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${ogDesc}" />`
  );

  // --- hreflang (update per route instead of always pointing to /) ---
  const pageUrl = route.canonical || `${SITE}${route.path}`;
  out = out.replace(
    /<link\s+rel="alternate"\s+hreflang="ro"\s+href="[^"]*"\s*\/?>/,
    `<link rel="alternate" hreflang="ro" href="${pageUrl}" />`
  );
  out = out.replace(
    /<link\s+rel="alternate"\s+hreflang="x-default"\s+href="[^"]*"\s*\/?>/,
    `<link rel="alternate" hreflang="x-default" href="${pageUrl}" />`
  );

  // --- JSON-LD structured data ---
  if (route.schema) {
    const schemas = Array.isArray(route.schema) ? route.schema : [route.schema];
    const jsonLd = schemas
      .map((s) => `  <script type="application/ld+json">${JSON.stringify(s)}</script>`)
      .join('\n');
    out = out.replace('</head>', `${jsonLd}\n  </head>`);
  }

  // --- Semantic HTML body ---
  // Hidden div: crawlers see it, JS users see React
  // Noscript: fallback for non-JS browsers
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
const sitemapUrls = ROUTES
  .filter((r) => r.sitemap !== false)
  .map((r) => {
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
Allow: /pricing
Allow: /privacy
Allow: /terms

Disallow: /dashboard
Disallow: /settings
Disallow: /onboarding
Disallow: /crm
Disallow: /employees
Disallow: /analytics
Disallow: /activity
Disallow: /chat
Disallow: /profile
Disallow: /tasks
Disallow: /leaves
Disallow: /time-tracking
Disallow: /support
Disallow: /reset-password
Disallow: /forgot-password

Sitemap: ${SITE}/sitemap.xml
`;

writeFileSync(join(DIST, 'robots.txt'), robots);
console.log('  robots.txt generated');

console.log(`\nPrerendered ${ROUTES.length} routes + sitemap.xml + robots.txt`);
