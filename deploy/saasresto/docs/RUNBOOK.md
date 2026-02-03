# SAASRESTO Operations Runbook

## Quick Reference

| Task | Command |
|------|---------|
| View app logs | `docker compose logs -f saasresto-app` |
| Restart app | `docker compose restart saasresto-app` |
| Check status | `docker compose ps` |
| Reload nginx | `./scripts/nginx-reload.sh` |
| Manual backup | `./scripts/db-backup.sh` |
| Renew cert | `./scripts/renew-cert.sh` |
| Deploy update | See CI/CD section |

---

## Service Management

### Start/Stop Services

```bash
cd /opt/saasresto

# Start all
docker compose up -d

# Stop all
docker compose down

# Restart specific service
docker compose restart saasresto-app

# View status
docker compose ps
```

### View Logs

```bash
# Follow app logs
docker compose logs -f saasresto-app

# Last 100 lines
docker compose logs --tail=100 saasresto-app

# All services
docker compose logs -f

# Postgres logs
docker compose logs -f saasresto-postgres
```

### Health Checks

```bash
# App health endpoint
curl -s http://localhost:3000/api/health | jq

# Or via public URL
curl -s https://saasresto.isprojets.cloud/api/health

# Postgres health
docker exec saasresto-postgres pg_isready -U saasresto
```

---

## Common Operations

### Deploy New Version

```bash
cd /opt/saasresto

# Pull latest image
docker compose pull

# Restart with new image
docker compose up -d

# Verify
docker compose ps
docker compose logs -f saasresto-app

# Check health
curl https://saasresto.isprojets.cloud/api/health
```

### Rollback to Previous Version

```bash
cd /opt/saasresto

# Find available images
docker images ghcr.io/your-org/saasresto

# Edit .env to use previous tag
nano .env
# Change: SAASRESTO_IMAGE=ghcr.io/your-org/saasresto:previous-tag

# Restart
docker compose up -d
```

### Run Database Migrations

```bash
# Migrations run automatically on app start
# To run manually:
docker compose exec saasresto-app npx prisma migrate deploy
```

### Execute Prisma Commands

```bash
# Open Prisma Studio (not recommended in prod, but possible)
docker compose exec saasresto-app npx prisma studio

# Generate Prisma client
docker compose exec saasresto-app npx prisma generate

# Check migration status
docker compose exec saasresto-app npx prisma migrate status
```

### Access Database Shell

```bash
docker exec -it saasresto-postgres psql -U saasresto -d saasresto
```

Useful queries:
```sql
-- Count tenants
SELECT COUNT(*) FROM "Tenant";

-- List tenants
SELECT id, slug, name FROM "Tenant";

-- Check recent sessions
SELECT * FROM "Session" ORDER BY "createdAt" DESC LIMIT 10;

-- Database size
SELECT pg_size_pretty(pg_database_size('saasresto'));
```

---

## Incident Response

### App Returns 502 Bad Gateway

**Symptoms:** Nginx returns 502, app seems down.

**Diagnosis:**
```bash
# Check if app container is running
docker compose ps

# Check app logs
docker compose logs --tail=50 saasresto-app

# Check if app is listening
docker exec saasresto-app wget -qO- http://localhost:3000/api/health
```

**Common causes:**
1. App crashed → `docker compose restart saasresto-app`
2. Memory exhausted → Check `docker stats`, increase memory
3. Database connection failed → Check postgres health

### App Returns 500 Internal Server Error

**Diagnosis:**
```bash
# Check app logs for stack trace
docker compose logs --tail=100 saasresto-app | grep -A 10 "Error"
```

**Common causes:**
1. Database schema mismatch → Run migrations
2. Missing environment variable → Check `.env`
3. Bug in code → Check recent deployment, rollback if needed

### Database Connection Refused

**Diagnosis:**
```bash
# Check postgres is running
docker compose ps saasresto-postgres

# Check postgres logs
docker compose logs --tail=50 saasresto-postgres

# Check postgres health
docker exec saasresto-postgres pg_isready -U saasresto
```

**Fixes:**
```bash
# Restart postgres
docker compose restart saasresto-postgres

# If data corrupted, restore from backup
./scripts/db-restore.sh
```

### SSL Certificate Expired

**Symptoms:** Browser shows certificate error.

**Diagnosis:**
```bash
# Check cert expiry
openssl x509 -in /opt/saasresto/certs/certificates/saasresto.isprojets.cloud.crt \
    -noout -dates
```

