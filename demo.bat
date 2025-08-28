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

echo Starting demo coordinator...
echo.
echo INSTRUCTIONS:
echo 1. Start the mock server first: node mock-env\server.js
echo 2. Open http://localhost:5556/demo in your browser
echo 3. Click "Load API Bridge" button
echo 4. Click anywhere on the page to calibrate
echo 5. Watch the real API flow happen!
echo.

node src\node-server\coordinator-demo.js

pause