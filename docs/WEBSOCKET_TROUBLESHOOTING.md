# WebSocket Connection Troubleshooting

## Issue Description

Users are experiencing WebSocket connection errors when accessing Pulse through Docker, particularly when the error message shows:
```
Connection error: websocket error
```

This typically occurs when the WebSocket connection cannot be established between the frontend and the backend, even though the application appears to load initially.

## Root Cause

The issue usually stems from one of these causes:

1. Incorrect WebSocket proxy configuration in a reverse proxy setup
2. Manual override of the API URL that doesn't properly handle WebSocket connections
3. Network configuration that blocks WebSocket traffic
4. Docker networking configuration that doesn't properly forward WebSocket connections

## Solution

### 1. Remove Manual API URL Configuration

If you've set `VITE_API_URL` in your `.env` file, remove it and let the application handle the WebSocket connection automatically. The application is designed to work without this configuration in most setups.

### 2. Update Docker Compose Configuration

Use this recommended `docker-compose.yml` configuration:

```yaml
version: '3'
services:
  pulse-app:
    image: rcourtman/pulse:1.3.1
    container_name: pulse-app
    ports:
      - "7654:7654"
    environment:
      - NODE_ENV=production
      - PROXMOX_NODE_1_NAME=PVE-001
      - PROXMOX_NODE_1_HOST=https://pve-001.home.local:8006
      - PROXMOX_NODE_1_TOKEN_ID=root@pam!pulse
      - PROXMOX_NODE_1_TOKEN_SECRET=your-token-secret
      - PROXMOX_NODE_2_NAME=PVE-002
      - PROXMOX_NODE_2_HOST=https://pve-002.home.local:8006
      - PROXMOX_NODE_2_TOKEN_ID=root@pam!pulse
      - PROXMOX_NODE_2_TOKEN_SECRET=your-token-secret
      - IGNORE_SSL_ERRORS=true
      - NODE_TLS_REJECT_UNAUTHORIZED=0
    restart: unless-stopped
```

### 3. Configure Reverse Proxy (if used)

If you're using a reverse proxy (like nginx) in front of Pulse, ensure it's configured to handle WebSocket connections properly.

#### Nginx Configuration

Add this to your nginx configuration:

```nginx
location /socket.io {
    proxy_pass http://your-pulse-server:7654;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}

location / {
    proxy_pass http://your-pulse-server:7654;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

#### Apache Configuration

If using Apache, add this to your configuration:

```apache
RewriteEngine On
RewriteCond %{REQUEST_URI}  ^/socket.io            [NC]
RewriteCond %{QUERY_STRING} transport=websocket    [NC]
RewriteRule /(.*)           ws://your-pulse-server:7654/$1 [P,L]

ProxyPass / http://your-pulse-server:7654/
ProxyPassReverse / http://your-pulse-server:7654/
```

### 4. Network Configuration

1. Ensure port 7654 is open for both TCP and WebSocket traffic
2. Check any firewalls or security groups to allow WebSocket connections
3. If using a container orchestration platform (like Kubernetes), ensure the service configuration allows WebSocket traffic

## Verification

To verify the WebSocket connection is working:

1. Open your browser's Developer Tools (F12)
2. Go to the Network tab
3. Filter for "WS" or "WebSocket"
4. Access your Pulse application
5. You should see a successful WebSocket connection to `/socket.io`

## Common Error Messages and Solutions

### Error: WebSocket connection failed
- Check if the WebSocket port is accessible
- Verify reverse proxy configuration
- Ensure no firewall is blocking WebSocket traffic

### Error: Connection timed out
- Check network connectivity
- Verify DNS resolution
- Ensure the backend service is running

### Error: Invalid WebSocket frame
- Check reverse proxy configuration
- Verify SSL/TLS settings if using HTTPS

## Still Having Issues?

If you're still experiencing WebSocket connection issues after trying these solutions:

1. Check the browser console for specific error messages
2. Review the Pulse application logs:
   ```bash
   docker logs pulse-app
   ```
3. Test direct WebSocket connectivity:
   ```bash
   websocat ws://your-server:7654/socket.io
   ```
4. Create an issue on the GitHub repository with:
   - Your environment details
   - Configuration files
   - Error messages
   - Steps to reproduce the issue 