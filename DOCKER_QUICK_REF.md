# Docker Quick Reference

## One-Line Start

```bash
# Development
docker-compose up -d && docker-compose logs -f app

# Production
docker-compose -f docker-compose.production.yml up -d
```

## Essential Commands

### Start/Stop

```bash
docker-compose up -d              # Start all services in background
docker-compose up                 # Start all services (show logs)
docker-compose down               # Stop all services
docker-compose down -v            # Stop and remove volumes (DELETE DATABASE)
docker-compose restart            # Restart all services
docker-compose restart app        # Restart specific service
```

### View Status

```bash
docker-compose ps                 # Show all containers
docker-compose logs -f            # Follow all logs
docker-compose logs -f app        # Follow app logs only
docker-compose logs -f postgres   # Follow database logs only
docker-compose logs app --tail=50 # Last 50 lines of app logs
```

### Access Services

```bash
# App shell
docker-compose exec app sh

# PostgreSQL shell
docker-compose exec postgres psql -U screentime_user -d screentime_dev

# Run command in app
docker-compose exec app npm test
docker-compose exec app npm run build
```

### Database Operations

```bash
# Backup database
docker-compose exec postgres pg_dump -U screentime_user screentime_dev > backup.sql

# Restore database
docker-compose exec -T postgres psql -U screentime_user screentime_dev < backup.sql

# Query database
docker-compose exec postgres psql -U screentime_user -d screentime_dev -c "SELECT * FROM users;"

# Reset database
docker-compose exec -T postgres psql -U screentime_user -d screentime_dev < lib/database/schema.sql
```

### Rebuild & Deploy

```bash
docker-compose build               # Build image
docker-compose build --no-cache    # Build without cache
docker-compose up -d --build       # Build and start
```

### Cleanup

```bash
docker-compose down                # Stop services
docker system prune                # Remove unused images
docker volume prune                # Remove unused volumes
docker volume ls                   # List all volumes
```

## Using Make (Recommended)

```bash
make help                          # Show all commands
make up                            # Start services
make down                          # Stop services
make logs                          # View logs
make restart                       # Restart services
make clean                         # Stop and remove volumes
make db-backup                     # Backup database
make db-restore FILE=backups/...   # Restore database
make shell                         # Access app shell
make db-shell                      # Access database
```

## Using quickstart.sh

```bash
bash scripts/quickstart.sh         # Setup everything
```

## Port Mappings

| Service | Internal | External | URL |
|---------|----------|----------|-----|
| Next.js App | 3000 | 3000 | http://localhost:3000 |
| PostgreSQL | 5432 | 5432 | localhost:5432 |
| pgAdmin | 80 | 5050 | http://localhost:5050 |

## Credentials (Development)

| Service | User | Password |
|---------|------|----------|
| PostgreSQL | screentime_user | screentime_password |
| pgAdmin | admin@screentime.local | admin |

## Troubleshooting Quick Fixes

```bash
# App won't start
docker-compose logs app
docker-compose rebuild app

# Database won't connect
docker-compose logs postgres
docker-compose restart postgres

# Port already in use
# Edit docker-compose.yml and change ports

# Need to clear everything and start fresh
docker-compose down -v
docker-compose up -d

# All logs
docker-compose logs

# Resource usage
docker stats
```

## Production Commands

```bash
# Start production services
docker-compose -f docker-compose.production.yml up -d

# View production logs
docker-compose -f docker-compose.production.yml logs -f app

# Stop production services
docker-compose -f docker-compose.production.yml down

# Backup production database
docker-compose -f docker-compose.production.yml exec postgres pg_dump -U screentime_user screentime_prod > prod_backup.sql
```

## File Locations in Container

| Path | Purpose |
|------|---------|
| `/app` | Application root |
| `/app/.next` | Built Next.js app |
| `/app/lib` | Source code |
| `/var/lib/postgresql/data` | Database files |
| `/backups` | Database backups |

## Environment File

```bash
# Create from example
cp .env.example .env.local

# Edit with your secrets
nano .env.local

# Variables used:
# DATABASE_URL              - PostgreSQL connection string
# JWT_SECRET               - JWT signing key
# NEXTAUTH_SECRET          - Next Auth key
# NODE_ENV                 - production/development
# NEXTAUTH_URL             - Full app URL
```

## Debugging

```bash
# View entire docker-compose file
docker-compose config

# Validate docker-compose file
docker-compose config --quiet

# View image details
docker images | grep screentime

# Inspect container
docker inspect screentime-app

# Real-time container monitoring
docker stats screentime-app

# Container resource limits
docker update --memory 2g screentime-app
```

## Useful Aliases to Add to ~/.bashrc or ~/.zshrc

```bash
alias d='docker'
alias dc='docker-compose'
alias dcup='docker-compose up -d'
alias dcdown='docker-compose down'
alias dclogs='docker-compose logs -f'
alias dcps='docker-compose ps'
alias dcreset='docker-compose down -v && docker-compose up -d'
```

## See Also

- [DOCKER_GUIDE.md](DOCKER_GUIDE.md) - Comprehensive Docker guide
- [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) - API and app guide
- Docker Docs: https://docs.docker.com
- Docker Compose Docs: https://docs.docker.com/compose
