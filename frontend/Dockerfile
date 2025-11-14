# Frontend Dockerfile - Vue 3 + Vite
# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package.json for workspace configuration
COPY package*.json ./

# Copy shared package
COPY shared ./shared

# Copy frontend package
COPY frontend ./frontend

# Install all workspace dependencies
RUN npm ci

# Build shared package first
RUN npm run build -w shared

# Build frontend with Vite
ARG VITE_API_URL=http://localhost:3000
ARG VITE_WS_URL=ws://localhost:3000

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

RUN npm run build -w frontend

# Stage 2: Runtime (nginx for serving SPA)
FROM nginx:alpine

# Copy nginx config
RUN rm -f /etc/nginx/conf.d/default.conf
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
