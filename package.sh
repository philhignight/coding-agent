#!/bin/bash

echo "================================"
echo "CCC Production Packager"
echo "================================"
echo

# Clear dist directory
rm -f dist/ccc-bundle.txt
rm -f dist/unpackage.bat

echo "Packaging production files..."
echo

# Create the concatenated bundle file
OUTPUT="dist/ccc-bundle.txt"

# Package configuration files
echo "-~{File: package.json}~-" >> "$OUTPUT"
cat package.json >> "$OUTPUT"
echo >> "$OUTPUT"
echo "-~{END}~-" >> "$OUTPUT"
echo >> "$OUTPUT"

echo "-~{File: config.json}~-" >> "$OUTPUT"
cat config.json >> "$OUTPUT"
echo >> "$OUTPUT"
echo "-~{END}~-" >> "$OUTPUT"
echo >> "$OUTPUT"

# Package Java source
echo "-~{File: src/java-agent/ClipboardAgent.java}~-" >> "$OUTPUT"
cat src/java-agent/ClipboardAgent.java >> "$OUTPUT"
echo >> "$OUTPUT"
echo "-~{END}~-" >> "$OUTPUT"
echo >> "$OUTPUT"

# Package Node.js coordinator
echo "-~{File: src/node-server/coordinator-demo.js}~-" >> "$OUTPUT"
cat src/node-server/coordinator-demo.js >> "$OUTPUT"
echo >> "$OUTPUT"
echo "-~{END}~-" >> "$OUTPUT"
echo >> "$OUTPUT"

# Package bridge script
echo "-~{File: src/browser-bridge/bridge-api.js}~-" >> "$OUTPUT"
cat src/browser-bridge/bridge-api.js >> "$OUTPUT"
echo >> "$OUTPUT"
echo "-~{END}~-" >> "$OUTPUT"
echo >> "$OUTPUT"

# Package run script
echo "-~{File: run-prod.bat}~-" >> "$OUTPUT"
cat run-prod.bat >> "$OUTPUT"
echo >> "$OUTPUT"
echo "-~{END}~-" >> "$OUTPUT"

echo
echo "Package created: dist/ccc-bundle.txt"
echo

# Copy unpackage script
echo "Copying unpackage script..."
cp unpackage.bat dist/unpackage.bat

echo
echo "================================"
echo "Packaging Complete!"
echo "================================"
echo
echo "Files created in dist/:"
echo "- ccc-bundle.txt (the package)"
echo "- unpackage.bat (the unpacker)"
echo
echo "To use in production:"
echo "1. Copy both files to production machine"
echo "2. Run: unpackage.bat"
echo "3. Run: run-prod.bat"
echo