#!/bin/bash

# Make script executable if it isn't already
chmod +x "$0"

# Kill any existing servers
echo "Killing any existing servers..."
pkill -f "node dist/server.js" || true
npx kill-port 5173 3000

# Start the real backend server
echo "Starting real backend server..."
NODE_ENV=development LOG_LEVEL=info ENABLE_DEV_TOOLS=true npm run dev &
BACKEND_PID=$!

# Wait a moment for the server to start
sleep 3

# Get the host IP (use 0.0.0.0 in Docker, otherwise use 192.168.0.130 or the local IP)
HOST_IP="0.0.0.0"
if [[ -z "${DOCKER_CONTAINER}" ]]; then
  # Not in Docker, use the specific IP
  HOST_IP="192.168.0.130"
fi

# Start the frontend Vite dev server
echo "Starting Pulse interface..."
cd frontend && npm run dev -- --host "${HOST_IP}"

# When the frontend exits, also kill the backend server
kill $BACKEND_PID 