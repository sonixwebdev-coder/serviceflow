# ViperX Team Manager - Self-Hosting Deployment Guide

Complete guide for deploying the ViperX Team Manager application on your own server with automatic GitHub synchronization.

---

## Table of Contents

1. [Server Requirements](#server-requirements)
2. [Initial Server Setup](#initial-server-setup)
3. [Install Required Software](#install-required-software)
4. [Database Setup (PostgreSQL)](#database-setup-postgresql)
5. [Application Deployment](#application-deployment)
6. [Configure GitHub Auto-Deployment](#configure-github-auto-deployment)
7. [Configure Nginx as Reverse Proxy](#configure-nginx-as-reverse-proxy)
8. [SSL Certificate Setup](#ssl-certificate-setup)
9. [Process Management with PM2](#process-management-with-pm2)
10. [Monitoring and Maintenance](#monitoring-and-maintenance)
11. [Troubleshooting](#troubleshooting)

---

## Server Requirements

### Minimum Hardware Specifications:
- **CPU**: 2 cores
- **RAM**: 4GB (8GB recommended)
- **Storage**: 20GB SSD
- **OS**: Ubuntu 22.04 LTS or Ubuntu 24.04 LTS (recommended)

### Network Requirements:
- Static IP address or domain name
- Ports 80 (HTTP) and 443 (HTTPS) open
- SSH access (port 22)

---

## Initial Server Setup

### 1. Connect to Your Server

```bash
ssh root@your-server-ip
# Or if using a non-root user:
ssh username@your-server-ip
```

### 2. Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Create a Deployment User (Optional but Recommended)

```bash
# Create a new user for deployments
sudo adduser deploy

# Add user to sudo group
sudo usermod -aG sudo deploy

# Switch to deploy user
su - deploy
```

### 4. Configure Firewall

```bash
# Enable UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Install Required Software

### 1. Install Node.js (v20.x LTS)

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

### 2. Install PostgreSQL

```bash
# Install PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
sudo systemctl status postgresql
```

### 3. Install Redis

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis to start on boot
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verify installation
redis-cli ping  # Should return "PONG"
```

### 4. Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Configure PM2 to start on boot
pm2 startup systemd
# Follow the command output instructions
```

### 6. Install Git

```bash
sudo apt install -y git
git --version
```

---

## Database Setup (PostgreSQL)

### 1. Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE viperx_db;
CREATE USER viperx_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE viperx_db TO viperx_user;

# Grant schema privileges (PostgreSQL 15+)
\c viperx_db
GRANT ALL ON SCHEMA public TO viperx_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO viperx_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO viperx_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO viperx_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO viperx_user;

# Exit PostgreSQL
\q
```

### 2. Configure PostgreSQL for Remote Access (if needed)

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/16/main/postgresql.conf

# Find and modify:
listen_addresses = 'localhost'  # Keep as localhost for security

# Edit pg_hba.conf for local connections
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Add this line for local connections:
local   viperx_db   viperx_user   scram-sha-256

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## Application Deployment

### 1. Set Up GitHub SSH Keys

```bash
# Generate SSH key for GitHub
ssh-keygen -t ed25519 -C "your-server@yourdomain.com"
# Press Enter to accept default location
# Set a passphrase or leave empty

# Display your public key
cat ~/.ssh/id_ed25519.pub

# Copy this key and add it to GitHub:
# Go to GitHub → Settings → SSH and GPG keys → New SSH key
# Paste your public key
```

### 2. Clone the Repository

```bash
# Navigate to deployment directory
cd /home/deploy  # Or your preferred directory

# Clone your repository
git clone git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git viperx
cd viperx

# Verify the clone
git status
```

### 3. Install Dependencies

```bash
# Install all dependencies
npm install

# Install frontend dependencies
cd apps/frontend
npm install
cd ../..

# Install backend dependencies
cd apps/backend
npm install
cd ../..
```

### 4. Configure Environment Variables

```bash
# Create backend .env file
cd apps/backend
nano .env
```

**Backend `.env` configuration:**

```env
# Server Configuration
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com

# Database Configuration
DATABASE_URL=postgresql://viperx_user:your_secure_password_here@localhost:5432/viperx_db

# JWT Configuration
JWT_SECRET=your_very_long_random_secret_key_here_min_32_chars
JWT_EXPIRES_IN=7d

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Session Configuration
SESSION_SECRET=another_very_long_random_secret_key_here

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Email Configuration (optional - configure if using email features)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# Logging
LOG_LEVEL=info
```

```bash
# Generate secure random keys for JWT_SECRET and SESSION_SECRET:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Run this twice and use the outputs for JWT_SECRET and SESSION_SECRET
```

**Frontend `.env` configuration:**

```bash
cd ../frontend
nano .env
```

```env
# API Configuration
VITE_API_URL=https://yourdomain.com/api

# Environment
VITE_ENV=production
```

### 5. Run Database Migrations

```bash
# Navigate to project root
cd /home/deploy/viperx

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### 6. Build the Frontend

```bash
# Build frontend for production
cd apps/frontend
npm run build

# Verify build
ls -la dist/  # Should contain index.html and assets/
```

---

## Configure GitHub Auto-Deployment

### Option 1: GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml` in your repository:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main  # or master, depending on your default branch

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy to Server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /home/deploy/viperx
            git pull origin main
            npm install
            cd apps/frontend
            npm install
            npm run build
            cd ../backend
            npm install
            npm run prisma:generate
            npm run prisma:migrate
            cd ../..
            pm2 restart viperx-ecosystem
```

**Configure GitHub Secrets:**

1. Go to your GitHub repository
2. Navigate to **Settings → Secrets and variables → Actions**
3. Add these secrets:
   - `SERVER_HOST`: Your server IP or domain
   - `SERVER_USER`: Your deployment user (e.g., `deploy`)
   - `SERVER_SSH_KEY`: Your private SSH key (contents of `~/.ssh/id_ed25519` on your LOCAL machine)

### Option 2: Webhook + Deployment Script

#### A. Create Deployment Script

```bash
cd /home/deploy/viperx
nano deploy.sh
```

**deploy.sh content:**

```bash
#!/bin/bash

# Deployment script for ViperX
LOG_FILE="/home/deploy/viperx/deploy.log"
APP_DIR="/home/deploy/viperx"

echo "$(date): Starting deployment..." >> "$LOG_FILE"

# Navigate to app directory
cd "$APP_DIR" || exit 1

# Pull latest changes
echo "$(date): Pulling latest changes from GitHub..." >> "$LOG_FILE"
git pull origin main >> "$LOG_FILE" 2>&1

# Install root dependencies
echo "$(date): Installing root dependencies..." >> "$LOG_FILE"
npm install >> "$LOG_FILE" 2>&1

# Build frontend
echo "$(date): Building frontend..." >> "$LOG_FILE"
cd apps/frontend
npm install >> "$LOG_FILE" 2>&1
npm run build >> "$LOG_FILE" 2>&1

# Install backend dependencies
echo "$(date): Installing backend dependencies..." >> "$LOG_FILE"
cd ../backend
npm install >> "$LOG_FILE" 2>&1

# Run database migrations
echo "$(date): Running database migrations..." >> "$LOG_FILE"
cd ../..
npm run prisma:generate >> "$LOG_FILE" 2>&1
npm run prisma:migrate >> "$LOG_FILE" 2>&1

# Restart application
echo "$(date): Restarting application..." >> "$LOG_FILE"
pm2 restart viperx-ecosystem >> "$LOG_FILE" 2>&1

echo "$(date): Deployment completed successfully!" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"
```

```bash
# Make script executable
chmod +x deploy.sh
```

#### B. Set Up Webhook Server

```bash
cd /home/deploy
mkdir webhook-server
cd webhook-server
npm init -y
npm install express body-parser
```

Create `webhook.js`:

```javascript
const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const crypto = require('crypto');

const app = express();
const PORT = 9000;
const WEBHOOK_SECRET = 'your_webhook_secret_here'; // Change this!

app.use(bodyParser.json());

// Verify GitHub webhook signature
function verifySignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

app.post('/webhook', (req, res) => {
  // Verify signature
  if (!verifySignature(req)) {
    console.log('Invalid signature');
    return res.status(403).send('Forbidden');
  }

  // Check if push to main branch
  if (req.body.ref === 'refs/heads/main') {
    console.log('Push to main detected, running deployment...');

    exec('cd /home/deploy/viperx && ./deploy.sh', (error, stdout, stderr) => {
      if (error) {
        console.error(`Deployment error: ${error}`);
        return;
      }
      console.log(`Deployment output: ${stdout}`);
      if (stderr) console.error(`Deployment stderr: ${stderr}`);
    });

    res.status(200).send('Deployment triggered');
  } else {
    res.status(200).send('Not main branch, skipping deployment');
  }
});

app.listen(PORT, () => {
  console.log(`Webhook server listening on port ${PORT}`);
});
```

```bash
# Start webhook server with PM2
pm2 start webhook.js --name viperx-webhook
pm2 save
```

#### C. Configure GitHub Webhook

1. Go to your GitHub repository
2. Navigate to **Settings → Webhooks → Add webhook**
3. Configure:
   - **Payload URL**: `http://your-server-ip:9000/webhook`
   - **Content type**: `application/json`
   - **Secret**: Your webhook secret from `webhook.js`
   - **Events**: Select "Just the push event"
   - **Active**: ✓ Checked
4. Click **Add webhook**

---

## Configure Nginx as Reverse Proxy

### 1. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/viperx
```

**Nginx configuration:**

```nginx
# Upstream for backend API
upstream backend {
    server localhost:5000;
    keepalive 64;
}

# HTTP server (redirect to HTTPS)
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client body size (for file uploads)
    client_max_body_size 20M;

    # Root directory for frontend
    root /home/deploy/viperx/apps/frontend/dist;
    index index.html;

    # Logs
    access_log /var/log/nginx/viperx-access.log;
    error_log /var/log/nginx/viperx-error.log;

    # API proxy
    location /api {
        proxy_pass http://backend;
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

    # Socket.io proxy for real-time features
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Serve uploaded files
    location /uploads {
        alias /home/deploy/viperx/apps/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Frontend routes (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
}
```

### 2. Enable Site and Test Configuration

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/viperx /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## SSL Certificate Setup

### Using Let's Encrypt (Free SSL)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts:
# - Enter your email address
# - Agree to terms of service
# - Choose whether to redirect HTTP to HTTPS (recommended: yes)

# Verify auto-renewal
sudo certbot renew --dry-run
```

The certificates will auto-renew. Certbot installs a cron job for automatic renewal.

---

## Process Management with PM2

### 1. Create PM2 Ecosystem File

```bash
cd /home/deploy/viperx
nano ecosystem.config.js
```

**ecosystem.config.js:**

```javascript
module.exports = {
  apps: [
    {
      name: 'viperx-backend',
      cwd: '/home/deploy/viperx/apps/backend',
      script: './server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: '/home/deploy/viperx/logs/backend-error.log',
      out_file: '/home/deploy/viperx/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M'
    }
  ]
};
```

### 2. Create Logs Directory

```bash
mkdir -p /home/deploy/viperx/logs
```

### 3. Start Application with PM2

```bash
# Start all apps
pm2 start ecosystem.config.js --name viperx-ecosystem

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd
# Run the command that PM2 outputs

# View logs
pm2 logs viperx-backend

# Monitor processes
pm2 monit
```

### 4. Useful PM2 Commands

```bash
# View all processes
pm2 list

# Restart app
pm2 restart viperx-ecosystem

# Stop app
pm2 stop viperx-ecosystem

# View logs
pm2 logs viperx-backend --lines 100

# Clear logs
pm2 flush

# Monitor CPU/Memory
pm2 monit
```

---

## Monitoring and Maintenance

### 1. Set Up Log Rotation

```bash
sudo nano /etc/logrotate.d/viperx
```

```
/home/deploy/viperx/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 2. Database Backup Script

```bash
nano /home/deploy/backup-db.sh
```

```bash
#!/bin/bash

BACKUP_DIR="/home/deploy/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="viperx_db"
DB_USER="viperx_user"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup database
PGPASSWORD="your_secure_password_here" pg_dump -U "$DB_USER" -h localhost "$DB_NAME" > "$BACKUP_DIR/viperx_$DATE.sql"

# Compress backup
gzip "$BACKUP_DIR/viperx_$DATE.sql"

# Delete backups older than 30 days
find "$BACKUP_DIR" -name "viperx_*.sql.gz" -mtime +30 -delete

echo "Backup completed: viperx_$DATE.sql.gz"
```

```bash
# Make executable
chmod +x /home/deploy/backup-db.sh

# Add to crontab for daily backups at 2 AM
crontab -e

# Add this line:
0 2 * * * /home/deploy/backup-db.sh >> /home/deploy/backup.log 2>&1
```

### 3. Monitor System Resources

```bash
# Install htop for monitoring
sudo apt install -y htop

# View processes
htop

# Check disk space
df -h

# Check memory usage
free -h

# Monitor Nginx access
sudo tail -f /var/log/nginx/viperx-access.log

# Monitor application logs
pm2 logs viperx-backend
```

### 4. Health Check Script

```bash
nano /home/deploy/health-check.sh
```

```bash
#!/bin/bash

# Check if backend is responding
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health)

if [ "$BACKEND_STATUS" != "200" ]; then
    echo "$(date): Backend is down! Restarting..." >> /home/deploy/health-check.log
    pm2 restart viperx-backend
else
    echo "$(date): Backend is healthy" >> /home/deploy/health-check.log
fi
```

```bash
chmod +x /home/deploy/health-check.sh

# Add to crontab (runs every 5 minutes)
crontab -e

# Add this line:
*/5 * * * * /home/deploy/health-check.sh
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs viperx-backend --lines 50

# Check if port 5000 is in use
sudo lsof -i :5000

# Check backend manually
cd /home/deploy/viperx/apps/backend
node server.js
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -U viperx_user -d viperx_db -h localhost

# Check PostgreSQL status
sudo systemctl status postgresql

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

### Nginx Issues

```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# View Nginx error logs
sudo tail -f /var/log/nginx/viperx-error.log

# Restart Nginx
sudo systemctl restart nginx
```

### SSL Certificate Issues

```bash
# Check certificate expiry
sudo certbot certificates

# Manually renew
sudo certbot renew

# Test auto-renewal
sudo certbot renew --dry-run
```

### Redis Issues

```bash
# Check Redis status
sudo systemctl status redis-server

# Test Redis connection
redis-cli ping

# Restart Redis
sudo systemctl restart redis-server
```

### Deployment Not Triggering

**For GitHub Actions:**
- Check Actions tab in GitHub repository
- Review workflow run logs
- Verify secrets are set correctly

**For Webhooks:**
- Check webhook server logs: `pm2 logs viperx-webhook`
- Verify webhook in GitHub settings (Recent Deliveries)
- Check firewall allows port 9000: `sudo ufw status`

### Out of Memory

```bash
# Check memory usage
free -h

# Reduce PM2 instances in ecosystem.config.js
nano ecosystem.config.js
# Change instances: 2 to instances: 1

# Restart
pm2 restart viperx-ecosystem
```

### High CPU Usage

```bash
# Monitor processes
pm2 monit

# Check system resources
htop

# Review application logs for errors
pm2 logs viperx-backend
```

---

## Updating the Application

### Manual Update

```bash
cd /home/deploy/viperx
./deploy.sh
```

### Automatic Update (if using GitHub Actions/Webhooks)

Simply push to the `main` branch:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

The deployment will happen automatically!

---

## Security Best Practices

1. **Keep system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Use strong passwords** for database and JWT secrets

3. **Disable root SSH login:**
   ```bash
   sudo nano /etc/ssh/sshd_config
   # Set: PermitRootLogin no
   sudo systemctl restart sshd
   ```

4. **Enable automatic security updates:**
   ```bash
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure unattended-upgrades
   ```

5. **Regular backups** - Run daily database backups

6. **Monitor logs** regularly for suspicious activity

7. **Keep dependencies updated:**
   ```bash
   cd /home/deploy/viperx
   npm audit
   npm audit fix
   ```

---

## Quick Reference Commands

```bash
# View application status
pm2 status

# Restart application
pm2 restart viperx-ecosystem

# View logs
pm2 logs viperx-backend

# Test deployment script
cd /home/deploy/viperx && ./deploy.sh

# Check database
psql -U viperx_user -d viperx_db

# Reload Nginx
sudo systemctl reload nginx

# View Nginx logs
sudo tail -f /var/log/nginx/viperx-error.log

# Backup database manually
/home/deploy/backup-db.sh

# Check disk space
df -h

# Monitor resources
htop
```

---

## Support

For issues or questions:
1. Check the logs: `pm2 logs`
2. Review Nginx error logs: `sudo tail -f /var/log/nginx/viperx-error.log`
3. Check application health: `curl http://localhost:5000/api/health`
4. Review this troubleshooting guide

---

**Deployment completed! Your ViperX Team Manager application should now be running at https://yourdomain.com with automatic deployment from GitHub.**
