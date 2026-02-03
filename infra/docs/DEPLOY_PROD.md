# Deploying SaaSResto to Production

This guide covers deploying SaaSResto to a production server with PostgreSQL, Caddy reverse proxy, and systemd service management.

## Prerequisites

- Ubuntu 22.04 LTS (or similar Linux distribution)
- Root or sudo access
- Domain configured (e.g., `saasresto.isprojets.cloud`)
- DNS wildcard record: `*.saasresto.isprojets.cloud → your_server_ip`

## Step 1: Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl git build-essential

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.x
npm --version
```

## Step 2: Install PostgreSQL

```bash
# Install PostgreSQL 15
sudo apt install -y postgresql postgresql-contrib

# Start and enable
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE USER saasresto WITH PASSWORD 'your_secure_password_here';
CREATE DATABASE saasresto OWNER saasresto;
GRANT ALL PRIVILEGES ON DATABASE saasresto TO saasresto;
\q
EOF
```

## Step 3: Install Caddy

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

## Step 4: Create Application User

```bash
# Create dedicated user
sudo useradd -r -m -d /opt/saasresto -s /bin/bash saasresto

# Create directories
sudo mkdir -p /opt/saasresto/logs
sudo mkdir -p /var/backups/saasresto
sudo chown -R saasresto:saasresto /opt/saasresto
sudo chown -R saasresto:saasresto /var/backups/saasresto
```

## Step 5: Deploy Application

```bash
# Switch to app user
sudo -u saasresto -i

# Clone repository (or copy files)
cd /opt/saasresto
git clone https://github.com/yourusername/saasresto.git .

# Install dependencies
npm ci --production=false

# Create production env file
cat > .env.production << EOF
# Database
DATABASE_URL="postgresql://saasresto:your_secure_password_here@localhost:5432/saasresto?schema=public"

# App
NODE_ENV=production
APP_BASE_DOMAIN=saasresto.isprojets.cloud
NEXT_PUBLIC_APP_URL=https://saasresto.isprojets.cloud

# Security (generate with: openssl rand -hex 32)
SESSION_SECRET=your_session_secret_here
EOF

# Build application
npm run build

# Run database migrations
npx prisma migrate deploy

# Seed initial data (if needed)
npm run db:seed

# Exit from saasresto user
exit
```

## Step 6: Configure Caddy

```bash
# Copy production Caddyfile
sudo cp /opt/saasresto/infra/proxy/Caddyfile.prod /etc/caddy/Caddyfile

# If using Cloudflare for DNS challenge, set token
sudo systemctl edit caddy
# Add:
# [Service]
# Environment=CLOUDFLARE_API_TOKEN=your_token_here

# Restart Caddy
sudo systemctl restart caddy
sudo systemctl enable caddy

# Check status
sudo systemctl status caddy
```

### Alternative: Without Wildcard TLS

If you can't use DNS challenge for wildcard certificates, edit the Caddyfile to list each tenant explicitly:

```caddyfile
demo.saasresto.isprojets.cloud {
    reverse_proxy localhost:3000 {
        header_up Host {http.request.host}
        header_up X-Tenant-Slug demo
    }
}
```

## Step 7: Configure Systemd Service

```bash
# Copy service file
sudo cp /opt/saasresto/infra/systemd/saasresto.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Start and enable service
sudo systemctl start saasresto
sudo systemctl enable saasresto

# Check status
sudo systemctl status saasresto

# View logs
sudo journalctl -u saasresto -f
```

## Step 8: Configure Backups

```bash
# Make backup scripts executable
sudo chmod +x /opt/saasresto/infra/scripts/*.sh

# Add cron job for daily backups
sudo crontab -e
# Add:
# 0 3 * * * PGPASSWORD=your_secure_password_here /opt/saasresto/infra/scripts/db-backup.sh >> /var/log/saasresto-backup.log 2>&1
# 0 4 * * * /opt/saasresto/infra/scripts/rotate-backups.sh >> /var/log/saasresto-backup.log 2>&1
```

## Step 9: Firewall Configuration

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

## Step 10: Verify Deployment

1. Open https://demo.saasresto.isprojets.cloud in your browser
2. You should see the public menu
3. Navigate to /app/login and login with demo credentials

## Updating the Application

```bash
# Stop service
sudo systemctl stop saasresto

# Deploy new version
sudo -u saasresto -i
cd /opt/saasresto
git pull origin main
npm ci
npm run build
npx prisma migrate deploy
exit

# Start service
sudo systemctl start saasresto
```

## Monitoring

### View Application Logs

```bash
# Real-time logs
sudo journalctl -u saasresto -f

# Last 100 lines
sudo journalctl -u saasresto -n 100

# Errors only
sudo journalctl -u saasresto -p err
```

### View Caddy Logs

```bash
sudo journalctl -u caddy -f
```

### Check Resource Usage

```bash
# CPU and Memory
htop

# Disk usage
df -h

# Database connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='saasresto';"
```

## SSL Certificate Renewal

Caddy handles automatic certificate renewal. To manually trigger:

```bash
sudo caddy reload --config /etc/caddy/Caddyfile
```

## Rollback

If deployment fails:

```bash
# Stop service
sudo systemctl stop saasresto

# Rollback code
sudo -u saasresto -i
cd /opt/saasresto
git checkout <previous_commit_hash>
npm ci
npm run build
exit

# Rollback database (if needed)
PGPASSWORD=your_password /opt/saasresto/infra/scripts/db-restore.sh /var/backups/saasresto/latest.sql.gz

# Start service
sudo systemctl start saasresto
```

## Security Checklist

- [ ] Strong database password
- [ ] Strong session secret
- [ ] Firewall configured
- [ ] SSL/TLS enabled
- [ ] Regular backups configured
- [ ] Log rotation configured
- [ ] Fail2ban installed (optional)
- [ ] Security updates automated
