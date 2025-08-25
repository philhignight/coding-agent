@echo off
echo ================================
echo CCC Windows Local Components
echo ================================
echo.
echo This runs the LOCAL components on your Windows machine:
echo - Java Agent (controls YOUR clipboard and mouse)
echo - Coordinator (manages the clipboard bridge)
echo.
echo The Mock UI is already running on dailyernest.com:5556
echo.

REM Check if agent.jar exists locally
if not exist "src\java-agent\agent.jar" (
    echo Java agent not compiled. Running compile script...
    call compile.bat
    if %errorlevel% neq 0 (
        echo Compilation failed. Exiting.
        exit /b 1
    )
)

echo Starting LOCAL components...
echo.

REM Start coordinator LOCALLY on Windows (port 5555)
echo Starting LOCAL coordinator on port 5555...
start "CCC Local Coordinator" cmd /k node src\node-server\coordinator.js

echo.
echo ================================
echo LOCAL Components Running!
echo ================================
echo.
echo LOCAL Services (on your Windows machine):
echo   Coordinator: http://localhost:5555
echo   Java Agent: Running in system tray
echo.
echo REMOTE Mock UI (on Linux server):
echo   Browser UI: http://dailyernest.com:5556
echo.
echo ================================
echo SETUP STEPS:
echo ================================
echo.
echo 1. Open http://dailyernest.com:5556 in your browser
echo    (This loads the mock UI from the Linux server)
echo.
echo 2. Open browser console (F12) and paste bridge.js:
echo    Copy all contents from src\browser-bridge\bridge.js
echo.
echo 3. Calibrate your LOCAL mouse positions:
echo    Run: calibrate.bat
echo.
echo 4. Test the bridge:
echo    PowerShell: 
echo    $body = @{message="Hello"} ^| ConvertTo-Json
echo    Invoke-RestMethod -Uri "http://localhost:5555/api/chat" -Method Post -Body $body -ContentType "application/json"
echo.
echo The coordinator window will show the bridge activity
echo.
pause