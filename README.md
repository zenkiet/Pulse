# ProxMox Pulse

A lightweight, responsive ProxMox monitoring application that displays real-time metrics for CPU, memory, network, and disk usage across multiple nodes.

## Features

- Real-time monitoring of ProxMox nodes, VMs, and containers
- Dashboard with summary cards for nodes, guests, and resources
- Responsive design that works on desktop and mobile
- WebSocket connection for live updates

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Install frontend dependencies:
   ```
   cd frontend && npm install && cd ..
   ```
4. Create a `.env` file based on the `.env.example` file

## Running the Application

The simplest way to run the application is to use one of these methods:

### Using the startup script directly

```bash
# Make the script executable (only needed once)
chmod +x start-pulse.sh

# Run the application
./start-pulse.sh
```

### Using npm

```bash
# Run the application
npm run pulse
```

### Using Docker

```bash
# Build the Docker image
docker build -t proxmox-pulse .

# Run the Docker container
docker run -p 3000:3000 -p 5173:5173 --env-file .env proxmox-pulse
```

This will:
1. Kill any existing server processes
2. Start the backend server in development mode
3. Start the frontend Vite server
4. Host the application at http://192.168.0.130:5173/

The application will show real-time metrics from your ProxMox servers configured in the .env file.

## Configuration

The application uses environment variables for configuration. You can create a `.env` file in the root directory with the following structure:

```
# Node 1
PROXMOX_NODE_1_NAME=Proxmox Node 1
PROXMOX_NODE_1_HOST=https://192.168.0.132:8006
PROXMOX_NODE_1_TOKEN_ID=root@pam!pulse
PROXMOX_NODE_1_TOKEN_SECRET=your-token-secret

# Node 2
PROXMOX_NODE_2_NAME=Proxmox Node 2
PROXMOX_NODE_2_HOST=https://192.168.0.141:8006
PROXMOX_NODE_2_TOKEN_ID=root@pam!pulse
PROXMOX_NODE_2_TOKEN_SECRET=your-token-secret

# App Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
ENABLE_DEV_TOOLS=true
METRICS_HISTORY_MINUTES=60
IGNORE_SSL_ERRORS=true
```

### Important Note on API Tokens

If your ProxMox API token ID contains special characters (like `!`, `?`, `&`, etc.), make sure your `.env` file has the correct format. The application handles this internally, but it's important for the configuration to be correct.

## Troubleshooting

If you're having trouble connecting to your ProxMox nodes, check the following:

1. **Network Connectivity**: Make sure you can reach the ProxMox host from your machine
2. **API Access**: Verify that the ProxMox API is accessible on the specified port
3. **API Token**: Ensure that your API token has the correct permissions and is properly formatted
4. **SSL Certificates**: If you're using self-signed certificates, make sure `IGNORE_SSL_ERRORS` is set to `true`

## License

This project is licensed under the MIT License - see the LICENSE file for details. 