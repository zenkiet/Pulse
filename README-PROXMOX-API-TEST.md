# ProxMox API Test Script

This is a comprehensive test script for the ProxMox API that automatically discovers node names and tests all relevant endpoints.

## Features

- **Automatic Node Name Discovery**: The script automatically discovers the correct ProxMox node names (like "pve", "pve2", or "minipc") instead of hardcoding them
- **Environment Variable Configuration**: Uses environment variables from your `.env` file
- **Comprehensive API Testing**: Tests all relevant API endpoints for each node
- **Detailed Reporting**: Generates a JSON report file with test results
- **Response Structure Analysis**: Shows the structure of API responses for reference
- **API Pattern Documentation**: Documents common patterns in the ProxMox API

## Usage

```bash
# Run the API test
npm run test:api
```

## How It Works

1. **Configuration Loading**: The script loads ProxMox API credentials from the `.env` file
2. **Node Discovery**: It connects to the cluster API to discover available nodes
3. **Node Name Mapping**: It maps the discovered node names to the configured nodes by IP address
4. **Endpoint Testing**: It tests all relevant endpoints with the discovered node names
5. **Report Generation**: It generates a detailed report showing successful API patterns and response structures

## Environment Variables

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

## Tested Endpoints

The script tests the following endpoints for each node:

- Node status: `/api2/json/nodes/{nodeName}/status`
- List VMs: `/api2/json/nodes/{nodeName}/qemu`
- List containers: `/api2/json/nodes/{nodeName}/lxc`
- List storage: `/api2/json/nodes/{nodeName}/storage`
- Network configuration: `/api2/json/nodes/{nodeName}/network`
- Recent tasks: `/api2/json/nodes/{nodeName}/tasks`
- Subscription info: `/api2/json/nodes/{nodeName}/subscription`
- ProxMox version: `/api2/json/nodes/{nodeName}/version`

## Report Format

The script generates a JSON report file in the `reports` directory with the following structure:

```json
{
  "timestamp": "2025-02-27T15:06:04.535Z",
  "nodes": [
    {
      "nodeConfig": {
        "id": "node-1",
        "name": "Proxmox Node 1",
        "host": "https://192.168.0.132:8006",
        "tokenId": "root@pam!pulse",
        "tokenSecret": "e1850350-6afc-4b8e-ae28-472152af84f9"
      },
      "discoveredNode": {
        "id": "node-1",
        "name": "Proxmox Node 1",
        "nodeName": "minipc",
        "host": "https://192.168.0.132:8006",
        "ipAddress": "192.168.0.132"
      },
      "testResults": [
        {
          "endpoint": "/nodes/minipc/status",
          "success": true,
          "responseTime": 27,
          "statusCode": 200,
          "data": { ... }
        },
        // More test results...
      ],
      "overallSuccess": true,
      "totalTests": 8,
      "successfulTests": 8,
      "failedTests": 0,
      "averageResponseTime": 92.75
    }
  ],
  "overallSuccess": true,
  "totalTests": 8,
  "successfulTests": 8,
  "failedTests": 0,
  "averageResponseTime": 92.75
}
```

## API Patterns

The script documents the following common patterns in the ProxMox API:

1. All endpoints return a data object with the actual response data
2. Most list endpoints return an array of objects in the data property
3. Status endpoints return a single object with status information
4. Error responses include a message property with error details
5. Authentication is done via PVEAPIToken in the Authorization header
6. Node names must be used in the URL path for node-specific endpoints

## Implementation Details

The script uses the following approach to discover node names:

1. It first tries to get the list of nodes from the cluster API
2. It then tries to match the configured nodes to the discovered nodes by IP address
3. If it can't find a direct match, it tries to match by position in the list
4. If that fails, it tries to access each node's status endpoint to find the correct node
5. As a last resort, it falls back to the old method of using hardcoded node names

This ensures that the script will work even if the node names are not the default "pve" or "pve2". 