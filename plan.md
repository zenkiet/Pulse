# ProxMox Monitoring App Implementation Plan

## Project Overview

A lightweight, responsive ProxMox monitoring application that displays real-time metrics for CPU, memory, network, and disk usage across multiple nodes. The application will use the ProxMox API and event subscription for real-time updates.

## Environment Configuration

The application will use environment variables for configuration with the following structure:

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

# App Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_DEV_TOOLS=true
METRICS_HISTORY_MINUTES=60
```

## Technology Stack

- **Backend**: Node.js with Express, TypeScript, Socket.io for real-time updates
- **Frontend**: Simple HTML/CSS/TypeScript with grid layout
- **Deployment**: Docker container

## Project Structure

```
proxmox-monitor/
├── src/
│   ├── config/
│   ├── types/
│   ├── api/
│   ├── services/
│   ├── utils/
│   ├── routes/
│   ├── websocket/
│   ├── public/
│   └── server.ts
├── .env
├── .env.example
├── .gitignore
├── tsconfig.json
├── package.json
├── Dockerfile
└── README.md
```

## Core Components

### 1. Configuration Module

- **Purpose**: Load and validate environment variables
- **Features**:
  - Parse environment variables for multiple ProxMox nodes
  - Support dynamic number of nodes (PROXMOX_NODE_1, PROXMOX_NODE_2, etc.)
  - Validate configuration during startup
  - Keep credentials secure

### 2. ProxMox API Client

- **Purpose**: Interface with ProxMox API
- **Features**:
  - Authentication with API tokens
  - Fetch node status information
  - Get virtual machines and containers
  - Get detailed metrics
  - Handle API errors with proper logging
  - Support HTTPS with option to ignore certificate validation for lab environments

### 3. Event Subscription Service

- **Purpose**: Receive real-time updates from ProxMox
- **Features**:
  - Connect to ProxMox event stream
  - Process event data
  - Emit events to internal event system
  - Handle connection errors and auto-reconnect
  - Correlate events with specific nodes

### 4. Node Management Service

- **Purpose**: Manage multiple ProxMox nodes
- **Features**:
  - Create and maintain API clients for each node
  - Manage event subscriptions
  - Aggregate data from multiple nodes
  - Track node connectivity status
  - Support dynamic node addition/removal

### 5. Metrics Collection Service

- **Purpose**: Collect and process metrics
- **Features**:
  - Combine event-based and polling data
  - Normalize metrics across different sources
  - Calculate derived metrics (percentages, rates)
  - Store short-term history (configurable, default 60 minutes)
  - Support for different metric types (CPU, memory, network, disk)

### 6. WebSocket Server

- **Purpose**: Real-time communication with frontend
- **Features**:
  - Push metrics updates to clients
  - Handle client connections/disconnections
  - Support filtering data sent to clients
  - Optimize data transfer (send only changed data)

### 7. REST API

- **Purpose**: Provide data to frontend
- **Endpoints**:
  - `/api/nodes` - List all nodes
  - `/api/nodes/:nodeId` - Get node details
  - `/api/nodes/:nodeId/vms` - Get all VMs for a node
  - `/api/nodes/:nodeId/containers` - Get all containers for a node
  - `/api/status` - Get system status
  - `/api/metrics` - Get current metrics
  - `/api/metrics/history` - Get historical metrics

### 8. Development Tools

- **Purpose**: Assist in development with AI
- **Features**:
  - Enhanced logging with context
  - API call visualization
  - State inspection
  - Error handling with suggestions
  - Development dashboard
  - API response recording/playback

### 9. Frontend Components

- **Purpose**: Display monitoring data
- **Features**:
  - Grid layout for VMs/containers
  - Real-time metric updates
  - Node selector
  - Responsive design
  - Minimal but functional UI

## Implementation Phases

### Phase 1: Project Setup

- Initialize TypeScript project
- Configure environment
- Set up basic project structure
- Install core dependencies

### Phase 2: Core API Implementation

- Implement ProxMox API client
- Create type definitions for API responses
- Build node configuration loader
- Implement enhanced logging system

### Phase 3: Event System

- Create event subscription service
- Implement event processing
- Set up WebSocket server
- Build real-time data pipeline

### Phase 4: Metrics Collection

- Implement metrics normalization
- Create polling fallback for missing metrics
- Build short-term history storage
- Implement derived metrics calculation

### Phase 5: Node Management

- Create multi-node support
- Implement node discovery (if in cluster)
- Build node status tracking
- Create aggregated metrics view

### Phase 6: Frontend Development

- Create simple grid layout
- Implement WebSocket client
- Build real-time updates
- Create node selector

### Phase 7: Development Tools

- Implement enhanced logging
- Create development dashboard
- Add API explorer
- Build state visualization

### Phase 8: Containerization

- Create Docker configuration
- Set up environment variable passing
- Test container deployment

## API Type Definitions

The application should define TypeScript interfaces for:

1. **ProxmoxNodeStatus** - Node status information
2. **ProxmoxVM** - Virtual machine information
3. **ProxmoxContainer** - Container information
4. **ProxmoxGuest** - Union type of VM and Container
5. **ProxmoxEvent** - Event data structure
6. **MetricsData** - Normalized metrics format
7. **NodeConfig** - Node configuration structure

## Security Considerations

1. Keep API tokens in environment variables
2. Don't commit .env files with credentials
3. Use HTTPS for API communication
4. Consider read-only API tokens with minimal permissions
5. Validate all user inputs

## Development Context Helpers

1. **Configuration Validator and API Reference**:
   - **Purpose**: Provide a reliable reference for ProxMox API interactions
   - **Features**:
     - Validate environment configurations during startup
     - Test connectivity to all configured nodes
     - Sample and store actual API response structures for reference
     - Document endpoint patterns with examples
     - Create schema validators for request/response bodies
     - Generate TypeScript interfaces from actual API responses
     - Expose an endpoint that shows API structure for reference
     - Store successful API call patterns for the AI to reference
     - Cache sample responses for offline development
     - Provide helper functions to validate API calls before sending
     - Create a "cheat sheet" of common API patterns
   - **Implementation**:
     - Create a startup validation process that tests all endpoints
     - Build an in-memory reference database of API interactions
     - Expose `/dev/api-reference` endpoint with interactive documentation
     - Log all successful API interactions for pattern recognition
     - Create a validation library the AI can use to check its work

2. **Enhanced Logging**:
   - Include node ID, component, operation in logs
   - Different log levels (debug, info, warn, error)
   - Contextual error information
   - Log reference to successful patterns when errors occur

3. **State Inspection**:
   - Endpoint to view current system state
   - Connection status visualization
   - Event subscription status
   - Configuration status and validation results

4. **API Explorer**:
   - Test API calls directly
   - View recent API calls and responses
   - Response visualization
   - Template library of working API calls
   - Side-by-side comparison of expected vs. actual responses

5. **Performance Monitoring**:
   - Track memory and CPU usage
   - Monitor event processing time
   - Connection statistics

## Docker Configuration

- Use Node.js Alpine image as base
- Multi-stage build for smaller image
- Expose configuration via environment variables
- Volume mounting for persistent data (if needed)
- Health check endpoint
