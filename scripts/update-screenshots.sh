#!/bin/bash

# Update Screenshots Script for ProxMox Pulse
# This script is a convenience wrapper for the screenshot automation tool

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Flag to track if we started the server (so we know whether to stop it)
SERVER_STARTED_BY_SCRIPT=false

# Function to check if mock data is enabled on the server
check_mock_data() {
  # Check if the server is running and if mock data is enabled
  if curl -s http://localhost:7654/api/status | grep -q "mockDataEnabled\":true"; then
    echo "✅ Server is running with mock data enabled"
    return 0
  else
    echo "❌ Server is not running with mock data enabled"
    return 1
  fi
}

# Function to start the development server with mock data
start_server() {
  echo "🚀 Starting development server with mock data..."
  cd "$PROJECT_ROOT" && npm run dev:mock &
  SERVER_PID=$!
  SERVER_STARTED_BY_SCRIPT=true
  
  # Wait for the server to start
  echo "⏳ Waiting for the server to start..."
  for i in {1..15}; do
    if curl -s http://localhost:3000 > /dev/null; then
      echo "✅ Development server is running"
      
      # Wait a bit more for the backend to be ready
      sleep 5
      
      # Check if mock data is enabled
      if check_mock_data; then
        return 0
      else
        echo "❌ Error: Server is running but mock data is not enabled"
        echo "Stopping the server and exiting..."
        stop_server
        exit 1
      fi
    fi
    
    if [ "$i" -eq 15 ]; then
      echo "❌ Error: Development server failed to start"
      exit 1
    fi
    
    echo "Waiting... ($i/15)"
    sleep 2
  done
}

# Function to stop the server
stop_server() {
  if [ "$SERVER_STARTED_BY_SCRIPT" = true ]; then
    echo "🛑 Stopping development server..."
    cd "$PROJECT_ROOT" && npm run dev:kill:all
    SERVER_STARTED_BY_SCRIPT=false
  fi
}

# Set up trap to ensure server is stopped on script exit
trap stop_server EXIT

# Check if the development server is running
if ! curl -s http://localhost:3000 > /dev/null; then
  echo "❌ Development server is not running on port 3000"
  echo "Starting development server automatically..."
  start_server
else
  # Server is running, but check if mock data is enabled
  if ! check_mock_data; then
    echo "❌ Server is running but mock data is not enabled"
    echo "Restarting server with mock data enabled..."
    cd "$PROJECT_ROOT" && npm run dev:kill:all
    start_server
  fi
fi

# Run the screenshot tool
echo "📸 Running screenshot tool..."
cd "$PROJECT_ROOT/tools/screenshot-automation" && ./update-screenshots.sh "$@"
SCREENSHOT_RESULT=$?

# Stop the server if we started it
stop_server

# Check if screenshots were created successfully
if [ $SCREENSHOT_RESULT -eq 0 ]; then
  echo "✅ Screenshots updated successfully!"
  
  # Ask if the user wants to see the updated screenshots
  echo "Would you like to open the screenshots directory? (y/n)"
  read -r answer
  
  if [[ "$answer" =~ ^[Yy]$ ]]; then
    # Open the screenshots directory
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      open "$PROJECT_ROOT/docs/images"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
      # Linux
      xdg-open "$PROJECT_ROOT/docs/images"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
      # Windows
      start "$PROJECT_ROOT/docs/images"
    else
      echo "Could not open directory automatically. Please check: $PROJECT_ROOT/docs/images"
    fi
  fi
else
  echo "❌ Error: Failed to update screenshots"
  exit 1
fi 