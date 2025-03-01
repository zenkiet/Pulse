# ProxMox Pulse

A lightweight, responsive ProxMox monitoring application that displays real-time metrics for CPU, memory, network, and disk usage across multiple nodes.

## Features

- Real-time monitoring of ProxMox nodes, VMs, and containers
- Dashboard with summary cards for nodes, guests, and resources
- Responsive design that works on desktop and mobile
- WebSocket connection for live updates

## Environment Variables

### Backend Environment Variables

The backend server uses the following environment variables, which can be set in the `.env` file:

- `PORT`: The port on which the server will run (default: 7654)
- `NODE_ENV`: Set to `production` for production or `development` for development
- `LOG_LEVEL`: Log level (`error`, `warn`, `info`, `debug`)
- `ENABLE_DEV_TOOLS`: Enable development tools (`true` or `false`)
- `IGNORE_SSL_ERRORS`: Whether to ignore SSL errors when connecting to ProxMox nodes
- `NODE_TLS_REJECT_UNAUTHORIZED`: Set to `0` to disable SSL certificate validation (not recommended for production)

### Frontend Environment Variables

The frontend can be configured using the following environment variables:

- `VITE_API_URL`: The URL of the backend API (defaults to the current origin if not specified)

### Security Considerations

- For development or internal networks, you can set `IGNORE_SSL_ERRORS=true` and `NODE_TLS_REJECT_UNAUTHORIZED=0`
- For production, set these to `false` and `1` respectively, and ensure proper SSL certificates are installed
- Setting these to `true` and `0` disables SSL certificate validation and is not secure for production environments

## Installation

### Standard Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Install frontend dependencies:
   ```
   cd frontend && npm install
   ```
4. Create a `.env` file based on the `.env.example` file
5. Run the application:
   ```
   npm run pulse
   ```
6. Access the application at http://localhost:9513

## Docker Deployment

### Using Docker Compose (Recommended)

1. Clone the repository
2. Copy the example environment file and configure it:
   ```
   cp .env.example .env
   ```
3. Edit the `.env` file with your ProxMox node details
4. Start the application in production mode:
   ```
   docker-compose up -d pulse
   ```
   Or in development mode:
   ```
   docker-compose up -d pulse-dev
   ```
5. Access the application at http://localhost:7654

### Using Docker Directly

1. Build and run the container:
   ```
   # For production
   docker build --target production -t proxmox-pulse:prod .
   docker run -d -p 7654:7654 --env-file .env --name proxmox-pulse proxmox-pulse:prod
   
   # For development
   docker build --target development -t proxmox-pulse:dev .
   docker run -d -p 7654:7654 -p 9513:9513 --env-file .env --name proxmox-pulse-dev proxmox-pulse:dev
   ```
2. Access the application at http://localhost:7654

### Docker Image Details

The Docker setup uses a multi-stage build approach with two main targets:

- **Production**: A lightweight image that runs the compiled application with minimal dependencies and runs as a non-root user for better security.
- **Development**: A more feature-rich image that includes all development dependencies and tools.

In production mode, the application will exit if startup checks fail (e.g., if it can't connect to your ProxMox nodes). In development mode, it will continue running with warnings, allowing you to troubleshoot connection issues.

## Configuration

The only configuration you need to provide is your ProxMox node details. Create a `.env` file in the root directory based on the `.env.example` file:

```
# ProxMox Node Configuration
# Replace with your ProxMox node details

# Node 1
PROXMOX_NODE_1_NAME=Proxmox Node 1
PROXMOX_NODE_1_HOST=https://proxmox.local:8006
PROXMOX_NODE_1_TOKEN_ID=root@pam!pulse
PROXMOX_NODE_1_TOKEN_SECRET=your-token-secret

# Node 2 (optional)
PROXMOX_NODE_2_NAME=Proxmox Node 2
PROXMOX_NODE_2_HOST=https://proxmox2.local:8006
PROXMOX_NODE_2_TOKEN_ID=root@pam!pulse
PROXMOX_NODE_2_TOKEN_SECRET=your-token-secret
```

### Advanced Configuration

You can customize the application further with these optional settings:

```
# App Configuration (usually you don't need to change these)
PORT=7654
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_DEV_TOOLS=true
METRICS_HISTORY_MINUTES=60
IGNORE_SSL_ERRORS=true
NODE_TLS_REJECT_UNAUTHORIZED=0

# Polling Intervals (in milliseconds)
NODE_POLLING_INTERVAL_MS=10000
EVENT_POLLING_INTERVAL_MS=2000
```

The `NODE_TLS_REJECT_UNAUTHORIZED=0` setting is particularly important when using self-signed certificates, as it tells Node.js to ignore SSL certificate validation errors. Note that this should only be used in development environments or when you trust your network, as it bypasses security checks.

### Important Note on API Tokens

If your ProxMox API token ID contains special characters (like `!`, `?`, `&`, etc.), make sure your `.env` file has the correct format. The application handles this internally, but it's important for the configuration to be correct.

## Troubleshooting

If you're having trouble connecting to your ProxMox nodes, check the following:

1. **Network Connectivity**: Make sure you can reach the ProxMox node from your machine
2. **API Access**: Verify that the ProxMox API is accessible on the specified port
3. **API Token**: Ensure that your API token has the correct permissions and is properly formatted
4. **SSL Certificates**: If you're using self-signed certificates, make sure both `IGNORE_SSL_ERRORS` is set to `true` and `NODE_TLS_REJECT_UNAUTHORIZED=0` is included in your `.env` file

### SSL Certificate Issues

When connecting to ProxMox nodes with self-signed certificates, you may encounter SSL verification errors. To resolve this:

1. Set `IGNORE_SSL_ERRORS=true` in your `.env` file
2. Add `NODE_TLS_REJECT_UNAUTHORIZED=0` to your `.env` file
3. When using Docker, ensure these environment variables are passed to the container using the `--env-file .env` flag

### Port Conflicts

If you encounter port conflicts when running the application:

1. Check for processes using the same ports:
   ```bash
   lsof -i :7654
   lsof -i :9513
   ```
2. Stop the conflicting processes or use different ports in your configuration
3. For Docker, you can map to different host ports:
   ```bash
   docker run -p 7655:7654 -p 9514:9513 --env-file .env proxmox-pulse
   ```
   Then access the application at http://localhost:7655

### Verifying the Application is Running

You can check if the application is running properly by accessing the health endpoint:

```bash
curl http://localhost:7654/api/health
```

This should return a JSON response like:
```json
{"success":true,"data":{"status":"ok","timestamp":1234567890123},"timestamp":1234567890123}
```

## License

This project is licensed under the MIT License - see the LICENSE file for details. 