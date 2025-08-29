@echo off
echo ================================
echo CCC Production Runner
echo ================================
echo.

REM Check for Node modules
if exist node_modules goto :compile
echo Installing Node.js dependencies...
npm install

:compile
REM Compile Java agent
echo Compiling Java agent...
javac src/java-agent/ClipboardAgent.java
jar cvf src/java-agent/agent.jar -C . src/java-agent/ClipboardAgent.class

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
echo Starting coordinator...
node src/node-server/coordinator-demo.js

pause