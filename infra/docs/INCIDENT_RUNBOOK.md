# Incident Runbook - SaaSResto

Quick reference guide for common incidents and their resolution.

## Table of Contents

1. [Application Not Responding](#application-not-responding)
2. [Database Connection Issues](#database-connection-issues)
3. [High CPU/Memory Usage](#high-cpumemory-usage)
4. [SSL Certificate Issues](#ssl-certificate-issues)
5. [Login Problems](#login-problems)
6. [Data Corruption](#data-corruption)
7. [Deployment Failures](#deployment-failures)

---

## Application Not Responding

### Symptoms
- 502 Bad Gateway
- Connection timeout
- White page

### Diagnosis

```bash
# Check if service is running
sudo systemctl status saasresto

# Check if port 3000 is listening
ss -tlnp | grep 3000

# Check recent logs
sudo journalctl -u saasresto -n 50 --no-pager

# Check process
ps aux | grep node
```

### Resolution

```bash
# Restart application
sudo systemctl restart saasresto

# If restart fails, check logs for errors
sudo journalctl -u saasresto -n 100

# Check Caddy
sudo systemctl status caddy
sudo systemctl restart caddy
```

### Escalation
If issue persists after restart:
1. Check disk space: `df -h`
2. Check memory: `free -h`
3. Check database: `sudo systemctl status postgresql`

---

## Database Connection Issues

### Symptoms
- "Connection refused" errors
- "Too many connections" errors
- Slow queries

### Diagnosis

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connections count
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check max connections
sudo -u postgres psql -c "SHOW max_connections;"

# Check for locks
sudo -u postgres psql -c "SELECT * FROM pg_locks WHERE NOT granted;"
```

### Resolution

```bash
# Restart PostgreSQL
sudo systemctl restart postgresql

# Kill idle connections (careful!)
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='saasresto' AND state='idle' AND query_start < now() - interval '30 minutes';"

# Increase max connections (edit postgresql.conf)
sudo nano /etc/postgresql/15/main/postgresql.conf
# max_connections = 200
sudo systemctl restart postgresql
```

---

## High CPU/Memory Usage

### Diagnosis

```bash
# Check top processes
top -o %CPU

# Check Node.js memory
ps aux | grep node | grep -v grep

# Check for memory leaks (if running long time)
sudo journalctl -u saasresto | grep -i "memory"
```

### Resolution

```bash
# Graceful restart
sudo systemctl restart saasresto

# If OOM (Out of Memory)
# Check for memory-hungry queries
sudo -u postgres psql -c "SELECT pid, query, state FROM pg_stat_activity WHERE datname='saasresto' ORDER BY query_start;"

# Increase swap (temporary)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## SSL Certificate Issues

### Symptoms
- "Certificate expired" warnings
- "Certificate not valid" errors
- HTTPS not working

### Diagnosis

```bash
# Check certificate expiry
echo | openssl s_client -servername demo.saasresto.isprojets.cloud -connect demo.saasresto.isprojets.cloud:443 2>/dev/null | openssl x509 -noout -dates

# Check Caddy logs
sudo journalctl -u caddy | grep -i "cert"
```

### Resolution

```bash
# Force certificate renewal
sudo caddy reload --config /etc/caddy/Caddyfile

# If DNS challenge fails, check token
# Verify CLOUDFLARE_API_TOKEN is set correctly

# Manual certificate test
sudo caddy trust
```

---

## Login Problems

### Symptoms
- "Invalid credentials" for valid users
- Session not persisting
- Redirect loops

### Diagnosis

```bash
# Check if user exists
sudo -u postgres psql -d saasresto -c "SELECT email, role FROM \"User\" WHERE email='demo@demo.com';"

# Check sessions
sudo -u postgres psql -d saasresto -c "SELECT id, \"userId\", \"expiresAt\" FROM \"Session\" ORDER BY \"createdAt\" DESC LIMIT 5;"

# Check application logs
sudo journalctl -u saasresto | grep -i "auth\|login\|session"
```

### Resolution

```bash
# Reset user password
sudo -u postgres psql -d saasresto << EOF
-- Generate new password hash (use bcrypt)
-- This sets password to 'Demo12345!'
UPDATE "User" 
SET "passwordHash" = '\$2b\$10\$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' 
WHERE email = 'demo@demo.com';
EOF

# Clear expired sessions
sudo -u postgres psql -d saasresto -c "DELETE FROM \"Session\" WHERE \"expiresAt\" < now();"
```

---

## Data Corruption

### Symptoms
- Missing data
- Inconsistent state
- Foreign key violations

### Diagnosis

```bash
# Check table integrity
sudo -u postgres psql -d saasresto -c "SELECT schemaname, relname, n_live_tup FROM pg_stat_user_tables;"

# Check for orphaned records
sudo -u postgres psql -d saasresto << EOF
-- Check orphaned categories
SELECT c.id FROM "Category" c LEFT JOIN "Menu" m ON c."menuId" = m.id WHERE m.id IS NULL;

-- Check orphaned items
SELECT i.id FROM "Item" i LEFT JOIN "Category" c ON i."categoryId" = c.id WHERE c.id IS NULL;
EOF
```

### Resolution

```bash
# Restore from backup
PGPASSWORD=your_password /opt/saasresto/infra/scripts/db-restore.sh /var/backups/saasresto/latest_backup.sql.gz

# Or fix specific issues
sudo -u postgres psql -d saasresto << EOF
-- Delete orphaned categories
DELETE FROM "Category" c WHERE NOT EXISTS (SELECT 1 FROM "Menu" m WHERE m.id = c."menuId");
EOF
```

---

## Deployment Failures

### Symptoms
- Build fails
- Migration fails
- Service won't start after deploy

### Diagnosis

```bash
# Check build output
cd /opt/saasresto
npm run build 2>&1 | tail -50

# Check migration status
npx prisma migrate status

# Check for syntax errors
npm run lint
```

### Resolution

```bash
# Rollback to previous version
git log --oneline -10
git checkout <previous_commit>
npm ci
npm run build

# If migration failed, rollback
# Check prisma/migrations for the failing migration
# Either fix it or delete it

# Reset database (DESTRUCTIVE - last resort)
npx prisma migrate reset --force
npm run db:seed
```

---

## Emergency Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| On-call Dev | dev@example.com | 24/7 |
| Database Admin | dba@example.com | Business hours |
| System Admin | sysadmin@example.com | 24/7 |

## Post-Incident

After resolving any incident:

1. **Document** what happened
2. **Timeline** of events
3. **Root cause** analysis
4. **Action items** to prevent recurrence
5. **Update** this runbook if needed
