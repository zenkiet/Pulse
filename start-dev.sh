#!/bin/bash

# Make script executable if it isn't already
chmod +x "$0"

# Kill any existing servers
echo "Killing any existing servers..."
pkill -f "node dist/server.js" || true
npx kill-port 7654 3000

# Set environment to development
export NODE_ENV=development

# Start the real backend server
echo "Starting real backend server..."
npm run dev:server &
BACKEND_PID=$!

# Wait a moment for the server to start
sleep 3

# Get the host IP (use 0.0.0.0 in Docker, otherwise use localhost or your local IP)
HOST_IP="0.0.0.0"
if [[ -z "${DOCKER_CONTAINER}" ]]; then
  # Not in Docker, use localhost or your specific IP
  HOST_IP="localhost"
fi

# Start the frontend Vite dev server
echo "Starting Pulse interface..."
cd frontend && npm run dev -- --host "${HOST_IP}" --port 3000

# When the frontend exits, also kill the backend server
kill $BACKEND_PID