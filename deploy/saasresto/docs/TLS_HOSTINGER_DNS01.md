# TLS Wildcard Certificate with Hostinger DNS-01

## Overview

SAASRESTO uses wildcard certificates (`*.saasresto.isprojets.cloud`) to support multi-tenant subdomains like `demo.saasresto.isprojets.cloud`, `pizzeria.saasresto.isprojets.cloud`, etc.

**Why DNS-01?**
- Wildcard certificates REQUIRE DNS-01 challenge (HTTP-01 cannot do wildcards)
- DNS-01 doesn't need port 80 access (good since CRM owns it)
- Works even if the app isn't running yet

**Tool Used: Lego**
- Go-based ACME client
- Native Hostinger DNS provider support
- Runs in a Docker container

---

## Prerequisites

### 1. Hostinger API Token

1. Log into Hostinger Dashboard
2. Go to **Profile** → **API Keys** (or Account Settings → API)
3. Generate a new API key with DNS management permissions
4. Copy the token

### 2. DNS Configuration

In Hostinger DNS settings for `isprojets.cloud`:

| Type | Name | Value |
|------|------|-------|
| A | saasresto | YOUR_VPS_IP |
| A | *.saasresto | YOUR_VPS_IP |

The wildcard `*.saasresto` record ensures all subdomains resolve to your VPS.

---

## Initial Certificate Setup

### 1. Configure Token

```bash
cd /opt/saasresto
nano .env
```

Set:
```ini
HOSTINGER_API_TOKEN=your_token_here
CERT_EMAIL=admin@isprojets.cloud
```

Secure the file:
```bash
chmod 600 .env
```

### 2. Obtain Certificate

```bash
./scripts/obtain-cert.sh
```

This runs:
```bash
docker compose run --rm lego \
    --accept-tos \
    --email="admin@isprojets.cloud" \
    --dns hostinger \
    --domains "saasresto.isprojets.cloud" \
    --domains "*.saasresto.isprojets.cloud" \
    --path /certs \
    run
```

**What happens:**
1. Lego contacts Let's Encrypt
2. Let's Encrypt asks to prove domain ownership
3. Lego creates a TXT record `_acme-challenge.saasresto.isprojets.cloud` via Hostinger API
4. Let's Encrypt verifies the TXT record
5. Certificate is issued and saved to `/opt/saasresto/certs/`

### 3. Verify Certificate

```bash
# Check files exist
ls -la /opt/saasresto/certs/certificates/

# View certificate details
openssl x509 -in /opt/saasresto/certs/certificates/saasresto.isprojets.cloud.crt \
    -noout -subject -dates -issuer
```

Expected output:
```
subject=CN = saasresto.isprojets.cloud
notBefore=Feb  3 00:00:00 2026 GMT
notAfter=May  4 00:00:00 2026 GMT
issuer=C = US, O = Let's Encrypt, CN = R3
```

### 4. Reload Nginx

```bash
./scripts/nginx-reload.sh
```

---

## Certificate Renewal

### Automatic Renewal

Let's Encrypt certificates expire after 90 days. The renewal script checks daily and renews if expiring within 30 days.

**Setup cron:**
```bash
crontab -e

# Add:
0 3 * * * /opt/saasresto/scripts/renew-cert.sh >> /opt/saasresto/logs/cron.log 2>&1
```

### Manual Renewal

```bash
./scripts/renew-cert.sh
```

### Verify Cron

```bash
# Check cron is running
systemctl status cron

# View scheduled jobs
crontab -l

# Check logs
tail -f /opt/saasresto/logs/cert-renewal.log
```

---

## Certificate File Locations

```
/opt/saasresto/certs/
├── certificates/
│   ├── saasresto.isprojets.cloud.crt      # Full chain certificate
│   ├── saasresto.isprojets.cloud.key      # Private key
│   ├── saasresto.isprojets.cloud.issuer.crt
│   └── saasresto.isprojets.cloud.json     # Lego metadata
└── live/
    ├── fullchain.pem -> ../certificates/saasresto.isprojets.cloud.crt
    └── privkey.pem -> ../certificates/saasresto.isprojets.cloud.key
```

**Nginx config uses:**
```nginx
ssl_certificate     /etc/nginx/ssl/saasresto/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/saasresto/privkey.pem;
```

These are mounted from `/opt/saasresto/certs/live/`.

---

## Troubleshooting

### "DNS problem: NXDOMAIN"

**Cause:** DNS records not propagated yet or misconfigured.

**Fix:**
```bash
# Check DNS resolution
dig +short saasresto.isprojets.cloud
dig +short demo.saasresto.isprojets.cloud

# Should both return your VPS IP
```

Wait for DNS propagation (up to 48 hours, usually minutes).

### "Invalid credentials" from Hostinger

**Cause:** API token incorrect or expired.

**Fix:**
1. Verify token in Hostinger dashboard
2. Generate new token if needed
3. Update `/opt/saasresto/.env`

### "Rate limit exceeded"

**Cause:** Too many certificate requests (Let's Encrypt limit: 5 per week per domain).

**Fix:**
- Wait a week, or
- Use staging environment for testing:
  ```bash
  docker compose run --rm lego \
      --accept-tos \
      --server="https://acme-staging-v02.api.letsencrypt.org/directory" \
      --email="admin@isprojets.cloud" \
      --dns hostinger \
      --domains "saasresto.isprojets.cloud" \
      --domains "*.saasresto.isprojets.cloud" \
      --path /certs \
      run
  ```

### TXT Record Not Cleaning Up

Lego should clean up TXT records after challenge. If stuck:

1. Log into Hostinger DNS management
2. Look for `_acme-challenge.saasresto` TXT records
3. Delete manually if present

### Certificate Not Recognized by Nginx

**Cause:** Symlinks broken or nginx not reloaded.

**Fix:**
```bash
# Recreate symlinks
cd /opt/saasresto/certs
rm -rf live
mkdir live
ln -s ../certificates/saasresto.isprojets.cloud.crt live/fullchain.pem
ln -s ../certificates/saasresto.isprojets.cloud.key live/privkey.pem

# Reload nginx
./scripts/nginx-reload.sh
```

---

## Security Notes

### Protect API Token

The Hostinger API token can modify your DNS. Keep it secure:

```bash
# File permissions
chmod 600 /opt/saasresto/.env

# Never commit to git
echo ".env" >> .gitignore
```

### Monitor Expiry

Set up monitoring for certificate expiry:

```bash
# Check days until expiry
openssl x509 -in /opt/saasresto/certs/certificates/saasresto.isprojets.cloud.crt \
    -noout -checkend $((30*86400)) && echo "OK" || echo "EXPIRES SOON"
```

Add to monitoring system (Uptime Kuma, Healthchecks.io, etc.).

---

## Alternative: Certbot with certbot-dns-hostinger

If you prefer Certbot over Lego:

```bash
# Install certbot with hostinger plugin
pip install certbot certbot-dns-hostinger

# Create credentials file
cat > /opt/saasresto/hostinger.ini <<EOF
dns_hostinger_api_key = YOUR_TOKEN_HERE
EOF
chmod 600 /opt/saasresto/hostinger.ini

# Obtain certificate
certbot certonly \
    --dns-hostinger \
    --dns-hostinger-credentials /opt/saasresto/hostinger.ini \
    -d saasresto.isprojets.cloud \
    -d "*.saasresto.isprojets.cloud" \
    --config-dir /opt/saasresto/certs

# Renewal
certbot renew --config-dir /opt/saasresto/certs
```

**Note:** The Lego approach is preferred as it runs in a container without host dependencies.
