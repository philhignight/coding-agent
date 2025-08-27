# CCC Testing Guide

## Overview
This guide explains how to test the CCC system using the button-based clipboard bridge approach. The system uses precise mouse clicks on READ and WRITE buttons to trigger clipboard operations.

## Important: Choose the Right Bridge Script!

### For Testing with Mock UI (buttons visible):
Use `src/browser-bridge/bridge-mock.js`
- Keeps the buttons visible for debugging
- Enhances existing button functionality
- Shows "CCC BRIDGE ACTIVE" indicator
- Provides visual feedback when buttons are clicked

### For Production (full screen overlay):
Use `src/browser-bridge/bridge.js`
- Creates full-screen green overlay
- Handles all click events
- Hides UI elements for security

## Testing Steps

1. **Start Windows components:**
   ```cmd
   start-windows.bat
   ```
   This starts both the coordinator (port 5555) and mock server (if testing locally).

2. **Open Mock UI:**
   - For remote testing: Go to http://dailyernest.com:5556
   - For local testing: Go to http://localhost:3001

3. **Inject the appropriate bridge script:**
   - Open Developer Console (F12)
   - Copy ALL contents of `src/browser-bridge/bridge-mock.js` (for testing)
   - Paste into console and press Enter
   - You should see:
     - "CCC BRIDGE ACTIVE" green badge in top-right
     - READ and WRITE buttons remain visible
     - Console message: "[CCC Bridge Mock] Bridge active!"

4. **Calibrate button positions:**
   ```cmd
   cd tools
   javac CalibrateButtons.java
   java CalibrateButtons
   ```
   - Click on the READ button when prompted
   - Click on the WRITE button when prompted
   - Copy and run the generated calibration command

5. **Test the system:**
   ```powershell
   $body = @{message="Test message"} | ConvertTo-Json
   Invoke-RestMethod -Uri "http://localhost:5555/api/chat" -Method Post -Body $body -ContentType "application/json"
   ```

## What to Expect

When working correctly:
1. Java agent will click the READ button several times
2. READ button flashes yellow when request is found
3. Java agent clicks WRITE button
4. WRITE button flashes green when response is written
5. You get a response in PowerShell

## Console Output

Watch the browser console (F12) for:
- `[CCC Bridge Mock] READ button clicked by user/robot`
- `[CCC Bridge Mock] Found CCC_REQUEST!`
- `[CCC Bridge Mock] Writing response for request: <id>`

## Button-Based Approach

The system now uses a standardized button-based approach:
- **READ Button**: Clicked multiple times to poll for clipboard requests
- **WRITE Button**: Clicked once to trigger clipboard write operation

This approach is more reliable than coordinate-based clicking and provides visual feedback.

## Calibration Tools

Two calibration tools are available:

1. **CalibrateButtons.java**: Interactive tool with countdown timer
   - Provides 3-second countdown before capturing positions
   - Shows captured coordinates
   - Generates exact calibration command

2. **QuickCalibrate.java**: Simpler immediate capture
   - Click buttons without countdown
   - Good for quick recalibration

## Troubleshooting

### "Buttons not found" error
- Make sure you're on the correct URL
- Ensure you used bridge-mock.js (not bridge.js) for testing
- Check that buttons are visible on the page

### Buttons disappear / green screen
- You used the wrong script (bridge.js instead of bridge-mock.js)
- Refresh page and inject bridge-mock.js for testing

### No clicks happening
- Run calibration again - window may have moved
- Check coordinator is running (port 5555)
- Verify Java agent compiled successfully
- Check Windows permissions for mouse control

### Incorrect button positions
- Use CalibrateButtons.java for more accurate capture
- Ensure browser window doesn't move after calibration
- Try maximizing browser window for consistency