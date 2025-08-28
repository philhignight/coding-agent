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
echo 1. Open any webpage in your browser
echo 2. Open Developer Console (F12)
echo 3. Copy and paste the contents of src\browser-bridge\bridge-calibrate.js
echo 4. Click anywhere on the page to calibrate
echo 5. Watch the magic happen!
echo.

node src\node-server\coordinator-demo.js

pause