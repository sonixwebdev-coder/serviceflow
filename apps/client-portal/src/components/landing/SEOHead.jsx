import { useEffect } from 'react';

/**
 * Dynamically sets <title>, meta tags, and JSON-LD structured data per page.
 * Works in React SPA without external dependencies.
 */
export default function SEOHead({ title, description, canonical, og, schema }) {
  useEffect(() => {
    if (title) document.title = title;

    const setMeta = (attr, key, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    if (description) setMeta('name', 'description', description);
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }

    if (og) {
      setMeta('property', 'og:title', og.title || title);
      setMeta('property', 'og:description', og.description || description);
      if (og.image) setMeta('property', 'og:image', og.image);
      if (og.url) setMeta('property', 'og:url', og.url);
      setMeta('name', 'twitter:title', og.title || title);
      setMeta('name', 'twitter:description', og.description || description);
      if (og.image) setMeta('name', 'twitter:image', og.image);
    }

    const schemas = schema ? (Array.isArray(schema) ? schema : [schema]) : [];
    const scriptId = 'seo-head-jsonld';
    let scriptEl = document.getElementById(scriptId);
    if (schemas.length > 0) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = scriptId;
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(
        schemas.length === 1 ? schemas[0] : schemas
      );
    }

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [title, description, canonical, og, schema]);

  return null;
}
