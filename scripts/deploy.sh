#!/bin/bash
# Deploy script for production Docker deployment
# Usage: ./scripts/deploy.sh staging|production

set -e

ENVIRONMENT=${1:-staging}
REGISTRY=${DOCKER_REGISTRY:-docker.io}
IMAGE_NAME=screentime
VERSION=$(git rev-parse --short HEAD)
FULL_IMAGE_NAME=$REGISTRY/$IMAGE_NAME:$VERSION

echo "🚀 Deploying Screentime to $ENVIRONMENT"
echo "📦 Image: $FULL_IMAGE_NAME"

# 1. Build Docker image
echo "🔨 Building Docker image..."
docker build -t $FULL_IMAGE_NAME .

# 2. Push to registry
echo "📤 Pushing to registry..."
docker push $FULL_IMAGE_NAME

# 3. Update docker-compose with new image
echo "🔄 Updating docker-compose..."
sed -i "s|image: screentime.*|image: $FULL_IMAGE_NAME|g" docker-compose.$ENVIRONMENT.yml

# 4. Deploy
echo "🚀 Deploying..."
docker-compose -f docker-compose.$ENVIRONMENT.yml down || true
docker-compose -f docker-compose.$ENVIRONMENT.yml up -d

# 5. Run health checks
echo "🏥 Running health checks..."
for i in {1..30}; do
  if curl -f http://localhost:3000/api/health; then
    echo "✅ Deployment successful!"
    exit 0
  fi
  echo "⏳ Waiting for app to be ready... ($i/30)"
  sleep 2
done

echo "❌ Deployment failed - app not responding"
exit 1
