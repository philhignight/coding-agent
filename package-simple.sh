#!/bin/bash

echo "================================"
echo "CCC Simple Production Packager"
echo "================================"
echo

# Clear dist directory
rm -f dist/ccc-bundle-simple.txt
rm -f dist/unpackage-simple.bat

echo "Packaging production files (Java only)..."
echo

# Create the concatenated bundle file
OUTPUT="dist/ccc-bundle-simple.txt"

# Function to convert to Windows line endings
to_windows_line_endings() {
    sed 's/$/\r/' "$1"
}

# Package Java source files
echo "-~{File: src/java-agent/ClipboardAgent.java}~-" >> "$OUTPUT"
to_windows_line_endings src/java-agent/ClipboardAgent.java >> "$OUTPUT"
echo >> "$OUTPUT"
echo "-~{END}~-" >> "$OUTPUT"
echo >> "$OUTPUT"

echo "-~{File: src/java-agent/StandaloneAgent.java}~-" >> "$OUTPUT"
to_windows_line_endings src/java-agent/StandaloneAgent.java >> "$OUTPUT"
echo >> "$OUTPUT"
echo "-~{END}~-" >> "$OUTPUT"
echo >> "$OUTPUT"

# Package bridge script
echo "-~{File: src/browser-bridge/bridge-api.js}~-" >> "$OUTPUT"
to_windows_line_endings src/browser-bridge/bridge-api.js >> "$OUTPUT"
echo >> "$OUTPUT"
echo "-~{END}~-" >> "$OUTPUT"
echo >> "$OUTPUT"

# Package run script with Windows line endings
echo "-~{File: run-prod.bat}~-" >> "$OUTPUT"
to_windows_line_endings run-prod-simple.bat >> "$OUTPUT"
echo >> "$OUTPUT"
echo "-~{END}~-" >> "$OUTPUT"

echo
echo "Package created: dist/ccc-bundle-simple.txt"
echo

# Create simple unpackage script
cat > dist/unpackage-simple.bat << 'EOF'
@echo off
echo ================================
echo CCC Simple Production Unpacker
echo ================================
echo.

if not exist ccc-bundle-simple.txt (
    echo ERROR: ccc-bundle-simple.txt not found!
    pause
    exit /b 1
)

echo Creating PowerShell extraction script...

echo $content = Get-Content 'ccc-bundle-simple.txt' -Raw > extract-simple.ps1
echo $current = $null >> extract-simple.ps1
echo $buffer = "" >> extract-simple.ps1
echo $inFile = $false >> extract-simple.ps1
echo. >> extract-simple.ps1
echo foreach ($line in ($content -split "`r?`n")) { >> extract-simple.ps1
echo     if ($line -match '^-~\{File: (.+)\}~-$') { >> extract-simple.ps1
echo         $current = $matches[1] >> extract-simple.ps1
echo         Write-Host "Extracting: $current" >> extract-simple.ps1
echo         $dir = Split-Path $current -Parent >> extract-simple.ps1
echo         if ($dir -and -not (Test-Path $dir)) { >> extract-simple.ps1
echo             New-Item -ItemType Directory -Path $dir -Force ^| Out-Null >> extract-simple.ps1
echo         } >> extract-simple.ps1
echo         $buffer = "" >> extract-simple.ps1
echo         $inFile = $true >> extract-simple.ps1
echo     } >> extract-simple.ps1
echo     elseif ($line -eq '-~{END}~-') { >> extract-simple.ps1
echo         if ($inFile -and $current) { >> extract-simple.ps1
echo             $buffer = $buffer -replace "`n", "`r`n" >> extract-simple.ps1
echo             [System.IO.File]::WriteAllText($current, $buffer, [System.Text.Encoding]::UTF8) >> extract-simple.ps1
echo         } >> extract-simple.ps1
echo         $inFile = $false >> extract-simple.ps1
echo         $current = $null >> extract-simple.ps1
echo         $buffer = "" >> extract-simple.ps1
echo     } >> extract-simple.ps1
echo     elseif ($inFile) { >> extract-simple.ps1
echo         if ($buffer) { $buffer += "`n" } >> extract-simple.ps1
echo         $buffer += $line >> extract-simple.ps1
echo     } >> extract-simple.ps1
echo } >> extract-simple.ps1

echo Running extraction...
powershell -ExecutionPolicy Bypass -File extract-simple.ps1

echo Cleaning up...
del extract-simple.ps1

echo.
echo ================================
echo Unpacking Complete!
echo ================================
echo.
echo Files extracted:
echo - src/java-agent/ClipboardAgent.java
echo - src/java-agent/StandaloneAgent.java  
echo - src/browser-bridge/bridge-api.js
echo - run-prod.bat
echo.
echo To run CCC:
echo 1. Make sure you have Java installed
echo 2. Run: run-prod.bat
echo.
pause
EOF

# Convert unpackage script to Windows line endings
sed -i 's/$/\r/' dist/unpackage-simple.bat

echo "Copying unpackage script..."

echo
echo "================================"
echo "Simple Packaging Complete!"
echo "================================"
echo
echo "Files created in dist/:"
echo "- ccc-bundle-simple.txt (the package)"
echo "- unpackage-simple.bat (the unpacker)"
echo
echo "To use in production:"
echo "1. Copy both files to production machine"
echo "2. Run: unpackage-simple.bat"
echo "3. Run: run-prod.bat"
echo
echo "This version only requires Java - no Node.js needed!"
echo