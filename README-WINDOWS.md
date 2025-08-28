# CCC - Windows Setup Guide

## Prerequisites

1. **Java JDK 8+** (not just JRE)
   - Download from: https://adoptium.net/
   - Make sure `javac` is available in your PATH
   - Test: `java -version` and `javac -version`

2. **Node.js 14+**
   - Download from: https://nodejs.org/
   - Test: `node --version`

3. **Git for Windows** (to clone the repo)
   - Download from: https://git-scm.com/download/win

## Quick Start

### 1. Clone the Repository
```cmd
git clone https://github.com/philhignight/coding-agent.git
cd coding-agent
```

### 2. Compile the Java Agent
```cmd
compile.bat
```

### 3. Start the System
```cmd
start.bat
```
This will open two command windows:
- Mock API Server (port 3001)
- Coordinator (port 3000)

### 4. Test the System
Open a new command prompt and run:
```cmd
test.bat
```

## Available Scripts

### Batch Files (.bat)
- `compile.bat` - Compiles Java agents
- `start.bat` - Starts mock server and coordinator in separate windows
- `start-windows.bat` - Starts only Windows components (coordinator)
- `test.bat` - Runs basic tests
- `calibrate.bat` - Runs button calibration tool

### PowerShell Script (.ps1)
For better process management, use PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File start.ps1
```

## Testing with Windows

### Using curl (Windows 10+)
```cmd
# Check status
curl http://localhost:3000/api/status

# Calibrate button positions
cd tools
javac CalibrateButtons.java
java CalibrateButtons
# Follow prompts to click READ and WRITE buttons

# Send chat request
curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"message\":\"Hello\"}"
```

### Using PowerShell
```powershell
# Check status
Invoke-RestMethod -Uri "http://localhost:3000/api/status"

# Calibrate button positions (run the calibrate.bat instead)
calibrate.bat

# Send chat request
$body = @{message="Hello"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5555/api/chat" -Method Post -Body $body -ContentType "application/json"
```

## Production Setup on Windows

### 1. Start the System
```cmd
start.bat
```
This will:
- Compile the Java agent automatically
- Start mock server on port 5556
- Start coordinator on port 5555
- Auto-calibrate button positions (READ: 360,216 WRITE: 630,207)

### 2. Open the Mock UI
1. Open http://localhost:5556 in Chrome/Edge
2. Wait for "CCC BRIDGE ACTIVE" indicator to appear (auto-loads after 1 second)
3. The bridge script is now loaded automatically - no need to paste anything!

### 3. Test
Send a test message:
```powershell
$body = @{message="Hello, Claude!"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5555/api/chat" -Method Post -Body $body -ContentType "application/json"
```

## Troubleshooting

### Java Issues
- **"javac not found"**: Install JDK (not just JRE), add to PATH
- **"Cannot find symbol BufferedImage"**: Make sure you have full JDK installed
- **System tray not appearing**: Use ClipboardAgentHeadless.java for headless environments

### Node.js Issues
- **"node not found"**: Add Node.js to PATH after installation
- **Port already in use**: Kill existing Node processes:
  ```cmd
  taskkill /F /IM node.exe
  ```

### Clipboard Issues
- **Access denied**: Run as Administrator if needed
- **Clipboard not working**: Close clipboard managers temporarily

### PowerShell Execution Policy
If PowerShell scripts won't run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Or run with bypass:
```powershell
powershell -ExecutionPolicy Bypass -File start.ps1
```

## Development Tips

### Running Individual Components
```cmd
# Mock server only
node mock-env\server.js

# Coordinator only
node src\node-server\coordinator.js

# Java agent only (GUI version)
java ClipboardAgent

# Java agent headless version
java ClipboardAgentHeadless
```

### Viewing Logs
The scripts open components in separate windows so you can see logs in real-time.

### Using VS Code
Open the project in VS Code for better development experience:
```cmd
code .
```

## API Endpoints

- `GET http://localhost:5555/api/status` - System status (Note: coordinator runs on port 5555)
- `GET http://localhost:5555/api/calibrate?x=X&y=Y` - Set button positions
- `POST http://localhost:5555/api/chat` - Send chat message
- `GET http://localhost:5555/api/test` - Test clipboard operations

## Mock UI

- Local testing: Open http://localhost:3001 in your browser
- Remote testing: Open http://dailyernest.com:5556 in your browser

The mock UI simulates the Claude interface with READ and WRITE buttons for clipboard operations.

## Calibration Tools

The `tools` directory contains calibration utilities:
- `CalibrateButtons.java` - Interactive calibration with 3-second countdown
- `QuickCalibrate.java` - Immediate calibration without countdown

Use `calibrate.bat` for the easiest calibration experience.