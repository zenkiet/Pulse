# Pulse Mock Data Setup

This guide explains how to run Pulse with mock data instead of connecting to real Proxmox servers.

## Quick Start

There are several ways to start Pulse with mock data:

### Option 1: Using the dev:mock script (Recommended)

```bash
npm run dev:mock
```

This script follows the same pattern as the standard `dev:start` script but uses mock data instead of real Proxmox servers. It:

1. Kills any existing servers running on the required ports
2. Starts the mock data server
3. Starts the backend server with mock data enabled
4. Starts the frontend with mock data enabled

When you exit the frontend (Ctrl+C), it will automatically kill the backend and mock data servers.

### Option 2: Using the dev script

```bash
npm run dev
```

This will:
1. Start the mock data server
2. Start the backend server with mock data enabled
3. Start the frontend with mock data enabled

## What's Happening Behind the Scenes

The mock data setup:

1. Sets the necessary environment variables:
   - `NODE_ENV=development`
   - `USE_MOCK_DATA=true`
   - `MOCK_DATA_ENABLED=true`

2. Starts the mock data server (`src/mock/server.ts`)
   - This server runs on port 7655
   - It generates simulated Proxmox data with realistic VM and container names

3. Starts the backend server with mock data enabled
   - The backend connects to the mock data server instead of real Proxmox servers
   - It uses the `MockClient` class to handle communication with the mock server

4. Starts the frontend with mock data enabled
   - The frontend connects to the backend as usual

## Mock Data Architecture

The mock data implementation consists of several components:

1. **Mock Templates** (`src/mock/templates.ts`)
   - Contains templates for VM and container names and OS types
   - Used by both the mock client and mock server

2. **Mock Server** (`src/mock/server.ts`)
   - Standalone server that generates and serves mock data
   - Runs on port 7655
   - Provides realistic VM and container data with meaningful names

3. **Mock Client** (`src/api/mock-client.ts`)
   - Implements the same interface as the real Proxmox client
   - Connects to the mock server instead of real Proxmox servers
   - Generates its own mock VMs and containers with meaningful names

## Customizing Mock Data

If you want to customize the mock data:

1. Edit the `src/mock/templates.ts` file
   - Modify the VM and container templates to add or change the available names and OS types

2. Edit the `src/mock/server.ts` file
   - Modify the data generation functions to create the data you need

3. Restart the mock server

## Troubleshooting

If you encounter issues:

1. Check the mock server logs: `/tmp/pulse-mock-server.log`
2. Make sure all required ports are available:
   - 7654 (backend server)
   - 7655 (mock data server)
   - 3000 (frontend)

3. If needed, kill existing processes:
   ```bash
   npm run dev:kill:all
   ```

4. If you get a "ts-node: command not found" error:
   ```bash
   npm install -g ts-node
   ```

5. If you encounter TypeScript errors in the mock server:
   - Make sure all variables have proper type definitions
   - Check the `src/mock/server.ts` file for any type errors
   - Run `tsc --noEmit src/mock/server.ts` to check for type errors without compiling

## Switching Back to Real Data

To switch back to using real Proxmox servers:

1. Configure your `.env` file with real Proxmox server details
2. Start the application normally:
   ```bash
   npm run dev:start
   ``` 