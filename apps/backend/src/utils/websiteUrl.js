function buildWebsiteUrl(website) {
  const template = process.env.WEBSITE_URL_TEMPLATE;
  if (template) {
    return template.replace('{subdomain}', website.subdomain);
  }
  const baseUrl = (process.env.WEBSITE_BASE_URL || 'http://localhost:5175').replace(/\/+$/, '');
  return `${baseUrl}/${website.subdomain}`;
}

module.exports = { buildWebsiteUrl };
