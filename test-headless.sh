#!/bin/bash

echo "================================"
echo "CCC Headless Test"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Java agent is compiled
if [ ! -f "src/java-agent/agent.jar" ] && [ ! -f "src/java-agent/agent-headless.jar" ]; then
    echo "Compiling Java agent..."
    ./compile.sh
fi

# Start mock server
echo "Starting mock API server..."
node mock-env/server.js &
MOCK_PID=$!
sleep 2

# Start coordinator
echo "Starting coordinator..."
node src/node-server/coordinator.js &
COORD_PID=$!
sleep 3

echo ""
echo "Testing system..."
echo ""

# Test status
echo "1. Checking status..."
curl -s http://localhost:3000/api/status | python3 -m json.tool 2>/dev/null || echo "Status check failed"

echo ""
echo "2. Calibrating browser position..."
curl -s 'http://localhost:3000/api/calibrate?x=500&y=500' | python3 -m json.tool 2>/dev/null || echo "Calibration failed"

echo ""
echo "3. Testing clipboard operations..."
curl -s http://localhost:3000/api/test | python3 -m json.tool 2>/dev/null || echo "Test failed"

echo ""
echo "4. Mock UI available at: ${YELLOW}http://localhost:3001${NC}"
echo ""

# Function to cleanup
cleanup() {
    echo ""
    echo "Cleaning up..."
    kill $MOCK_PID 2>/dev/null
    kill $COORD_PID 2>/dev/null
    pkill -f "java.*agent.jar" 2>/dev/null
    echo "Done."
}

trap cleanup EXIT

echo "Press Ctrl+C to exit or wait for manual testing..."
echo ""
echo "Test commands you can try:"
echo "  curl http://localhost:3000/api/status"
echo "  curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' -d '{\"message\":\"Hello\"}'"
echo ""

# Keep running
wait