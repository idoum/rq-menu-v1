#!/bin/bash
# Database backup script for SaaSResto
# Creates a timestamped backup of the PostgreSQL database

set -e

# Configuration
DB_NAME="${DB_NAME:-saasresto}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/saasresto}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

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

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    log "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    error "pg_dump command not found. Please install PostgreSQL client."
    exit 1
fi

log "Starting backup of database: $DB_NAME"
log "Backup file: $BACKUP_FILE"

# Perform backup
if PGPASSWORD="${PGPASSWORD:-issa}" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    | gzip > "$BACKUP_FILE"; then
    
    # Get file size
    FILE_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    
    log "Backup completed successfully!"
    log "File size: $FILE_SIZE"
    log "Location: $BACKUP_FILE"
    
    # Verify backup
    if gzip -t "$BACKUP_FILE" 2>/dev/null; then
        log "Backup integrity verified."
    else
        error "Backup file appears to be corrupted!"
        exit 1
    fi
else
    error "Backup failed!"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Optional: Upload to remote storage
# Uncomment and configure as needed
# if command -v aws &> /dev/null; then
#     log "Uploading to S3..."
#     aws s3 cp "$BACKUP_FILE" "s3://your-bucket/backups/"
# fi

log "Backup process finished."
