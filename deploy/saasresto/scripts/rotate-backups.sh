#!/bin/bash
# =============================================================================
# rotate-backups.sh - Remove old backup files
# /opt/saasresto/scripts/rotate-backups.sh
# =============================================================================
# Keeps only the last N days of backups.
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAASRESTO_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${SAASRESTO_DIR}/.env"

BACKUP_DIR="${SAASRESTO_DIR}/backups"
LOG_FILE="${SAASRESTO_DIR}/logs/backup.log"

# Default retention: 14 days
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

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
# Load environment for BACKUP_RETENTION_DAYS override
# -----------------------------------------------------------------------------
if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
fi

# -----------------------------------------------------------------------------
# Find and remove old backups
# -----------------------------------------------------------------------------
log "🗑️ Rotating backups (keeping last ${RETENTION_DAYS} days)..."

if [[ ! -d "$BACKUP_DIR" ]]; then
    log "⚠️ Backup directory does not exist: $BACKUP_DIR"
    exit 0
fi

# Count backups before
BEFORE_COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f | wc -l)

# Find and delete old backups
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +${RETENTION_DAYS})

if [[ -n "$OLD_BACKUPS" ]]; then
    DELETED_COUNT=$(echo "$OLD_BACKUPS" | wc -l)
    
    log "📋 Deleting ${DELETED_COUNT} backup(s) older than ${RETENTION_DAYS} days:"
    
    while IFS= read -r file; do
        if [[ -n "$file" ]]; then
            log "   - $(basename "$file")"
            rm -f "$file"
        fi
    done <<< "$OLD_BACKUPS"
    
    log "✅ Deleted ${DELETED_COUNT} old backup(s)"
else
    log "✅ No old backups to delete"
fi

# Count backups after
AFTER_COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f | wc -l)

log "📊 Backup stats: ${BEFORE_COUNT} -> ${AFTER_COUNT} files"

# Show disk usage
DISK_USAGE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
log "💾 Backup directory size: ${DISK_USAGE}"
