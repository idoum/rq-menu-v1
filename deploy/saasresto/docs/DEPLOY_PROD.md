# SAASRESTO - Production Deployment Guide

## Overview

This guide covers deploying SAASRESTO to a VPS that already runs a CRM application.

**Architecture:**
```
Internet
    │
    ▼
┌─────────────────────────────────────────┐
│  Existing Nginx Container (crm-nginx)   │
│  Ports 80/443                           │
│  - CRM vhost (HTTP-01 certs)            │
│  - SAASRESTO vhost (DNS-01 wildcard)    │
└─────────────────────────────────────────┘
    │                      │
    ▼                      ▼
┌──────────┐        ┌──────────────────┐
│ CRM App  │        │ saasresto-app    │
└──────────┘        │ (Next.js:3000)   │
                    └──────────────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │ saasresto-postgres│
                    │ (PostgreSQL 16)  │
                    └──────────────────┘
```

## Prerequisites

- VPS with Docker & Docker Compose installed
- Existing CRM running with nginx on ports 80/443
- DNS configured:
  - `saasresto.isprojets.cloud` → VPS IP
  - `*.saasresto.isprojets.cloud` → VPS IP (wildcard A record)
- Hostinger API token for DNS-01 challenge
- GHCR access token (for private images)

## Quick Start

### 1. Create Directory Structure

```bash
ssh user@vps
sudo mkdir -p /opt/saasresto/{data/postgres,backups,uploads,logs,certs,nginx/conf.d,scripts,docs}
sudo chown -R $USER:$USER /opt/saasresto
cd /opt/saasresto
```

### 2. Copy Files

From your local machine:
```bash
scp -r deploy/saasresto/* user@vps:/opt/saasresto/
```

### 3. Configure Environment

```bash
cd /opt/saasresto
cp .env.example .env
chmod 600 .env

# Edit with your values
nano .env
```

**Required values to change:**
- `POSTGRES_PASSWORD` - Strong database password
- `AUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `HOSTINGER_API_TOKEN` - From Hostinger dashboard
- `CERT_EMAIL` - Your email for Let's Encrypt
- `SAASRESTO_IMAGE` - Your GHCR image path

### 4. Create Docker Network

```bash
# Create shared network for nginx <-> saasresto
docker network create edge

