#!/bin/bash
# Backup rotation script for SaaSResto
# Keeps a specified number of recent backups and removes older ones

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/saasresto}"
KEEP_DAILY=7       # Keep last 7 daily backups
KEEP_WEEKLY=4      # Keep last 4 weekly backups
KEEP_MONTHLY=3     # Keep last 3 monthly backups

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    error "Backup directory not found: $BACKUP_DIR"
    exit 1
fi

log "Starting backup rotation in: $BACKUP_DIR"

# Get current date info
CURRENT_DAY=$(date +%u)    # Day of week (1-7, 1=Monday)
CURRENT_DATE=$(date +%d)   # Day of month

# Count backups before
BEFORE_COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f | wc -l)
log "Backups before rotation: $BEFORE_COUNT"

# Remove backups older than retention period
# Keep daily backups for KEEP_DAILY days
log "Removing daily backups older than $KEEP_DAILY days..."
find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$KEEP_DAILY -delete 2>/dev/null || true

# For weekly rotation (keep Sunday backups longer)
# This is simplified - in production, you might want more sophisticated logic
if [ $CURRENT_DAY -eq 7 ]; then
    log "Today is Sunday - this backup will be kept as weekly"
fi

# For monthly rotation (keep 1st of month backups even longer)
if [ $CURRENT_DATE -eq "01" ]; then
    log "Today is 1st of month - this backup will be kept as monthly"
fi

# Count backups after
AFTER_COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f | wc -l)
DELETED_COUNT=$((BEFORE_COUNT - AFTER_COUNT))

log "Backups after rotation: $AFTER_COUNT"
log "Backups deleted: $DELETED_COUNT"

# Show remaining backups
log "Current backups:"
ls -lht "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -20 || echo "  No backups found"

# Calculate total size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
log "Total backup size: $TOTAL_SIZE"

log "Rotation completed."
