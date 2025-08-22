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

echo Starting CCC components...
echo.

REM Start mock server in new window
echo Starting mock API server on port 3001...
start "CCC Mock Server" cmd /k node mock-env\server.js

REM Wait a moment for mock server to start
timeout /t 2 /nobreak >nul

REM Start coordinator in new window
echo Starting coordinator on port 3000...
start "CCC Coordinator" cmd /k node src\node-server\coordinator.js

echo.
echo ================================
echo CCC is running!
echo ================================
echo.
echo Mock UI:     http://localhost:3001
echo Coordinator: http://localhost:3000
echo.
echo Two new windows have been opened:
echo - "CCC Mock Server" - Mock API server
echo - "CCC Coordinator" - Main coordinator
echo.
echo Next steps:
echo 1. Open http://localhost:3001 in your browser
echo 2. Note the center position of the green area
echo 3. Calibrate using curl or PowerShell:
echo    curl "http://localhost:3000/api/calibrate?x=500&y=500"
echo.
echo 4. Test with:
echo    curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"message\":\"Hello\"}"
echo.
echo Or using PowerShell:
echo    Invoke-WebRequest -Uri "http://localhost:3000/api/calibrate?x=500&y=500"
echo    Invoke-WebRequest -Uri "http://localhost:3000/api/chat" -Method POST -ContentType "application/json" -Body '{\"message\":\"Hello\"}'
echo.
echo To stop: Close the two command windows that were opened
echo.
pause