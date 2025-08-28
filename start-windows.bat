@echo off
echo ================================
echo CCC Windows Local Setup
echo ================================
echo.
echo This runs ALL components locally on Windows for testing:
echo - Mock UI Server (port 5556)
echo - Coordinator (port 5555)
echo - Java Agent (clipboard/mouse control)
echo.

REM Always recompile to ensure latest changes
echo Compiling Java agent...
call compile.bat
if %errorlevel% neq 0 (
    echo Compilation failed. Exiting.
    exit /b 1
)

echo Starting ALL components locally...
echo.

REM Set environment variables for local ports
set MOCK_PORT=5556
set COORDINATOR_PORT=5555

REM Start mock server LOCALLY on Windows
echo Starting LOCAL mock server on port %MOCK_PORT%...
start "CCC Mock Server" cmd /k node mock-env\server.js

REM Wait a bit for mock server to start
timeout /t 2 /nobreak >nul

REM Start coordinator LOCALLY on Windows
echo Starting LOCAL coordinator on port %COORDINATOR_PORT%...
start "CCC Coordinator" cmd /k node src\node-server\coordinator.js

REM Wait for coordinator to start
timeout /t 2 /nobreak >nul

REM Auto-calibrate with hardcoded coordinates
echo Auto-calibrating button positions...
curl -s "http://localhost:5555/api/calibrate?readX=360&readY=296&writeX=630&writeY=287" >nul 2>&1
if %errorlevel% equ 0 (
    echo Calibration successful!
) else (
    echo Warning: Auto-calibration failed. You may need to calibrate manually.
)

echo.
echo ================================
echo All Components Running Locally!
echo ================================
echo.
echo LOCAL Services on your Windows machine:
echo   Mock UI:     http://localhost:5556
echo   Coordinator: http://localhost:5555
echo   Java Agent:  Running (system tray)
echo.
echo Button positions auto-calibrated:
echo   READ:  X=360, Y=296
echo   WRITE: X=630, Y=287
echo.
echo ================================
echo SETUP STEPS:
echo ================================
echo.
echo 1. Open http://localhost:5556 in your browser
echo    (This uses localhost which allows clipboard access)
echo.
echo 2. Open browser console (F12) and paste bridge script:
echo    Copy ALL contents from src\browser-bridge\bridge-mock.js
echo.
echo 3. Test the bridge:
echo    PowerShell: 
echo    $body = @{message="Hello"} ^| ConvertTo-Json
echo    Invoke-RestMethod -Uri "http://localhost:5555/api/chat" -Method Post -Body $body -ContentType "application/json"
echo.
echo Two command windows have been opened:
echo - Mock Server window
echo - Coordinator window
echo.
pause