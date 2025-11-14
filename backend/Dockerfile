# Multi-stage Dockerfile for backend production image
# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package.json for workspace configuration
COPY package*.json ./

# Copy shared package
COPY shared ./shared

# Copy backend package
COPY backend ./backend

# Install all workspace dependencies
RUN npm ci

# Build shared package first
RUN npm run build -w shared

# Build backend
RUN npm run build -w backend

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Copy root package.json for workspace configuration
COPY package*.json ./

# Copy shared package.json and built files
COPY shared/package*.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist

# Copy backend package.json
COPY backend/package*.json ./backend/

# Install production dependencies only
RUN npm ci --only=production --workspaces

# Copy built backend application from builder stage
COPY --from=builder /app/backend/dist ./backend/dist

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=10s \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { if (res.statusCode !== 200) throw new Error(res.statusCode) })"

# Expose port
EXPOSE 3000

# Set working directory to backend for runtime
WORKDIR /app/backend

# Start application
CMD ["node", "dist/index.js"]
