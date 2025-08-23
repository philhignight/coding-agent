#!/bin/bash

# Start script for running CCC on the server with custom ports

echo "================================"
echo "CCC Server Startup"
echo "================================"
echo ""

# Set custom ports
export COORDINATOR_PORT=5555
export MOCK_PORT=5556

echo "Using ports:"
echo "  Coordinator: $COORDINATOR_PORT"
echo "  Mock Server: $MOCK_PORT"
echo ""

# Check if agent.jar exists
if [ ! -f "src/java-agent/agent.jar" ]; then
    echo "Compiling Java agent..."
    ./compile.sh
    if [ $? -ne 0 ]; then
        echo "Compilation failed. Exiting."
        exit 1
    fi
fi

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
echo "Starting mock API server on port $MOCK_PORT..."
nohup node mock-env/server.js > logs/mock-server.log 2>&1 &
MOCK_PID=$!
echo "Mock server PID: $MOCK_PID"

# Wait for mock server
sleep 2

# Start coordinator
echo "Starting coordinator on port $COORDINATOR_PORT..."
nohup node src/node-server/coordinator.js > logs/coordinator.log 2>&1 &
COORD_PID=$!
echo "Coordinator PID: $COORD_PID"

echo ""
echo "================================"
echo "CCC is running on server!"
echo "================================"
echo ""
echo "Local access:"
echo "  Coordinator: http://localhost:$COORDINATOR_PORT"
echo "  Mock UI:     http://localhost:$MOCK_PORT"
echo ""
echo "After setting up nginx, access from Windows:"
echo "  Coordinator: https://dailyernest.com:5557/ccc/"
echo "  Mock UI:     https://dailyernest.com:5557/ccc-mock/"
echo ""
echo "Or if using subdomain:"
echo "  https://ccc.dailyernest.com"
echo ""
echo "Logs:"
echo "  tail -f logs/coordinator.log"
echo "  tail -f logs/mock-server.log"
echo ""
echo "PIDs saved. Use 'kill $MOCK_PID $COORD_PID' to stop"
echo ""

# Keep running and show logs
tail -f logs/coordinator.log logs/mock-server.log