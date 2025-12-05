# WSL Production Networking Setup

## Prerequisites
- Windows 10/11 with WSL2
- Router admin access
- Static IP or Dynamic DNS service (optional but recommended)

---

## 1. Get Your Network Information

### From WSL (Ubuntu)
```bash
# Get WSL IP address
hostname -I | awk '{print $1}'

# Example output: 172.18.240.123
```

### From Windows PowerShell (Run as Administrator)
```powershell
# Get Windows host IP
ipconfig

# Look for "Ethernet adapter" or "Wi-Fi adapter"
# Note your IPv4 Address (e.g., 192.168.1.100)

# Get WSL IP
wsl hostname -I
```

---

## 2. Setup Port Forwarding in Windows

Since WSL runs behind Windows networking, you need to forward ports from Windows to WSL.

### Create Port Forward Script

**On Windows PowerShell (Run as Administrator):**

Create a file: `C:\wsl-port-forward.ps1`

```powershell
$wslIP = (wsl hostname -I).Trim()
Write-Host "WSL IP: $wslIP"

# Remove existing rules (if any)
netsh interface portproxy delete v4tov4 listenport=80 listenaddress=0.0.0.0
netsh interface portproxy delete v4tov4 listenport=443 listenaddress=0.0.0.0
netsh interface portproxy delete v4tov4 listenport=5000 listenaddress=0.0.0.0

# Add port forwarding rules
Write-Host "Setting up port forwarding..."
netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=$wslIP
netsh interface portproxy add v4tov4 listenport=443 listenaddress=0.0.0.0 connectport=443 connectaddress=$wslIP
netsh interface portproxy add v4tov4 listenport=5000 listenaddress=0.0.0.0 connectport=5000 connectaddress=$wslIP

Write-Host "Port forwarding configured!"
Write-Host ""
Write-Host "Active port forwards:"
netsh interface portproxy show v4tov4
```

### Run the Script on Every Windows Restart

**Option A: Manual Execution**
```powershell
# Run as Administrator whenever you restart Windows
powershell -ExecutionPolicy Bypass -File C:\wsl-port-forward.ps1
```

**Option B: Automatic on Windows Startup**

1. Press `Win + R`, type `taskschd.msc`, press Enter
2. Click "Create Task" (not "Create Basic Task")
3. **General Tab:**
   - Name: `WSL Port Forward`
   - Check "Run with highest privileges"
   - Check "Run whether user is logged on or not"
4. **Triggers Tab:**
   - New → "At startup"
5. **Actions Tab:**
   - New → Start a program
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File C:\wsl-port-forward.ps1`
6. Click OK and enter your Windows password

### Verify Port Forwarding
```powershell
# Check active port forwards
netsh interface portproxy show v4tov4

# Should show:
# Listen on 0.0.0.0:80 → Connect to 172.x.x.x:80
# Listen on 0.0.0.0:443 → Connect to 172.x.x.x:443
# Listen on 0.0.0.0:5000 → Connect to 172.x.x.x:5000
```

---

## 3. Configure Windows Firewall

### Allow Ports Through Windows Firewall

**PowerShell (Run as Administrator):**

```powershell
# Allow HTTP
New-NetFirewallRule -DisplayName "WSL HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Allow HTTPS
New-NetFirewallRule -DisplayName "WSL HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# Allow Backend (optional - only if accessing directly)
New-NetFirewallRule -DisplayName "WSL Backend" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow

# Verify rules
Get-NetFirewallRule -DisplayName "WSL*"
```

---

## 4. Router Port Forwarding

You need to forward ports from your router to your Windows machine.

### Get Your Windows Local IP
```powershell
ipconfig

# Look for IPv4 Address under your active network adapter
# Example: 192.168.1.100
```

### Configure Router (Access your router admin page)

**Typical router addresses:**
- http://192.168.1.1
- http://192.168.0.1
- http://10.0.0.1

**Login credentials:** Usually on router sticker or:
- Username: `admin`
- Password: Check router manual or sticker

### Add Port Forwarding Rules

Navigate to: **Port Forwarding** or **Virtual Server** or **NAT**

Add these rules:

| Service Name | External Port | Internal Port | Internal IP | Protocol |
|--------------|---------------|---------------|-------------|----------|
| HTTP | 80 | 80 | 192.168.1.100 | TCP |
| HTTPS | 443 | 443 | 192.168.1.100 | TCP |

**Replace `192.168.1.100` with YOUR Windows machine's local IP**

Save and restart router if required.

---

## 5. Get Your Public IP

### Find Your Public IP
```bash
# From WSL or Windows
curl ifconfig.me
# or
curl icanhazip.com
```

Note this IP address - you'll use it in Cloudflare DNS.

### Dynamic IP Warning ⚠️

Most home internet connections have dynamic IPs that change periodically.

**Solutions:**

**Option A: Check ISP for Static IP**
- Call your ISP
- Usually costs $5-10/month extra
- Best solution for production

**Option B: Dynamic DNS (Free)**
- Services: No-IP, DuckDNS, Dynu
- Updates your domain's IP automatically
- See Dynamic DNS Setup section below

**Option C: Monitor & Update Manually**
- Check IP daily
- Update Cloudflare DNS when it changes
- Not recommended for production

---

## 6. Cloudflare DNS Configuration

### DNS Records Setup

Go to Cloudflare Dashboard → DNS → Records

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| A | @ | YOUR_PUBLIC_IP | ☁️ Proxied | Auto |
| A | www | YOUR_PUBLIC_IP | ☁️ Proxied | Auto |
| A | api | YOUR_PUBLIC_IP | ☁️ Proxied | Auto |

**Replace `YOUR_PUBLIC_IP` with the IP from step 5**

### Important Cloudflare Settings

1. **SSL/TLS Mode:** Set to "Full (strict)" after you get SSL certificate
2. **Always Use HTTPS:** Enable
3. **Automatic HTTPS Rewrites:** Enable
4. **Brotli:** Enable

### Wait for DNS Propagation
- Can take 5 minutes to 48 hours
- Check with: `nslookup viperx.online`
- Or online tool: https://dnschecker.org

---

## 7. Dynamic DNS Setup (Optional)

If you don't have a static IP, use Dynamic DNS to auto-update your IP.

### Using Cloudflare API (Recommended)

Create update script in WSL:
```bash
nano ~/update-cloudflare-ip.sh
```

```bash
#!/bin/bash

