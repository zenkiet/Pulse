#!/bin/bash

# Kill any existing test servers
pkill -f "node test-server.js" || true

# Start the test server
echo "Starting test server..."
node test-server.js &
TEST_SERVER_PID=$!

# Wait a moment for the server to start
sleep 2

# Start the frontend
echo "Starting frontend..."
cd frontend && npm run dev

# When the frontend exits, also kill the test server
kill $TEST_SERVER_PID 