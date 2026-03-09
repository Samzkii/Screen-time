#!/bin/bash
set -e

echo "🚀 Starting Screentime Application..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
while ! pg_isready -h postgres -U screentime_user -d screentime_dev; do
  sleep 1
done

echo "✅ PostgreSQL is ready"

# Run database migrations if needed
echo "📊 Checking database schema..."
psql -h postgres -U screentime_user -d screentime_dev -f /app/lib/database/schema.sql || true

echo "✅ Database initialized"

# Start the Next.js application
echo "🎯 Starting Next.js application..."
exec npm start
