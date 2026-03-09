.PHONY: help build up down logs clean restart test shell db-backup db-restore

# Docker Makefile for Screentime
# Usage: make [command]

help:
	@echo "Screentime Docker Commands"
	@echo "=========================="
	@echo "make build              - Build Docker image"
	@echo "make up                 - Start all services"
	@echo "make down               - Stop all services"
	@echo "make logs               - View application logs"
	@echo "make logs-db            - View database logs"
	@echo "make restart            - Restart all services"
	@echo "make clean              - Stop services and remove volumes"
	@echo "make shell              - Access application shell"
	@echo "make db-shell           - Access PostgreSQL shell"
	@echo "make db-backup          - Backup database"
	@echo "make db-restore FILE=   - Restore database from backup"
	@echo "make ps                 - Show running containers"
	@echo "make test               - Run tests in Docker"
	@echo "make prod-up            - Start production services"
	@echo "make prod-down          - Stop production services"

build:
	@echo "🔨 Building Docker image..."
	docker-compose build

up:
	@echo "🚀 Starting services (development)..."
	docker-compose up -d
	@echo "✅ Services started"
	@echo "App: http://localhost:3000"
	@echo "pgAdmin: http://localhost:5050"

down:
	@echo "🛑 Stopping services..."
	docker-compose down

logs:
	@docker-compose logs -f app

logs-db:
	@docker-compose logs -f postgres

logs-all:
	@docker-compose logs -f

restart:
	@echo "🔄 Restarting services..."
	docker-compose restart

ps:
	@docker-compose ps

clean:
	@echo "🧹 Cleaning up (removing volumes)..."
	docker-compose down -v
	@echo "✅ Cleaned"

shell:
	@docker-compose exec app sh

db-shell:
	@docker-compose exec postgres psql -U screentime_user -d screentime_dev

db-backup:
	@echo "💾 Backing up database..."
	@mkdir -p backups
	@docker-compose exec postgres pg_dump -U screentime_user screentime_dev > backups/screentime_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup complete"

db-restore:
	@if [ -z "$(FILE)" ]; then \
		echo "Usage: make db-restore FILE=backups/screentime_timestamp.sql"; \
		exit 1; \
	fi
	@echo "♻️  Restoring database from $(FILE)..."
	@docker-compose exec -T postgres psql -U screentime_user screentime_dev < $(FILE)
	@echo "✅ Restore complete"

test:
	@echo "🧪 Running tests..."
	docker-compose exec app npm test

prod-up:
	@echo "🚀 Starting production services..."
	docker-compose -f docker-compose.production.yml up -d

prod-down:
	@echo "🛑 Stopping production services..."
	docker-compose -f docker-compose.production.yml down

prod-logs:
	@docker-compose -f docker-compose.production.yml logs -f app

health-check:
	@echo "🏥 Checking service health..."
	@docker-compose ps
	@docker-compose exec app curl -s http://localhost:3000/api/health || echo "❌ Health check failed"

prune:
	@echo "🧹 Pruning Docker resources (WARNING: removes unused images/volumes)..."
	docker system prune -f

stats:
	@echo "📊 Docker resource usage:"
	docker stats

version:
	@docker --version
	@docker-compose --version

.DEFAULT_GOAL := help
