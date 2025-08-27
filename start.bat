@echo off
echo ================================
echo CCC Quick Start for Windows
echo ================================
echo.

REM Check if agent.jar exists
if not exist "src\java-agent\agent.jar" (
    echo Java agent not compiled. Running compile script...
    call compile.bat
    if %errorlevel% neq 0 (
        echo Compilation failed. Exiting.
        exit /b 1
    )
)

echo Starting CCC components locally...
echo.

REM Set proper ports
set MOCK_PORT=5556
set COORDINATOR_PORT=5555

REM Start mock server locally
echo Starting mock server on localhost:%MOCK_PORT%...
start "CCC Mock Server" cmd /k node mock-env\server.js

REM Wait for mock server to start
timeout /t 2 /nobreak >nul

REM Start coordinator locally
echo Starting coordinator on localhost:%COORDINATOR_PORT%...
start "CCC Coordinator" cmd /k node src\node-server\coordinator.js

echo.
echo ================================
echo CCC is running locally!
echo ================================
echo.
echo Mock UI:     http://localhost:5556
echo Coordinator: http://localhost:5555
echo.
echo Using localhost allows clipboard access!
echo.
echo Next steps:
echo 1. Open http://localhost:5556 in your browser
echo 2. Paste bridge-mock.js in console (F12)
echo 3. Run calibrate.bat
echo 4. Test with PowerShell:
echo.
echo $body = @{message="Hello"} ^| ConvertTo-Json
echo Invoke-RestMethod -Uri "http://localhost:5555/api/chat" -Method Post -Body $body -ContentType "application/json"
echo.
pause