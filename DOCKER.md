# Docker Deployment Guide

This guide covers how to deploy the Book Tracker application using Docker and Docker Compose.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)
- At least 1GB of available disk space

## Quick Start

1. **Clone the repository** (if you haven't already)

2. **Create environment file**

   ```bash
   cp .env.example .env
   ```

3. **Configure your environment**

   Edit `.env` and set your values:
   
   ```bash
   # Required: Get your API key from https://hardcover.app/account/api
   HARDCOVER_API_KEY=your_actual_api_key_here
   
   # Required: Set path to your book collection on your HOST machine
   COLLECTION_ROOT=/path/to/your/book/collection
   
   # Optional: Customize ports if needed
   BACKEND_PORT=3034
   FRONTEND_PORT=8174
   ```

4. **Start the application**

   ```bash
   docker compose up -d
   ```

5. **Access the application**

   - Frontend: http://localhost:8174
   - Backend API: http://localhost:3034

## Architecture

The application uses an npm workspace monorepo structure with three packages:
- `shared` - Common TypeScript types and GraphQL queries shared between frontend and backend
- `backend` - Express API server with SQLite database
- `frontend` - Vue 3 SPA with Vite

The application consists of two services:

### Backend Service
- Built on Node.js 20 Alpine
- Uses npm workspaces to build shared package first, then backend
- Runs the Express API server
- Handles database operations and external API calls
- Port: 3000 (internal), mapped to 3034 (host)

### Frontend Service
- Built with Vite/Vue 3
- Uses npm workspaces to build shared package first, then frontend
- Served by Nginx
- Port: 80 (internal), mapped to 8174 (host)

## Docker Compose Services

### Backend

```yaml
backend:
  - Persistent database storage via Docker volume
  - Optional book collection mount (read-only)
  - Health checks configured
  - Auto-restart enabled
```

### Frontend

```yaml
frontend:
  - Waits for backend to be healthy before starting
  - Build-time environment variables for API URLs
  - Static asset serving via Nginx
  - Auto-restart enabled
```

## Data Persistence

### Database Volume

The SQLite database is stored in a named Docker volume `db-data`. This ensures your data persists across container restarts and updates.

To backup the database:

```bash
# Create backup
docker compose exec backend sqlite3 /app/data/books.db ".backup /app/data/backup.db"
docker cp book-tracker-backend-1:/app/data/backup.db ./backup.db
```

To restore from backup:

```bash
# Stop services
docker compose down

# Remove old volume
docker volume rm book-tracker_db-data

# Start services (creates new volume)
docker compose up -d

# Wait for backend to initialize
sleep 5

# Restore backup
docker cp ./backup.db book-tracker-backend-1:/app/data/restore.db
docker compose exec backend sqlite3 /app/data/books.db ".restore /app/data/restore.db"
docker compose restart backend
```

### Book Collection Mount

Your book collection is mounted as read-only from your host filesystem. The application scans this directory to mark books you own.

Expected structure:
```
{COLLECTION_ROOT}/
├── Author Name/
│   └── Book Title (12345)/
│       └── book_files...
```

## Common Commands

### View logs

```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f backend

# Frontend only
docker compose logs -f frontend
```

### Restart services

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart backend
```

### Stop services

```bash
# Stop (containers remain)
docker compose stop

# Stop and remove containers
docker compose down

# Stop, remove containers and volumes (WARNING: deletes database)
docker compose down -v
```

### Rebuild after code changes

```bash
# Rebuild and restart
docker compose up -d --build

# Rebuild specific service
docker compose up -d --build backend
```

### Access container shell

```bash
# Backend
docker compose exec backend sh

# Frontend
docker compose exec frontend sh
```

### Check service health

```bash
# Backend health
curl http://localhost:3034/health

# Frontend health
curl http://localhost:8174/health
```

## Environment Variables

### Required

- `HARDCOVER_API_KEY` - Your Hardcover API key
- `COLLECTION_ROOT` - Path to your book collection (on host)

### Optional

- `BACKEND_PORT` - Backend port on host (default: 3034)
- `FRONTEND_PORT` - Frontend port on host (default: 8174)
- `NODE_ENV` - Node environment (default: production)
- `LOG_LEVEL` - Logging level: debug, info, warn, error (default: info)
- `VITE_API_URL` - Frontend API URL (default: http://localhost:3034)
- `VITE_WS_URL` - Frontend WebSocket URL (default: ws://localhost:3034)

## Troubleshooting

### Container won't start

Check logs for errors:
```bash
docker compose logs backend
```

### Database connection errors

Ensure the data directory has proper permissions:
```bash
docker compose exec backend ls -la /app/data
```

### Frontend can't connect to backend

1. Check backend is healthy:
   ```bash
   docker compose ps
   curl http://localhost:3034/health
   ```

2. Verify environment variables are set correctly in `.env`

3. Check if ports are already in use:
   ```bash
   lsof -i :3034
   lsof -i :8174
   ```

### Book ownership not detected

1. Verify `COLLECTION_ROOT` path is correct
2. Check the path is accessible from the container:
   ```bash
   docker compose exec backend ls -la /data/books
   ```

3. Ensure the directory structure matches the expected format

### Out of disk space

Clean up unused Docker resources:
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (WARNING: check what will be deleted first)
docker volume prune
```

## Production Deployment

For production deployments:

1. **Use production environment**
   ```bash
   NODE_ENV=production
   LOG_LEVEL=warn
   ```

2. **Set strong security headers** (already configured in nginx.conf)

3. **Use HTTPS** - Put behind a reverse proxy like Nginx or Traefik

4. **Regular backups** - Set up automated database backups

5. **Monitor resources**
   ```bash
   docker stats
   ```

6. **Update regularly**
   ```bash
   git pull
   docker compose up -d --build
   ```

## Advanced Configuration

### Custom Network

The services run on a network named `book-tracker-network`. To connect other containers:

```yaml
services:
  your-service:
    networks:
      - book-tracker-network

networks:
  book-tracker-network:
    external: true
```

### Resource Limits

Add resource constraints to docker-compose.yml:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Custom Build Arguments

Override build-time variables:

```bash
docker compose build --build-arg VITE_API_URL=https://api.yourdomain.com backend
```

## Development with Docker

For development, you might want to mount source code:

```yaml
# docker-compose.dev.yml
services:
  backend:
    volumes:
      - ./backend/src:/app/src
    command: npm run dev
```

Then run:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Uninstall

To completely remove the application:

```bash
# Stop and remove containers
docker compose down

# Remove volumes (WARNING: deletes all data)
docker volume rm book-tracker_db-data

# Remove images
docker rmi book-tracker-backend book-tracker-frontend
```
