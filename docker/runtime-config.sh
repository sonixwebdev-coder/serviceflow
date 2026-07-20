#!/bin/sh
set -eu

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

api_url=${SERVICEFLOW_API_URL:-http://localhost:5000/api}
socket_url=${SERVICEFLOW_SOCKET_URL:-http://localhost:5000}
app_url=${SERVICEFLOW_APP_URL:-http://localhost:5173}
portal_url=${SERVICEFLOW_PORTAL_URL:-http://localhost:5174}
website_url=${SERVICEFLOW_WEBSITE_URL:-http://localhost:5175}
admin_url=${SERVICEFLOW_ADMIN_URL:-http://localhost:5176}
platform_name=${PLATFORM_NAME:-ServiceFlow}
platform_url=${PLATFORM_URL:-http://localhost:5173}
contact_email=${PLATFORM_CONTACT_EMAIL:-contact@example.com}

cat > /usr/share/nginx/html/serviceflow-config.js <<EOF
window.__SERVICEFLOW_CONFIG__ = {
  platformName: "$(json_escape "$platform_name")",
  platformUrl: "$(json_escape "$platform_url")",
  platformContactEmail: "$(json_escape "$contact_email")",
  apiUrl: "$(json_escape "$api_url")",
  socketUrl: "$(json_escape "$socket_url")",
  appUrl: "$(json_escape "$app_url")",
  portalUrl: "$(json_escape "$portal_url")",
  websiteUrl: "$(json_escape "$website_url")",
  adminUrl: "$(json_escape "$admin_url")"
};

(() => {
  const config = window.__SERVICEFLOW_CONFIG__;
  const replacements = [
    ["ServiceFlow", config.platformName],
    ["http://localhost:5173", config.platformUrl],
    ["http://localhost:5174", config.portalUrl],
    ["http://localhost:5175", config.websiteUrl]
  ].filter(([from, to]) => to && from !== to);
  const replace = (value) =>
    replacements.reduce((current, [from, to]) => current.split(from).join(to), value);

  document.title = replace(document.title);
  for (const element of document.querySelectorAll("meta[content], link[href]")) {
    const attribute = element.hasAttribute("content") ? "content" : "href";
    element.setAttribute(attribute, replace(element.getAttribute(attribute)));
  }
})();
EOF
