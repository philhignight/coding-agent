@echo off
echo ================================
echo CCC Production Runner (Java Only)
echo ================================
echo.

REM Compile Java agent
echo Compiling Java agent...
javac src\java-agent\ClipboardAgent.java
if errorlevel 1 (
    echo Java compilation failed!
    pause
    exit /b 1
)

jar cvf src\java-agent\agent.jar -C . src\java-agent\ClipboardAgent.class
if errorlevel 1 (
    echo JAR creation failed!
    pause
    exit /b 1
)

REM Copy bridge script to clipboard
echo.
echo Copying bridge script to clipboard...
type src\browser-bridge\bridge-api.js | clip
echo.
echo ================================
echo BRIDGE SCRIPT COPIED TO CLIPBOARD!
echo ================================
echo.
echo Instructions:
echo 1. Open your internal Claude UI
echo 2. Open Developer Console (F12)
echo 3. Paste the bridge script (Ctrl+V)
echo 4. Click anywhere on the overlay to calibrate
echo.
echo Starting Java agent...
java -jar src\java-agent\agent.jar

pause