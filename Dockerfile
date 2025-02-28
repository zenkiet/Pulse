FROM node:18-alpine

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
RUN chmod +x start-pulse.sh

# Set environment variables
ENV NODE_ENV=development
ENV LOG_LEVEL=info
ENV ENABLE_DEV_TOOLS=true
ENV PORT=3000
ENV DOCKER_CONTAINER=true

# Expose the backend and frontend ports
EXPOSE 3000 5173

# Start both the backend and frontend (using the start-pulse.sh script)
CMD ["./start-pulse.sh"] 