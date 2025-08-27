# CCC Testing Guide

## Important: Use the Right Bridge Script!

### For Testing with Mock UI (buttons visible):
Use `src/browser-bridge/bridge-mock.js`
- Keeps the buttons visible
- Enhances existing button functionality
- Shows "CCC BRIDGE ACTIVE" indicator

### For Production (full screen overlay):
Use `src/browser-bridge/bridge.js`
- Creates full-screen green overlay
- Handles all click events

## Testing Steps

1. **Start Windows components:**
   ```cmd
   start-windows.bat
   ```

2. **Open Mock UI:**
   Go to http://dailyernest.com:5556

3. **Inject the MOCK bridge script:**
   - Open F12 Console
   - Copy ALL contents of `src/browser-bridge/bridge-mock.js`
   - Paste into console
   - You should see:
     - "CCC BRIDGE ACTIVE" green badge in top-right
     - Buttons remain visible
     - Console message: "[CCC Bridge Mock] Bridge active!"

4. **Calibrate button positions:**
   ```cmd
   calibrate.bat
   ```
   - Follow prompts to capture button positions
   - Run the generated command

5. **Test:**
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

## Troubleshooting

### "Buttons not found" error
- Make sure you're on http://dailyernest.com:5556
- Don't use bridge.js, use bridge-mock.js

### Buttons disappear / green screen
- You used the wrong script (bridge.js instead of bridge-mock.js)
- Refresh page and use bridge-mock.js

### No clicks happening
- Check calibration is correct
- Make sure coordinator is running (check the command window)
- Verify Java agent is running (system tray icon)