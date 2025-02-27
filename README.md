# ProxMox Pulse

A lightweight, responsive ProxMox monitoring application that displays real-time metrics for CPU, memory, network, and disk usage across multiple nodes.

## Features

- Real-time monitoring of ProxMox nodes, VMs, and containers
- Dashboard with summary cards for nodes, guests, and resources
- Responsive design that works on desktop and mobile
- WebSocket connection for real-time updates
- Development tools for easier debugging
- Configurable polling intervals for optimal performance

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on the `.env.example` file
4. Build the application:
   ```
   npm run build
   ```
5. Start the application:
   ```
   npm start
   ```

## Configuration

The application uses environment variables for configuration. You can create a `.env` file in the root directory with the following structure:

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
IGNORE_SSL_ERRORS=true

# Polling Intervals (in milliseconds)
NODE_POLLING_INTERVAL_MS=10000
EVENT_POLLING_INTERVAL_MS=2000
```

### Polling Intervals

The application uses polling to fetch data from ProxMox nodes:

- `NODE_POLLING_INTERVAL_MS`: How often to poll for node status, VMs, and containers (default: 10000ms)
- `EVENT_POLLING_INTERVAL_MS`: How often to poll for events (default: 2000ms)

The application also implements adaptive polling for events:
- When events are detected, polling frequency temporarily increases
- Quick follow-up polls occur 500ms after receiving events
- Polling frequency remains higher for 10 seconds after activity is detected

Decreasing these values will make the application more responsive but may increase server load. Increasing them will reduce server load but make updates less frequent.

### Important Note on API Tokens

If your ProxMox API token ID contains special characters (like `!`, `?`, `&`, etc.), you may encounter issues when using it in shell commands or other contexts. The application handles this internally, but if you're testing the connection manually, make sure to properly escape or quote the token ID.

For example, when using curl:

```bash
# INCORRECT - will cause issues with the ! character
curl -k -v -H "Authorization: PVEAPIToken=root@pam!pulse=your-token-secret" https://your-proxmox-host:8006/api2/json/version

# CORRECT - use single quotes around the token ID
curl -k -v -H "Authorization: PVEAPIToken='root@pam!pulse'=your-token-secret" https://your-proxmox-host:8006/api2/json/version
```

## Testing the Connection

The application includes a script to test the connection to your ProxMox nodes. This is useful for troubleshooting connection issues.

```bash
npm run test:connection
```

This script will:
1. Validate your configuration
2. Test the connection to each configured ProxMox node
3. Check for potential issues with your API tokens
4. Provide helpful error messages and suggestions if the connection fails

If you encounter connection issues, the script will provide detailed information about what went wrong and how to fix it.

## Development

To run the application in development mode:

```bash
npm run dev
```

This will start the application with hot reloading enabled.

### Development Tools

When `ENABLE_DEV_TOOLS` is set to `true`, the application provides additional endpoints for debugging:

- `/dev/api-reference`: API reference documentation
- `/dev/config`: Current configuration (with sensitive information redacted)
- `/dev/state`: Current application state
- `/dev/refresh/:nodeId`: Manually refresh data for a node

## Troubleshooting

### Connection Issues

If you're having trouble connecting to your ProxMox nodes, check the following:

1. **Network Connectivity**: Make sure you can reach the ProxMox host from the machine running the application.
   ```bash
   ping your-proxmox-host
   ```

2. **API Access**: Verify that the ProxMox API is accessible on the specified port.
   ```bash
   curl -k https://your-proxmox-host:8006/api2/json/version
   ```

3. **API Token**: Ensure that your API token has the correct permissions and is properly formatted.
   - If your token ID contains special characters, make sure to properly escape or quote it.
   - Run the connection test script to check for issues with your token:
     ```bash
     npm run test:connection
     ```

4. **SSL Certificates**: If you're using self-signed certificates, make sure `IGNORE_SSL_ERRORS` is set to `true`.

### Common Errors

- **Timeout**: The connection to the ProxMox API is timing out. Check your network configuration and firewall settings.
- **401 Unauthorized**: The API token is invalid or doesn't have the necessary permissions.
- **SSL Certificate Error**: The SSL certificate is not trusted. Set `IGNORE_SSL_ERRORS` to `true` or install a valid certificate.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 