# CCC (Claude Code Clone) - Minimal Implementation

## Overview
This is a minimal implementation of the CCC system that bridges a local IDE with an internal Claude web UI through clipboard-based communication.

## Components
1. **Mock Environment** (`mock-env/`) - Simulates the internal Claude API and UI
2. **Java Agent** (`src/java-agent/`) - Handles clipboard and mouse operations
3. **Browser Bridge** (`src/browser-bridge/`) - JavaScript to inject into the Claude UI
4. **Node Coordinator** (`src/node-server/`) - Orchestrates communication between components

## Prerequisites
- Java 8 or higher
- Node.js 14 or higher
- A modern web browser with clipboard API support

## Quick Start

### 1. Run the test environment
```bash
chmod +x test.sh
./test.sh
```

This will:
- Compile the Java agent
- Start the mock API server on port 3001
- Start the coordinator on port 3000

### 2. Open the mock UI
Open http://localhost:3001 in your browser. You should see a green overlay saying "CLICK HERE TO POLL".

### 3. Calibrate the browser position
```bash
# Replace 500,500 with the actual center coordinates of the green area
curl 'http://localhost:3000/api/calibrate?x=500&y=500'
```

### 4. Test a chat request
```bash
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Hello, Claude!"}'
```

## Production Setup

### 1. Prepare the browser bridge
1. Open the internal Claude UI in your browser
2. Open the browser console (F12)
3. Copy and paste the contents of `src/browser-bridge/bridge.js`
4. The screen should turn green with "CCC BRIDGE READY"

### 2. Start the coordinator
```bash
# Compile Java agent
cd src/java-agent
./compile.sh
cd ../..

# Start coordinator
node src/node-server/coordinator.js
```

### 3. Calibrate browser position
1. Position your browser window on a second monitor
2. Note the center coordinates of the green overlay
3. Calibrate: `curl 'http://localhost:3000/api/calibrate?x=X&y=Y'`

### 4. Use the system
Send chat requests to the coordinator API, which will route them through the clipboard bridge.

## API Endpoints

### Coordinator API (Port 3000)
- `GET /api/status` - System status
- `GET /api/calibrate?x=X&y=Y` - Calibrate browser position
- `POST /api/chat` - Send chat request
- `GET /api/test` - Test clipboard operations

### Mock API (Port 3001)
- `GET /` - Mock UI page
- `POST /api/v1/chats/new` - Create new chat
- `GET /api/v1/chats/:id` - Get chat state
- `POST /api/v1/chats/:id` - Update chat
- `POST /api/chat/completions` - Stream completions

## Architecture Flow
1. User sends request to Coordinator API
2. Coordinator saves clipboard and mouse state
3. Coordinator writes request to clipboard
4. Java agent clicks on browser to trigger polling
5. Browser bridge reads clipboard and processes request
6. Browser bridge makes API calls to Claude backend
7. Browser bridge writes response to clipboard
8. Coordinator reads response and returns to user
9. Coordinator restores clipboard and mouse state

## Troubleshooting

### Java agent won't start
- Ensure Java is installed: `java -version`
- Compile the agent: `cd src/java-agent && ./compile.sh`

### Clipboard operations fail
- Check system permissions for clipboard access
- Ensure no other clipboard managers are interfering

### Browser bridge doesn't respond
- Verify the bridge script is injected and active
- Check browser console for errors
- Ensure clipboard API is available

### Calibration issues
- Make sure browser window is visible
- Use actual screen coordinates, not window-relative
- Test with the mock UI first

## Security Notes
- Never log or expose authentication tokens
- Clear clipboard after operations
- Run components with minimal privileges
- This is a proof of concept - additional security hardening needed for production

## Known Limitations
- Single request at a time (no concurrent processing)
- Clipboard size limited by system (usually ~10MB)
- Requires browser window to remain visible
- Mouse/keyboard interference during operations

## Next Steps
- Implement proper SSE streaming in coordinator
- Add WebSocket support for real-time UI updates
- Implement retry logic and better error handling
- Add support for continuing conversations
- Create proper web UI with code editor