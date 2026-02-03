#!/bin/bash
# =============================================================================
# nginx-reload.sh - Reload nginx container to pick up new config/certs
# /opt/saasresto/scripts/nginx-reload.sh
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
# Name of the nginx container (from CRM compose)
NGINX_CONTAINER="${NGINX_CONTAINER:-crm-nginx}"

# -----------------------------------------------------------------------------
# Find and reload nginx
# -----------------------------------------------------------------------------
echo "🔄 Reloading nginx container: ${NGINX_CONTAINER}"

# Check if container exists and is running
if ! docker ps --format '{{.Names}}' | grep -q "^${NGINX_CONTAINER}$"; then
    echo "❌ Error: Container '${NGINX_CONTAINER}' is not running"
    echo ""
    echo "Available containers:"
    docker ps --format 'table {{.Names}}\t{{.Status}}'
    exit 1
fi

# Test nginx configuration first
echo "📋 Testing nginx configuration..."
if docker exec "$NGINX_CONTAINER" nginx -t 2>&1; then
    echo "✅ Configuration test passed"
else
    echo "❌ Configuration test failed!"
    exit 1
fi

# Reload nginx
echo "🔄 Sending reload signal..."
if docker exec "$NGINX_CONTAINER" nginx -s reload; then
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Failed to reload nginx"
    exit 1
fi

# Verify nginx is still running
sleep 1
if docker ps --format '{{.Names}}' | grep -q "^${NGINX_CONTAINER}$"; then
    echo "✅ Nginx container is running"
else
    echo "❌ Warning: Nginx container may have stopped!"
    exit 1
fi
