# ViperX CRM - Production Deployment Guide

## Prerequisites Checklist
- ✅ WSL environment (Ubuntu recommended)
- ✅ Node.js & npm installed
- ✅ Git installed
- ✅ PM2 installed globally
- ✅ Domain: viperx.online
- ✅ Cloudflare DNS configured

---

## Table of Contents
1. [Install Required Software](#1-install-required-software)
2. [Setup PostgreSQL Database](#2-setup-postgresql-database)
3. [Configure Nginx](#3-configure-nginx)
4. [SSL Certificate with Certbot](#4-ssl-certificate-with-certbot)
5. [Clone and Configure Project](#5-clone-and-configure-project)
6. [Environment Variables](#6-environment-variables)
7. [Database Setup](#7-database-setup)
8. [Build Frontend](#8-build-frontend)
9. [Configure PM2](#9-configure-pm2)
10. [Cloudflare Configuration](#10-cloudflare-configuration)
11. [GitHub Deployment Workflow](#11-github-deployment-workflow)
12. [Monitoring & Logs](#12-monitoring--logs)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Install Required Software

### Install Nginx
```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Install Certbot (for SSL)
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Install PostgreSQL (Optional - if not using Neon)
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### Verify Installations
```bash
nginx -v
certbot --version
node -v
npm -v
pm2 -v
git --version
```

---

## 2. Setup PostgreSQL Database

### Option A: Use Existing Neon Database
Skip this section and keep your existing `DATABASE_URL` from `.env`

### Option B: Setup Local PostgreSQL
```bash
# Switch to postgres user
sudo -i -u postgres

# Create database and user
createuser viperx_user -P
# Enter password when prompted (e.g., "SecurePassword123")

createdb viperx_production -O viperx_user

# Exit postgres user
exit

# Test connection
psql -U viperx_user -d viperx_production -h localhost
# Enter password when prompted
# Type \q to exit
```

---

## 3. Configure Nginx

### Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/viperx
```

Paste this configuration (Single Domain Setup - Everything on viperx.online):
```nginx
server {
    listen 80;
    server_name viperx.online www.viperx.online;

    client_max_body_size 10M;

    # Backend API
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

    # WebSocket support for realtime features
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Serve uploaded files (PDFs, images, logos, etc.)
    location /files {
        alias /home/claudiu/viper/apps/backend/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";

        # Allow CORS for files
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept" always;
    }

    # Frontend - serve React app
    root /home/claudiu/viper/apps/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
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

**Important Notes:**
- Everything runs on `viperx.online` (no api subdomain)
- Backend API: `https://viperx.online/api`
- Uploaded files: `https://viperx.online/files`
- Frontend: `https://viperx.online`
- WebSocket: `https://viperx.online/socket.io`

### Enable the configuration
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/viperx /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 4. SSL Certificate with Certbot

### Obtain SSL Certificates
```bash
# For both domains at once
sudo certbot --nginx -d viperx.online -d www.viperx.online -d api.viperx.online
```

Follow the prompts:
- Enter your email address
- Agree to Terms of Service
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### Auto-renewal test
```bash
sudo certbot renew --dry-run
```

Certbot will automatically renew certificates before they expire.

---

## 5. Clone and Configure Project

### Clone Repository
```bash
cd /home/claudiu/WebstormProjects
# If viper directory already exists, skip clone
# Otherwise:
git clone https://github.com/YOUR_USERNAME/viper.git
cd viper
```

### Install Dependencies
```bash
# Install backend dependencies
cd apps/backend
npm install --production

# Install frontend dependencies
cd ../frontend
npm install
```

---

## 6. Environment Variables

### Backend Environment (.env)
```bash
cd /home/claudiu/WebstormProjects/viper/apps/backend
nano .env
```

Update with production values:
```env
# Server Configuration
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://viperx.online

# Database - Use your Neon connection string or local PostgreSQL
DATABASE_URL="postgresql://viperx_user:SecurePassword123@localhost:5432/viperx_production?schema=public"
# OR keep your existing Neon URL:
# DATABASE_URL="postgresql://neondb_owner:npg_E47MzPlcGdwm@ep-spring-butterfly-ahmwi25f-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# JWT Secrets (CHANGE THESE!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-too

# Session Secret (CHANGE THIS!)
SESSION_SECRET=your-super-secret-session-key-minimum-32-characters-long

# CORS
CORS_ORIGIN=https://viperx.online

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Push Notifications (keep existing VAPID keys)
VAPID_PUBLIC_KEY=BJppv1tbKPTItHHBs1-hH2Vd7JsC9UD-IXh04ylI699R3fqM2qqYiJE7GZQCRSfT_bEJ6tIYtywFlHyMz5Ns1yQ
VAPID_PRIVATE_KEY=pV0mbK3hOf5ALR-omJpe9RVN_elHhpsw1C08R2Jmb7c
VAPID_SUBJECT=mailto:admin@viperx.online

# Email Configuration (optional - for notifications)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
```

**IMPORTANT:** Generate new secure secrets:
```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Frontend Environment (.env)
```bash
cd /home/claudiu/WebstormProjects/viper/apps/frontend
nano .env
```

```env
VITE_API_URL=https://viperx.online/api
VITE_SOCKET_URL=https://viperx.online
```

---

## 7. Database Setup

### Run Prisma Migrations
```bash
cd /home/claudiu/WebstormProjects/viper/apps/backend

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed database with initial data
# node prisma/seed.js
```

### Create Initial Admin User
```bash
# Connect to database
psql -U viperx_user -d viperx_production -h localhost

# Or if using Neon, use their connection string in psql
# psql "postgresql://neondb_owner:npg_E47MzPlcGdwm@..."
```

You'll need to create an admin user through your application's registration flow or seed script.

---

## 8. Build Frontend

### Build for Production
```bash
cd /home/claudiu/WebstormProjects/viper/apps/frontend

# Build
npm run build

# Verify build output
ls -la dist/
```

The `dist` folder should contain your built frontend files.

---

## 9. Configure PM2

### Create PM2 Ecosystem File
```bash
cd /home/claudiu/WebstormProjects/viper
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'viperx-backend',
      cwd: './apps/backend',
      script: 'src/server.js',
      instances: 2, // Use multiple instances for load balancing
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
    },
  ],
};
```

### Start Application with PM2
```bash
# Create logs directory
mkdir -p /home/claudiu/WebstormProjects/viper/apps/backend/logs

# Start application
cd /home/claudiu/WebstormProjects/viper
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the command it outputs (will be something like):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u claudiu --hp /home/claudiu
```

### PM2 Commands
```bash
# View status
pm2 status

# View logs
pm2 logs

# Restart application
pm2 restart viperx-backend

# Stop application
pm2 stop viperx-backend

# Monitor
pm2 monit
```

---

## 10. Cloudflare Configuration

### DNS Records (Cloudflare Dashboard)

Go to Cloudflare Dashboard → Your Domain → DNS → Records

Add these DNS records (only two needed for single domain setup):

| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|--------------|-----|
| A | @ | YOUR_PUBLIC_IP | Proxied ☁️ | Auto |
| A | www | YOUR_PUBLIC_IP | Proxied ☁️ | Auto |

**Note:** No `api` subdomain needed - everything runs on viperx.online

**Get Your WSL IP:**
```bash
# From WSL
hostname -I | awk '{print $1}'

# Or from Windows PowerShell
wsl hostname -I
```

**IMPORTANT:** If you're using WSL on a local machine (not a VPS), you'll need to:
1. Port forward on your router (ports 80, 443)
2. Use your public IP address instead of WSL IP
3. Consider using a VPS instead for production (recommended)

### Cloudflare SSL/TLS Settings
1. Go to SSL/TLS → Overview
2. Set SSL/TLS encryption mode to: **Full (strict)**
3. Enable "Always Use HTTPS"
4. Enable "Automatic HTTPS Rewrites"

### Cloudflare Speed Settings
1. Go to Speed → Optimization
2. Enable "Auto Minify" for JavaScript, CSS, HTML
3. Enable "Brotli"
4. Enable "Rocket Loader" (optional)

---

## 11. GitHub Deployment Workflow

### Setup SSH Key for GitHub
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your-email@example.com"
# Press Enter to accept default location
# Enter a passphrase (recommended)

# Copy public key
cat ~/.ssh/id_ed25519.pub
```

Add this key to GitHub:
1. Go to GitHub → Settings → SSH and GPG keys
2. Click "New SSH Key"
3. Paste your public key

### Create Deployment Script
```bash
cd /home/claudiu/WebstormProjects/viper
nano deploy.sh
```

```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# Pull latest code
echo "📥 Pulling latest code from GitHub..."
git pull origin master

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd apps/backend
npm install --production

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy
npx prisma generate

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

# Build frontend
echo "🏗️  Building frontend..."
npm run build

# Restart backend with PM2
echo "🔄 Restarting backend..."
cd ../..
pm2 restart viperx-backend

echo "✅ Deployment completed!"
echo "🌐 Frontend: https://viperx.online"
echo "🔌 Backend: https://api.viperx.online"
```

Make it executable:
```bash
chmod +x deploy.sh
```

### Deploy Updates
```bash
# From your development machine (WSL), commit and push
git add .
git commit -m "Your changes"
git push origin master

# On production server (same WSL or different), deploy
cd /home/claudiu/WebstormProjects/viper
./deploy.sh
```

### Automated Deployment with Git Hooks (Optional)
```bash
cd /home/claudiu/WebstormProjects/viper/.git/hooks
nano post-merge
```

```bash
#!/bin/bash
cd /home/claudiu/WebstormProjects/viper
./deploy.sh
```

```bash
chmod +x post-merge
```

Now `git pull` will automatically trigger deployment.

---

## 12. Monitoring & Logs

### View Backend Logs
```bash
# Real-time logs
pm2 logs viperx-backend

# Last 100 lines
pm2 logs viperx-backend --lines 100

# Error logs only
pm2 logs viperx-backend --err

# View log files directly
tail -f /home/claudiu/WebstormProjects/viper/apps/backend/logs/backend-error.log
tail -f /home/claudiu/WebstormProjects/viper/apps/backend/logs/backend-out.log
```

### View Nginx Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### System Resource Monitoring
```bash
# PM2 monitoring dashboard
pm2 monit

# System resources
htop

# Disk usage
df -h

# Memory usage
free -h
```

### Setup Log Rotation
```bash
# PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 13. Troubleshooting

### Application Won't Start
```bash
# Check PM2 status
pm2 status

# View error logs
pm2 logs viperx-backend --err

# Check if port 5000 is in use
sudo lsof -i :5000

# Kill process using port
sudo kill -9 $(sudo lsof -t -i:5000)

# Restart application
pm2 restart viperx-backend
```

### Nginx Issues
```bash
# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test database connection
cd /home/claudiu/WebstormProjects/viper/apps/backend
npx prisma db pull

# Check database credentials in .env
cat .env | grep DATABASE_URL
```

### Frontend Not Loading
```bash
# Check if build exists
ls -la /home/claudiu/WebstormProjects/viper/apps/frontend/dist

# Rebuild frontend
cd /home/claudiu/WebstormProjects/viper/apps/frontend
npm run build

# Check Nginx is serving correct directory
sudo nginx -T | grep root
```

### Port Already in Use
```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill the process
sudo kill -9 <PID>

# Or kill all node processes
pkill -9 node

# Restart PM2
pm2 restart all
```

### Clear Cache and Restart Everything
```bash
# Stop all PM2 processes
pm2 stop all
pm2 delete all

# Restart Nginx
sudo systemctl restart nginx

# Restart PostgreSQL (if local)
sudo systemctl restart postgresql

# Start application again
cd /home/claudiu/WebstormProjects/viper
pm2 start ecosystem.config.js
pm2 save
```

---

## Security Checklist

- [ ] Changed all default secrets in `.env`
- [ ] Enabled HTTPS with valid SSL certificate
- [ ] Configured Cloudflare security settings
- [ ] Set up firewall rules (ufw)
- [ ] Database has strong password
- [ ] Regular backups configured
- [ ] PM2 log rotation enabled
- [ ] File upload limits configured
- [ ] CORS properly configured
- [ ] Security headers added in Nginx

### Setup Firewall (UFW)
```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

---

## Backup Strategy

### Database Backups
```bash
# Create backup script
nano /home/claudiu/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/claudiu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# PostgreSQL backup
pg_dump -U viperx_user -d viperx_production > $BACKUP_DIR/viperx_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "viperx_*.sql" -mtime +7 -delete

echo "Backup completed: viperx_$DATE.sql"
```

```bash
chmod +x /home/claudiu/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
```

Add this line:
```
0 2 * * * /home/claudiu/backup-db.sh
```

### Uploaded Files Backup
```bash
# Backup uploads directory
tar -czf /home/claudiu/backups/uploads_$(date +%Y%m%d).tar.gz \
  /home/claudiu/WebstormProjects/viper/apps/backend/uploads
```

---

## Performance Optimization

### Node.js Memory Limit
If experiencing memory issues, increase Node.js heap size:

Edit `ecosystem.config.js`:
```javascript
node_args: '--max-old-space-size=2048', // 2GB
```

### Database Connection Pool
Check `apps/backend/lib/prisma.js` for connection pooling settings.

### Enable PM2 Cluster Mode
Already configured in `ecosystem.config.js` with 2 instances.

---

## Production URL Structure

After deployment, your application will be accessible at:

- **Frontend:** https://viperx.online
- **Backend API:** https://api.viperx.online/api
- **WebSocket:** https://api.viperx.online/socket.io

---

## Quick Command Reference

```bash
# Deploy updates
cd /home/claudiu/WebstormProjects/viper && ./deploy.sh

# View logs
pm2 logs viperx-backend

# Restart backend
pm2 restart viperx-backend

# Restart Nginx
sudo systemctl restart nginx

# Check application status
pm2 status

# Monitor resources
pm2 monit

# Database backup
/home/claudiu/backup-db.sh
```

---

## Need Help?

- Check logs: `pm2 logs viperx-backend`
- Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Test Nginx: `sudo nginx -t`
- PM2 status: `pm2 status`
- Database status: `sudo systemctl status postgresql`

---

**Deployment Guide Version:** 1.0
**Last Updated:** January 2025
**Application:** ViperX CRM
