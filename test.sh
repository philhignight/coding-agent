#!/bin/bash

echo "CCC Test Script"
echo "==============="
echo ""

# Check Java
echo "Checking Java installation..."
if command -v java &> /dev/null; then
    java -version 2>&1 | head -n 1
else
    echo "ERROR: Java not found. Please install Java."
    exit 1
fi

# Check Node.js
echo "Checking Node.js installation..."
if command -v node &> /dev/null; then
    node --version
else
    echo "ERROR: Node.js not found. Please install Node.js."
    exit 1
fi

echo ""
echo "Starting CCC components..."
echo ""

# Compile Java agent if needed
if [ ! -f "src/java-agent/agent.jar" ]; then
    echo "Compiling Java agent..."
    cd src/java-agent
    chmod +x compile.sh
    ./compile.sh
    cd ../..
fi

# Start mock server in background
echo "Starting mock API server..."
node mock-env/server.js &
MOCK_PID=$!
echo "Mock server PID: $MOCK_PID"

# Wait for mock server to start
sleep 2

# Open mock UI in browser (optional)
echo ""
echo "Mock UI available at: http://localhost:3001"
echo "Open this URL in your browser to see the mock internal UI"
echo ""

# Start coordinator
echo "Starting CCC Coordinator..."
echo "Coordinator will be available at: http://localhost:3000"
echo ""
echo "To calibrate browser position:"
echo "  1. Open http://localhost:3001 in your browser"
echo "  2. Note the center position of the green area"
echo "  3. Call: curl 'http://localhost:3000/api/calibrate?x=500&y=500'"
echo ""
echo "To test a chat request:"
echo "  curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' -d '{\"message\":\"Hello\"}'"
echo ""
echo "Press Ctrl+C to stop all components"
echo ""

# Start coordinator (this will block)
node src/node-server/coordinator.js

# Cleanup on exit
kill $MOCK_PID 2>/dev/null