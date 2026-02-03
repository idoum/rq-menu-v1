#!/bin/bash
# =============================================================================
# renew-cert.sh - Renew wildcard certificate via DNS-01
# /opt/saasresto/scripts/renew-cert.sh
# =============================================================================
# Renews the certificate if it expires within 30 days.
# Should be run daily via cron or systemd timer.
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAASRESTO_DIR="$(dirname "$SCRIPT_DIR")"
CERTS_DIR="${SAASRESTO_DIR}/certs"
ENV_FILE="${SAASRESTO_DIR}/.env"
LOG_FILE="${SAASRESTO_DIR}/logs/cert-renewal.log"

# Domains
DOMAIN="saasresto.isprojets.cloud"
WILDCARD="*.saasresto.isprojets.cloud"

# Renew if expiring within N days
RENEW_DAYS=30

# -----------------------------------------------------------------------------
# Logging setup
# -----------------------------------------------------------------------------
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$msg"
    echo "$msg" >> "$LOG_FILE"
}

# -----------------------------------------------------------------------------
# Load environment variables
# -----------------------------------------------------------------------------
if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$ENV_FILE"
else
    log "❌ Error: .env file not found at $ENV_FILE"
    exit 1
fi

# Validate required variables
if [[ -z "${HOSTINGER_API_TOKEN:-}" ]]; then
    log "❌ Error: HOSTINGER_API_TOKEN is not set in .env"
    exit 1
fi

if [[ -z "${CERT_EMAIL:-}" ]]; then
    log "❌ Error: CERT_EMAIL is not set in .env"
    exit 1
fi

# -----------------------------------------------------------------------------
# Check if certificate exists
# -----------------------------------------------------------------------------
CERT_PATH="${CERTS_DIR}/certificates/${DOMAIN}.crt"

if [[ ! -f "$CERT_PATH" ]]; then
    log "⚠️ Certificate not found. Running initial obtain..."
    "$SCRIPT_DIR/obtain-cert.sh"
    exit 0
fi

# -----------------------------------------------------------------------------
# Check certificate expiry
# -----------------------------------------------------------------------------
EXPIRY_DATE=$(openssl x509 -in "$CERT_PATH" -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

log "📋 Certificate expires: $EXPIRY_DATE ($DAYS_LEFT days left)"

if [[ $DAYS_LEFT -gt $RENEW_DAYS ]]; then
    log "✅ Certificate still valid for $DAYS_LEFT days. No renewal needed."
    exit 0
fi

# -----------------------------------------------------------------------------
# Renew certificate
# -----------------------------------------------------------------------------
log "🔄 Certificate expires in $DAYS_LEFT days. Renewing..."

cd "$SAASRESTO_DIR"

# Run lego renew
if docker compose run --rm lego \
    --accept-tos \
    --email="${CERT_EMAIL}" \
    --dns hostinger \
    --domains "${DOMAIN}" \
    --domains "${WILDCARD}" \
    --path /certs \
    renew --days $RENEW_DAYS; then
    
    log "✅ Certificate renewed successfully!"
    
    # Reload nginx to pick up new cert
    log "🔄 Reloading nginx..."
    if "$SCRIPT_DIR/nginx-reload.sh"; then
        log "✅ Nginx reloaded successfully"
    else
        log "⚠️ Failed to reload nginx. Manual intervention required."
    fi
else
    log "❌ Certificate renewal failed!"
    exit 1
fi
