#!/bin/bash
# =============================================================================
# obtain-cert.sh - Obtain initial wildcard certificate via DNS-01
# /opt/saasresto/scripts/obtain-cert.sh
# =============================================================================
# Uses lego with Hostinger DNS provider to obtain a wildcard certificate
# for *.saasresto.isprojets.cloud
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAASRESTO_DIR="$(dirname "$SCRIPT_DIR")"
CERTS_DIR="${SAASRESTO_DIR}/certs"
ENV_FILE="${SAASRESTO_DIR}/.env"

# Domains
DOMAIN="saasresto.isprojets.cloud"
WILDCARD="*.saasresto.isprojets.cloud"

# -----------------------------------------------------------------------------
# Load environment variables
# -----------------------------------------------------------------------------
if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$ENV_FILE"
else
    echo "❌ Error: .env file not found at $ENV_FILE"
    echo "   Copy .env.example to .env and fill in the values."
    exit 1
fi

# Validate required variables
if [[ -z "${HOSTINGER_API_TOKEN:-}" ]]; then
    echo "❌ Error: HOSTINGER_API_TOKEN is not set in .env"
    exit 1
fi

if [[ -z "${CERT_EMAIL:-}" ]]; then
    echo "❌ Error: CERT_EMAIL is not set in .env"
    exit 1
fi

# -----------------------------------------------------------------------------
# Create certs directory
# -----------------------------------------------------------------------------
mkdir -p "$CERTS_DIR"
chmod 700 "$CERTS_DIR"

echo "🔐 Obtaining wildcard certificate for ${DOMAIN}..."
echo "   Using Hostinger DNS-01 challenge"
echo ""

# -----------------------------------------------------------------------------
# Run lego via docker-compose
# -----------------------------------------------------------------------------
cd "$SAASRESTO_DIR"

docker compose run --rm lego \
    --accept-tos \
    --email="${CERT_EMAIL}" \
    --dns hostinger \
    --domains "${DOMAIN}" \
    --domains "${WILDCARD}" \
    --path /certs \
    run

# -----------------------------------------------------------------------------
# Verify certificate was created
# -----------------------------------------------------------------------------
CERT_PATH="${CERTS_DIR}/certificates/${DOMAIN}.crt"
KEY_PATH="${CERTS_DIR}/certificates/${DOMAIN}.key"

if [[ -f "$CERT_PATH" ]] && [[ -f "$KEY_PATH" ]]; then
    echo ""
    echo "✅ Certificate obtained successfully!"
    echo ""
    echo "📁 Certificate files:"
    echo "   Certificate: ${CERT_PATH}"
    echo "   Private Key: ${KEY_PATH}"
    echo ""
    
    # Show certificate info
    echo "📋 Certificate details:"
    openssl x509 -in "$CERT_PATH" -noout -subject -dates -issuer 2>/dev/null || true
    echo ""
    
    # Create symlinks for nginx
    echo "🔗 Creating symlinks for nginx..."
    NGINX_CERT_DIR="${CERTS_DIR}/live"
    mkdir -p "$NGINX_CERT_DIR"
    
    ln -sf "../certificates/${DOMAIN}.crt" "${NGINX_CERT_DIR}/fullchain.pem"
    ln -sf "../certificates/${DOMAIN}.key" "${NGINX_CERT_DIR}/privkey.pem"
    
    echo "   ${NGINX_CERT_DIR}/fullchain.pem -> certificates/${DOMAIN}.crt"
    echo "   ${NGINX_CERT_DIR}/privkey.pem -> certificates/${DOMAIN}.key"
    echo ""
    echo "✅ Symlinks created. Nginx config uses /etc/nginx/ssl/saasresto/"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Reload nginx: ./scripts/nginx-reload.sh"
    echo "   2. Test HTTPS: curl -I https://${DOMAIN}"
else
    echo ""
    echo "❌ Error: Certificate files not found after lego run"
    echo "   Check lego output above for errors"
    exit 1
fi