**Fix:**
```bash
# Force renewal
./scripts/renew-cert.sh

# Reload nginx
./scripts/nginx-reload.sh
```

### Disk Full

**Diagnosis:**
```bash
df -h
du -sh /opt/saasresto/*
```

**Fixes:**
```bash
# Clean old Docker images
docker image prune -af

# Clean old logs
truncate -s 0 /opt/saasresto/logs/*.log

# Clean old backups (keep fewer days)
BACKUP_RETENTION_DAYS=7 ./scripts/rotate-backups.sh

# Clean Docker build cache
docker builder prune -af
```

### High CPU/Memory Usage

**Diagnosis:**
```bash
docker stats

# Top processes in container
docker exec saasresto-app top
```

**Mitigations:**
1. Restart the container: `docker compose restart saasresto-app`
2. Check for memory leaks in logs
3. Scale horizontally (requires load balancer setup)

---

## Scheduled Tasks

### Crontab Reference

```bash
# View current cron jobs
crontab -l

# Expected entries:
# 0 2 * * * /opt/saasresto/scripts/db-backup.sh >> /opt/saasresto/logs/cron.log 2>&1
# 0 3 * * * /opt/saasresto/scripts/renew-cert.sh >> /opt/saasresto/logs/cron.log 2>&1
```

### Check Scheduled Task Status

```bash
# View cron logs
tail -f /opt/saasresto/logs/cron.log

# Check backup logs
tail -f /opt/saasresto/logs/backup.log

# Check cert renewal logs
tail -f /opt/saasresto/logs/cert-renewal.log
```

---

## Monitoring Checklist

### Daily Checks
- [ ] App health endpoint returns 200
- [ ] No 5xx errors in nginx logs
- [ ] Backup completed successfully
- [ ] Disk usage below 80%

### Weekly Checks
- [ ] Review error logs
- [ ] Check certificate expiry (should be >60 days)
- [ ] Verify backup can be restored (test in staging)
- [ ] Review Docker image sizes, prune if needed

### Monthly Checks
- [ ] Update dependencies (security patches)
- [ ] Review access logs for anomalies
- [ ] Test disaster recovery procedure
- [ ] Review and rotate secrets if needed

---

## Security Operations

### Rotate Database Password

```bash
cd /opt/saasresto

# 1. Generate new password
NEW_PASS=$(openssl rand -base64 32)
echo "New password: $NEW_PASS"

# 2. Stop app
docker compose stop saasresto-app

# 3. Change password in postgres
docker exec -it saasresto-postgres psql -U saasresto -d saasresto \
    -c "ALTER USER saasresto PASSWORD '$NEW_PASS';"

# 4. Update .env
nano .env
# Update POSTGRES_PASSWORD

# 5. Restart
docker compose up -d

# 6. Verify
curl https://saasresto.isprojets.cloud/api/health
```

### Rotate Auth Secret

```bash
cd /opt/saasresto

# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# 2. Update .env
nano .env
# Update AUTH_SECRET

# 3. Restart app (will invalidate all sessions)
docker compose restart saasresto-app

# Note: All users will be logged out
```

### Check for Unauthorized Access

```bash
# Review nginx access logs
tail -1000 /var/log/nginx/saasresto.access.log | grep -E "401|403|500"

# Check for brute force attempts
tail -1000 /var/log/nginx/saasresto.access.log | grep "/app/login" | wc -l
```

---

## Performance Tuning

### Database Optimization

```bash
# Vacuum and analyze
docker exec saasresto-postgres psql -U saasresto -d saasresto -c "VACUUM ANALYZE;"

# Check slow queries (if pg_stat_statements enabled)
docker exec saasresto-postgres psql -U saasresto -d saasresto \
    -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

### App Memory Tuning

In `docker-compose.yml`, add memory limits:
```yaml
services:
  saasresto-app:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

---

## Useful Commands

### Docker Compose

```bash
# Rebuild without cache
docker compose build --no-cache

# Force recreate containers
docker compose up -d --force-recreate

# View environment variables
docker compose exec saasresto-app env

# Execute command in running container
docker compose exec saasresto-app sh
```

### Networking

```bash
# Check edge network
docker network inspect edge

# Test connectivity from nginx to app
docker exec crm-nginx wget -qO- http://saasresto-app:3000/api/health
```

### Cleanup

```bash
# Remove stopped containers
docker container prune -f

# Remove unused images
docker image prune -af

# Remove unused volumes (CAREFUL - can delete data)
docker volume prune -f

# Full cleanup (everything unused)
docker system prune -af
```
