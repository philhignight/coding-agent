@echo off
echo ================================
echo CCC Production Unpacker
echo ================================
echo.

if not exist ccc-bundle.txt (
    echo ERROR: ccc-bundle.txt not found!
    echo Make sure you're in the same directory as the bundle file.
    exit /b 1
)

echo Unpacking files...
echo.

setlocal enabledelayedexpansion

REM PowerShell script to properly extract files
powershell -Command "& { $content = Get-Content 'ccc-bundle.txt' -Raw; $files = $content -split '-~\{File: '; foreach ($file in $files) { if ($file) { $parts = $file -split '\}~-'; if ($parts.Count -ge 2) { $filename = $parts[0]; $fileContent = $parts[1] -split '-~\{END'; $fileContent = $fileContent[0].Trim(); if ($filename -and $fileContent) { Write-Host \"Extracting: $filename\"; $dir = Split-Path $filename -Parent; if ($dir -and !(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }; $fileContent | Out-File -FilePath $filename -Encoding UTF8 } } } } }"

echo.
echo ================================
echo Unpacking Complete!
echo ================================
echo.
echo Files extracted:
echo - package.json
echo - config.json
echo - src/java-agent/ClipboardAgent.java
echo - src/node-server/coordinator-demo.js
echo - src/browser-bridge/bridge-api.js
echo - run-prod.bat
echo.
echo To run CCC:
echo 1. Make sure you have Java and Node.js installed
echo 2. Run: run-prod.bat
echo.
pause