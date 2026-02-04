#!/bin/sh
# =============================================================================
# SAASRESTO Docker Entrypoint
# Runs database migrations and starts the application
# =============================================================================

set -e

echo "🚀 Starting SAASRESTO..."

# Check required environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is required!"
  echo "   Set it in your .env file or docker-compose.yml"
  exit 1
fi

echo "✅ DATABASE_URL is set"

# Wait for database to be ready (optional, depends_on should handle this)
echo "⏳ Waiting for database connection..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if node -e "
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.\$connect()
      .then(() => { console.log('DB connected'); process.exit(0); })
      .catch(() => process.exit(1));
  " 2>/dev/null; then
    echo "✅ Database connection established"
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "   Attempt $RETRY_COUNT/$MAX_RETRIES - database not ready, waiting..."
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ ERROR: Could not connect to database after $MAX_RETRIES attempts"
  exit 1
fi

# Run database migrations
echo "📦 Running database migrations..."
if ./node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma; then
  echo "✅ Migrations completed successfully"
else
  echo "⚠️ Migration failed or no migrations to run"
  # Don't exit on migration failure - might be first run without migrations
fi

# Start the application
echo "🌐 Starting Next.js server..."
exec node server.js
