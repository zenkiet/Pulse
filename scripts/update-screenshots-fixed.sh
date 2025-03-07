#!/bin/bash

# Update Screenshots Script for ProxMox Pulse
# This script is a convenience wrapper for the screenshot automation tool

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Flag to track if we started the server (so we know whether to stop it)
SERVER_STARTED_BY_SCRIPT=false
MOCK_SERVER_PID=""
BACKEND_PID=""
FRONTEND_PID=""

# Function to clean up all started processes
cleanup() {
  echo "🧹 Cleaning up processes..."
  
  if [ -n "$FRONTEND_PID" ]; then
    echo "Stopping frontend server (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null || true
  fi
  
  if [ -n "$BACKEND_PID" ]; then
    echo "Stopping backend server (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null || true
  fi
  
  if [ -n "$MOCK_SERVER_PID" ]; then
    echo "Stopping mock server (PID: $MOCK_SERVER_PID)..."
    kill $MOCK_SERVER_PID 2>/dev/null || true
  fi
  
  # Kill any remaining processes
  echo "Killing any remaining processes..."
  cd "$PROJECT_ROOT" && npm run dev:kill:all 2>/dev/null || true
}

# Set up trap to ensure servers are stopped on script exit
trap cleanup EXIT INT TERM

# Kill any existing servers
echo "🔪 Killing any existing servers..."
cd "$PROJECT_ROOT" && npm run dev:kill:all

# Start the mock data server
echo "🚀 Starting mock data server..."
export NODE_ENV=development
export USE_MOCK_DATA=true
export MOCK_DATA_ENABLED=true
cd "$PROJECT_ROOT" && ts-node src/mock/run-server.ts > /tmp/pulse-mock-server.log 2>&1 &
MOCK_SERVER_PID=$!
echo "Mock server started with PID: $MOCK_SERVER_PID"

# Wait for the mock server to start
sleep 3

# Start the backend server with mock data
echo "🚀 Starting backend server with mock data..."
cd "$PROJECT_ROOT" && USE_MOCK_DATA=true MOCK_DATA_ENABLED=true npm run dev:server > /tmp/pulse-backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend server started with PID: $BACKEND_PID"

# Wait for the backend server to start
sleep 5

# Start the frontend server
echo "🚀 Starting frontend server..."
cd "$PROJECT_ROOT/frontend" && USE_MOCK_DATA=true MOCK_DATA_ENABLED=true npm run dev -- --host "0.0.0.0" --port 3000 > /tmp/pulse-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend server started with PID: $FRONTEND_PID"

# Wait for the frontend server to start
echo "⏳ Waiting for servers to start..."
sleep 10

# Check if the frontend server is running
if ! curl -s http://localhost:3000 > /dev/null; then
  echo "❌ Error: Frontend server is not running on port 3000"
  exit 1
fi

# Check if mock data is enabled
if ! curl -s http://localhost:7654/api/status | grep -q "mockDataEnabled\":true"; then
  echo "❌ Error: Server is running but mock data is not enabled"
  exit 1
fi

echo "✅ All servers are running with mock data enabled"

# Run the screenshot tool
echo "📸 Running screenshot tool..."
cd "$PROJECT_ROOT/tools/screenshot-automation" && npm run build && npm start -- --config ../../screenshot-config.json
SCREENSHOT_RESULT=$?

# Check if screenshots were created successfully
if [ $SCREENSHOT_RESULT -eq 0 ]; then
  echo "✅ Screenshots updated successfully!"
  echo "Check the docs/images directory for the new screenshots."
else
  echo "❌ Error: Failed to update screenshots"
  exit 1
fi
