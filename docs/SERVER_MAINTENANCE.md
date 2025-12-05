# Viper Server Maintenance Guide

Quick reference for managing the Viper application remotely via SSH.

## Table of Contents

1. [Connect to Server](#connect-to-server)
2. [Check Application Status](#check-application-status)
3. [View Logs](#view-logs)
4. [Restart Services](#restart-services)
5. [Database Operations](#database-operations)
6. [Deployment Updates](#deployment-updates)
7. [Backup & Restore](#backup--restore)
8. [Common Issues](#common-issues)

---

## Connect to Server

```bash
# Connect via SSH
ssh -p 2222 username@your-server-ip

# Or use configured host
ssh wsl-server
```

---

## Check Application Status

### Quick Health Check

```bash
# Check if services are running
pm2 status

# Check system resources
df -h        # Disk space
free -h      # Memory
uptime       # System uptime and load
```

### Detailed Application Status

```bash
# View detailed PM2 info
pm2 info backend
pm2 info frontend  # If running frontend with PM2

# Real-time monitoring
pm2 monit

# View environment variables
pm2 env backend
```

### Check Database Connection

```bash
cd /home/user/viper

# Test database connection
npx prisma db execute --stdin <<< "SELECT 1;"

# Or connect to database directly
npx prisma studio  # Opens on port 5555
# Access via SSH tunnel: ssh -L 5555:localhost:5555 -p 2222 user@server
```

### Check Redis (if using)

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# View Redis info
redis-cli info

# Check memory usage
redis-cli info memory
```

---

## View Logs

### Application Logs

```bash
# View all logs
pm2 logs

# View specific app logs
pm2 logs backend
pm2 logs backend --lines 100  # Last 100 lines

# View only errors
pm2 logs --err

# Follow logs in real-time
pm2 logs backend --lines 0

# Search logs for specific term
pm2 logs backend | grep -i error
pm2 logs backend | grep -i "user login"
```

### System Logs

```bash
# View system logs
sudo tail -f /var/log/syslog

# View authentication logs (SSH logins, etc.)
sudo tail -f /var/log/auth.log

# Search for errors in system logs
sudo journalctl -p err -b  # Errors since last boot
sudo journalctl -xe        # Last 1000 lines with details
```

### Clear Logs

```bash
# Clear PM2 logs (if they get too large)
pm2 flush

# Clear PM2 logs for specific app
pm2 flush backend
```

---

## Restart Services

### Restart Application

```bash
# Restart all PM2 apps
pm2 restart all

# Restart specific app
pm2 restart backend

# Restart with zero downtime (if clustered)
pm2 reload backend

# Stop and start
pm2 stop backend
pm2 start backend

# Restart all and reload configuration
pm2 restart ecosystem.config.js
```

### Restart System Services

```bash
# Restart SSH (be careful!)
sudo service ssh restart

# Restart Redis
sudo service redis-server restart

# Restart PostgreSQL (if running locally)
sudo service postgresql restart
```

### Reboot Server (last resort)

```bash
# Graceful reboot
sudo reboot

# Force reboot if system is unresponsive
sudo reboot -f
```

---

## Database Operations

### Run Migrations

```bash
cd /home/user/viper

# Deploy migrations (production)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

### Seed Database

```bash
cd /home/user/viper

# Run seeder to create admin user
npm run db:seed
```

### Database Backup

```bash
# Create backup directory
mkdir -p ~/backups

# Backup database (PostgreSQL example)
pg_dump -U postgres viper_db > ~/backups/viper_backup_$(date +%Y%m%d_%H%M%S).sql

# Compress backup
gzip ~/backups/viper_backup_*.sql

# List backups
ls -lh ~/backups/
```

### Database Restore

```bash
# Restore from backup
psql -U postgres viper_db < ~/backups/viper_backup_20231101.sql

# Or if compressed
gunzip -c ~/backups/viper_backup_20231101.sql.gz | psql -U postgres viper_db
```

### Prisma Studio (Database GUI)

```bash
# Start Prisma Studio
cd /home/user/viper
npx prisma studio

# Access from your local machine via SSH tunnel
# On your local machine, run:
# ssh -L 5555:localhost:5555 -p 2222 username@server
# Then open: http://localhost:5555
```

---

## Deployment Updates

### Update Application Code

```bash
cd /home/user/viper

# Check current branch
git branch

# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Run migrations
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate

# Rebuild frontend (if needed)
npm run build --workspace apps/frontend

# Restart application
pm2 restart all

# Verify it's running
pm2 status
pm2 logs --lines 50
```

### Update Node.js Dependencies

```bash
cd /home/user/viper

# Check for outdated packages
npm outdated

# Update all dependencies
npm update

# Or update specific package
npm update package-name

# Restart application
pm2 restart all
```

### Update System Packages

```bash
# Update package list
sudo apt update

# Upgrade packages
sudo apt upgrade -y

# Clean up
sudo apt autoremove -y
sudo apt autoclean
```

---

## Backup & Restore

### Complete Backup Script

Create a backup script:

```bash
nano ~/scripts/backup-viper.sh
```

Add this content:

```bash
#!/bin/bash

BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR=/home/user/viper

echo "Starting backup at $(date)"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
echo "Backing up database..."
pg_dump -U postgres viper_db > $BACKUP_DIR/db_backup_$DATE.sql
gzip $BACKUP_DIR/db_backup_$DATE.sql

# Backup environment files
echo "Backing up environment files..."
cp $APP_DIR/apps/backend/.env $BACKUP_DIR/backend_env_$DATE.bak
cp $APP_DIR/apps/frontend/.env $BACKUP_DIR/frontend_env_$DATE.bak 2>/dev/null || true

# Backup uploads/media (if any)
if [ -d "$APP_DIR/uploads" ]; then
  echo "Backing up uploads..."
  tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C $APP_DIR uploads
fi

# Keep only last 7 days of backups
echo "Cleaning old backups..."
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.bak" -mtime +7 -delete

echo "Backup completed at $(date)"
echo "Backup location: $BACKUP_DIR"
ls -lh $BACKUP_DIR | grep $DATE
```

Make it executable:

```bash
chmod +x ~/scripts/backup-viper.sh
```

Run manually:

```bash
~/scripts/backup-viper.sh
```

Or schedule with cron (daily at 2 AM):

```bash
crontab -e
```

Add:

```cron
0 2 * * * ~/scripts/backup-viper.sh >> ~/backups/backup.log 2>&1
```

### Download Backups to Local Machine

```bash
# From your local machine
scp -P 2222 username@server:~/backups/db_backup_*.sql.gz ./local-backups/

# Or sync entire backup directory
rsync -avz -e "ssh -p 2222" username@server:~/backups/ ./local-backups/
```

---

## Common Issues

### Application Won't Start

```bash
# Check PM2 logs for errors
pm2 logs backend --err

# Check if port is already in use
sudo netstat -tulpn | grep :3000  # Replace with your port

# Check environment variables
pm2 env backend

# Try starting manually to see errors
cd /home/user/viper/apps/backend
node src/server.js  # Or your main file
```

### Database Connection Issues

```bash
# Check if database is running
sudo service postgresql status

# Check database credentials in .env
cat /home/user/viper/apps/backend/.env | grep DATABASE

# Test connection
npx prisma db execute --stdin <<< "SELECT 1;"

# Check Prisma client is generated
npx prisma generate
```

### Out of Memory

```bash
# Check memory usage
free -h

# Check which process is using memory
top
# Press Shift+M to sort by memory

# Restart application to free memory
pm2 restart all

# Or restart specific app
pm2 restart backend
```

### Disk Space Full

```bash
# Check disk usage
df -h

# Find large files/directories
du -sh /home/user/* | sort -h

# Clear PM2 logs
pm2 flush

# Clear system logs (be careful)
sudo journalctl --vacuum-time=7d

# Clean npm cache
npm cache clean --force

# Remove old node_modules and reinstall
cd /home/user/viper
rm -rf node_modules apps/*/node_modules
npm install
```

### Port Already in Use

```bash
# Find process using port 3000 (example)
sudo lsof -i :3000

# Kill the process
sudo kill -9 PID  # Replace PID with actual process ID

# Or use fuser
sudo fuser -k 3000/tcp
```

### Can't SSH to Server

From Windows (where WSL is running):

```bash
# Check if WSL is running
wsl --status

# Check SSH service in WSL
wsl -d Ubuntu -u root service ssh status

# Start SSH if stopped
wsl -d Ubuntu -u root service ssh start

# Check port forwarding
# In PowerShell (as Admin):
netsh interface portproxy show all
```

---

## Useful One-Liners

### Application Management

```bash
# Quick restart and follow logs
pm2 restart backend && pm2 logs backend --lines 50

# Check if app is responding
curl http://localhost:3000/health  # Replace with your health endpoint

# View all environment variables
pm2 env 0 | grep -v "undefined"
```

### Performance Monitoring

```bash
# Monitor CPU and memory in real-time
watch -n 1 'ps aux | grep node'

# Check port listeners
sudo ss -tulpn | grep LISTEN

# Network connections
sudo netstat -anp | grep ESTABLISHED | grep node
```

### Log Analysis

```bash
# Count errors in last hour
pm2 logs backend --lines 1000 --nostream | grep -i error | wc -l

# Find slowest requests (if logging response times)
pm2 logs backend --lines 1000 --nostream | grep -i "response time" | sort -t: -k2 -rn | head -20

# Check for failed login attempts
sudo grep "Failed password" /var/log/auth.log | tail -20
```

---

## Emergency Procedures

### Application Crashed

1. Check logs:
   ```bash
   pm2 logs backend --err --lines 100
   ```

2. Check system resources:
   ```bash
   free -h
   df -h
   ```

3. Restart application:
   ```bash
   pm2 restart backend
   ```

4. If still failing, start manually to see errors:
   ```bash
   cd /home/user/viper/apps/backend
   node src/server.js
   ```

### Database Corrupted

1. Stop application:
   ```bash
   pm2 stop all
   ```

2. Restore from backup:
   ```bash
   psql -U postgres viper_db < ~/backups/latest_backup.sql
   ```

3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

4. Restart application:
   ```bash
   pm2 restart all
   ```

### Server Unresponsive

1. Try SSH first
2. If SSH fails, access via Windows:
   ```powershell
   # In PowerShell
   wsl -d Ubuntu
   ```

3. Check system status:
   ```bash
   top
   df -h
   free -h
   ```

4. Reboot if necessary:
   ```bash
   sudo reboot
   ```

---

## Monitoring Setup (Optional)

### Simple Health Check Script

```bash
nano ~/scripts/health-check.sh
```

Add:

```bash
#!/bin/bash

# Check if application is running
if pm2 status | grep -q "online"; then
    echo "✓ Application is running"
else
    echo "✗ Application is down"
    pm2 restart all
    echo "Application restarted"
fi

# Check database
if npx prisma db execute --stdin <<< "SELECT 1;" >/dev/null 2>&1; then
    echo "✓ Database is accessible"
else
    echo "✗ Database connection failed"
fi

# Check disk space
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "⚠ Disk usage is high: ${DISK_USAGE}%"
else
    echo "✓ Disk usage is normal: ${DISK_USAGE}%"
fi
```

Make executable:

```bash
chmod +x ~/scripts/health-check.sh
```

Run every 5 minutes via cron:

```bash
crontab -e
```

Add:

```cron
*/5 * * * * ~/scripts/health-check.sh >> ~/health-check.log 2>&1
```

---

## Quick Reference

```bash
# SSH connect
ssh -p 2222 user@server

# Status check
pm2 status && df -h && free -h

# View logs
pm2 logs backend --lines 50

# Restart app
pm2 restart backend

# Deploy update
cd /home/user/viper && git pull && npm install && npx prisma migrate deploy && pm2 restart all

# Backup database
pg_dump -U postgres viper_db > ~/backups/backup_$(date +%Y%m%d).sql

# Download logs
scp -P 2222 user@server:~/backups/backup_*.sql ./
```

---

**Tip:** Keep this guide bookmarked for quick reference when managing your server remotely!
