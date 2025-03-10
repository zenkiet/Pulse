# Troubleshooting WebSocket Connection Issues

## Common Issue: "Connection error: websocket error"

If you're seeing a "Connection error: websocket error" message when accessing the Pulse web interface, it's typically because the browser is unable to establish a WebSocket connection to the Pulse server.

## Understanding the Problem

The most common cause of this issue is that the frontend JavaScript code is trying to connect to `ws://127.0.0.1:7654` (localhost) instead of using the actual server IP address that you used to access the web interface.

This happens because:

1. When you access Pulse via `http://your-server-ip:7654` in your browser
2. The frontend code loads and tries to establish a WebSocket connection
3. If the connection URL is hardcoded to `127.0.0.1`, your browser will try to connect to itself rather than the Pulse server

## Solutions

### Solution 1: Remove VITE_API_URL from your .env file (Recommended)

The simplest solution is to **remove** the `VITE_API_URL` line from your `.env` file if it exists:

```
# Remove or comment out this line
# VITE_API_URL=http://192.168.x.x:7654
```

Without this setting, Pulse will automatically use the same host that you used to access the web interface, which is the correct behavior.

### Solution 2: Use Docker's Host Network Mode

If you're still experiencing issues, you can try using Docker's host network mode, which shares the host's network namespace with the container:

```yaml
services:
  pulse-app:
    # ... other settings ...
    network_mode: "host"
```

With this setting, the container will use the host's network directly, which can resolve some networking issues.

### Solution 3: Configure a Reverse Proxy

If you're using a reverse proxy (like Nginx or Apache), make sure it's properly configured to handle WebSocket connections:

#### Nginx Example:

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

#### Apache Example:

```apache
RewriteEngine On
RewriteCond %{REQUEST_URI}  ^/socket.io            [NC]
RewriteCond %{QUERY_STRING} transport=websocket    [NC]
RewriteRule /(.*)           ws://your-pulse-server:7654/$1 [P,L]

ProxyPass / http://your-pulse-server:7654/
ProxyPassReverse / http://your-pulse-server:7654/
```

## Debugging Tips

1. Open your browser's developer tools (F12)
2. Go to the Network tab and filter for "WS" or "WebSocket"
3. Reload the page and check what WebSocket URL is being used
4. Check for any errors in the Console tab

If you see the WebSocket trying to connect to `ws://127.0.0.1:7654` instead of your server's IP, that confirms the issue.

## Still Having Problems?

If you're still experiencing issues after trying these solutions, please provide the following information when reporting the problem:

1. Your browser's console log (F12 > Console tab)
2. The Docker logs: `docker logs pulse-app`
3. Your `.env` file (with sensitive information redacted)
4. Your Docker Compose configuration
5. Details about your network setup (are you accessing Pulse from the same network or remotely?) 