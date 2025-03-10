# Build stage
FROM node:18-slim AS builder

WORKDIR /app

# Install dependencies for canvas
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python-is-python3 \
    make \
    g++ \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy package files for better caching
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci
RUN cd frontend && npm ci

# Copy application files
COPY . .

# Build the application
RUN npm run build
RUN cd frontend && npm run build

# Production stage
FROM node:18-slim

# Add version labels
LABEL version="1.3.1"
LABEL description="Pulse - A lightweight monitoring application for Proxmox VE"
LABEL maintainer="Richard Courtman"

# Install dependencies for canvas and create a non-root user
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    python3 \
    python-is-python3 \
    make \
    g++ \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r pulse && useradd -r -g pulse pulse

WORKDIR /app

# Copy only necessary files from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend/dist ./frontend/dist

# Create a symbolic link from /app/dist/public to /app/frontend/dist
RUN mkdir -p /app/dist/public && rm -rf /app/dist/public && ln -s /app/frontend/dist /app/dist/public

# Install only production dependencies
RUN npm ci --only=production

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chown -R pulse:pulse /app/logs

# Set environment variables
ENV PORT=7654

# Switch to non-root user
USER pulse

# Expose the backend port
EXPOSE 7654

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"] 