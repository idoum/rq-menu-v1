#!/bin/bash
# =============================================================================
# apply-crm-nginx-patch.sh
# Applies the minimal CRM nginx patch for SAASRESTO integration
# =============================================================================
# This script is idempotent - safe to run multiple times.
# It will:
#   1. Create the edge network if it doesn't exist
#   2. Deploy saasresto.conf to /opt/saasresto/nginx/conf.d/
#   3. Patch /opt/crm/docker-compose.yml to mount saasresto.conf and join edge network
#   4. Validate nginx config
#   5. Apply changes and reload nginx
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
CRM_DIR="${CRM_DIR:-/opt/crm}"
SAASRESTO_DIR="${SAASRESTO_DIR:-/opt/saasresto}"
NGINX_CONTAINER="${NGINX_CONTAINER:-crm-nginx}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Helper functions
# -----------------------------------------------------------------------------
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check CRM directory exists
    if [[ ! -d "$CRM_DIR" ]]; then
        log_error "CRM directory not found: $CRM_DIR"
        exit 1
    fi
    
    # Check CRM docker-compose.yml exists
    if [[ ! -f "$CRM_DIR/docker-compose.yml" ]]; then
        log_error "CRM docker-compose.yml not found: $CRM_DIR/docker-compose.yml"
        exit 1
    fi
    
    # Check SAASRESTO directory exists
    if [[ ! -d "$SAASRESTO_DIR" ]]; then
        log_error "SAASRESTO directory not found: $SAASRESTO_DIR"
        log_info "Creating SAASRESTO directory structure..."
        mkdir -p "$SAASRESTO_DIR"/{nginx/conf.d,certs/live,data/postgres,backups,uploads,logs,scripts,docs}
    fi
    
    # Check nginx container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${NGINX_CONTAINER}$"; then
        log_error "Nginx container '${NGINX_CONTAINER}' is not running"
        log_info "Available containers:"
        docker ps --format 'table {{.Names}}\t{{.Status}}'
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# -----------------------------------------------------------------------------
# Step 1: Create edge network
# -----------------------------------------------------------------------------
create_edge_network() {
    log_info "Step 1: Creating edge network..."
    
    if docker network ls --format '{{.Name}}' | grep -q "^edge$"; then
        log_info "Edge network already exists"
    else
        docker network create edge
        log_info "Edge network created"
    fi
}

# -----------------------------------------------------------------------------
# Step 2: Deploy saasresto.conf
# -----------------------------------------------------------------------------
deploy_saasresto_conf() {
    log_info "Step 2: Deploying saasresto.conf..."
    
    local CONF_DIR="$SAASRESTO_DIR/nginx/conf.d"
    local CONF_FILE="$CONF_DIR/saasresto.conf"
    
    mkdir -p "$CONF_DIR"
    
    # Check if config already exists
    if [[ -f "$CONF_FILE" ]]; then
        log_info "saasresto.conf already exists, checking for updates..."
        # We'll overwrite with the latest version from the repo
    fi
    
    # The config file should be copied from the repo by the workflow
    # Here we just verify it exists
    if [[ ! -f "$CONF_FILE" ]]; then
        log_error "saasresto.conf not found at $CONF_FILE"
        log_error "Please ensure the workflow copies the config file first"
        exit 1
    fi
    
    log_info "saasresto.conf deployed to $CONF_FILE"
}

# -----------------------------------------------------------------------------
# Step 3: Backup CRM docker-compose.yml
# -----------------------------------------------------------------------------
backup_crm_compose() {
    log_info "Step 3: Backing up CRM docker-compose.yml..."
    
    local BACKUP_FILE="$CRM_DIR/docker-compose.yml.bak.${TIMESTAMP}"
    cp "$CRM_DIR/docker-compose.yml" "$BACKUP_FILE"
    
    log_info "Backup created: $BACKUP_FILE"
}

