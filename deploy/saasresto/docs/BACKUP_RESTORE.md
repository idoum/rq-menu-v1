# SAASRESTO Backup & Restore Guide

## Overview

This guide covers database backup, rotation, and restore procedures for SAASRESTO.

**Backup Strategy:**
- Daily automated PostgreSQL dumps
- 14-day retention (configurable)
- Compressed SQL format (gzip)
- Pre-restore safety backup

---

## Backup Locations

```
/opt/saasresto/
├── backups/                    # Database backups
│   ├── saasresto_20260201_020000.sql.gz
│   ├── saasresto_20260202_020000.sql.gz
│   └── ...
├── uploads/                    # User-uploaded files
│   ├── tenant-uuid-1/
│   │   ├── logo.png
│   │   └── hero.jpg
│   └── tenant-uuid-2/
│       └── ...
└── data/
    └── postgres/               # PostgreSQL data directory
```

---

## Automated Backups

### Setup Cron Job

```bash
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/saasresto/scripts/db-backup.sh >> /opt/saasresto/logs/cron.log 2>&1
```

### What Gets Backed Up

1. **Database** - Full SQL dump via `pg_dump`
   - All tables, indexes, sequences
   - Without owner/ACL info (portable)
   - Compressed with gzip

2. **Uploads** - User files (should backup separately)

### Backup Retention

Default: 14 days. Change in `.env`:
```ini
BACKUP_RETENTION_DAYS=14
```

---

## Manual Backup

### Quick Backup

```bash
cd /opt/saasresto
./scripts/db-backup.sh
```

Output:
```
📦 Starting database backup...
   Database: saasresto
   Container: saasresto-postgres
   Output: /opt/saasresto/backups/saasresto_20260203_143022.sql.gz
✅ Backup completed successfully
   Size: 2.3M
   Integrity: OK (gzip valid)
```

### Backup with Custom Name

```bash
docker exec saasresto-postgres \
    pg_dump -U saasresto -d saasresto --no-owner --no-acl \
    | gzip > /opt/saasresto/backups/manual_backup_$(date +%Y%m%d).sql.gz
```

---

## Restore Procedures

### ⚠️ IMPORTANT: Restore is Destructive

Restoring will **REPLACE** the current database. Always:
1. Verify you have a current backup
2. Consider stopping the app during restore
3. Test in staging first if possible

### List Available Backups

```bash
./scripts/db-restore.sh
```

Output:
```
📋 Available backups:

-rw-r--r-- 1 user user 2.3M Feb  3 02:00 saasresto_20260203_020000.sql.gz
-rw-r--r-- 1 user user 2.2M Feb  2 02:00 saasresto_20260202_020000.sql.gz
-rw-r--r-- 1 user user 2.1M Feb  1 02:00 saasresto_20260201_020000.sql.gz

Usage: ./scripts/db-restore.sh <backup_file.sql.gz>
```

### Restore from Backup

```bash
./scripts/db-restore.sh saasresto_20260201_020000.sql.gz
```

The script will:
1. Ask for confirmation
2. Stop the application
3. Create a "pre-restore" backup of current state
4. Drop and recreate the database
5. Import the backup
6. Restart the application

### Quick Restore (Without Script)

```bash
cd /opt/saasresto

# Stop app
docker compose stop saasresto-app

# Restore
gunzip -c backups/saasresto_20260201_020000.sql.gz | \
    docker exec -i saasresto-postgres psql -U saasresto -d saasresto

# Start app
docker compose up -d saasresto-app
```

---

## Backup User Uploads

User-uploaded files (logos, images) are stored in `/opt/saasresto/uploads/`.

### Backup Uploads

```bash
# Create tarball
tar -czvf /opt/saasresto/backups/uploads_$(date +%Y%m%d).tar.gz \
    -C /opt/saasresto uploads/

# Or rsync to backup server
rsync -avz /opt/saasresto/uploads/ backup-server:/backups/saasresto/uploads/
```

### Restore Uploads

```bash
# From tarball
tar -xzvf uploads_20260201.tar.gz -C /opt/saasresto/

# Fix permissions
chown -R 1000:1000 /opt/saasresto/uploads/  # Match container user
```

---

## Disaster Recovery

### Complete Server Loss

1. **Provision new server**
   - Same OS, Docker installed
   - Same IP (or update DNS)

