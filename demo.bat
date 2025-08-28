@echo off
echo ================================
echo CCC AI Bridge Demo
echo ================================
echo.
echo This demo shows the full clipboard bridge flow:
echo 1. Auto-calibration by clicking
echo 2. Sending an AI request 
echo 3. Receiving the response
echo.

REM Compile Java agent if needed
if not exist "src\java-agent\agent.jar" (
    echo Compiling Java agent...
    call compile.bat
    if %errorlevel% neq 0 (
        echo Compilation failed!
        exit /b 1
    )
)

REM Set environment variable for mock server port
set MOCK_PORT=5556

REM Start mock server in a new window
echo Starting mock server on port %MOCK_PORT%...
start "CCC Mock Server" cmd /k node mock-env\server.js

REM Wait for mock server to start
timeout /t 2 /nobreak >nul

echo Starting demo coordinator...
echo.
echo ================================
echo INSTRUCTIONS:
echo ================================
echo 1. Open http://localhost:5556/demo in your browser
echo 2. Click "Load API Bridge (Real Flow)" button
echo 3. Click anywhere on the overlay to calibrate
echo 4. Watch the real API flow happen!
echo.
echo The mock server is running in a separate window.
echo.

node src\node-server\coordinator-demo.js

echo.
echo Demo completed. Press any key to close all windows...
pause >nul

REM Kill the mock server window
taskkill /FI "WINDOWTITLE eq CCC Mock Server*" /F >nul 2>&1