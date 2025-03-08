# Running Screenshot Tool on Windows

This document explains how to use the screenshot automation tool on Windows systems.

## Prerequisites

1. Make sure you have Node.js and npm installed
2. PowerShell 5.0 or higher
3. All project dependencies installed (`npm install` in both root and frontend directories)

## Running the Screenshot Tool

The easiest way to run the screenshot tool on Windows is to use the provided npm script:

```powershell
npm run screenshots:win
```

This will:
1. Kill any existing servers on the required ports
2. Start the mock data server
3. Start the backend server
4. Start the frontend server
5. Run the screenshot tool with the default configuration
6. Save the screenshots to the `docs/images` directory
7. Clean up all processes when done

## Troubleshooting

### PowerShell Execution Policy

If you get an error about execution policy, you may need to allow script execution:

```powershell
# Run PowerShell as Administrator and execute:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port Conflicts

If you get errors about ports already in use:

1. Make sure no other instances of the application are running
2. Manually kill processes on the required ports:
   ```powershell
   npx kill-port 7654 7655 3000
   ```

### Server Startup Issues

If any of the servers fail to start:

1. Check the log files in your temp directory (`%TEMP%\pulse-*.log`)
2. Make sure all dependencies are installed
3. Try running each server manually to see specific error messages

### Screenshot Tool Issues

If the screenshot tool fails:

1. Navigate to the screenshot tool directory:
   ```powershell
   cd tools\screenshot-automation
   ```

2. Build the tool:
   ```powershell
   npm run build
   ```

3. Run it manually:
   ```powershell
   npm start -- --config ..\..\screenshot-config.json
   ```

## Manual Process

If you prefer to run each step manually:

1. Start the mock data server:
   ```powershell
   $env:NODE_ENV = "development"
   $env:USE_MOCK_DATA = "true"
   $env:MOCK_DATA_ENABLED = "true"
   npx ts-node src/mock/run-server.ts
   ```

2. In another terminal, start the backend server:
   ```powershell
   $env:USE_MOCK_DATA = "true"
   $env:MOCK_DATA_ENABLED = "true"
   npm run dev:server
   ```

3. In another terminal, start the frontend server:
   ```powershell
   $env:USE_MOCK_DATA = "true"
   $env:MOCK_DATA_ENABLED = "true"
   cd frontend
   npm run dev -- --host "0.0.0.0" --port 3000
   ```

4. In another terminal, run the screenshot tool:
   ```powershell
   cd tools\screenshot-automation
   npm run build
   npm start -- --config ..\..\screenshot-config.json
   ``` 