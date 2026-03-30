/**
 * Post-build SEO prerender script.
 *
 * Reads the built dist/index.html and creates route-specific copies
 * with correct <title>, <meta description>, <link canonical>, and OG tags
 * so that crawlers and social-share bots see the right metadata
 * without needing to execute JavaScript.
 *
 * Usage: node scripts/prerender-seo.js
 * Runs automatically via: npm run build
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');

const ROUTES = [
  {
    path: '/',
    title: 'ForjaIt - Clientii se programeaza singuri | Programari, CRM, Facturare',
    description: 'O singura platforma care inlocuieste agenda, Excel-ul si WhatsApp-ul. Programari online, CRM, facturare, website builder si portal clienti. 14 zile gratuit.',
    canonical: 'https://app.forja.it.com/',
    og: {
      title: 'ForjaIt - Clientii se programeaza singuri. Tu te ocupi de business.',
      description: 'Programari online, CRM, facturare si website - o singura platforma pentru afaceri de servicii. 14 zile gratuit.',
      url: 'https://app.forja.it.com/',
    },
  },
  {
    path: '/pricing',
    title: 'Preturi ForjaIt - Planuri de la 0 RON/luna | Fara contract',
    description: 'Planuri flexibile pentru orice afacere de servicii. Starter 99 RON/luna, Professional 249 RON/luna. 14 zile gratuit, fara card de credit.',
    canonical: 'https://app.forja.it.com/pricing',
    og: {
      title: 'Preturi ForjaIt - Costa mai putin decat un client pierdut',
      description: 'Planuri de la 0 RON/luna. 14 zile gratuit pe orice plan. Fara contract, fara penalizari.',
      url: 'https://app.forja.it.com/pricing',
    },
  },
  {
    path: '/signup',
    title: 'Inregistrare - Creeaza cont ForjaIt gratuit | 14 zile trial',
    description: 'Creeaza cont gratuit ForjaIt in 2 minute. Programari online, CRM, facturare si website builder. 14 zile trial pe orice plan, fara card de credit.',
    canonical: 'https://app.forja.it.com/signup',
  },
  {
    path: '/privacy',
    title: 'Politica de Confidentialitate - ForjaIt',
    description: 'Politica de confidentialitate ForjaIt. Cum colectam, stocam si protejam datele tale personale. Conform GDPR si Legii nr. 190/2018.',
    canonical: 'https://app.forja.it.com/privacy',
  },
  {
    path: '/terms',
    title: 'Termeni si Conditii - ForjaIt',
    description: 'Termenii si conditiile de utilizare a platformei ForjaIt. Informatii despre drepturi, obligatii si politicile de utilizare.',
    canonical: 'https://app.forja.it.com/terms',
  },
];

function injectSEO(html, route) {
  let out = html;

  // Replace <title>
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`);

  // Replace <meta name="description">
  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${route.description}" />`
  );

  // Replace <link rel="canonical">
  if (route.canonical) {
    out = out.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${route.canonical}" />`
    );
  }

  // Replace OG tags
  const og = route.og || {};
  const ogTitle = og.title || route.title;
  const ogDesc = og.description || route.description;
  const ogUrl = og.url || route.canonical;

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

  // Replace Twitter tags
  out = out.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${ogTitle}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${ogDesc}" />`
  );

  return out;
}

const baseHtml = readFileSync(join(DIST, 'index.html'), 'utf-8');

for (const route of ROUTES) {
  const rendered = injectSEO(baseHtml, route);

  if (route.path === '/') {
    // Overwrite the root index.html
    writeFileSync(join(DIST, 'index.html'), rendered);
    console.log(`  / -> dist/index.html`);
  } else {
    const dir = join(DIST, route.path);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), rendered);
    console.log(`  ${route.path} -> dist${route.path}/index.html`);
  }
}

console.log(`Prerendered SEO for ${ROUTES.length} routes.`);