# Cloudflare credentials
ZONE_ID="your_zone_id_here"
API_TOKEN="your_api_token_here"
DOMAIN="viperx.online"
RECORD_NAMES=("@" "www" "api")

# Get current public IP
CURRENT_IP=$(curl -s ifconfig.me)

echo "Current Public IP: $CURRENT_IP"

# Update each DNS record
for RECORD_NAME in "${RECORD_NAMES[@]}"; do
    if [ "$RECORD_NAME" = "@" ]; then
        FULL_DOMAIN="$DOMAIN"
    else
        FULL_DOMAIN="$RECORD_NAME.$DOMAIN"
    fi

    echo "Updating $FULL_DOMAIN..."

    # Get record ID
    RECORD_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?name=$FULL_DOMAIN" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" | jq -r '.result[0].id')

    # Update record
    curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" \
        --data "{\"type\":\"A\",\"name\":\"$FULL_DOMAIN\",\"content\":\"$CURRENT_IP\",\"ttl\":120,\"proxied\":true}"

    echo "✓ Updated $FULL_DOMAIN"
done

echo "DNS update complete!"
```

**Get Cloudflare credentials:**
1. Zone ID: Cloudflare Dashboard → Overview (right sidebar)
2. API Token: Cloudflare Dashboard → My Profile → API Tokens → Create Token
   - Use template: "Edit zone DNS"
   - Permissions: Zone - DNS - Edit
   - Zone Resources: Include - Specific zone - viperx.online

```bash
chmod +x ~/update-cloudflare-ip.sh

# Test it
~/update-cloudflare-ip.sh
```

### Auto-run Every Hour
```bash
crontab -e
```

Add this line:
```
0 * * * * /home/claudiu/update-cloudflare-ip.sh >> /home/claudiu/dns-update.log 2>&1
```

Now your DNS will auto-update if your IP changes!

---

## 8. Testing Your Setup

### Test Local Access (from Windows)
```powershell
# Test if WSL web server is accessible from Windows
curl http://localhost
curl http://localhost:5000/api/health
```

### Test External Access

**From another device or phone (using mobile data):**
```
http://YOUR_PUBLIC_IP
```

**If DNS is propagated:**
```
https://viperx.online
https://api.viperx.online/api/health
```

### Troubleshooting Connection Issues

**Can't access from external network:**

1. **Check Windows port forwarding:**
   ```powershell
   netsh interface portproxy show v4tov4
   ```

2. **Check router port forwarding:**
   - Login to router
   - Verify rules are active
   - Try disabling router firewall temporarily

3. **Check Windows Firewall:**
   ```powershell
   Get-NetFirewallRule -DisplayName "WSL*" | Select-Object DisplayName,Enabled,Action
   ```

4. **Check ISP blocking:**
   - Some ISPs block port 80/443 for residential connections
   - Call ISP or use alternative ports (8080, 8443)

5. **Test from inside network first:**
   ```
   http://192.168.1.100  (your Windows local IP)
   ```

---

## 9. Keep Computer Running 24/7

### Windows Power Settings

1. **Prevent Sleep:**
   - Settings → System → Power & Sleep
   - Set "When plugged in, PC goes to sleep after" → **Never**

2. **Prevent Hibernation:**
   ```powershell
   # Run as Administrator
   powercfg -h off
   ```

3. **Prevent WSL from stopping:**
   - Settings → Windows Subsystem for Linux
   - Ensure "Start WSL on boot" is enabled (Windows 11)

### Create Windows Startup Script

Create `C:\start-viperx.bat`:
```batch
@echo off
echo Starting WSL and ViperX services...

REM Start WSL (it will auto-start if configured)
wsl -d Ubuntu --exec dbus-launch true

REM Wait a bit for WSL to fully start
timeout /t 10 /nobreak

REM Setup port forwarding
powershell -ExecutionPolicy Bypass -File C:\wsl-port-forward.ps1

REM Start services in WSL
wsl -d Ubuntu --exec bash -c "cd /home/claudiu/WebstormProjects/viper && pm2 resurrect"

echo ViperX services started!
pause
```

Add to Windows startup:
1. Press `Win + R`
2. Type `shell:startup`
3. Create shortcut to `C:\start-viperx.bat`

---

## 10. Monitoring & Maintenance

### Check if Everything is Running

**From Windows PowerShell:**
```powershell
# Check port forwards
netsh interface portproxy show v4tov4

# Check if ports are listening
netstat -ano | findstr ":80 "
netstat -ano | findstr ":443 "

# Check WSL status
wsl --list --running
```

**From WSL:**
```bash
# Check services
pm2 status

# Check Nginx
sudo systemctl status nginx

# Check if ports are listening
sudo netstat -tlnp | grep -E ':80|:443|:5000'
```

### Create Monitoring Script

```bash
nano ~/check-services.sh
```

```bash
#!/bin/bash

echo "=== ViperX Services Status ==="
echo ""

# Check Nginx
echo "Nginx:"
sudo systemctl is-active nginx

# Check PM2
echo "PM2 Backend:"
pm2 describe viperx-backend | grep status

# Check if ports are listening
echo ""
echo "Listening Ports:"
sudo netstat -tlnp | grep -E ':80|:443|:5000'

# Check public IP
echo ""
echo "Public IP:"
curl -s ifconfig.me

# Check disk space
echo ""
echo "Disk Space:"
df -h | grep -E 'Filesystem|/$'

# Check memory
echo ""
echo "Memory:"
free -h
```

```bash
chmod +x ~/check-services.sh

# Run it
~/check-services.sh
```

---

## 11. Backup Strategy for WSL

### Backup WSL Distribution

**From Windows PowerShell (Run as Administrator):**

```powershell
# Export WSL to backup
wsl --export Ubuntu C:\WSL-Backups\ubuntu-backup-$(Get-Date -Format 'yyyyMMdd').tar

# List backups
dir C:\WSL-Backups\
```

### Restore from Backup
```powershell
# Stop WSL
wsl --shutdown

# Import backup
wsl --import Ubuntu-Restored C:\WSL-Restored C:\WSL-Backups\ubuntu-backup-20250113.tar
```

---

## 12. WSL-Specific Issues & Solutions

### Issue: WSL IP Changes After Reboot
**Solution:** Run the port forward script after every reboot (automated with Task Scheduler)

### Issue: Can't Access from Internet
**Checklist:**
- [ ] Port forwarding in Windows working?
- [ ] Port forwarding in router configured?
- [ ] Windows Firewall allows ports?
- [ ] Router firewall allows ports?
- [ ] ISP not blocking ports?
- [ ] Public IP correct in Cloudflare?

### Issue: SSL Certificate Fails
**Problem:** Certbot can't verify domain ownership
**Solution:**
1. Ensure ports 80 and 443 are accessible from internet
2. Test: `curl http://YOUR_PUBLIC_IP`
3. Check DNS propagation: `nslookup viperx.online`

### Issue: Services Don't Start After Reboot
**Solution:** Use the Windows startup script (Section 9)

### Issue: WSL Uses Too Much Memory
```bash
# Create .wslconfig in Windows user directory
# C:\Users\YourUsername\.wslconfig

[wsl2]
memory=4GB
processors=2
swap=2GB
```

Restart WSL:
```powershell
wsl --shutdown
wsl
```

---

## Quick Reference Commands

### Windows PowerShell (Administrator)
```powershell
# Setup port forwarding
powershell -ExecutionPolicy Bypass -File C:\wsl-port-forward.ps1

# Check port forwards
netsh interface portproxy show v4tov4

# Check listening ports
netstat -ano | findstr ":80 :443 :5000"

# Restart WSL
wsl --shutdown
wsl

# Get public IP
(Invoke-WebRequest -Uri "http://ifconfig.me/ip").Content
```

### WSL/Ubuntu
```bash
# Check services
pm2 status
sudo systemctl status nginx

# Restart services
pm2 restart viperx-backend
sudo systemctl restart nginx

# Check ports
sudo netstat -tlnp | grep -E ':80|:443|:5000'

# Update DNS (if using dynamic DNS)
~/update-cloudflare-ip.sh

# Health check
~/check-services.sh
```

---

## Production Readiness Checklist

- [ ] Windows port forwarding configured and automated
- [ ] Windows Firewall rules added
- [ ] Router port forwarding configured
- [ ] Dynamic DNS setup (if no static IP)
- [ ] Cloudflare DNS records configured
- [ ] SSL certificates obtained
- [ ] Windows set to never sleep
- [ ] WSL services auto-start on boot
- [ ] PM2 save and startup configured
- [ ] Backup strategy implemented
- [ ] Monitoring script created
- [ ] Tested external access from mobile data
- [ ] Tested after Windows reboot

---

**Remember:** Keep your Windows machine running 24/7 and ensure your internet connection is stable for production use!