# Verify
docker network ls | grep edge
```

### 5. Update CRM Nginx

See "Minimal CRM Changes" section below.

### 6. Obtain SSL Certificate

```bash
cd /opt/saasresto
chmod +x scripts/*.sh

# First-time certificate
./scripts/obtain-cert.sh
```

### 7. Start SAASRESTO

```bash
# Pull and start
docker compose pull
docker compose up -d

# Check status
docker compose ps
docker compose logs -f saasresto-app
```

### 8. Reload Nginx

```bash
./scripts/nginx-reload.sh
```

### 9. Verify Deployment

```bash
# Health check
curl -I https://saasresto.isprojets.cloud/api/health

# Check wildcard works
curl -I https://demo.saasresto.isprojets.cloud/
```

---

## Minimal CRM Changes

### 1. Create Edge Network (if not exists)

```bash
docker network create edge
```

### 2. Update /opt/crm/docker-compose.yml

Add to the **nginx service**:
```yaml
services:
  nginx:  # or whatever your nginx service is named
    # ... existing config ...
    networks:
      - default
      - edge
    volumes:
      # ... existing volumes ...
      # ADD this line to mount SAASRESTO vhost:
      - /opt/saasresto/nginx/conf.d/saasresto.conf:/etc/nginx/conf.d/saasresto.conf:ro
      # ADD this line to mount SAASRESTO certs:
      - /opt/saasresto/certs/live:/etc/nginx/ssl/saasresto:ro

# ADD at the bottom of the file:
networks:
  edge:
    external: true
```

### 3. Restart CRM Nginx

```bash
cd /opt/crm
docker compose up -d nginx
```

This adds the SAASRESTO vhost without touching existing CRM configuration.

---

## Cron Jobs Setup

### Certificate Renewal (Daily)

```bash
# Edit crontab
crontab -e

# Add:
0 3 * * * /opt/saasresto/scripts/renew-cert.sh >> /opt/saasresto/logs/cron.log 2>&1
```

### Database Backup (Daily)

```bash
# Add to crontab:
0 2 * * * /opt/saasresto/scripts/db-backup.sh >> /opt/saasresto/logs/cron.log 2>&1
```

---

## GitHub Actions Deployment

### 1. Add Self-Hosted Runner

Follow GitHub docs to install a runner on your VPS:
https://docs.github.com/en/actions/hosting-your-own-runners

### 2. Create Workflow

`.github/workflows/deploy-saasresto-vps.yml` (see repo)

### 3. Required Secrets

In GitHub repo settings, add:
- `GHCR_TOKEN` - GitHub token with packages:read
- (Optional) `SLACK_WEBHOOK` - For deployment notifications

---

## Troubleshooting

### App won't start

```bash
# Check logs
docker compose logs saasresto-app

# Common issues:
# - DATABASE_URL wrong
# - Prisma migrations failed
# - Missing env vars
```

### Certificate issues

```bash
# Check cert status
openssl x509 -in /opt/saasresto/certs/certificates/saasresto.isprojets.cloud.crt -noout -dates

# Verify DNS propagation
dig +short TXT _acme-challenge.saasresto.isprojets.cloud
```

### Nginx 502 Bad Gateway

```bash
# Check if app is running
docker compose ps

# Check if app is on edge network
docker network inspect edge

# Test internal connectivity
docker exec crm-nginx wget -qO- http://saasresto-app:3000/api/health
```

### Database connection issues

```bash
# Check postgres is healthy
docker compose ps saasresto-postgres

# Connect manually
docker exec -it saasresto-postgres psql -U saasresto -d saasresto
```

---

## Rollback Procedure

### 1. Quick Rollback (Previous Image)

```bash
cd /opt/saasresto

# Find previous image
docker images ghcr.io/your-org/saasresto

# Update .env with previous tag
nano .env  # Change SAASRESTO_IMAGE tag

# Restart
docker compose up -d
```

### 2. Database Rollback

```bash
# List backups
./scripts/db-restore.sh

# Restore specific backup
./scripts/db-restore.sh saasresto_20260201_020000.sql.gz
```

---

## Security Checklist

- [ ] `.env` file has `chmod 600`
- [ ] `POSTGRES_PASSWORD` is strong (32+ chars)
- [ ] `AUTH_SECRET` is unique and strong
- [ ] `HOSTINGER_API_TOKEN` not in git
- [ ] Firewall allows only 80/443 from internet
- [ ] SSH uses key-based auth only
- [ ] Regular backups are running
- [ ] Certificate renewal is scheduled

---

## Directory Structure

```
/opt/saasresto/
├── docker-compose.yml      # Main compose file
├── .env                    # Environment variables (NOT in git)
├── .env.example            # Template for .env
├── data/
│   └── postgres/           # PostgreSQL data (persistent)
├── uploads/                # User-uploaded files
├── backups/                # Database backups
├── logs/                   # Application logs
├── certs/                  # SSL certificates (lego)
│   ├── certificates/       # Actual cert files
│   └── live/               # Symlinks for nginx
├── nginx/
│   └── conf.d/
│       └── saasresto.conf  # Nginx vhost (mounted into crm-nginx)
├── scripts/
│   ├── obtain-cert.sh
│   ├── renew-cert.sh
│   ├── nginx-reload.sh
│   ├── db-backup.sh
│   ├── rotate-backups.sh
│   └── db-restore.sh
└── docs/
    ├── DEPLOY_PROD.md
    ├── TLS_HOSTINGER_DNS01.md
    ├── BACKUP_RESTORE.md
    └── RUNBOOK.md
```
