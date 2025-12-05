# Nginx Configuration for ViperX CRM Production

## Overview
This document contains the **complete and correct** nginx configuration for deploying ViperX CRM on `viperx.online`.

## Important Points
- Everything runs on a single domain: `viperx.online`
- Backend API is at: `https://viperx.online/api`
- WebSocket is at: `https://viperx.online/socket.io`
- Static files (PDFs, logos) are at: `https://viperx.online/files`
- Frontend is served at: `https://viperx.online`

## Full Nginx Configuration

### File Location
`/etc/nginx/sites-available/viperx`

### Important: Add this to your nginx.conf or at the top of the http block

```nginx
# In /etc/nginx/nginx.conf, inside the http block (before server blocks)
http {
    # ... existing config ...

    # WebSocket connection upgrade mapping
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    # ... rest of config ...
}
```

### Configuration

```nginx
server {
    listen 80;
    server_name viperx.online www.viperx.online;

    # File upload size limit
    client_max_body_size 10M;

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket support (CRITICAL for realtime features)
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;

        # WebSocket headers - using mapped variable for proper handling
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # WebSocket specific timeouts (24 hours)
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Serve uploaded files (PDFs, images, logos, etc.)
    # IMPORTANT: This must match the storage directory on the backend
    location /files {
        alias /home/claudiu/WebstormProjects/viper/apps/backend/storage;
        expires 1y;
        add_header Cache-Control "public, immutable";

        # Allow CORS for files
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept" always;

        # Handle OPTIONS requests for CORS preflight
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin * always;
            add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept" always;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }

    # Frontend - serve React app
    root /home/claudiu/WebstormProjects/viper/apps/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;

    # Cache static assets (JS, CSS, images, fonts)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # React Router - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

## After SSL Certificate Installation (Certbot)

After running `sudo certbot --nginx -d viperx.online -d www.viperx.online`, Certbot will automatically:
1. Modify the config to redirect HTTP to HTTPS
2. Add SSL certificate paths
3. Create a new server block for port 443

The final config will look similar to above, but with HTTPS on port 443 and HTTP redirecting to HTTPS.

## Setup Instructions

### 1. Create the configuration file
```bash
sudo nano /etc/nginx/sites-available/viperx
```

Paste the configuration above.

### 2. Enable the site
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/viperx /etc/nginx/sites-enabled/

# Remove default site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

### 3. Verify file permissions and directories

**CRITICAL:** Ensure the storage directory exists and has correct permissions:

```bash
# Create storage directory if it doesn't exist
mkdir -p /home/claudiu/WebstormProjects/viper/apps/backend/storage/logos
mkdir -p /home/claudiu/WebstormProjects/viper/apps/backend/storage/pdfs

# Set correct permissions (nginx needs read access)
chmod -R 755 /home/claudiu/WebstormProjects/viper/apps/backend/storage

# Verify nginx user can access the directory
sudo -u www-data ls -la /home/claudiu/WebstormProjects/viper/apps/backend/storage
```

**Important:** If the directory `/home/claudiu` or any parent directories don't have execute permissions for others, nginx won't be able to access the files. Fix with:

```bash
chmod o+x /home/claudiu
chmod o+x /home/claudiu/WebstormProjects
chmod o+x /home/claudiu/WebstormProjects/viper
chmod o+x /home/claudiu/WebstormProjects/viper/apps
chmod o+x /home/claudiu/WebstormProjects/viper/apps/backend
```

### 4. Install SSL Certificate
```bash
sudo certbot --nginx -d viperx.online -d www.viperx.online
```

Follow the prompts and select "Redirect HTTP to HTTPS" when asked.

### 5. Verify it's working

After setup, test each endpoint:

```bash
# Test API
curl -I https://viperx.online/api/health

# Test WebSocket (should not return 400)
curl -I https://viperx.online/socket.io/

# Test file serving (use an actual file path from your uploads)
curl -I https://viperx.online/files/logos/company-logo-1763367275405-737622893.png
```

## Common Issues and Solutions

### Issue 1: WebSocket returns 400 error
**Cause:** Missing WebSocket-specific headers or incorrect proxy configuration
**Solution:** Ensure the `/socket.io/` location block has:
- `proxy_http_version 1.1;`
- `Upgrade` and `Connection` headers properly set using mapped variable
- Long timeouts (86400s for read/send)

**Important:** Use the mapped variable `$connection_upgrade` instead of hardcoded `"upgrade"`:
```nginx
# Add to http block in nginx.conf:
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

# Then in location block:
proxy_set_header Connection $connection_upgrade;  # Correct - handles both HTTP and WebSocket
# NOT: proxy_set_header Connection "upgrade";     # Works but less robust
```

### Issue 2: Files return 404
**Causes:**
1. Wrong storage directory path in nginx config
2. Backend using different storage path than nginx alias
3. Permission issues - nginx can't access the directory
4. Parent directories don't have execute permissions

**Solutions:**
1. Verify storage path matches between backend and nginx
2. Check `FILE_STORAGE_ROOT` in backend `.env`
3. Fix permissions: `chmod -R 755 /path/to/storage`
4. Fix parent directory permissions: `chmod o+x /home/claudiu` (and all parents)

### Issue 3: PDF iframe shows 404
**Cause:** Same as Issue 2, plus CORS headers might be missing
**Solution:**
- Ensure `/files` location has CORS headers
- Verify file exists in the storage directory
- Check browser console for exact error

### Issue 4: Changes don't take effect
**Solution:**
```bash
# Always test config first
sudo nginx -t

# Then reload (faster, no downtime)
sudo systemctl reload nginx

# Or restart if reload doesn't work
sudo systemctl restart nginx
```

## Verification Checklist

After deployment, verify:
- [ ] Homepage loads: `https://viperx.online`
- [ ] API responds: `https://viperx.online/api/health`
- [ ] WebSocket connects (no 400 errors in browser console)
- [ ] File uploads work
- [ ] Company logo displays
- [ ] PDF previews work in iframes
- [ ] SSL certificate is valid
- [ ] HTTP redirects to HTTPS

## Backend Configuration Requirements

Ensure your backend `.env` has:

```env
# Server
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://viperx.online

# File Storage - MUST match nginx alias path
FILE_STORAGE_ROOT=/home/claudiu/WebstormProjects/viper/apps/backend/storage

# CORS
CORS_ORIGIN=https://viperx.online
```

## Frontend Configuration Requirements

Ensure your frontend `.env` has:

```env
VITE_API_URL=https://viperx.online/api
VITE_SOCKET_URL=https://viperx.online
```

---

**Document Version:** 1.0
**Last Updated:** 2025-01-17
**Verified Configuration:** Production-ready for ViperX CRM
