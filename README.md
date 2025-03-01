# ProxMox Pulse

[![Docker Pulls](https://img.shields.io/docker/pulls/rcourtman/pulse.svg)](https://hub.docker.com/r/rcourtman/pulse)

A lightweight, responsive ProxMox monitoring application that displays real-time metrics for CPU, memory, network, and disk usage across multiple nodes.

## Features

- Real-time monitoring of ProxMox nodes, VMs, and containers
- Dashboard with summary cards for nodes, guests, and resources
- Responsive design that works on desktop and mobile
- WebSocket connection for live updates
- Automatic version display linked to GitHub releases

## Versioning

The application version displayed in the header is automatically updated when a new GitHub release is created. This is handled by a GitHub Actions workflow that:

1. Updates the version in the source code when a release is published
2. Updates the package.json files to match the release version
3. Commits and pushes these changes back to the repository

For more details on how to create releases, see the [workflow documentation](.github/workflows/README.md).

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

### Quick Start with Docker Hub

The easiest way to get started with Pulse is to use the pre-built Docker image:

1. Create a `.env` file with your ProxMox node details (see Configuration section)
2. Run the container:
   ```bash
   docker run -d -p 7654:7654 --env-file .env --name pulse-app rcourtman/pulse:latest
   ```
3. Access the application at http://localhost:7654

#### Using Docker Compose with Docker Hub

For a more robust setup with Docker Compose:

1. Create a `.env` file with your ProxMox node details
2. Run using the provided Docker Compose file:
   ```bash
   docker-compose -f docker-compose.hub.yml up -d
   ```
3. Access the application at http://localhost:7654

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

If your ProxMox API token ID contains special characters (like `!`, `@`, or `%`), make sure to properly encode them in your environment variables. In some cases, you may need to escape these characters or enclose the entire token ID in quotes.

For example:
```
PROXMOX_NODE_1_TOKEN_ID="root@pam!pulse"
```

## Support

If you encounter any issues or have questions, please open an issue on the [GitHub repository](https://github.com/rcourtman/pulse/issues).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to the ProxMox team for their excellent virtualization platform
- All contributors who have helped improve this project