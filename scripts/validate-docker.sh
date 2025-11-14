#!/bin/bash
# Script to validate Docker setup before deployment

set -e

echo "🔍 Validating Docker deployment setup..."

# Check if required files exist
echo ""
echo "📁 Checking required files..."
required_files=(
  "docker-compose.yml"
  "backend/Dockerfile"
  "frontend/Dockerfile"
  "frontend/nginx.conf"
  ".dockerignore"
  ".env.example"
)

for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (missing)"
    exit 1
  fi
done

# Check if .env exists
echo ""
echo "📝 Checking environment configuration..."
if [ -f ".env" ]; then
  echo "  ✅ .env file exists"

  # Check for required variables
  required_vars=("HARDCOVER_API_KEY" "COLLECTION_ROOT")
  for var in "${required_vars[@]}"; do
    if grep -q "^${var}=" .env && ! grep -q "^${var}=.*your_.*_here" .env; then
      echo "  ✅ $var is configured"
    else
      echo "  ⚠️  $var needs to be set in .env"
    fi
  done
else
  echo "  ⚠️  .env file not found. Copy .env.example to .env and configure it."
fi

# Check if Docker is installed
echo ""
echo "🐳 Checking Docker installation..."
if command -v docker &> /dev/null; then
  echo "  ✅ Docker is installed ($(docker --version))"
else
  echo "  ❌ Docker is not installed"
  echo "     Install from: https://docs.docker.com/get-docker/"
  exit 1
fi

if command -v docker compose &> /dev/null; then
  echo "  ✅ Docker Compose is available"
else
  echo "  ❌ Docker Compose is not available"
  echo "     Install Docker Compose v2 or use 'docker-compose' (v1)"
  exit 1
fi

# Validate docker-compose.yml syntax
echo ""
echo "✅ Validating docker-compose.yml syntax..."
if docker compose config > /dev/null 2>&1; then
  echo "  ✅ docker-compose.yml is valid"
else
  echo "  ❌ docker-compose.yml has syntax errors"
  docker compose config
  exit 1
fi

# Check if ports are available
echo ""
echo "🔌 Checking port availability..."
if [ -f ".env" ]; then
  source .env
fi

BACKEND_PORT=${BACKEND_PORT:-3034}
FRONTEND_PORT=${FRONTEND_PORT:-8174}

for port in $BACKEND_PORT $FRONTEND_PORT; do
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "  ⚠️  Port $port is already in use"
  else
    echo "  ✅ Port $port is available"
  fi
done

echo ""
echo "✨ Validation complete!"
echo ""
echo "Next steps:"
echo "  1. Ensure HARDCOVER_API_KEY is set in .env"
echo "  2. Ensure COLLECTION_ROOT is set to your book collection path in .env"
echo "  3. Run: docker compose up -d"
echo "  4. Access the app at: http://localhost:${FRONTEND_PORT}"
