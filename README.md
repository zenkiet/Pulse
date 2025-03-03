# ProxMox Pulse

A lightweight, responsive ProxMox monitoring application that displays real-time metrics for CPU, memory, network, and disk usage across multiple nodes.

## Quick Start

### 💻 Development
```bash
# 1. Clone and install
git clone https://github.com/rcourtman/pulse.git
cd pulse
npm install
cd frontend && npm install && cd ..

# 2. Copy and edit .env
cp .env.example .env

# 3. Start development servers
./start-dev.sh

# 4. Open in browser
open http://localhost:3000  # or visit in your browser
```

### 🚀 Production
```bash
# Just want to run it? Use Docker:
docker run -d -p 7654:7654 --env-file .env --name pulse-app rcourtman/pulse:latest
```

## Features

- Real-time monitoring of ProxMox nodes, VMs, and containers
- Dashboard with summary cards for nodes, guests, and resources
- Responsive design that works on desktop and mobile
- WebSocket connection for live updates

## Screenshots

### Dashboard
![Dashboard](docs/images/dashboard.png)
*Main dashboard showing node overview and resource usage*

### Resource Details
![Resources](docs/images/resources.png)
*Detailed resource monitoring with real-time graphs*

### Mobile View
![Mobile](docs/images/mobile.png)
*Responsive mobile interface*

⚠️ Note: These screenshots are examples only. The actual interface may vary based on your ProxMox setup and version.

## Development

### Project Structure
```
pulse/
├── frontend/                # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Utility functions
│   │   └── styles/        # CSS and style files
│   ├── public/            # Static assets
│   └── package.json       # Frontend dependencies
│
├── src/                   # TypeScript backend application
│   ├── api/              # API route handlers
│   ├── proxmox/          # ProxMox API integration
│   ├── websocket/        # WebSocket server logic
│   ├── utils/            # Utility functions
│   └── server.ts         # Main server entry point
│
├── scripts/              # Development and utility scripts
├── .env.example         # Example environment variables
└── package.json         # Backend dependencies
```

### Development Mode
When running with `./start-dev.sh`:
- Frontend (Vite dev server): http://localhost:3000
- Backend (API + WebSocket): http://localhost:7654
- Hot-reloading enabled for both frontend and backend
- Source maps and detailed logging available
- Changes to code are reflected immediately

### Available Commands
```bash
# Development
npm run dev:start         # Start both frontend and backend (same as ./start-dev.sh)
npm run dev:kill:all     # Kill all development servers

# Testing
npm run test:startup     # Run startup checks
npm run test:api         # Test ProxMox API connection
npm run lint            # Run ESLint

# Building
npm run build          # Build the TypeScript backend
```

## Configuration

### Environment Variables
Create a `.env` file based on `.env.example`:

```bash
# Required: ProxMox Node Configuration
PROXMOX_NODE_1_NAME=Proxmox Node 1
PROXMOX_NODE_1_HOST=https://proxmox.local:8006
PROXMOX_NODE_1_TOKEN_ID=root@pam!pulse
PROXMOX_NODE_1_TOKEN_SECRET=your-token-secret

# Optional: Additional nodes
PROXMOX_NODE_2_NAME=Proxmox Node 2
PROXMOX_NODE_2_HOST=https://proxmox2.local:8006
PROXMOX_NODE_2_TOKEN_ID=root@pam!pulse
PROXMOX_NODE_2_TOKEN_SECRET=your-token-secret

# Development Settings (adjust as needed)
PORT=7654
NODE_ENV=development
LOG_LEVEL=debug
METRICS_HISTORY_MINUTES=60
NODE_POLLING_INTERVAL_MS=2000
EVENT_POLLING_INTERVAL_MS=1000
```

### ProxMox API Token Requirements
Your ProxMox API token needs these permissions:
- PVEAuditor role or custom role with:
  - Datastore.Audit
  - VM.Audit
  - Sys.Audit
  - Pool.Audit

## Troubleshooting

### Development Issues

#### Port Conflicts
```bash
# Kill all development servers and try again
npm run dev:kill:all
./start-dev.sh
```

#### Connection Issues
1. Verify your ProxMox node details in `.env`
2. Run `npm run test:api` to test the connection
3. Check if your ProxMox node is accessible
4. For SSL issues in development, set:
   ```
   IGNORE_SSL_ERRORS=true
   NODE_TLS_REJECT_UNAUTHORIZED=0
   ```

#### Hot Reload Not Working
1. Ensure you're using http://localhost:3000
2. Kill all servers and restart:
   ```bash
   npm run dev:kill:all
   ./start-dev.sh
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Set up development environment
4. Make your changes
5. Test thoroughly
6. Submit a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.