/**
 * Post-build SEO prerender script.
 *
 * Reads the built dist/index.html and creates route-specific copies
 * with correct <title>, <meta description>, and OG tags so that
 * crawlers and social-share bots see the right metadata
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
    title: 'ForjaIt - Programeaza-te online in 30 de secunde | Fara telefon',
    description: 'Gaseste furnizori de servicii, programeaza online si tine evidenta programarilor si facturilor intr-un singur loc. 100% gratuit.',
    og: {
      title: 'ForjaIt - Programeaza-te in 30 de secunde, fara telefon',
      description: 'Alegi serviciul, alegi ora, confirmi. Programari, facturi si comunicare - totul intr-un singur portal gratuit.',
      url: 'https://portal.forja.it.com/',
    },
  },
  {
    path: '/privacy',
    title: 'Politica de Confidentialitate - ForjaIt',
    description: 'Afla cum ForjaIt colecteaza, prelucreaza si protejeaza datele tale personale. Conformitate GDPR, criptare si drepturi de acces.',
  },
  {
    path: '/terms',
    title: 'Termeni si Conditii - ForjaIt',
    description: 'Termenii si conditiile de utilizare a platformei ForjaIt. Drepturi, obligatii si reguli pentru utilizarea serviciului de programari online.',
  },
  {
    path: '/contact',
    title: 'Contact - ForjaIt',
    description: 'Ai o intrebare sau nevoie de ajutor? Trimite-ne un mesaj si iti raspundem in cel mai scurt timp.',
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

  // Replace OG tags
  const og = route.og || {};
  const ogTitle = og.title || route.title;
  const ogDesc = og.description || route.description;
  const ogUrl = og.url || '';

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

  return out;
}

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

console.log(`Prerendered SEO for ${ROUTES.length} routes.`);
