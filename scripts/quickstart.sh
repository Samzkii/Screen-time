#!/bin/bash
# Quick start script for Screentime
# Run this to get everything set up and running

set -e

echo "🚀 Screentime Docker Quick Start"
echo "=================================="
echo ""

# Check Docker installation
if ! command -v docker &> /dev/null; then
  echo "❌ Docker is not installed"
  echo "   Please install Docker from https://docs.docker.com/get-docker/"
  exit 1
fi

if ! command -v docker-compose &> /dev/null; then
  echo "❌ Docker Compose is not installed"
  echo "   Please install Docker Compose from https://docs.docker.com/compose/install/"
  exit 1
fi

echo "✅ Docker is installed"
docker --version
docker-compose --version
echo ""

# Check if running on Windows or Unix
OS=$(uname)
if [[ "$OS" == "MINGW64"* ]] || [[ "$OS" == "MSYS"* ]]; then
  IS_WINDOWS=true
else
  IS_WINDOWS=false
fi

# Setup environment file
echo "1️⃣  Setting up environment..."
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "   ✅ Created .env.local from .env.example"
  echo "   ⚠️  Update .env.local with your secrets before production!"
else
  echo "   ℹ️  .env.local already exists"
fi

echo ""
echo "2️⃣  Building Docker image..."
docker-compose build

echo ""
echo "3️⃣  Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

echo ""
echo "4️⃣  Checking service health..."

# Check PostgreSQL
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if docker-compose exec postgres pg_isready -U screentime_user > /dev/null 2>&1; then
    echo "   ✅ PostgreSQL is ready"
    break
  fi
  attempt=$((attempt + 1))
  if [ $attempt -eq $max_attempts ]; then
    echo "   ❌ PostgreSQL failed to start"
    exit 1
  fi
  echo "   ⏳ Waiting for PostgreSQL... ($attempt/$max_attempts)"
  sleep 1
done

# Check Next.js App
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ Next.js app is running"
    break
  fi
  attempt=$((attempt + 1))
  if [ $attempt -eq $max_attempts ]; then
    echo "   ❌ Next.js app failed to start"
    echo "   View logs with: docker-compose logs -f app"
    exit 1
  fi
  echo "   ⏳ Waiting for Next.js app... ($attempt/$max_attempts)"
  sleep 2
done

echo ""
echo "✨ Setup complete! Your application is running:"
echo ""
echo "   🌐 Application:    http://localhost:3000"
echo "   🗄️  Database UI:    http://localhost:5050 (admin/admin)"
echo "   📊 PostgreSQL:     localhost:5432"
echo ""
echo "Available commands:"
echo ""
echo "   docker-compose logs -f app       - View app logs"
echo "   docker-compose logs -f postgres  - View database logs"
echo "   docker-compose ps                - Show running services"
echo "   docker-compose down              - Stop services"
echo "   docker-compose down -v           - Stop and remove volumes"
echo ""
echo "Or use Makefile shortcuts:"
echo ""
echo "   make logs                        - View app logs"
echo "   make logs-db                     - View database logs"
echo "   make restart                     - Restart services"
echo "   make clean                       - Stop and clean"
echo "   make help                        - Show all commands"
echo ""
echo "Happy coding! 🎉"