# -----------------------------------------------------------------------------
# Step 4: Patch CRM docker-compose.yml (idempotent)
# -----------------------------------------------------------------------------
patch_crm_compose() {
    log_info "Step 4: Patching CRM docker-compose.yml..."
    
    local COMPOSE_FILE="$CRM_DIR/docker-compose.yml"
    local TEMP_FILE=$(mktemp)
    
    # Read current content
    cat "$COMPOSE_FILE" > "$TEMP_FILE"
    
    # Check if already patched
    local NEEDS_NETWORK_SECTION=true
    local NEEDS_NGINX_NETWORK=true
    local NEEDS_SAASRESTO_MOUNT=true
    local NEEDS_CERTS_MOUNT=true
    
    if grep -q "edge:" "$COMPOSE_FILE" && grep -q "external: true" "$COMPOSE_FILE"; then
        NEEDS_NETWORK_SECTION=false
        log_info "  - Edge network section already exists"
    fi
    
    if grep -q "saasresto.conf" "$COMPOSE_FILE"; then
        NEEDS_SAASRESTO_MOUNT=false
        log_info "  - saasresto.conf mount already exists"
    fi
    
    if grep -q "/etc/nginx/ssl/saasresto" "$COMPOSE_FILE"; then
        NEEDS_CERTS_MOUNT=false
        log_info "  - SSL certs mount already exists"
    fi
    
    # If nothing needs patching, skip
    if [[ "$NEEDS_NETWORK_SECTION" == "false" ]] && \
       [[ "$NEEDS_SAASRESTO_MOUNT" == "false" ]] && \
       [[ "$NEEDS_CERTS_MOUNT" == "false" ]]; then
        log_info "CRM docker-compose.yml already fully patched"
        rm "$TEMP_FILE"
        return 0
    fi
    
    # Create Python script for YAML manipulation (more reliable than sed)
    python3 << 'PYTHON_SCRIPT' - "$COMPOSE_FILE" "$NEEDS_NETWORK_SECTION" "$NEEDS_SAASRESTO_MOUNT" "$NEEDS_CERTS_MOUNT"
import sys
import yaml
import os

compose_file = sys.argv[1]
needs_network = sys.argv[2] == "true"
needs_saasresto_mount = sys.argv[3] == "true"
needs_certs_mount = sys.argv[4] == "true"

# Read current compose file
with open(compose_file, 'r') as f:
    compose = yaml.safe_load(f)

# Ensure networks section exists
if 'networks' not in compose:
    compose['networks'] = {}

# Add edge network if needed
if needs_network and 'edge' not in compose.get('networks', {}):
    compose['networks']['edge'] = {'external': True}
    print("  - Added edge network section")

# Find nginx service (try common names)
nginx_service = None
for name in ['nginx', 'crm-nginx', 'web', 'proxy']:
    if name in compose.get('services', {}):
        nginx_service = name
        break

if not nginx_service:
    # Look for any service with nginx in the image
    for name, config in compose.get('services', {}).items():
        if 'nginx' in str(config.get('image', '')).lower():
            nginx_service = name
            break

if not nginx_service:
    print("ERROR: Could not find nginx service in docker-compose.yml")
    sys.exit(1)

print(f"  - Found nginx service: {nginx_service}")

service = compose['services'][nginx_service]

# Add networks to nginx service
if 'networks' not in service:
    service['networks'] = ['default']
if 'edge' not in service['networks']:
    if isinstance(service['networks'], list):
        service['networks'].append('edge')
    else:
        service['networks']['edge'] = {}
    print("  - Added edge network to nginx service")

# Add volumes if needed
if 'volumes' not in service:
    service['volumes'] = []

volumes = service['volumes']

# Add saasresto.conf mount
saasresto_mount = '/opt/saasresto/nginx/conf.d/saasresto.conf:/etc/nginx/conf.d/saasresto.conf:ro'
if needs_saasresto_mount and not any('saasresto.conf' in str(v) for v in volumes):
    volumes.append(saasresto_mount)
    print("  - Added saasresto.conf volume mount")

# Add certs mount
certs_mount = '/opt/saasresto/certs/live:/etc/nginx/ssl/saasresto:ro'
if needs_certs_mount and not any('/etc/nginx/ssl/saasresto' in str(v) for v in volumes):
    volumes.append(certs_mount)
    print("  - Added SSL certs volume mount")

# Write updated compose file
with open(compose_file, 'w') as f:
    yaml.dump(compose, f, default_flow_style=False, sort_keys=False)

print("  - docker-compose.yml updated successfully")
PYTHON_SCRIPT

    rm -f "$TEMP_FILE"
    log_info "CRM docker-compose.yml patched"
}

