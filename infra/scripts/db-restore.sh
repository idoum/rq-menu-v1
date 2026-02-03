#!/bin/bash
# Database restore script for SaaSResto
# Restores a PostgreSQL database from a backup file

set -e

# Configuration
DB_NAME="${DB_NAME:-saasresto}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/saasresto}"

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

# Check arguments
if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Available backups:"
    if [ -d "$BACKUP_DIR" ]; then
        ls -lht "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "  No backups found in $BACKUP_DIR"
    else
        echo "  Backup directory not found: $BACKUP_DIR"
    fi
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    # Try with backup directory prefix
    if [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
        BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
    else
        error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    error "psql command not found. Please install PostgreSQL client."
    exit 1
fi

# Verify backup file
log "Verifying backup file integrity..."
if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
    error "Backup file appears to be corrupted!"
    exit 1
fi
log "Backup file integrity verified."

# Confirmation
warn "This will OVERWRITE all data in database: $DB_NAME"
warn "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log "Restore cancelled."
    exit 0
fi

log "Starting restore of database: $DB_NAME"
log "From backup: $BACKUP_FILE"

# Terminate existing connections
log "Terminating existing connections..."
PGPASSWORD="${PGPASSWORD:-issa}" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
    > /dev/null 2>&1 || true

# Perform restore
log "Restoring database..."
if gunzip -c "$BACKUP_FILE" | PGPASSWORD="${PGPASSWORD:-issa}" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --quiet \
    --no-psqlrc \
    -v ON_ERROR_STOP=0; then
    
    log "Restore completed successfully!"
else
    error "Restore completed with some errors. Please check the database."
fi

# Verify restore
log "Verifying restore..."
TABLE_COUNT=$(PGPASSWORD="${PGPASSWORD:-issa}" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -t \
    -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" \
    | tr -d ' ')

log "Tables in database: $TABLE_COUNT"

log "Restore process finished."
