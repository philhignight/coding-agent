@echo off
echo ================================
echo CCC Test Script for Windows
echo ================================
echo.

REM Check Java
where java >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Java not found. Please install Java.
    exit /b 1
)

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js.
    exit /b 1
)

REM Check if curl is available (comes with Windows 10+)
where curl >nul 2>nul
if %errorlevel% neq 0 (
    echo WARNING: curl not found. Install curl or use PowerShell commands shown below.
    set USE_POWERSHELL=1
) else (
    set USE_POWERSHELL=0
)

echo.
echo Starting CCC test environment...
echo.

REM Compile Java agent if needed
if not exist "src\java-agent\agent.jar" (
    echo Compiling Java agent...
    call compile.bat
    if %errorlevel% neq 0 (
        echo Compilation failed. Exiting.
        exit /b 1
    )
)

REM Start mock server in background
echo Starting mock API server on port 3001...
start /B node mock-env\server.js >nul 2>&1

REM Wait for mock server
timeout /t 2 /nobreak >nul

echo Mock server started
echo.

REM Start coordinator in background
echo Starting CCC Coordinator on port 3000...
start /B node src\node-server\coordinator.js >nul 2>&1

REM Wait for coordinator
timeout /t 3 /nobreak >nul

echo Coordinator started
echo.
echo ================================
echo Running Tests...
echo ================================
echo.

if %USE_POWERSHELL%==1 (
    echo Using PowerShell for tests...
    echo.
    
    echo 1. Checking status...
    powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000/api/status' -UseBasicParsing; Write-Host 'Status: OK'; $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10 } catch { Write-Host 'Status check failed' }"
    
    echo.
    echo 2. Calibrating browser position...
    powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000/api/calibrate?x=500&y=500' -UseBasicParsing; Write-Host 'Calibration: OK'; $response.Content } catch { Write-Host 'Calibration failed' }"
    
    echo.
    echo 3. Testing clipboard operations...
    powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000/api/test' -UseBasicParsing; Write-Host 'Test: OK' } catch { Write-Host 'Test failed' }"
) else (
    echo Using curl for tests...
    echo.
    
    echo 1. Checking status...
    curl -s http://localhost:3000/api/status
    echo.
    echo.
    
    echo 2. Calibrating browser position...
    curl -s "http://localhost:3000/api/calibrate?x=500&y=500"
    echo.
    echo.
    
    echo 3. Testing clipboard operations...
    curl -s http://localhost:3000/api/test
    echo.
)

echo.
echo ================================
echo Test Complete!
echo ================================
echo.
echo Services running:
echo - Mock UI:     http://localhost:3001
echo - Coordinator: http://localhost:3000
echo.
echo You can now:
echo 1. Open http://localhost:3001 in your browser to see the mock UI
echo 2. Test chat requests with:
echo.

if %USE_POWERSHELL%==1 (
    echo PowerShell:
    echo   $body = '{\"message\":\"Hello\"}'
    echo   Invoke-WebRequest -Uri "http://localhost:3000/api/chat" -Method POST -ContentType "application/json" -Body $body
) else (
    echo curl:
    echo   curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"message\":\"Hello\"}"
)

echo.
echo Press Ctrl+C to stop all services, or close this window
echo.
pause

REM Cleanup - kill node processes
taskkill /F /IM node.exe >nul 2>&1