2. **Restore configuration**
   ```bash
   mkdir -p /opt/saasresto
   cd /opt/saasresto
   
   # Copy from git or backup
   git clone <repo> .
   cp /path/to/backup/.env .
   chmod 600 .env
   ```

3. **Create network**
   ```bash
   docker network create edge
   ```

4. **Start services**
   ```bash
   docker compose up -d saasresto-postgres
   # Wait for postgres to be healthy
   docker compose ps
   ```

5. **Restore database**
   ```bash
   gunzip -c /path/to/backup/saasresto_latest.sql.gz | \
       docker exec -i saasresto-postgres psql -U saasresto -d saasresto
   ```

6. **Restore uploads**
   ```bash
   tar -xzvf /path/to/backup/uploads_latest.tar.gz -C /opt/saasresto/
   ```

7. **Obtain new certificate**
   ```bash
   ./scripts/obtain-cert.sh
   ```

8. **Start application**
   ```bash
   docker compose up -d
   ./scripts/nginx-reload.sh
   ```

---

## Verify Backup Integrity

### Test Gzip Integrity

```bash
gzip -t /opt/saasresto/backups/saasresto_20260201_020000.sql.gz && echo "OK" || echo "CORRUPTED"
```

### Test SQL Validity

```bash
# Check if SQL can be parsed (dry run)
gunzip -c /opt/saasresto/backups/saasresto_20260201_020000.sql.gz | head -100
```

### Full Restore Test

Best practice: regularly test restores in a staging environment.

```bash
# On staging server or local Docker
docker run -d --name test-postgres \
    -e POSTGRES_USER=test \
    -e POSTGRES_PASSWORD=test \
    -e POSTGRES_DB=test \
    postgres:16-alpine

# Wait for startup
sleep 5

# Restore
gunzip -c backup.sql.gz | docker exec -i test-postgres psql -U test -d test

# Verify
docker exec test-postgres psql -U test -d test -c "SELECT COUNT(*) FROM \"Tenant\";"

# Cleanup
docker rm -f test-postgres
```

---

## Backup Monitoring

### Check Latest Backup

```bash
# Most recent backup
ls -lt /opt/saasresto/backups/*.sql.gz | head -1

# Age of latest backup
LATEST=$(ls -t /opt/saasresto/backups/*.sql.gz | head -1)
HOURS_OLD=$(( ( $(date +%s) - $(stat -c %Y "$LATEST") ) / 3600 ))
echo "Latest backup is ${HOURS_OLD} hours old"

# Alert if > 25 hours (missed backup)
if [ $HOURS_OLD -gt 25 ]; then
    echo "WARNING: Backup may have failed!"
fi
```

### Integrate with Monitoring

Add to your monitoring system (Healthchecks.io, Uptime Kuma, etc.):

```bash
# In cron, ping healthcheck on success
0 2 * * * /opt/saasresto/scripts/db-backup.sh && curl -fsS -m 10 --retry 5 https://hc-ping.com/your-uuid
```

---

## Backup Script Reference

### db-backup.sh

Creates timestamped backup:
```bash
./scripts/db-backup.sh
# Creates: backups/saasresto_YYYYMMDD_HHMMSS.sql.gz
```

### rotate-backups.sh

Removes old backups:
```bash
./scripts/rotate-backups.sh
# Keeps last N days (from BACKUP_RETENTION_DAYS)
```

### db-restore.sh

Restores from backup:
```bash
./scripts/db-restore.sh                          # List backups
./scripts/db-restore.sh backup_file.sql.gz       # Restore specific backup
```

---

## Offsite Backups

For production, copy backups offsite:

### Option 1: Rsync to Backup Server

```bash
# Add to cron after backup
30 2 * * * rsync -avz /opt/saasresto/backups/ backup-server:/backups/saasresto/
```

### Option 2: S3/Object Storage

```bash
# Using rclone
rclone copy /opt/saasresto/backups/ remote:bucket/saasresto-backups/
```

### Option 3: Borg Backup

```bash
# Initialize repo
borg init --encryption=repokey user@backup-server:saasresto

# Daily backup
borg create user@backup-server:saasresto::{now} /opt/saasresto/backups /opt/saasresto/uploads
borg prune --keep-daily=7 --keep-weekly=4 --keep-monthly=6 user@backup-server:saasresto
```
