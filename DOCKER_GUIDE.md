# Docker Setup Guide for Screentime

## Overview

This guide explains how to run the Screentime application using Docker and Docker Compose.

## Prerequisites

- **Docker** (version 20.10+)
- **Docker Compose** (version 1.29+)

### Install Docker

- **Windows/Mac:** [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux:** 
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
  ```

### Verify Installation

```bash
docker --version
docker-compose --version
```

---

## Quick Start

### 1. Clone and Setup

```bash
# Navigate to project
cd screentime

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your secrets (IMPORTANT for production)
# Change JWT_SECRET, NEXTAUTH_SECRET to strong random values
```

### 2. Start Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Expected output:
# ✅ postgres service healthy
# ✅ app service running on port 3000
```

### 3. Access Application

- **App:** http://localhost:3000
- **pgAdmin (Database UI):** http://localhost:5050
  - Email: `admin@screentime.local`
  - Password: `admin`

### 4. Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v
```

---

## Services Included

### PostgreSQL Database
- **Container:** `screentime-db`
- **Port:** 5432
- **Username:** `screentime_user`
- **Password:** `screentime_password`
- **Database:** `screentime_dev`
- **Data Persistence:** Docker volume `postgres_data`

### Next.js Application
- **Container:** `screentime-app`
- **Port:** 3000
- **Environment:** Production (configurable)
- **Health Check:** Every 30 seconds

### pgAdmin (Optional Database UI)
- **Container:** `screentime-pgadmin`
- **Port:** 5050
- **Access:** http://localhost:5050

---

## Development Workflow

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres

# Last 50 lines
docker-compose logs --tail=50 app
```

### Access Database

```bash
# Connect to PostgreSQL from host
psql -h localhost -U screentime_user -d screentime_dev

# Password: screentime_password

# Or use Docker exec
docker-compose exec postgres psql -U screentime_user -d screentime_dev
```

### Run Database Queries

```bash
# Execute SQL file
docker-compose exec postgres psql -U screentime_user -d screentime_dev < backup.sql

# Run single command
docker-compose exec postgres psql -U screentime_user -d screentime_dev -c "SELECT * FROM families;"
```

### Rebuild Application

```bash
# Rebuild image without cache
docker-compose build --no-cache

# Rebuild and restart
docker-compose up -d --build
```

### View Service Status

```bash
# Check all services
docker-compose ps

# Output:
# NAME                  STATUS              PORTS
# screentime-app        Up (healthy)        0.0.0.0:3000->3000/tcp
# screentime-db         Up (healthy)        0.0.0.0:5432->5432/tcp
# screentime-pgadmin    Up                  0.0.0.0:5050->80/tcp
```

---

## Environment Configuration

### Development (docker-compose.yml default)

```env
NODE_ENV=production
DATABASE_URL=postgresql://screentime_user:screentime_password@postgres:5432/screentime_dev
JWT_SECRET=your-secret-key-change-this
NEXTAUTH_SECRET=your-nextauth-secret-change-this
```

### Production Deployment

Before deploying to production:

1. **Generate Strong Secrets**
   ```bash
   # Generate random JWT_SECRET
   openssl rand -base64 32
   
   # Generate NEXTAUTH_SECRET
   openssl rand -hex 32
   ```

2. **Update .env.local**
   ```env
   JWT_SECRET=<generated-secret>
   NEXTAUTH_SECRET=<generated-secret>
   NODE_ENV=production
   ```

3. **Configure PostgreSQL**
   ```yaml
   # docker-compose.yml
   environment:
     POSTGRES_PASSWORD: <strong-random-password>
   ```

4. **Disable pgAdmin**
   ```yaml
   # Comment out pgadmin service in docker-compose.yml
   # Or remove volumes mounts for development
   ```

---

## Common Tasks

### Initialize Fresh Database

```bash
# Option 1: Stop and remove volumes
docker-compose down -v
docker-compose up -d

# Option 2: Reinitialize existing database
docker-compose exec postgres psql -U screentime_user -d screentime_dev < lib/database/schema.sql
```

### Create Backup

```bash
# Backup database
docker-compose exec postgres pg_dump -U screentime_user screentime_dev > backup.sql

# Restore from backup
docker-compose exec -T postgres psql -U screentime_user screentime_dev < backup.sql
```

### View Database Schema

```bash
# Connect to database
docker-compose exec postgres psql -U screentime_user -d screentime_dev

# In PostgreSQL:
\dt                    # List tables
\d activities         # Describe table
SELECT * FROM users;  # Query data
\q                    # Exit
```

### Tail Application Logs

```bash
# Real-time logs
docker-compose logs -f app --tail=100
```

### Scale Services

```bash
# Run multiple app instances (requires load balancer)
docker-compose up -d --scale app=3
```

---

## Troubleshooting

### Port Already in Use

```bash
# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Map to different host port
```

### Database Connection Refused

```bash
# Check if postgres is healthy
docker-compose ps postgres

# View postgres logs
docker-compose logs postgres

# Restart postgres
docker-compose restart postgres
```

### Out of Disk Space

```bash
# Clean up unused Docker resources
docker system prune

# Remove volumes (WARNING: deletes database)
docker volume prune
```

### Application Won't Start

```bash
# Check app logs
docker-compose logs app

# Rebuild image
docker-compose build --no-cache

# Restart app
docker-compose restart app
```

### Permission Denied

```bash
# On Linux, add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Or use sudo
sudo docker-compose up
```

---

## Production Deployment

### On Cloud Provider (AWS, GCP, Azure, etc.)

#### Option 1: AWS ECS

```bash
# Push image to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag screentime-app <account-id>.dkr.ecr.us-east-1.amazonaws.com/screentime-app:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/screentime-app:latest

# Deploy to ECS using docker-compose
ecs-cli compose up
```

#### Option 2: Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml screentime
```

#### Option 3: Kubernetes (Helm)

```bash
# Create Kubernetes manifests from docker-compose
kompose convert -f docker-compose.yml

# Deploy to cluster
kubectl apply -f .
```

#### Option 4: Self-Hosted (VPS)

```bash
# SSH into server
ssh user@your-vps.com

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Clone repo and deploy
git clone <your-repo>
cd screentime
docker-compose up -d
```

### Environment Variables

Create `.env.production` for production secrets:

```env
DATABASE_URL=postgresql://user:password@prod-db.example.com:5432/screentime
JWT_SECRET=<very-long-random-secret>
NEXTAUTH_SECRET=<very-long-random-secret>
NEXTAUTH_URL=https://yourapp.com
NODE_ENV=production
```

### SSL/TLS Certificate

```yaml
# docker-compose.yml - Add traefik reverse proxy
reverse-proxy:
  image: traefik:v2.3
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./traefik.yml:/traefik.yml
    - /var/run/docker.sock:/var/run/docker.sock
```

---

## Performance Optimization

### Multi-Stage Build

The Dockerfile uses a multi-stage build to:
- Reduce final image size (smaller deployments)
- Exclude build-only dependencies
- Improve security (smaller attack surface)

### Health Checks

Services include health checks for:
- Automatic restart on failure
- Load balancer routing in production
- Monitoring and alerting

### Volume Mounting

Database data persists in Docker volumes:
- Data survives container restarts
- Can be backed up easily
- Separate from application code

---

## Next Steps

1. **Start services:** `docker-compose up -d`
2. **Access app:** http://localhost:3000
3. **View logs:** `docker-compose logs -f`
4. **Stop services:** `docker-compose down`

For more help, see [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)
