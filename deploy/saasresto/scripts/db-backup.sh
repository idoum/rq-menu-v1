#!/bin/bash
# =============================================================================
# db-backup.sh - Backup PostgreSQL database
# /opt/saasresto/scripts/db-backup.sh
# =============================================================================
# Creates a compressed SQL dump of the SAASRESTO database.
# Run daily via cron.
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAASRESTO_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${SAASRESTO_DIR}/.env"

BACKUP_DIR="${SAASRESTO_DIR}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${SAASRESTO_DIR}/logs/backup.log"

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$msg"
    echo "$msg" >> "$LOG_FILE"
}

# -----------------------------------------------------------------------------
# Load environment
# -----------------------------------------------------------------------------
if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$ENV_FILE"
else
    log "❌ Error: .env file not found at $ENV_FILE"
    exit 1
fi

DB_NAME="${POSTGRES_DB:-saasresto}"
DB_USER="${POSTGRES_USER:-saasresto}"
CONTAINER_NAME="saasresto-postgres"

# -----------------------------------------------------------------------------
# Create backup directory
# -----------------------------------------------------------------------------
mkdir -p "$BACKUP_DIR"

# -----------------------------------------------------------------------------
# Check container is running
# -----------------------------------------------------------------------------
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log "❌ Error: Container '${CONTAINER_NAME}' is not running"
    exit 1
fi

# -----------------------------------------------------------------------------
# Create backup
# -----------------------------------------------------------------------------
BACKUP_FILE="${BACKUP_DIR}/saasresto_${TIMESTAMP}.sql.gz"

log "📦 Starting database backup..."
log "   Database: ${DB_NAME}"
log "   Container: ${CONTAINER_NAME}"
log "   Output: ${BACKUP_FILE}"

# Run pg_dump inside container and compress
if docker exec "$CONTAINER_NAME" \
    pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl \
    | gzip > "$BACKUP_FILE"; then
    
    # Verify backup file
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    
    if [[ -s "$BACKUP_FILE" ]]; then
        log "✅ Backup completed successfully"
        log "   Size: ${BACKUP_SIZE}"
        
        # Quick integrity check
        if gzip -t "$BACKUP_FILE" 2>/dev/null; then
            log "   Integrity: OK (gzip valid)"
        else
            log "⚠️ Warning: Backup file may be corrupted"
        fi
    else
        log "❌ Error: Backup file is empty"
        rm -f "$BACKUP_FILE"
        exit 1
    fi
else
    log "❌ Error: pg_dump failed"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# -----------------------------------------------------------------------------
# Rotate old backups
# -----------------------------------------------------------------------------
log "🔄 Running backup rotation..."
"$SCRIPT_DIR/rotate-backups.sh"

log "📋 Current backups:"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -5 || true
