@echo off
echo ================================
echo CCC Quick Start for Windows
echo ================================
echo.

REM Always recompile to ensure latest changes
echo Compiling Java agent...
call compile.bat
if %errorlevel% neq 0 (
    echo Compilation failed. Exiting.
    exit /b 1
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

REM Wait for coordinator to start
timeout /t 2 /nobreak >nul

REM Auto-calibrate with hardcoded coordinates
echo Auto-calibrating button positions...
curl -s "http://localhost:5555/api/calibrate?readX=360&readY=216&writeX=630&writeY=207" >nul 2>&1
if %errorlevel% equ 0 (
    echo Calibration successful!
) else (
    echo Warning: Auto-calibration failed. You may need to calibrate manually.
)

echo.
echo ================================
echo CCC is running locally!
echo ================================
echo.
echo Mock UI:     http://localhost:5556
echo Coordinator: http://localhost:5555
echo.
echo Button positions auto-calibrated:
echo   READ:  X=360, Y=216
echo   WRITE: X=630, Y=207
echo.
echo Next steps:
echo 1. Open http://localhost:5556 in your browser
echo 2. Paste bridge-mock.js in console (F12)
echo 3. Test with PowerShell:
echo.
echo $body = @{message="Hello"} ^| ConvertTo-Json
echo Invoke-RestMethod -Uri "http://localhost:5555/api/chat" -Method Post -Body $body -ContentType "application/json"
echo.
pause