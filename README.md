# ProxMox Pulse

A lightweight, responsive ProxMox monitoring application that displays real-time metrics for CPU, memory, network, and disk usage across multiple nodes.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/rcourtman)

![Dashboard](docs/images/dashboard.png)
*Main dashboard showing node overview and resource usage*

## 📑 Table of Contents
- [Quick Start with Docker](#-quick-start-with-docker)
- [Configuration](#-configuration)
- [Common Docker Commands](#️-common-docker-commands)
- [Features](#-features)
- [Troubleshooting](#-troubleshooting)
- [Advanced Configuration](#-advanced-configuration)
- [Development](#-development)
  - [Development Architecture](#development-architecture)
  - [Screenshot Automation](#screenshot-automation)
  - [Developer Documentation](#developer-documentation)
- [System Requirements](#-system-requirements)
- [Version Information](#-version-information)
- [Contributing](#-contributing)
- [Support](#-support)
- [License](#-license)

## 🚀 Quick Start with Docker

### Option 1: Simple Docker Run

```bash
# 1. Download the example environment file
curl -O https://raw.githubusercontent.com/rcourtman/pulse/main/.env.example
mv .env.example .env

# 2. Edit the .env file with your ProxMox details
nano .env  # or use your preferred editor

# 3. Run with Docker
docker run -d \
  -p 7654:7654 \
  --env-file .env \
  --name pulse-app \
  --restart unless-stopped \
  rcourtman/pulse:latest

# 4. Access the application
# Open http://localhost:7654 in your browser
# If running on a remote server, use http://server-ip:7654
```

### Option 2: Docker Compose

```bash
# 1. Download the example files
curl -O https://raw.githubusercontent.com/rcourtman/pulse/main/.env.example
curl -O https://raw.githubusercontent.com/rcourtman/pulse/main/docker-compose.yml
mv .env.example .env

# 2. Edit the .env file with your ProxMox details
nano .env  # or use your preferred editor

# 3. Run with Docker Compose
docker compose up -d  # Note: newer Docker versions use 'docker compose' (no hyphen)

# 4. Access the application
# Open http://localhost:7654 in your browser
# If running on a remote server, use http://server-ip:7654
```

## 🔧 Configuration

### Required Environment Variables

Edit your `.env` file with at least these settings:

```bash
# Required: ProxMox Node Configuration
PROXMOX_NODE_1_NAME=Proxmox Node 1
PROXMOX_NODE_1_HOST=https://proxmox.local:8006
PROXMOX_NODE_1_TOKEN_ID=root@pam!pulse
PROXMOX_NODE_1_TOKEN_SECRET=your-token-secret
```

### ProxMox API Token Requirements

Your ProxMox API token needs these permissions:
- PVEAuditor role or custom role with:
  - Datastore.Audit
  - VM.Audit
  - Sys.Audit
  - Pool.Audit

### Creating a ProxMox API Token

#### Option 1: Quick Command (Convenient but less secure)

You can run this command either by SSH'ing into your ProxMox server or by using the Shell console in the ProxMox web UI (Datacenter → Shell):

```bash
# This creates a token named 'pulse' to match the example in the .env file
pveum user token add root@pam pulse --privsep=0 && \
pveum acl modify / -user root@pam -role PVEAuditor && \
pveum user token list root@pam
```

⚠️ **Why this is less secure:**
- Uses the root account (best practice is to use a dedicated user)
- **Disables** privilege separation with `--privsep=0` (privilege separation restricts token permissions)
- Grants access to all resources (/)
- Outputs the token secret to the terminal (could be logged)

#### Option 2: Step-by-Step Guide (More secure)

1. **Log in to the ProxMox web interface**

2. **Create a dedicated user** (optional but recommended)
   - Go to Datacenter → Permissions → Users
   - Click "Add"
   - Enter a username (e.g., "pulse-monitor")
   - Set a password and enable the user

3. **Create an API token**
   - Go to Datacenter → Permissions → API Tokens
   - Click "Add"
   - Select your user (e.g., "pulse-monitor@pam" or "root@pam")
   - Enter a token ID (e.g., "pulse")
   - Leave "Privilege Separation" checked for better security (this restricts the token to only use permissions explicitly granted to it)
   - Click "Add"
   - **Important:** Save the displayed token value securely - it will only be shown once!

4. **Assign permissions**
   - Go to Datacenter → Permissions → Add
   - Path: /
   - User: Your user (e.g., "pulse-monitor@pam")
   - Role: PVEAuditor
   - Click "Add"

5. **Update your .env file**
   ```
   # If using root user (matching the quick command example)
   PROXMOX_NODE_1_TOKEN_ID=root@pam!pulse
   PROXMOX_NODE_1_TOKEN_SECRET=your-saved-token-value
   
   # OR if using a dedicated user (recommended for better security)
   PROXMOX_NODE_1_TOKEN_ID=pulse-monitor@pam!pulse
   PROXMOX_NODE_1_TOKEN_SECRET=your-saved-token-value
   ```

## 🛠️ Common Docker Commands

```bash
# View logs
docker logs pulse-app

# Restart the application
docker restart pulse-app

# Update to latest version
docker pull rcourtman/pulse:latest
docker rm -f pulse-app
docker run -d -p 7654:7654 --env-file .env --name pulse-app --restart unless-stopped rcourtman/pulse:latest

# For Docker Compose users
docker compose pull  # Pull latest image
docker compose up -d  # Restart with new image
```

## ✨ Features

- Real-time monitoring of ProxMox nodes, VMs, and containers
- Dashboard with summary cards for nodes, guests, and resources
- Responsive design that works on desktop and mobile
- WebSocket connection for live updates

## ❓ Troubleshooting

1. **Connection Issues**: Verify your ProxMox node details in `.env`
2. **SSL Problems**: Add these to your .env file:
   ```
   IGNORE_SSL_ERRORS=true
   NODE_TLS_REJECT_UNAUTHORIZED=0
   ```
3. **Port Conflicts**: Change the port mapping in your docker run command if port 7654 is already in use
4. **API Token Issues**: Ensure your token has the correct permissions (PVEAuditor role)

## 📋 Advanced Configuration

For multiple ProxMox nodes or advanced settings, add these to your `.env`:

```bash
# Additional nodes
PROXMOX_NODE_2_NAME=Proxmox Node 2
PROXMOX_NODE_2_HOST=https://proxmox2.local:8006
PROXMOX_NODE_2_TOKEN_ID=root@pam!pulse
PROXMOX_NODE_2_TOKEN_SECRET=your-token-secret

# App Configuration
PORT=7654
LOG_LEVEL=info
METRICS_HISTORY_MINUTES=60
NODE_POLLING_INTERVAL_MS=1000
EVENT_POLLING_INTERVAL_MS=1000
```

## 🧑‍💻 Development

If you're developing Pulse, you can use the development server:

```bash
# Clone the repository
git clone https://github.com/rcourtman/pulse.git
cd pulse

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Start the development server
./start-dev.sh
```

⚠️ **Warning**: The `start-dev.sh` script performs the following actions:
- Stops any running Docker containers with "pulse" in their name
- Kills any running Node.js processes serving the application
- Frees ports 7654 and 3000 by terminating processes using them
- Sets NODE_ENV to development
- Starts both backend and frontend development servers

### Development Architecture

Pulse uses a split architecture for development:
- **Backend server** (port 7654): Node.js Express server that communicates with ProxMox
- **Frontend server** (port 3000): Vite development server for the React frontend

This separation provides several benefits:
- **Hot Module Replacement (HMR)**: Changes to frontend code are instantly reflected without a full page reload
- **Independent development**: Backend and frontend can be developed and tested separately
- **API isolation**: Clear separation between data services and UI components

When you run `start-dev.sh`, both servers start automatically:
1. The backend server runs on port 7654 and handles all ProxMox API communication
2. The frontend development server runs on port 3000 with hot reloading enabled
3. API requests from the frontend are proxied to the backend

In production, these are combined into a single service running on port 7654.

### Screenshot Automation

Pulse includes a fully self-contained screenshot automation tool to keep documentation images up-to-date with the latest UI changes. This tool can:

- Capture screenshots of any page in the application
- Create split-view images showing both light and dark modes
- Crop specific regions for feature highlights
- Automatically save images to the docs/images directory

To update screenshots:

```bash
# From the project root
npm run screenshots
```

**Note:** The screenshot tool is fully self-contained - it will automatically start the server with mock data enabled if needed, take all the screenshots, and then clean up by stopping any servers it started. This ensures a clean and consistent environment for generating documentation images.

For more information, see the [Screenshot Documentation](docs/SCREENSHOTS.md).

### Developer Documentation

For more detailed information about the codebase structure, key components, and design decisions, please refer to the [Developer Documentation](docs/DEVELOPER.md).

The development server will be accessible at:
- http://localhost:3000 - from the local machine
- http://your-ip-address:3000 - from other devices on your network

## 💻 System Requirements

- **Docker**: Version 20.10.0 or higher
- **Memory**: Minimum 256MB RAM (512MB recommended)
- **CPU**: Any modern CPU (1+ cores)
- **Disk Space**: Approximately 100MB for the Docker image
- **Network**: Connectivity to your ProxMox server(s)
- **Browser**: Any modern browser (Chrome, Firefox, Safari, Edge)

## 🔄 Version Information

Current version: 1.2.1

To check for updates:
```bash
# Check for newer image versions
docker pull rcourtman/pulse:latest

# View current running version
docker exec pulse-app cat /app/package.json | grep version
```

## 👥 Contributing

Contributions are welcome! Here's how you can contribute:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add some amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

Please make sure to update tests as appropriate and follow the code style of the project.

For more detailed information about contributing, please see our [Contributing Guidelines](CONTRIBUTING.md).

### Reporting Issues

When reporting issues, please use the appropriate issue template:
- [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) - for reporting bugs or unexpected behavior
- [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) - for suggesting new features or improvements

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ❤️ Support

If you find Pulse helpful, please consider supporting its development through Ko-fi. Your support helps keep this project maintained and free for everyone!

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/rcourtman)