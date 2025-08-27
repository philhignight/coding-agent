# CCC Architecture - Clear Separation

## What Runs Where

### Linux Server (dailyernest.com)
**Purpose**: Simulates your work's internal Claude UI and API

**Components**:
- `mock-env/server.js` - Mock API server (port 5556)
- `mock-env/ui.html` - Mock UI that simulates internal Claude interface

**Access**: http://dailyernest.com:5556

### Windows Laptop (LOCAL)
**Purpose**: Controls your local clipboard and mouse

**Components**:
- `src/java-agent/ClipboardAgent.java` - GUI version with system tray
- `src/java-agent/ClipboardAgentHeadless.java` - Headless version for servers
- `src/node-server/coordinator.js` - Orchestrates the clipboard bridge
- `tools/CalibrateButtons.java` - Interactive button calibration with countdown
- `tools/QuickCalibrate.java` - Quick button calibration without countdown

**Access**: http://localhost:5555 (coordinator API)

### Browser (on Windows)
**Purpose**: Bridge between local clipboard and remote mock UI

**Components**:
- `src/browser-bridge/bridge.js` - Production version with full overlay
- `src/browser-bridge/bridge-mock.js` - Testing version with visible buttons
- Reads/writes to LOCAL clipboard when buttons are clicked
- Communicates with mock API on Linux server

## Data Flow

```
1. Windows App sends request
   ↓
2. Coordinator puts request in Windows clipboard
   ↓
3. Java Agent clicks READ button (multiple times)
   ↓
4. Browser bridge reads clipboard on button click
   ↓
5. Bridge sends request to Mock API (Linux server)
   ↓
6. Mock API processes and returns response
   ↓
7. Java Agent clicks WRITE button
   ↓
8. Bridge writes response to clipboard on button click
   ↓
9. Coordinator reads response from clipboard
   ↓
10. Windows App receives response
```

## Setup Order

### On Linux Server:
1. Start mock server: `node mock-env/server.js`
2. Verify running: http://dailyernest.com:5556

### On Windows Laptop:
1. Clone repo: `git clone https://github.com/philhignight/coding-agent.git`
2. Compile: `compile.bat`
3. Start local components: `start-windows.bat`
4. Calibrate mouse: `calibrate.bat`

### In Browser (on Windows):
1. Open http://dailyernest.com:5556
2. Open console (F12)
3. For testing: Paste contents of `src/browser-bridge/bridge-mock.js`
   - See "CCC BRIDGE ACTIVE" badge with buttons visible
4. For production: Paste contents of `src/browser-bridge/bridge.js`
   - See green overlay "CCC BRIDGE READY"

### Test:
From Windows PowerShell:
```powershell
$body = @{message="Test"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5555/api/chat" -Method Post -Body $body -ContentType "application/json"
```

## Key Points

- **Java Agent runs on WINDOWS** (needs access to your clipboard)
- **Coordinator runs on WINDOWS** (controls the Java agent)
- **Mock UI/API runs on LINUX** (simulates work environment)
- **Bridge script runs in BROWSER** (connects local clipboard to remote API)

## Production vs Mock

### Mock Testing (Current):
- Browser loads from dailyernest.com:5556
- Uses bridge-mock.js for visible button feedback
- Mock API responds with simulated responses
- Tests the clipboard bridge mechanism

### Production (Future):
- Browser loads actual internal Claude UI
- Uses bridge.js for full security overlay
- Real API responses from internal system
- Same button-based approach

## Button-Based Architecture

The system uses a standardized two-button approach:
- **READ Button**: Triggers clipboard read operations
- **WRITE Button**: Triggers clipboard write operations

This design:
- Eliminates coordinate-based clicking issues
- Provides visual feedback during operations
- Works consistently across different UI layouts
- Simplifies calibration to just two points