# =============================================================================
# SAASRESTO VPS Deployment - Step-by-Step Apply Plan
# =============================================================================
# This document provides the EXACT commands to run on the VPS to deploy
# SAASRESTO with MINIMAL downtime for the existing CRM.
#
# Estimated CRM downtime: < 30 seconds (nginx reload only)
# =============================================================================

## Prerequisites Checklist

- [ ] VPS access via SSH
- [ ] Docker & Docker Compose installed
- [ ] DNS configured:
  - `saasresto.isprojets.cloud` → VPS IP
  - `*.saasresto.isprojets.cloud` → VPS IP
- [ ] Hostinger API token ready
- [ ] GHCR credentials ready
- [ ] GitHub Actions self-hosted runner configured (see below)

---

## Phase 0: Self-Hosted Runner Setup (One-Time)

Before CI/CD can deploy automatically, the runner user must have proper permissions.

### 0.1 Create Runner User (if not exists)

```bash
# Create user for GitHub Actions runner
sudo useradd -m -s /bin/bash gha-rqmenu

# Add to docker group (required for docker commands without sudo)
sudo usermod -aG docker gha-rqmenu
```

### 0.2 Setup /opt/saasresto Ownership

```bash
# Create directory and give ownership to runner user
sudo mkdir -p /opt/saasresto
sudo chown -R gha-rqmenu:gha-rqmenu /opt/saasresto
```

### 0.3 Verify Permissions

```bash
# Switch to runner user and test
sudo -u gha-rqmenu bash -c '
  echo "User: $(whoami)"
  echo "Groups: $(groups)"
  echo "Docker test: $(docker ps > /dev/null 2>&1 && echo OK || echo FAIL)"
  echo "Write test: $(touch /opt/saasresto/.test && rm /opt/saasresto/.test && echo OK || echo FAIL)"
'
```

Expected output:
```
User: gha-rqmenu
Groups: gha-rqmenu docker
Docker test: OK
Write test: OK
```

### 0.4 Install and Configure Runner

Follow GitHub's instructions to install the self-hosted runner as user `gha-rqmenu`:
1. Go to repo Settings → Actions → Runners → New self-hosted runner
2. Run the installation commands as `gha-rqmenu` user
3. Configure as a service: `sudo ./svc.sh install gha-rqmenu`

---

## Phase 1: Preparation (No Downtime)

### 1.1 Connect to VPS

```bash
ssh user@your-vps-ip
```

### 1.2 Create SAASRESTO Directory Structure

```bash
sudo mkdir -p /opt/saasresto/{data/postgres,backups,uploads,logs,certs/live,nginx/conf.d,scripts,docs}
sudo chown -R $USER:$USER /opt/saasresto
cd /opt/saasresto
```

### 1.3 Upload Files

**From your local machine:**
```bash
cd /path/to/rq-menu-v1
scp -r deploy/saasresto/* user@vps:/opt/saasresto/
```

### 1.4 Make Scripts Executable

```bash
chmod +x /opt/saasresto/scripts/*.sh
```

### 1.5 Configure Environment

```bash
cd /opt/saasresto
cp .env.example .env
chmod 600 .env

# Edit with your production values
nano .env
```

**Critical values to set:**
```ini
POSTGRES_PASSWORD=<generate-strong-password>
AUTH_SECRET=<generate-with-openssl-rand-base64-32>
HOSTINGER_API_TOKEN=<your-hostinger-api-token>
CERT_EMAIL=admin@isprojets.cloud
SAASRESTO_IMAGE=ghcr.io/your-org/saasresto:latest
```

---

## Phase 2: Network Setup (No Downtime)

### 2.1 Create Shared Docker Network

```bash
docker network create edge
```

### 2.2 Verify Network

```bash
docker network ls | grep edge
# Should show: edge    bridge    local
```

---

## Phase 3: Start SAASRESTO Services (No Downtime)

### 3.1 Start Database

```bash
cd /opt/saasresto
docker compose up -d saasresto-postgres

# Wait for healthy
docker compose ps
# Should show: saasresto-postgres healthy
```

### 3.2 Log in to GHCR

```bash
echo $GHCR_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### 3.3 Start Application

```bash
docker compose up -d saasresto-app

# Watch logs
docker compose logs -f saasresto-app
```

Wait for:
```
✓ Ready in Xs
```

### 3.4 Verify App is Running

```bash
# Test internal endpoint
curl http://localhost:3000/api/health

