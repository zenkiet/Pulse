@echo off
setlocal

REM Stop any running Pulse Docker containers first
echo Stopping any running Pulse Docker containers...
where docker >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('docker ps -q --filter "name=pulse"') do (
        docker stop %%i
    )
) else (
    echo Docker not found, skipping container cleanup...
)

REM Kill any existing servers
echo Killing any existing servers...
taskkill /f /im "node.exe" /fi "WINDOWTITLE eq node dist/server.js" 2>nul
call npx kill-port 7654 3000

REM Set environment to development
set NODE_ENV=development

REM Start the real backend server
echo Starting real backend server...
start /b cmd /c "npm run dev:server"

REM Wait a moment for the server to start
timeout /t 3 /nobreak > nul

REM Set host IP to bind to all interfaces
set HOST_IP=0.0.0.0

REM Start the frontend Vite dev server
echo Starting Pulse interface...
cd frontend && npm run dev -- --host %HOST_IP% --port 3000

REM When the frontend exits, also kill the backend server
taskkill /f /im "node.exe" /fi "WINDOWTITLE eq npm run dev:server" 2>nul 