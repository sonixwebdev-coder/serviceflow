# Remote SSH Access to WSL Server

This guide will help you set up SSH access to your WSL server so you can manage it remotely from anywhere.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setup SSH Server in WSL](#setup-ssh-server-in-wsl)
3. [Configure SSH for Remote Access](#configure-ssh-for-remote-access)
4. [Windows Port Forwarding](#windows-port-forwarding)
5. [Firewall Configuration](#firewall-configuration)
6. [Security Best Practices](#security-best-practices)
7. [Connecting Remotely](#connecting-remotely)
8. [Useful Commands](#useful-commands)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- WSL2 installed on Windows
- Administrator access to Windows machine
- Static IP or Dynamic DNS service (for remote access)
- Router access (for port forwarding)

---

## Setup SSH Server in WSL

### 1. Install OpenSSH Server

```bash
# Update package list
sudo apt update

# Install OpenSSH server
sudo apt install openssh-server -y
```

### 2. Configure SSH Server

Edit the SSH configuration file:

```bash
sudo nano /etc/ssh/sshd_config
```

Make sure these settings are configured:

```conf
# Change default port (optional but recommended for security)
Port 2222

# Disable root login for security
PermitRootLogin no

# Enable public key authentication
PubkeyAuthentication yes

# Disable password authentication (after setting up SSH keys)
# PasswordAuthentication no  # Keep this 'yes' initially, disable after SSH keys work

# Allow your user to login
AllowUsers yourusername

# Disable X11 forwarding if not needed
X11Forwarding no

# Set idle timeout (15 minutes)
ClientAliveInterval 300
ClientAliveCountMax 2
```

**Important:** Replace `yourusername` with your actual WSL username.

### 3. Start SSH Service

```bash
# Start SSH service
sudo service ssh start

# Check if it's running
sudo service ssh status

# Enable SSH to start automatically
sudo systemctl enable ssh
```

### 4. Auto-start SSH on WSL Boot

Since WSL doesn't use systemd by default, create a startup script:

```bash
# Create startup script
sudo nano /etc/init.d/ssh-start
```

Add this content:

```bash
#!/bin/bash
service ssh start
```

Make it executable:

```bash
sudo chmod +x /etc/init.d/ssh-start
```

Add to Windows startup by creating a `.bat` file on Windows:

**File:** `C:\Users\YourWindowsUser\start-wsl-ssh.bat`

```bat
@echo off
wsl -d Ubuntu -u root service ssh start
```

Add this `.bat` file to Windows startup:
1. Press `Win + R`
2. Type `shell:startup`
3. Create a shortcut to the `.bat` file

---

## Configure SSH for Remote Access

### 1. Create SSH Key Pair (on your local machine, not the server)

```bash
# On your local computer (Mac, Linux, or Windows with Git Bash)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Or use RSA if ed25519 is not supported
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

Follow the prompts and optionally set a passphrase.

### 2. Copy Public Key to WSL Server

```bash
# From your local machine, copy the public key to the server
ssh-copy-id -p 2222 username@wsl-server-ip

# Or manually copy the key
cat ~/.ssh/id_ed25519.pub
```

Then on the WSL server:

```bash
# On WSL server
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
# Paste your public key here
chmod 600 ~/.ssh/authorized_keys
```

### 3. Test Local SSH Connection

First, find your WSL IP address:

```bash
# On WSL
ip addr show eth0 | grep inet
```

Then test from Windows PowerShell:

```powershell
# From Windows PowerShell
ssh -p 2222 username@WSL_IP_ADDRESS
```

---

## Windows Port Forwarding

To access WSL from outside your local network, you need to forward ports from Windows to WSL.

### Method 1: Using netsh (Persistent)

Run PowerShell as Administrator:

```powershell
# Find your WSL IP address
wsl hostname -I

# Forward port 2222 from Windows to WSL
netsh interface portproxy add v4tov4 listenport=2222 listenaddress=0.0.0.0 connectport=2222 connectaddress=WSL_IP_ADDRESS

# Verify the forwarding
netsh interface portproxy show all

# To remove the forwarding later (if needed)
# netsh interface portproxy delete v4tov4 listenport=2222 listenaddress=0.0.0.0
```

**Important:** WSL IP can change on reboot. To make this persistent, create a script.

### Method 2: Automatic Port Forwarding Script

Create a PowerShell script: `C:\Users\YourWindowsUser\wsl-port-forward.ps1`

```powershell
# Get WSL IP address
$wslIp = (wsl hostname -I).Trim()

# Remove existing port forwarding
netsh interface portproxy delete v4tov4 listenport=2222 listenaddress=0.0.0.0

# Add new port forwarding
netsh interface portproxy add v4tov4 listenport=2222 listenaddress=0.0.0.0 connectport=2222 connectaddress=$wslIp

Write-Host "Port forwarding configured: 0.0.0.0:2222 -> $wslIp:2222"
```

Run this script on Windows startup:
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: At startup
4. Action: Start a program
5. Program: `powershell.exe`
6. Arguments: `-ExecutionPolicy Bypass -File "C:\Users\YourWindowsUser\wsl-port-forward.ps1"`
7. Run with highest privileges

---

## Firewall Configuration

### 1. Windows Firewall

Allow SSH through Windows Firewall (PowerShell as Administrator):

```powershell
# Allow inbound SSH on port 2222
New-NetFirewallRule -DisplayName "WSL SSH" -Direction Inbound -LocalPort 2222 -Protocol TCP -Action Allow

# Verify the rule
Get-NetFirewallRule -DisplayName "WSL SSH"
```

### 2. Router Port Forwarding

To access from outside your home network:

1. Log in to your router's admin panel (usually `192.168.1.1` or `192.168.0.1`)
2. Find "Port Forwarding" or "Virtual Server" settings
3. Add a new rule:
   - **External Port:** 2222 (or any port you prefer)
   - **Internal Port:** 2222
   - **Internal IP:** Your Windows PC's local IP address
   - **Protocol:** TCP
4. Save the rule

### 3. Find Your Public IP

```bash
# From WSL or any terminal
curl ifconfig.me
```

Use this IP address to connect from outside your network.

---

## Security Best Practices

### 1. Change Default SSH Port

Using port `2222` instead of `22` reduces automated attacks.

### 2. Disable Password Authentication

After SSH keys are working, disable password login:

```bash
sudo nano /etc/ssh/sshd_config
```

Change:
```conf
PasswordAuthentication no
```

Restart SSH:
```bash
sudo service ssh restart
```

### 3. Install Fail2Ban

Protect against brute-force attacks:

```bash
# Install fail2ban
sudo apt install fail2ban -y

# Create local configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local
```

Add SSH jail configuration:

```conf
[sshd]
enabled = true
port = 2222
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
```

Start fail2ban:

```bash
sudo service fail2ban start
sudo systemctl enable fail2ban
```

### 4. Use SSH Key with Passphrase

Always use a passphrase on your SSH keys for additional security.

### 5. Limit User Access

Only allow specific users in `/etc/ssh/sshd_config`:

```conf
AllowUsers yourusername
```

### 6. Consider VPN

For better security, use a VPN (like WireGuard or OpenVPN) instead of exposing SSH directly to the internet.

---

## Connecting Remotely

### From Local Network

```bash
# Connect using local IP
ssh -p 2222 username@192.168.x.x

# Or if you added to ~/.ssh/config (recommended)
ssh wsl-server
```

### From Outside Network

```bash
# Connect using public IP
ssh -p 2222 username@YOUR_PUBLIC_IP

# Or with a domain name
ssh -p 2222 username@yourdomain.com
```

### SSH Config for Easy Access

On your local machine, edit `~/.ssh/config`:

```conf
Host wsl-server
    HostName YOUR_PUBLIC_IP_OR_DOMAIN
    User yourusername
    Port 2222
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Then simply connect with:

```bash
ssh wsl-server
```

### Using Dynamic DNS

If your ISP assigns dynamic IP addresses, use a DDNS service:

1. **Free DDNS Services:**
   - No-IP (https://www.noip.com)
   - DuckDNS (https://www.duckdns.org)
   - Dynu (https://www.dynu.com)

2. **Setup DDNS Client on WSL:**

```bash
# Example with DuckDNS
# Create update script
mkdir -p ~/scripts
nano ~/scripts/update-ddns.sh
```

Add:

```bash
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=yourdomain&token=your-token&ip=" | curl -k -o ~/duckdns.log -K -
```

Make executable and add to crontab:

```bash
chmod +x ~/scripts/update-ddns.sh

# Update every 5 minutes
crontab -e
```

Add:
```cron
*/5 * * * * ~/scripts/update-ddns.sh >/dev/null 2>&1
```

---

## Useful Commands

### Server Management

```bash
# Check server status
systemctl status app-name  # If using systemd
pm2 status                 # If using PM2

# View application logs
pm2 logs                   # PM2 logs
pm2 logs --lines 100       # Last 100 lines

# View system logs
sudo journalctl -xe        # System logs
sudo tail -f /var/log/syslog  # Follow system log

# Check disk space
df -h

# Check memory usage
free -h

# Check running processes
top
htop  # Better alternative (install: sudo apt install htop)

# Check network connections
netstat -tulpn
ss -tulpn  # Modern alternative
```

### Application Management

```bash
# Navigate to project
cd /home/user/viper

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Run database migrations
npx prisma migrate deploy

# Seed database
npm run db:seed

# Restart application
pm2 restart all
pm2 restart app-name

# View environment variables
pm2 env 0  # Show env for process ID 0

# Monitor resources
pm2 monit
```

### Log Management

```bash
# View backend logs
cd /home/user/viper/apps/backend
pm2 logs backend

# View Nginx logs (if using)
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Search logs for errors
pm2 logs --err
grep -i error /var/log/syslog

# Clear PM2 logs
pm2 flush
```

### Database Management

```bash
# Connect to database (if PostgreSQL)
psql -U username -d database_name

# Backup database
pg_dump -U username database_name > backup_$(date +%Y%m%d).sql

# Restore database
psql -U username database_name < backup_20231101.sql

# Run Prisma Studio (database GUI)
npx prisma studio
# Then access via SSH tunnel (see below)
```

### SSH Tunneling for Web Interfaces

Access web interfaces securely through SSH tunnel:

```bash
# Forward remote port to local machine
# Format: ssh -L local_port:localhost:remote_port user@server

# Example: Access Prisma Studio (port 5555)
ssh -L 5555:localhost:5555 -p 2222 username@server

# Then open browser: http://localhost:5555
```

### System Updates

```bash
# Update system packages
sudo apt update
sudo apt upgrade -y

# Update Node.js packages globally
npm update -g

# Update project dependencies
cd /home/user/viper
npm update
```

### Quick Health Check Script

Create a health check script:

```bash
nano ~/scripts/health-check.sh
```

Add:

```bash
#!/bin/bash

echo "=== System Health Check ==="
echo ""

echo "Disk Space:"
df -h / | tail -1
echo ""

echo "Memory Usage:"
free -h | grep Mem
echo ""

echo "CPU Load:"
uptime
echo ""

echo "Application Status:"
pm2 list
echo ""

echo "Database Connection:"
npx prisma db execute --stdin <<< "SELECT 1;" && echo "✓ Database OK" || echo "✗ Database Error"
echo ""

echo "Recent Errors (last 10):"
pm2 logs --err --lines 10 --nostream
```

Make executable:

```bash
chmod +x ~/scripts/health-check.sh
```

Run anytime:

```bash
~/scripts/health-check.sh
```

---

## Troubleshooting

### SSH Connection Refused

```bash
# Check if SSH is running
sudo service ssh status

# Start SSH if not running
sudo service ssh start

# Check which port SSH is listening on
sudo netstat -tulpn | grep ssh
```

### Can't Connect from Outside Network

1. **Check Windows port forwarding:**
   ```powershell
   netsh interface portproxy show all
   ```

2. **Check Windows Firewall:**
   ```powershell
   Get-NetFirewallRule -DisplayName "WSL SSH"
   ```

3. **Check router port forwarding:**
   - Verify the rule is active
   - Confirm internal IP is correct

4. **Test from outside:**
   - Use online port checker: https://www.yougetsignal.com/tools/open-ports/
   - Check port 2222 on your public IP

### WSL IP Changes After Reboot

WSL assigns a new IP on each restart. Use the auto-forwarding script in [Windows Port Forwarding](#windows-port-forwarding).

### Permission Denied (publickey)

```bash
# On WSL server, check permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# Verify your public key is in authorized_keys
cat ~/.ssh/authorized_keys

# Check SSH logs for more details
sudo tail -f /var/log/auth.log
```

### SSH Too Slow

Enable SSH compression:

```bash
# In ~/.ssh/config on local machine
Host wsl-server
    Compression yes
    CompressionLevel 6
```

### Forgot SSH Password

If you're locked out and password auth is disabled:

1. Access WSL directly from Windows
2. Re-enable password auth temporarily:
   ```bash
   sudo nano /etc/ssh/sshd_config
   # Set: PasswordAuthentication yes
   sudo service ssh restart
   ```
3. Fix your SSH key issue
4. Disable password auth again

---

## Additional Resources

- [OpenSSH Documentation](https://www.openssh.com/manual.html)
- [WSL Networking](https://learn.microsoft.com/en-us/windows/wsl/networking)
- [Fail2Ban Documentation](https://www.fail2ban.org/)
- [SSH Best Practices](https://infosec.mozilla.org/guidelines/openssh)

---

## Quick Reference Card

```bash
# Connect to server
ssh -p 2222 username@server

# Copy files to server
scp -P 2222 file.txt username@server:/path/to/destination

# Copy files from server
scp -P 2222 username@server:/path/to/file.txt ./local/path

# Sync directory (using rsync)
rsync -avz -e "ssh -p 2222" ./local/dir username@server:/remote/dir

# Run single command
ssh -p 2222 username@server "pm2 status"

# Keep session alive with tmux
ssh -p 2222 username@server
tmux new -s work
# Detach: Ctrl+B, then D
# Reattach: tmux attach -t work
```

---

**Remember:** Always prioritize security when exposing your server to the internet. Regularly update your system, monitor logs, and use strong authentication methods.
