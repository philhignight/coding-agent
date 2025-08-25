# CCC Architecture - Clear Separation

## What Runs Where

### Linux Server (dailyernest.com)
**Purpose**: Simulates your work's internal Claude UI and API

**Components**:
- `mock-env/server.js` - Mock API server (port 5556)
- `mock-env/ui-fixed.html` - Mock UI that simulates internal Claude interface

**Access**: http://dailyernest.com:5556

### Windows Laptop (LOCAL)
**Purpose**: Controls your local clipboard and mouse

**Components**:
- `src/java-agent/ClipboardAgent.java` - Controls Windows clipboard and mouse
- `src/node-server/coordinator.js` - Orchestrates the clipboard bridge
- `tools/CalibrateButtons.java` - Helps calibrate mouse positions

**Access**: http://localhost:5555 (coordinator API)

### Browser (on Windows)
**Purpose**: Bridge between local clipboard and remote mock UI

**Components**:
- `src/browser-bridge/bridge.js` - Paste into browser console
- Reads/writes to LOCAL clipboard when clicked
- Communicates with mock API on Linux server

## Data Flow

```
1. Windows App sends request
   ↓
2. Coordinator puts request in Windows clipboard
   ↓
3. Java Agent clicks on browser
   ↓
4. Browser bridge script reads clipboard
   ↓
5. Bridge sends request to Mock API (Linux server)
   ↓
6. Mock API processes and returns response
   ↓
7. Bridge writes response to clipboard
   ↓
8. Coordinator reads response from clipboard
   ↓
9. Windows App receives response
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
3. Paste contents of `src/browser-bridge/bridge.js`
4. See green overlay "CCC BRIDGE READY"

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
- Mock API responds with fake responses
- Tests the clipboard bridge mechanism

### Production (Future):
- Browser loads actual internal Claude UI
- Bridge script injected into real UI
- Real API responses from internal system

The clipboard bridge mechanism remains the same - only the UI/API endpoints change.