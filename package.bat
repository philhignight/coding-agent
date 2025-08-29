@echo off
echo ================================
echo CCC Production Packager
echo ================================
echo.

REM Clear dist directory
if exist dist\ccc-bundle.txt del dist\ccc-bundle.txt
if exist dist\unpackage.bat del dist\unpackage.bat

echo Packaging production files...
echo.

REM Create the concatenated bundle file
set OUTPUT=dist\ccc-bundle.txt

REM Package configuration files
echo -~{File: package.json}~->> "%OUTPUT%"
type package.json >> "%OUTPUT%"
echo. >> "%OUTPUT%"
echo -~{END}~->> "%OUTPUT%"
echo. >> "%OUTPUT%"

echo -~{File: config.json}~->> "%OUTPUT%"
type config.json >> "%OUTPUT%"
echo. >> "%OUTPUT%"
echo -~{END}~->> "%OUTPUT%"
echo. >> "%OUTPUT%"

REM Package Java source
echo -~{File: src/java-agent/ClipboardAgent.java}~->> "%OUTPUT%"
type src\java-agent\ClipboardAgent.java >> "%OUTPUT%"
echo. >> "%OUTPUT%"
echo -~{END}~->> "%OUTPUT%"
echo. >> "%OUTPUT%"

REM Package Node.js coordinator
echo -~{File: src/node-server/coordinator-demo.js}~->> "%OUTPUT%"
type src\node-server\coordinator-demo.js >> "%OUTPUT%"
echo. >> "%OUTPUT%"
echo -~{END}~->> "%OUTPUT%"
echo. >> "%OUTPUT%"

REM Package bridge script
echo -~{File: src/browser-bridge/bridge-api.js}~->> "%OUTPUT%"
type src\browser-bridge\bridge-api.js >> "%OUTPUT%"
echo. >> "%OUTPUT%"
echo -~{END}~->> "%OUTPUT%"
echo. >> "%OUTPUT%"

REM Package run script
echo -~{File: run-prod.bat}~->> "%OUTPUT%"
type run-prod.bat >> "%OUTPUT%"
echo. >> "%OUTPUT%"
echo -~{END}~->> "%OUTPUT%"

echo.
echo Package created: dist\ccc-bundle.txt
echo.

REM Create unpackage script
echo Creating unpackage script...
copy unpackage.bat dist\unpackage.bat >nul

echo.
echo ================================
echo Packaging Complete!
echo ================================
echo.
echo Files created in dist/:
echo - ccc-bundle.txt (the package)
echo - unpackage.bat (the unpacker)
echo.
echo To use in production:
echo 1. Copy both files to production machine
echo 2. Run: unpackage.bat
echo 3. Run: run-prod.bat
echo.
pause