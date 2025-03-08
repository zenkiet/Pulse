# ProxMox Pulse Screenshot Generator for Windows
# Automates the process of generating screenshots for documentation
# by starting required servers with mock data and running the screenshot tool.

# Get the project root directory
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# Process tracking variables
$MockServerProcess = $null
$BackendProcess = $null
$FrontendProcess = $null

# Cleanup function to ensure all processes are stopped
function Cleanup {
    Write-Host "🧹 Cleaning up processes..."
    
    if ($FrontendProcess -ne $null) {
        Write-Host "Stopping frontend server..."
        Stop-Process -Id $FrontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    if ($BackendProcess -ne $null) {
        Write-Host "Stopping backend server..."
        Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    if ($MockServerProcess -ne $null) {
        Write-Host "Stopping mock server..."
        Stop-Process -Id $MockServerProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host "Killing any remaining processes..."
    # Kill any processes that might be using the ports
    npx kill-port 7654 7655 3000 -ErrorAction SilentlyContinue
}

# Set up cleanup trap
try {
    # Ensure clean environment
    Write-Host "🔪 Killing any existing servers..."
    npx kill-port 7654 7655 3000 -ErrorAction SilentlyContinue

    # Start required services
    Write-Host "🚀 Starting mock data server..."
    $env:NODE_ENV = "development"
    $env:USE_MOCK_DATA = "true"
    $env:MOCK_DATA_ENABLED = "true"
    
    # Start the mock server
    $MockServerProcess = Start-Process -FilePath "npx" -ArgumentList "ts-node", "src/mock/run-server.ts" -WorkingDirectory $ProjectRoot -PassThru -NoNewWindow -RedirectStandardOutput "$env:TEMP\pulse-mock-server.log" -RedirectStandardError "$env:TEMP\pulse-mock-server-error.log"
    Write-Host "Mock server started with PID: $($MockServerProcess.Id)"
    Start-Sleep -Seconds 5

    # Check if mock server is running
    if ($MockServerProcess.HasExited) {
        Write-Host "❌ Error: Mock data server failed to start"
        Get-Content "$env:TEMP\pulse-mock-server.log"
        Get-Content "$env:TEMP\pulse-mock-server-error.log"
        exit 1
    }

    Write-Host "🚀 Starting backend server..."
    $env:USE_MOCK_DATA = "true"
    $env:MOCK_DATA_ENABLED = "true"
    $BackendProcess = Start-Process -FilePath "npx" -ArgumentList "ts-node-dev", "--respawn", "--transpile-only", "src/server.ts" -WorkingDirectory $ProjectRoot -PassThru -NoNewWindow -RedirectStandardOutput "$env:TEMP\pulse-backend.log" -RedirectStandardError "$env:TEMP\pulse-backend-error.log"
    Write-Host "Backend server started with PID: $($BackendProcess.Id)"
    Start-Sleep -Seconds 8

    # Check if backend server is running
    if ($BackendProcess.HasExited) {
        Write-Host "❌ Error: Backend server failed to start"
        Get-Content "$env:TEMP\pulse-backend.log"
        Get-Content "$env:TEMP\pulse-backend-error.log"
        exit 1
    }

    Write-Host "🚀 Starting frontend server..."
    $env:USE_MOCK_DATA = "true"
    $env:MOCK_DATA_ENABLED = "true"
    $FrontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000" -WorkingDirectory "$ProjectRoot\frontend" -PassThru -NoNewWindow -RedirectStandardOutput "$env:TEMP\pulse-frontend.log" -RedirectStandardError "$env:TEMP\pulse-frontend-error.log"
    Write-Host "Frontend server started with PID: $($FrontendProcess.Id)"

    # Wait for services to be ready
    Write-Host "⏳ Waiting for servers to start..."
    Start-Sleep -Seconds 15

    # Verify services are running correctly
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    } catch {
        Write-Host "❌ Error: Frontend server is not running on port 3000"
        Get-Content "$env:TEMP\pulse-frontend.log"
        Get-Content "$env:TEMP\pulse-frontend-error.log"
        Cleanup
        exit 1
    }

    # Check if mock data server is responding
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:7655/status" -UseBasicParsing -TimeoutSec 5
    } catch {
        Write-Host "❌ Error: Mock data server is not responding on port 7655"
        Get-Content "$env:TEMP\pulse-mock-server.log"
        Get-Content "$env:TEMP\pulse-mock-server-error.log"
        Cleanup
        exit 1
    }

    # Check if backend is using mock data
    try {
        $mockStatus = Invoke-WebRequest -Uri "http://localhost:7654/api/status" -UseBasicParsing -TimeoutSec 5 | Select-Object -ExpandProperty Content
        if (-not ($mockStatus -match '"mockDataEnabled":true')) {
            Write-Host "❌ Error: Server is running but mock data is not enabled"
            Write-Host "Server status: $mockStatus"
            Get-Content "$env:TEMP\pulse-backend.log"
            Cleanup
            exit 1
        }
    } catch {
        Write-Host "❌ Error: Backend server is not responding on port 7654"
        Get-Content "$env:TEMP\pulse-backend.log"
        Get-Content "$env:TEMP\pulse-backend-error.log"
        Cleanup
        exit 1
    }

    Write-Host "✅ All servers are running with mock data enabled"

    # Generate screenshots
    Write-Host "📸 Running screenshot tool..."
    Push-Location "$ProjectRoot\tools\screenshot-automation"
    npm run build
    $screenshotResult = $?
    if ($screenshotResult) {
        npm start -- --config "..\..\screenshot-config.json"
        $screenshotResult = $?
    }
    Pop-Location

    # Report results
    if ($screenshotResult) {
        Write-Host "✅ Screenshots updated successfully!"
        Write-Host "Check the docs/images directory for the new screenshots."
    } else {
        Write-Host "❌ Error: Failed to update screenshots"
        exit 1
    }
} finally {
    # Always run cleanup
    Cleanup
} 