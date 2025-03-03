# Pulse Development Tools

**⚠️ DEVELOPMENT USE ONLY ⚠️**

These tools are for development and testing purposes only. They are not part of the main Pulse application and should not be used in production environments.

## Mock Data Generator

This directory contains a tool for generating simulated data for the Pulse application. This is useful for development, testing, and creating documentation without needing a real Proxmox environment.

### Available Tools

1. **generate-mock-data.js** - Generates simulated data for the Pulse application
2. **debug-socket.js** - Debug proxy for troubleshooting socket communication
3. **debug-proxy.sh** - Runs the application with the debug proxy

### Quick Start

To use the mock data generator:

```bash
# Start the mock data server
node scripts/generate-mock-data.js

# In another terminal, start the frontend
cd frontend
VITE_API_URL=http://localhost:7655 npm run dev
```

The mock data server will run on port 7655 and provide simulated data to the frontend.

### Simulated Data

The generator creates:

- A single Proxmox node with realistic specifications
- 10 virtual machines with various configurations
- 10 containers with various configurations
- Realistic resource usage metrics that update every 2 seconds

The VMs and containers have:
- Different operating systems (Ubuntu, Debian, CentOS, Windows, etc.)
- Varying CPU, memory, and disk configurations
- Realistic network throughput
- A mix of running and stopped states

### Customizing the Data

You can modify the `generate-mock-data.js` script to change:

- The node specifications
- The number and types of VMs and containers
- The resource usage patterns
- The update frequency

### Troubleshooting

If you encounter issues with the socket communication, you can use the debug proxy:

```bash
./scripts/debug-proxy.sh
```

This will run the application with a debug proxy that logs all socket messages to `socket-debug.log`. 