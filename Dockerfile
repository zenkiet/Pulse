# Build stage
FROM node:18-slim AS builder

WORKDIR /app

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
FROM node:18-slim AS production

# Create a non-root user
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r pulse && useradd -r -g pulse pulse

WORKDIR /app

# Add labels for better metadata
LABEL org.opencontainers.image.title="ProxMox Pulse"
LABEL org.opencontainers.image.description="A lightweight, responsive ProxMox monitoring application"
LABEL org.opencontainers.image.version="1.0.12"
LABEL org.opencontainers.image.authors="Richard Courtman"
LABEL org.opencontainers.image.url="https://github.com/rcourtman/pulse"
LABEL org.opencontainers.image.source="https://github.com/rcourtman/pulse"
LABEL org.opencontainers.image.licenses="MIT"

# Define build arguments with defaults
ARG NODE_ENV=production
ARG LOG_LEVEL=info
ARG ENABLE_DEV_TOOLS=false
ARG PORT=7654
ARG NODE_TLS_REJECT_UNAUTHORIZED=0

# Set environment variables from build arguments
ENV NODE_ENV=${NODE_ENV}
ENV LOG_LEVEL=${LOG_LEVEL}
ENV ENABLE_DEV_TOOLS=${ENABLE_DEV_TOOLS}
ENV PORT=${PORT}
ENV DOCKER_CONTAINER=true
ENV NODE_TLS_REJECT_UNAUTHORIZED=${NODE_TLS_REJECT_UNAUTHORIZED}

# Copy only necessary files from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/start-dev.sh ./

# Create a symbolic link from /app/dist/public to /app/frontend/dist
RUN mkdir -p /app/dist/public && rm -rf /app/dist/public && ln -s /app/frontend/dist /app/dist/public

# Install only production dependencies
RUN npm ci --only=production

# Make the startup script executable
RUN chmod +x start-dev.sh && chown -R pulse:pulse /app

# Switch to non-root user
USER pulse

# Expose the backend port
EXPOSE ${PORT}

# Use dumb-init as entrypoint to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]

# Development stage for local development
FROM node:18 AS development

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci
RUN cd frontend && npm ci

# Copy application files
COPY . .

# Make the startup script executable
RUN chmod +x start-dev.sh

# Define build arguments with defaults
ARG NODE_ENV=development
ARG LOG_LEVEL=debug
ARG ENABLE_DEV_TOOLS=true
ARG PORT=7654
ARG VITE_PORT=9513
ARG NODE_TLS_REJECT_UNAUTHORIZED=0

# Set environment variables from build arguments
ENV NODE_ENV=${NODE_ENV}
ENV LOG_LEVEL=${LOG_LEVEL}
ENV ENABLE_DEV_TOOLS=${ENABLE_DEV_TOOLS}
ENV PORT=${PORT}
ENV VITE_PORT=${VITE_PORT}
ENV DOCKER_CONTAINER=true
ENV NODE_TLS_REJECT_UNAUTHORIZED=${NODE_TLS_REJECT_UNAUTHORIZED}

# Expose the backend and frontend ports
EXPOSE ${PORT} ${VITE_PORT}

# Start both the backend and frontend (using the start-dev.sh script)
CMD ["./start-dev.sh"] 