# -----------------------------------------------------------------------------
# Step 5: Validate nginx config
# -----------------------------------------------------------------------------
validate_nginx_config() {
    log_info "Step 5: Validating nginx configuration..."
    
    # Create dummy cert files if they don't exist (for config validation)
    local CERTS_DIR="$SAASRESTO_DIR/certs/live"
    mkdir -p "$CERTS_DIR"
    
    if [[ ! -f "$CERTS_DIR/fullchain.pem" ]]; then
        log_warn "SSL certificates not found, creating dummy certs for validation..."
        # Create self-signed cert for validation only
        openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
            -keyout "$CERTS_DIR/privkey.pem" \
            -out "$CERTS_DIR/fullchain.pem" \
            -subj "/CN=saasresto.isprojets.cloud" 2>/dev/null
        log_warn "Dummy certs created - run obtain-cert.sh for real certificates"
    fi
    
    # Test nginx configuration
    if docker exec "$NGINX_CONTAINER" nginx -t 2>&1; then
        log_info "Nginx configuration is valid"
    else
        log_error "Nginx configuration test failed!"
        log_error "Restoring backup..."
        
        # Find most recent backup
        local LATEST_BACKUP=$(ls -t "$CRM_DIR"/docker-compose.yml.bak.* 2>/dev/null | head -1)
        if [[ -n "$LATEST_BACKUP" ]]; then
            cp "$LATEST_BACKUP" "$CRM_DIR/docker-compose.yml"
            log_info "Backup restored from $LATEST_BACKUP"
        fi
        
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# Step 6: Apply changes
# -----------------------------------------------------------------------------
apply_changes() {
    log_info "Step 6: Applying changes with docker compose..."
    
    cd "$CRM_DIR"
    docker compose up -d
    
    log_info "Docker compose up completed"
}

# -----------------------------------------------------------------------------
# Step 7: Reload nginx
# -----------------------------------------------------------------------------
reload_nginx() {
    log_info "Step 7: Reloading nginx..."
    
    # Wait a moment for container to stabilize
    sleep 2
    
    # Final config test
    if docker exec "$NGINX_CONTAINER" nginx -t 2>&1; then
        docker exec "$NGINX_CONTAINER" nginx -s reload
        log_info "Nginx reloaded successfully"
    else
        log_error "Nginx config test failed after apply!"
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# Step 8: Verify and report
# -----------------------------------------------------------------------------
verify_and_report() {
    log_info "Step 8: Verifying deployment..."
    
    echo ""
    echo "=========================================="
    echo "Container Status:"
    echo "=========================================="
    cd "$CRM_DIR"
    docker compose ps
    
    echo ""
    echo "=========================================="
    echo "Network Status:"
    echo "=========================================="
    docker network inspect edge --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || echo "Edge network not found"
    
    echo ""
    echo "=========================================="
    echo "Nginx Mounts:"
    echo "=========================================="
    docker inspect "$NGINX_CONTAINER" --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}' | grep -E "(saasresto|ssl)" || echo "No SAASRESTO mounts found"
    
    echo ""
    log_info "=========================================="
    log_info "CRM Nginx Patch Applied Successfully!"
    log_info "=========================================="
    echo ""
    log_info "Next steps:"
    echo "  1. Obtain SSL certificate: /opt/saasresto/scripts/obtain-cert.sh"
    echo "  2. Start SAASRESTO: cd /opt/saasresto && docker compose up -d"
    echo "  3. Reload nginx: docker exec $NGINX_CONTAINER nginx -s reload"
    echo "  4. Test: curl -I https://saasresto.isprojets.cloud"
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
main() {
    echo ""
    echo "=============================================="
    echo "  SAASRESTO CRM Nginx Patch"
    echo "  $(date)"
    echo "=============================================="
    echo ""
    
    check_prerequisites
    create_edge_network
    deploy_saasresto_conf
    backup_crm_compose
    patch_crm_compose
    validate_nginx_config
    apply_changes
    reload_nginx
    verify_and_report
}

# Run main function
main "$@"
