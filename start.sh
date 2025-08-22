#!/bin/bash

# Quick start script for CCC

echo "================================"
echo "CCC Quick Start"
echo "================================"
echo ""

# Check if agent.jar exists
if [ ! -f "src/java-agent/agent.jar" ]; then
    echo "Java agent not compiled. Running compile script..."
    ./compile.sh
    if [ $? -ne 0 ]; then
        echo "Compilation failed. Exiting."
        exit 1
    fi
fi

echo "Starting CCC components..."
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $MOCK_PID 2>/dev/null
    kill $COORD_PID 2>/dev/null
    exit 0
}

# Set trap for cleanup
trap cleanup INT TERM

# Start mock server
echo "Starting mock API server on port 3001..."
node mock-env/server.js > /tmp/ccc-mock.log 2>&1 &
MOCK_PID=$!

# Wait for mock server
sleep 2

# Start coordinator
echo "Starting coordinator on port 3000..."
node src/node-server/coordinator.js &
COORD_PID=$!

echo ""
echo "================================"
echo "CCC is running!"
echo "================================"
echo ""
echo "Mock UI:     http://localhost:3001"
echo "Coordinator: http://localhost:3000"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:3001 in your browser"
echo "2. Note the center position of the green area"
echo "3. Calibrate: curl 'http://localhost:3000/api/calibrate?x=500&y=500'"
echo "4. Test: curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' -d '{\"message\":\"Hello\"}'"
echo ""
echo "Press Ctrl+C to stop all components"
echo ""

# Wait for processes
wait