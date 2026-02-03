#!/bin/bash
# =============================================================================
# db-restore.sh - Restore PostgreSQL database from backup
# /opt/saasresto/scripts/db-restore.sh
# =============================================================================
# Usage: ./db-restore.sh [backup_file.sql.gz]
#
# If no backup file is specified, lists available backups.
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAASRESTO_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${SAASRESTO_DIR}/.env"
BACKUP_DIR="${SAASRESTO_DIR}/backups"

# -----------------------------------------------------------------------------
# Load environment
# -----------------------------------------------------------------------------
if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$ENV_FILE"
else
    echo "❌ Error: .env file not found at $ENV_FILE"
    exit 1
fi

DB_NAME="${POSTGRES_DB:-saasresto}"
DB_USER="${POSTGRES_USER:-saasresto}"
CONTAINER_NAME="saasresto-postgres"

# -----------------------------------------------------------------------------
# Parse arguments
# -----------------------------------------------------------------------------
BACKUP_FILE="${1:-}"

# If no file specified, list available backups
if [[ -z "$BACKUP_FILE" ]]; then
    echo "📋 Available backups:"
    echo ""
    
    if [[ -d "$BACKUP_DIR" ]]; then
        ls -lht "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "   No backups found"
    else
        echo "   Backup directory does not exist: $BACKUP_DIR"
    fi
    
    echo ""
    echo "Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Examples:"
    echo "  $0 ${BACKUP_DIR}/saasresto_20260101_120000.sql.gz"
    echo "  $0 saasresto_20260101_120000.sql.gz  (relative to backup dir)"
    exit 0
fi

# Resolve backup file path
if [[ ! -f "$BACKUP_FILE" ]]; then
    # Try relative to backup directory
    if [[ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]]; then
        BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
    else
        echo "❌ Error: Backup file not found: $BACKUP_FILE"
        exit 1
    fi
fi

# -----------------------------------------------------------------------------
# Confirmation
# -----------------------------------------------------------------------------
echo "⚠️  WARNING: This will REPLACE the current database!"
echo ""
echo "   Database: ${DB_NAME}"
echo "   Container: ${CONTAINER_NAME}"
echo "   Backup file: ${BACKUP_FILE}"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM

if [[ "$CONFIRM" != "yes" ]]; then
    echo "❌ Restore cancelled"
    exit 1
fi

# -----------------------------------------------------------------------------
# Check container is running
# -----------------------------------------------------------------------------
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Error: Container '${CONTAINER_NAME}' is not running"
    exit 1
fi

# -----------------------------------------------------------------------------
# Stop application to prevent writes
# -----------------------------------------------------------------------------
echo "🛑 Stopping application..."
cd "$SAASRESTO_DIR"
docker compose stop saasresto-app || true

# -----------------------------------------------------------------------------
# Create a backup of current state (just in case)
# -----------------------------------------------------------------------------
echo "📦 Creating backup of current database state..."
PRE_RESTORE_BACKUP="${BACKUP_DIR}/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl \
    | gzip > "$PRE_RESTORE_BACKUP"
echo "   Saved to: ${PRE_RESTORE_BACKUP}"

# -----------------------------------------------------------------------------
# Restore database
# -----------------------------------------------------------------------------
echo "🔄 Restoring database from backup..."

# Drop and recreate database
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

# Restore from backup
if gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"; then
    echo "✅ Database restored successfully"
else
    echo "❌ Error during restore. Previous backup saved at: ${PRE_RESTORE_BACKUP}"
    exit 1
fi

# -----------------------------------------------------------------------------
# Restart application
# -----------------------------------------------------------------------------
echo "🚀 Starting application..."
docker compose up -d saasresto-app

# Wait for app to be healthy
echo "⏳ Waiting for application to start..."
sleep 10

if docker compose ps | grep -q "saasresto-app.*healthy"; then
    echo "✅ Application is running and healthy"
else
    echo "⚠️ Application may need more time to start. Check with: docker compose ps"
fi

echo ""
echo "✅ Restore completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Verify the application: curl https://saasresto.isprojets.cloud/api/health"
echo "   2. Test tenant login"
echo "   3. If something is wrong, restore from: ${PRE_RESTORE_BACKUP}"