# Should return JSON with status: "ok"
```

---

## Phase 4: Obtain SSL Certificate (No Downtime)

### 4.1 Run Certificate Obtention

```bash
cd /opt/saasresto
./scripts/obtain-cert.sh
```

Expected output:
```
🔐 Obtaining wildcard certificate for saasresto.isprojets.cloud...
✅ Certificate obtained successfully!
```

### 4.2 Verify Certificate

```bash
openssl x509 -in /opt/saasresto/certs/certificates/saasresto.isprojets.cloud.crt \
    -noout -subject -dates
```

---

## Phase 5: Integrate with CRM Nginx (< 30 seconds downtime)

### 5.1 Backup CRM Compose File

```bash
cp /opt/crm/docker-compose.yml /opt/crm/docker-compose.yml.backup
```

### 5.2 Edit CRM Docker Compose

```bash
nano /opt/crm/docker-compose.yml
```

**Add to nginx service volumes:**
```yaml
    volumes:
      # ... existing volumes ...
      - /opt/saasresto/nginx/conf.d/saasresto.conf:/etc/nginx/conf.d/saasresto.conf:ro
      - /opt/saasresto/certs/live:/etc/nginx/ssl/saasresto:ro
```

**Add to nginx service:**
```yaml
    networks:
      - default
      - edge
```

**Add at bottom of file:**
```yaml
networks:
  edge:
    external: true
```

### 5.3 Test Nginx Configuration

```bash
# Temporarily start a test nginx to validate config
docker run --rm \
    -v /opt/crm/nginx/conf.d:/etc/nginx/conf.d:ro \
    -v /opt/saasresto/nginx/conf.d/saasresto.conf:/etc/nginx/conf.d/saasresto.conf:ro \
    -v /opt/saasresto/certs/live:/etc/nginx/ssl/saasresto:ro \
    nginx:alpine nginx -t

# Should show: nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5.4 Apply Changes (Brief Nginx Restart)

```bash
cd /opt/crm

# This is the only step that briefly affects CRM
docker compose up -d nginx

# Verify nginx is running
docker compose ps nginx
```

### 5.5 Verify Both Apps Work

```bash
# Test CRM (your existing app)
curl -I https://your-crm-domain.com

# Test SAASRESTO
curl -I https://saasresto.isprojets.cloud

# Test wildcard
curl -I https://demo.saasresto.isprojets.cloud
```

---

## Phase 6: Setup Scheduled Tasks (No Downtime)

### 6.1 Configure Cron Jobs

```bash
crontab -e
```

Add:
```cron
# SAASRESTO - Daily database backup at 2 AM
0 2 * * * /opt/saasresto/scripts/db-backup.sh >> /opt/saasresto/logs/cron.log 2>&1

# SAASRESTO - Daily certificate renewal check at 3 AM
0 3 * * * /opt/saasresto/scripts/renew-cert.sh >> /opt/saasresto/logs/cron.log 2>&1
```

### 6.2 Verify Cron

```bash
crontab -l
```

---

## Phase 7: Final Verification

### 7.1 Service Status

```bash
cd /opt/saasresto
docker compose ps
```

Expected:
```
NAME                   STATUS
saasresto-app         Up (healthy)
saasresto-postgres    Up (healthy)
```

### 7.2 Test All Endpoints

```bash
# Health check
curl https://saasresto.isprojets.cloud/api/health

# Public menu (should redirect or show demo)
curl -I https://demo.saasresto.isprojets.cloud/

# Login page
curl -I https://demo.saasresto.isprojets.cloud/app/login
```

### 7.3 Test CRM Still Works

```bash
curl -I https://your-crm-domain.com
```

### 7.4 Check Logs for Errors

```bash
# App logs
docker compose logs --tail=50 saasresto-app

# Nginx logs
docker exec crm-nginx tail -50 /var/log/nginx/saasresto.error.log
```

---

## Rollback Procedure (If Something Goes Wrong)

### Quick Rollback - Revert Nginx Config

```bash
cd /opt/crm

# Restore backup
cp docker-compose.yml.backup docker-compose.yml

# Restart nginx
docker compose up -d nginx

# Verify CRM works
curl -I https://your-crm-domain.com
```

### Stop SAASRESTO

```bash
cd /opt/saasresto
docker compose down
```

---

## Post-Deployment Checklist

- [ ] SAASRESTO accessible at https://saasresto.isprojets.cloud
- [ ] Wildcard subdomains work (e.g., demo.saasresto.isprojets.cloud)
- [ ] CRM still works normally
- [ ] SSL certificate valid (check padlock in browser)
- [ ] Cron jobs scheduled (crontab -l)
- [ ] Backup script works (./scripts/db-backup.sh)
- [ ] Health endpoint returns 200
- [ ] Logs show no errors

---

## Support Contacts

- Infrastructure: [your-email]
- On-call: [phone-number]
- Escalation: [manager-email]
