# Production Dockerfile for DRAGME High-Performance Social Arena
FROM node:20-slim AS base

# Install OS dependencies for sharp and native modules if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests first for optimal layer caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Ensure storage directories exist
RUN mkdir -p uploads/temp uploads/profile uploads/post uploads/posters uploads/variants

# Create and use non-root application user for maximum security
RUN groupadd -r dragme && useradd -r -g dragme -d /app dragme \
    && chown -R dragme:dragme /app

USER dragme

# Environment defaults
ENV NODE_ENV=production
ENV PORT=5173

EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5173/api/rooms || exit 1

CMD ["node", "server.js"]
