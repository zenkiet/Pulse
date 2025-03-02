# ProxMox Pulse

[![Docker Pulls](https://img.shields.io/docker/pulls/rcourtman/pulse.svg)](https://hub.docker.com/r/rcourtman/pulse)

A lightweight, responsive ProxMox monitoring application that displays real-time metrics for CPU, memory, network, and disk usage across multiple nodes.

## Quick Start

### 🚀 Run with Docker (Production)
```bash
# 1. Create .env file with your ProxMox details
cat > .env << EOL
PROXMOX_NODE_1_NAME=My Proxmox
PROXMOX_NODE_1_HOST=https://proxmox.local:8006
PROXMOX_NODE_1_TOKEN_ID=root@pam!pulse
PROXMOX_NODE_1_TOKEN_SECRET=your-token-secret
EOL

# 2. Run the container
docker run -d -p 7654:7654 --env-file .env --name pulse-app rcourtman/pulse:latest

# 3. Open in browser
open http://localhost:7654  # or visit in your browser
```

### 💻 Development Setup
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

For detailed setup instructions, see the [Installation](#installation) section.

## Features

- Real-time monitoring of ProxMox nodes, VMs, and containers
- Dashboard with summary cards for nodes, guests, and resources
- Responsive design that works on desktop and mobile
- WebSocket connection for live updates
- Automatic version display linked to GitHub releases

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

## Project Structure

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
├── .github/             # GitHub Actions workflows
├── docker/              # Docker configuration files
├── .env.example         # Example environment variables
└── package.json         # Backend dependencies
```

### Key Components

#### Frontend
- Built with React and TypeScript
- Uses Vite for development server and building
- Styled with Tailwind CSS
- Real-time updates via WebSocket connection

#### Backend
- Node.js with Express
- TypeScript for type safety
- WebSocket server for real-time updates
- ProxMox API integration with error handling

#### Development Tools
- ESLint for code linting
- TypeScript for type checking
- Docker for production deployment
- GitHub Actions for CI/CD

## Development vs Production Modes

The application runs differently in development and production modes:

### Quick Reference

| Feature | Development Mode | Production Mode |
|---------|-----------------|-----------------|
| Start Command | `./start-dev.sh` or `npm run dev:start` | `docker-compose up -d pulse` |
| Frontend URL | http://localhost:3000 | http://localhost:7654 |
| Backend URL | http://localhost:7654 | http://localhost:7654 |
| Hot Reloading | Yes | No |
| Source Maps | Yes | No |
| Detailed Logging | Yes | No |
| Build Required | No | Yes |
| Best For | Local development, debugging | Deployment, production use |

### Development Mode
When running with `./start-dev.sh` or `npm run dev:start`:
- Frontend (Vite dev server): http://localhost:3000
- Backend (API + WebSocket): http://localhost:7654
- Frontend automatically proxies API/WebSocket requests to backend
- Hot-reloading enabled for both frontend and backend
- Source maps and detailed logging available
- Development tools and debugging features enabled
- Changes to code are reflected immediately

### Production Mode
When running with Docker or `NODE_ENV=production`:
- Everything runs on a single port: http://localhost:7654
- Backend serves the built frontend files directly
- No development servers or hot-reloading
- Optimized for performance and security
- Minimal dependencies and logging
- Requires a build step before deployment

## Versioning

The application version displayed in the header is automatically updated when a new GitHub release is created. This is handled by a GitHub Actions workflow that:

1. Updates the version in the source code when a release is published
2. Updates the package.json files to match the release version
3. Commits and pushes these changes back to the repository

For more details on how to create releases, see the [workflow documentation](.github/workflows/README.md).

## Environment Variables

### Backend Environment Variables

The backend server uses the following environment variables, which can be set in the `.env` file:

#### Common Settings
- `PORT`: The port on which the server will run (default: 7654)
- `NODE_ENV`: Set to `production` for production or `development` for development
- `METRICS_HISTORY_MINUTES`: How many minutes of metrics history to keep (default: 60)
- `NODE_POLLING_INTERVAL_MS`: How often to poll nodes for updates (default: 10000)
- `EVENT_POLLING_INTERVAL_MS`: How often to poll for events (default: 2000)

#### Development-only Settings
- `LOG_LEVEL`: Log level (`error`, `warn`, `info`, `debug`) - defaults to `debug` in development
- `ENABLE_DEV_TOOLS`: Enable development tools (`true` or `false`) - defaults to `true` in development
- `IGNORE_SSL_ERRORS`: Whether to ignore SSL errors when connecting to ProxMox nodes - defaults to `true` in development
- `NODE_TLS_REJECT_UNAUTHORIZED`: Set to `0` to disable SSL certificate validation - defaults to `0` in development

#### Production-only Settings
- `LOG_LEVEL`: Log level (`error`, `warn`, `info`, `debug`) - defaults to `error` in production
- `ENABLE_DEV_TOOLS`: Enable development tools (`true` or `false`) - defaults to `false` in production
- `IGNORE_SSL_ERRORS`: Whether to ignore SSL errors when connecting to ProxMox nodes - defaults to `false` in production
- `NODE_TLS_REJECT_UNAUTHORIZED`: Set to `1` to enable SSL certificate validation - defaults to `1` in production

### Frontend Environment Variables

The frontend can be configured using the following environment variables:

#### Development Mode
- `VITE_API_URL`: The URL of the backend API (defaults to `http://localhost:7654` in development)

#### Production Mode
- `VITE_API_URL`: The URL of the backend API (defaults to the current origin in production)

### Security Considerations

#### Development Mode
For development or internal networks, the default settings are:
```
LOG_LEVEL=debug
ENABLE_DEV_TOOLS=true
IGNORE_SSL_ERRORS=true
NODE_TLS_REJECT_UNAUTHORIZED=0
```

#### Production Mode
For production deployments, the recommended secure settings are:
```
LOG_LEVEL=error
ENABLE_DEV_TOOLS=false
IGNORE_SSL_ERRORS=false
NODE_TLS_REJECT_UNAUTHORIZED=1
```

⚠️ **Important**: Never use development security settings in production, as they disable important security features.

## Prerequisites

### Development Requirements
- Node.js 18 or higher
- npm 8 or higher
- Git
- Access to a ProxMox server
- A ProxMox API token with appropriate permissions

### Production Requirements
- Docker Engine 20.10.0 or higher
- Docker Compose v2.0.0 or higher (if using docker-compose)
- Access to a ProxMox server
- A ProxMox API token with appropriate permissions
- Valid SSL certificates (recommended)

### ProxMox API Token Requirements
Your ProxMox API token needs the following permissions:
- PVEAuditor role or custom role with:
  - Datastore.Audit
  - VM.Audit
  - Sys.Audit
  - Pool.Audit

## Compatibility

### Tested Environments

#### ProxMox VE Versions
- Fully tested on ProxMox VE 7.x and 8.x
- Should work with ProxMox VE 6.x (not actively tested)
- Earlier versions are not supported

#### Operating Systems
- Linux (Ubuntu 20.04+, Debian 11+)
- macOS (Monterey 12.0+)
- Windows 10/11 with WSL2

#### Browsers
- Chrome/Chromium 90+
- Firefox 90+
- Safari 15+
- Edge 90+

#### Container Platforms
- Docker 20.10.0+
- Podman 3.0+ (experimental)
- Kubernetes 1.20+ (with appropriate volume mounts)

### Known Limitations
- Internet Explorer is not supported
- Mobile browsers have limited functionality
- Some features may not work with ProxMox VE 6.x
- WebSocket connections may be blocked by some corporate firewalls

## Installation

### Development Setup

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
5. Start the development server:
   ```
   ./start-dev.sh
   ```
6. Access the application at http://localhost:3000

### Development Tools

The following npm scripts are available for development:

```bash
# Start the application in development mode
npm run dev:start         # Starts both frontend and backend (same as ./start-dev.sh)
npm run dev:frontend      # Start only the frontend dev server
npm run dev:server        # Start only the backend dev server

# Development utilities
npm run dev:kill:all     # Kill all development servers
npm run dev:kill:frontend # Kill only the frontend dev server
npm run dev:kill:backend  # Kill only the backend dev server

# Testing and validation
npm run test:startup     # Run startup checks
npm run test:api         # Test ProxMox API connection
npm run lint            # Run ESLint

# Production build
npm run build          # Build the TypeScript backend
```

#### Release Process

A release script is provided to automate the process of creating new releases. The script handles:

- Version bumping (patch, minor, or major)
- Updating version in all relevant files
- Git tagging and pushing
- Docker image building and pushing
- GitHub release creation

To create a new release:

```bash
# Create a new patch release (1.0.x → 1.0.x+1)
./scripts/release.sh

# Create a new minor release (1.x.0 → 1.x+1.0)
./scripts/release.sh -t minor

# Create a new major release (x.0.0 → x+1.0.0)
./scripts/release.sh -t major

# Show all available options
./scripts/release.sh --help
```

The script will prompt for confirmation before making any changes and will check for uncommitted changes before proceeding.

These commands are particularly useful when:
- You need to restart specific components
- You're debugging connection issues
- You want to validate your ProxMox API configuration
- You're preparing for production deployment

### Production Setup with Docker

1. Clone the repository
2. Copy the example environment file and configure it:
   ```
   cp .env.example .env
   ```
3. Edit the `.env` file with your ProxMox node details
4. Start the application:
   ```
   docker-compose up -d pulse
   ```
5. Access the application at http://localhost:7654

### Quick Start with Docker Hub

The easiest way to get started with Pulse is to use the pre-built Docker image:

1. Create a `.env` file with your ProxMox node details (see Configuration section)
2. Run the container:
   ```bash
   docker run -d -p 7654:7654 --env-file .env --name pulse-app rcourtman/pulse:latest
   ```
3. Access the application at http://localhost:7654

## Docker Details

The Docker setup uses a production-optimized build that:
- Runs the compiled application with minimal dependencies
- Runs as a non-root user for better security
- Serves both frontend and backend on port 7654
- Exits if startup checks fail (e.g., if it can't connect to your ProxMox nodes)

For development, use `./start-dev.sh` instead of Docker, as it provides:
- Hot-reloading of both frontend and backend
- Source maps for better debugging
- Development tools and detailed logging
- Immediate reflection of code changes

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

## Troubleshooting

### Common Development Issues

#### Port Conflicts
If you see "Port already in use" errors:
1. Use `npm run dev:kill:all` to stop all development servers
2. Check if any other applications are using ports 3000 or 7654
3. Restart the development server with `npm run dev:start`

#### Connection Issues
If you see connection errors:
1. Verify your ProxMox node details in `.env` are correct
2. Run `npm run test:api` to test the ProxMox API connection
3. Check if your ProxMox node is accessible from your machine
4. For SSL issues, ensure `IGNORE_SSL_ERRORS` and `NODE_TLS_REJECT_UNAUTHORIZED` are set correctly for your environment

#### Hot Reload Not Working
1. Ensure you're accessing the frontend via http://localhost:3000 in development
2. Check if both frontend and backend servers are running (`npm run dev:start` starts both)
3. Clear your browser cache and reload the page

### Common Production Issues

#### Docker Container Not Starting
1. Check container logs: `docker logs pulse-app`
2. Verify your `.env` file is properly mounted
3. Ensure port 7654 is not in use by another application
4. Run `docker-compose logs pulse` to see detailed logs

#### SSL/TLS Issues
1. For production, ensure you have valid SSL certificates
2. Set `IGNORE_SSL_ERRORS=false` and `NODE_TLS_REJECT_UNAUTHORIZED=1`
3. If using self-signed certificates, they must be properly installed and trusted

#### Version Mismatch
If the displayed version doesn't match the latest release:
1. Pull the latest Docker image: `docker pull rcourtman/pulse:latest`
2. Restart the container with the new image
3. Clear your browser cache

For additional support or unresolved issues, please open an issue on the [GitHub repository](https://github.com/rcourtman/pulse/issues).

## Contributing

We welcome contributions from the community! Here's how you can help:

### Development Workflow

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Set up your development environment:
   ```bash
   npm install
   cd frontend && npm install
   ```
4. Make your changes following our coding standards:
   - Use TypeScript for type safety
   - Follow ESLint rules (`npm run lint`)
   - Add comments for complex logic
   - Update tests if applicable

5. Test your changes:
   - Run the application in development mode
   - Test both frontend and backend functionality
   - Verify changes in both development and production modes

6. Submit a Pull Request:
   - Provide a clear description of the changes
   - Reference any related issues
   - Include screenshots for UI changes
   - Ensure all checks pass

### Code Style Guidelines

- Use TypeScript for all new code
- Follow the existing project structure
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep components and functions focused and small
- Write self-documenting code where possible

### Reporting Issues

When reporting issues, please include:
- Your environment details (OS, Node.js version, etc.)
- Steps to reproduce the issue
- Expected vs actual behavior
- Relevant error messages and logs
- Screenshots if applicable

## Performance Tuning

### Polling Intervals
Adjust these settings in your `.env` file based on your needs:
```bash
# Increase intervals to reduce server load
NODE_POLLING_INTERVAL_MS=30000    # Default: 10000 (10 seconds)
EVENT_POLLING_INTERVAL_MS=5000    # Default: 2000 (2 seconds)

# Reduce metrics history for lower memory usage
METRICS_HISTORY_MINUTES=30        # Default: 60 minutes
```

### Resource Usage Guidelines
- Memory usage scales with:
  - Number of ProxMox nodes
  - Number of VMs/containers
  - Metrics history length
  - Polling frequency

### Optimization Tips
1. **High-Traffic Environments**:
   - Increase polling intervals
   - Reduce metrics history
   - Use a reverse proxy with caching
   - Consider running multiple instances

2. **Low-Resource Environments**:
   - Reduce WebSocket connections
   - Minimize browser connections
   - Use production mode
   - Optimize Docker container resources

3. **Large Clusters**:
   - Monitor resource usage
   - Adjust Node.js memory limits
   - Consider horizontal scaling
   - Use load balancing

### Docker Resource Limits
Example `docker-compose.yml` with optimized settings:
```yaml
services:
  pulse:
    image: rcourtman/pulse:latest
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    environment:
      NODE_OPTIONS: "--max-old-space-size=256"
```

## Security Best Practices

### API Token Security
- Create a dedicated API token for Pulse with minimal permissions (PVEAuditor only)
- Never use root tokens or tokens with write permissions
- Rotate API tokens periodically
- Use environment variables or secrets management in production
- Never commit API tokens to version control

### Network Security
- Run behind a reverse proxy in production
- Use HTTPS for all ProxMox connections
- Enable SSL certificate validation in production
- Restrict access to the dashboard using network controls
- Consider using VPN for remote access

### Docker Security
- Never run the container as root
- Keep the Docker image updated
- Use Docker secrets or environment files for sensitive data
- Regularly update base images and dependencies
- Scan container images for vulnerabilities

### Development Security
- Keep all dependencies updated
- Run `npm audit` regularly
- Use `.env.example` without real credentials
- Never expose development ports to the internet
- Use different API tokens for development and production

⚠️ **Important Security Notes**:
1. This tool is for monitoring only and should never have write access to your ProxMox cluster
2. Development security settings (`IGNORE_SSL_ERRORS=true`) bypass important security checks
3. Always validate SSL certificates in production environments
4. Restrict access to the monitoring interface to trusted networks/users

## Monitoring and Maintenance

### Health Checks

#### Application Health
Monitor these indicators for application health:
```bash
# Check application status
curl http://localhost:7654/health

# Check WebSocket connectivity
curl http://localhost:7654/health/ws

# Verify ProxMox connectivity
npm run test:api
```

#### Container Health
For Docker deployments:
```bash
# View container status
docker ps -a | grep pulse-app

# Check container health
docker inspect pulse-app | grep Health

# View resource usage
docker stats pulse-app

# Check container logs
docker logs -f --tail 100 pulse-app
```

### Regular Maintenance

#### Weekly Tasks
1. Check for updates:
   ```bash
   docker pull rcourtman/pulse:latest
   ```
2. Review logs for errors
3. Verify API token permissions
4. Monitor resource usage trends

#### Monthly Tasks
1. Rotate API tokens
2. Update SSL certificates if needed
3. Review security settings
4. Backup configuration files

#### Update Procedure
1. Backup your configuration:
   ```bash
   cp .env .env.backup
   ```
2. Pull latest version:
   ```bash
   docker pull rcourtman/pulse:latest
   ```
3. Stop current container:
   ```bash
   docker stop pulse-app
   docker rm pulse-app
   ```
4. Start new container:
   ```bash
   docker run -d -p 7654:7654 --env-file .env --name pulse-app rcourtman/pulse:latest
   ```
5. Verify application status:
   ```bash
   curl http://localhost:7654/health
   ```

### Logging

#### Log Levels
Configure logging based on your needs:
```bash
# Production (minimal logging)
LOG_LEVEL=error

# Debugging (detailed logging)
LOG_LEVEL=debug
```

#### Log Rotation
For production deployments, configure log rotation:
```bash
# Docker log rotation
docker run -d \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  --name pulse-app \
  rcourtman/pulse:latest
```

### Backup and Recovery

#### Configuration Backup
Regularly backup these files:
- `.env` file
- `docker-compose.yml`
- Custom SSL certificates
- Any custom configurations

#### Recovery Procedure
1. Stop the container:
   ```bash
   docker stop pulse-app
   ```
2. Restore configuration:
   ```bash
   cp .env.backup .env
   ```
3. Restart with backup config:
   ```bash
   docker start pulse-app
   ```

## Support

If you encounter any issues or have questions, please open an issue on the [GitHub repository](https://github.com/rcourtman/pulse/issues).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to the ProxMox team for their excellent virtualization platform
- All contributors who have helped improve this project