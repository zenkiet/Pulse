#!/bin/bash
# Pulse Mock Data Helper
# This script handles everything needed for running Pulse with simulated data

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to display a fancy header
function display_header {
    clear
    echo -e "${BLUE}╔═════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                                                         ║${NC}"
    echo -e "${BLUE}║  Pulse Mock Data Helper                                 ║${NC}"
    echo -e "${BLUE}║                                                         ║${NC}"
    echo -e "${BLUE}╚═════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Display the header
display_header

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: This script must be run from the root of the Pulse project.${NC}"
    echo -e "${YELLOW}Please cd to the project root and try again.${NC}"
    exit 1
fi

# Kill any existing processes
echo -e "${YELLOW}Cleaning up any existing processes...${NC}"
pkill -f "node scripts/generate-mock-data.js" 2>/dev/null
pkill -f "node scripts/debug-socket.js" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
pkill -f "vite" 2>/dev/null

# Wait a moment for processes to terminate
sleep 1

# Check if ports are in use
function check_port {
    if lsof -i:$1 > /dev/null 2>&1; then
        echo -e "${RED}Error: Port $1 is already in use. Please free this port and try again.${NC}"
        exit 1
    fi
}

check_port 7655  # Mock data server port
check_port 5173  # Vite dev server port

# Start the mock data server
echo -e "${GREEN}Starting mock data server...${NC}"
node scripts/generate-mock-data.js > /tmp/pulse-mock-server.log 2>&1 &
MOCK_SERVER_PID=$!

# Wait for the mock data server to start
echo -e "${YELLOW}Waiting for mock data server to start...${NC}"
sleep 2

# Check if the mock data server is running
if ! ps -p $MOCK_SERVER_PID > /dev/null; then
    echo -e "${RED}Error: Mock data server failed to start.${NC}"
    echo -e "${YELLOW}Check the logs at /tmp/pulse-mock-server.log for details.${NC}"
    exit 1
fi

# Start the frontend
echo -e "${GREEN}Starting frontend...${NC}"
cd frontend
VITE_API_URL=http://localhost:7655 npm run dev > /tmp/pulse-frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for the frontend to start
echo -e "${YELLOW}Waiting for frontend to start...${NC}"
sleep 5

# Check if the frontend is running
if ! ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${RED}Error: Frontend failed to start.${NC}"
    echo -e "${YELLOW}Check the logs at /tmp/pulse-frontend.log for details.${NC}"
    exit 1
fi

# Open the browser
echo -e "${GREEN}Opening browser...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:5173
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:5173
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    start http://localhost:5173
else
    echo -e "${YELLOW}Please open http://localhost:5173 in your browser.${NC}"
fi

# Display success message
echo -e "${GREEN}Everything is running! The application is now available at http://localhost:5173${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all processes when you're done.${NC}"

# Wait for user to press Ctrl+C
trap "echo -e '${YELLOW}Stopping all processes...${NC}'; kill $MOCK_SERVER_PID $FRONTEND_PID 2>/dev/null; echo -e '${GREEN}Done! All processes have been stopped.${NC}'; exit 0" INT
wait 