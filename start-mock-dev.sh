#!/bin/bash

# Make script executable if it isn't already
chmod +x "$0"

# Stop any running Pulse Docker containers first
echo "Stopping any running Pulse Docker containers..."
if command -v docker &> /dev/null; then
  docker ps -q --filter "name=pulse" | xargs -r docker stop
else
  echo "Docker not found, skipping container cleanup..."
fi

# Kill any existing servers
echo "Killing any existing servers..."
pkill -f "node dist/server.js" || true
npx kill-port 7654 7655 3000

# Set environment to development with mock data
export NODE_ENV=development
export USE_MOCK_DATA=true
export MOCK_DATA_ENABLED=true

# Start the mock data server
echo "Starting mock data server..."
ts-node src/mock/run-server.ts > /tmp/pulse-mock-server.log 2>&1 &
MOCK_SERVER_PID=$!

# Wait a moment for the mock server to start
sleep 2

# Check if the mock data server is running
if ! ps -p $MOCK_SERVER_PID > /dev/null; then
  echo "Error: Mock data server failed to start."
  echo "Check the logs at /tmp/pulse-mock-server.log for details."
  exit 1
fi

# Start the backend server with mock data
echo "Starting backend server with mock data..."
USE_MOCK_DATA=true MOCK_DATA_ENABLED=true npm run dev:server &
BACKEND_PID=$!

# Wait a moment for the server to start
sleep 3

# Get the host IP (use 0.0.0.0 in Docker, otherwise use localhost or your local IP)
HOST_IP="0.0.0.0"
if [[ -z "${DOCKER_CONTAINER}" ]]; then
  # Not in Docker, still use 0.0.0.0 to bind to all interfaces
  HOST_IP="0.0.0.0"
fi

# Verify mock data is enabled
echo "Verifying mock data is enabled..."
curl -s "http://localhost:7654/api/status" | grep -q "mockDataEnabled" && echo "✅ Mock data is enabled" || echo "❌ Mock data is NOT enabled"

echo ""
echo "Pulse is now running with mock data!"
echo "- Backend server: http://localhost:7654"
echo "- Frontend: http://localhost:3000"
echo ""

# Start the frontend Vite dev server
echo "Starting Pulse interface with mock data..."
cd frontend && USE_MOCK_DATA=true MOCK_DATA_ENABLED=true npm run dev -- --host "${HOST_IP}" --port 3000

# When the frontend exits, also kill the backend and mock server
kill $BACKEND_PID $MOCK_SERVER_PID 