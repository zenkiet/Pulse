# ProxMox API Test Scripts

This directory contains scripts for testing the ProxMox API integration.

## Available Scripts

### ProxMox API Test (`proxmox-api-test.ts`)

A comprehensive test script that:

1. Loads ProxMox API credentials from the `.env` file
2. **Automatically discovers the correct node names** from the API
3. Tests all relevant API endpoints
4. Creates a detailed report showing successful API patterns and response structures

#### Usage

```bash
# Run the API test
npm run test:api
```

#### Features

- **Node Name Auto-Discovery**: The script automatically discovers the correct ProxMox node names (like "pve" or "pve2") instead of hardcoding them
- **Comprehensive Testing**: Tests multiple endpoints for each node
- **Detailed Reporting**: Generates a JSON report file in the `reports` directory
- **Response Structure Analysis**: Shows the structure of API responses for reference
- **API Pattern Documentation**: Documents common patterns in the ProxMox API

#### How It Works

1. The script first connects to the cluster API (not node-specific) to discover available nodes
2. It uses the `/api2/json/nodes` endpoint to get the actual node names
3. It maps the discovered node names to the configured nodes by IP address
4. It tests all endpoints with the discovered node names
5. It generates a detailed report including:
   - Discovered node names
   - Successful API patterns
   - Sample response structures
   - Any errors encountered
   - Connection statistics

#### Environment Variables

The script uses the following environment variables from your `.env` file:

```
# Node 1
PROXMOX_NODE_1_NAME=Proxmox Node 1
PROXMOX_NODE_1_HOST=https://192.168.0.132:8006
PROXMOX_NODE_1_TOKEN_ID=root@pam!pulse
PROXMOX_NODE_1_TOKEN_SECRET=e1850350-6afc-4b8e-ae28-472152af84f9

# Node 2
PROXMOX_NODE_2_NAME=Proxmox Node 2
PROXMOX_NODE_2_HOST=https://192.168.0.141:8006
PROXMOX_NODE_2_TOKEN_ID=root@pam!pulse
PROXMOX_NODE_2_TOKEN_SECRET=63e21f63-4cfd-4ba0-9b14-fc681c59d932
```

### Startup Check (`startup-check.ts`)

A script to check the configuration and connections during application startup.

```bash
# Run the startup check
npm run test:startup
``` 