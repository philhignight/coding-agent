const { spawn } = require('child_process');
const readline = require('readline');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  javaAgentPath: path.join(__dirname, '..', 'java-agent', 'agent.jar'),
  calibrationPollInterval: 1000,
  calibrationTimeout: 30000,
  clickPosition: null // Will be set during calibration
};

// State
const state = {
  javaAgent: null,
  calibrated: false,
  calibrationStartTime: null
};

// Start Java agent
async function startJavaAgent() {
  return new Promise((resolve, reject) => {
    console.log('[Demo] Starting Java agent...');
    
    const jarPath = CONFIG.javaAgentPath;
    if (!fs.existsSync(jarPath)) {
      console.error('[Demo] agent.jar not found. Please compile first.');
      reject(new Error('Java agent not found'));
      return;
    }
    
    state.javaAgent = spawn('java', ['-jar', jarPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const rl = readline.createInterface({
      input: state.javaAgent.stdout,
      crlfDelay: Infinity
    });
    
    rl.on('line', (line) => {
      try {
        const response = JSON.parse(line);
        handleJavaResponse(response);
      } catch (e) {
        console.log('[Java Agent]', line);
      }
    });
    
    state.javaAgent.stderr.on('data', (data) => {
      console.error('[Java Agent Error]', data.toString());
    });
    
    state.javaAgent.on('exit', (code) => {
      console.log(`[Demo] Java agent exited with code ${code}`);
      state.javaAgent = null;
    });
    
    setTimeout(() => {
      sendJavaCommand({ cmd: 'SET_STATUS', message: 'CCC Demo - Waiting for calibration' });
      resolve();
    }, 1000);
  });
}

// Send command to Java agent
function sendJavaCommand(command) {
  if (!state.javaAgent) {
    console.error('[Demo] Java agent not running');
    return false;
  }
  
  const commandStr = JSON.stringify(command) + '\n';
  state.javaAgent.stdin.write(commandStr);
  return true;
}

// Handle Java agent responses
function handleJavaResponse(response) {
  switch (response.type) {
    case 'clipboard_content':
      checkClipboardContent(response.data);
      break;
      
    case 'mouse_position':
      console.log('[Demo] Current mouse position:', response.data);
      break;
      
    default:
      console.log('[Demo] Java response:', response);
  }
}

// Check clipboard for calibration message
function checkClipboardContent(content) {
  if (!content) return;
  
  // Check for calibration message
  if (content.includes('CCC_CALIBRATION') && !state.calibrated) {
    try {
      const msgEnd = content.indexOf('|||CCC_END|||');
      if (msgEnd > 0) {
        const calibrationData = JSON.parse(content.substring(0, msgEnd));
        console.log('[Demo] Calibration received! Position:', calibrationData.x, calibrationData.y);
        
        // Save the click position
        CONFIG.clickPosition = { x: calibrationData.x, y: calibrationData.y };
        state.calibrated = true;
        
        // Update status
        sendJavaCommand({ cmd: 'SET_STATUS', message: 'CCC Demo - Calibrated! Sending AI request...' });
        
        // Clear clipboard
        sendJavaCommand({ cmd: 'SET_CLIPBOARD', data: '' });
        
        // Send AI request after short delay
        setTimeout(() => sendAIRequest(), 2000);
      }
    } catch (e) {
      console.error('[Demo] Failed to parse calibration:', e);
    }
  }
  
  // Check for AI response
  if (content.includes('BROWSER_RESPONSE')) {
    try {
      const msgEnd = content.indexOf('|||BROWSER_END|||');
      if (msgEnd > 0) {
        const response = JSON.parse(content.substring(0, msgEnd));
        console.log('\n[Demo] Received AI Response!');
        console.log('================================');
        console.log('Response ID:', response.id);
        console.log('Status:', response.status);
        console.log('Content:', response.payload.content);
        console.log('================================\n');
        
        // Stop polling
        if (state.responseFound) {
          state.responseFound();
        }
        
        // Update status
        sendJavaCommand({ cmd: 'SET_STATUS', message: 'CCC Demo - Success! Check console for response.' });
        
        // Clear clipboard and exit after delay
        setTimeout(() => {
          sendJavaCommand({ cmd: 'SET_CLIPBOARD', data: '' });
          console.log('[Demo] Demo completed successfully!');
          process.exit(0);
        }, 3000);
      }
    } catch (e) {
      console.error('[Demo] Failed to parse response:', e);
    }
  }
}

// Poll clipboard for calibration
async function pollForCalibration() {
  console.log('[Demo] Starting calibration polling...');
  console.log('[Demo] Please paste bridge-calibrate.js in your browser console');
  console.log('[Demo] Then click anywhere on the page to calibrate\n');
  
  state.calibrationStartTime = Date.now();
  
  const pollInterval = setInterval(() => {
    if (state.calibrated) {
      clearInterval(pollInterval);
      return;
    }
    
    // Check if timeout
    if (Date.now() - state.calibrationStartTime > CONFIG.calibrationTimeout) {
      console.error('[Demo] Calibration timeout!');
      clearInterval(pollInterval);
      process.exit(1);
    }
    
    // Poll clipboard
    sendJavaCommand({ cmd: 'GET_CLIPBOARD' });
    
  }, CONFIG.calibrationPollInterval);
}

// Send AI request through bridge
async function sendAIRequest() {
  if (!CONFIG.clickPosition) {
    console.error('[Demo] No calibration position!');
    return;
  }
  
  console.log('[Demo] Sending AI request...');
  
  // Create request
  const request = {
    type: 'CCC_REQUEST',
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    action: 'ai-complete',
    payload: {
      prompt: 'Write a haiku about clipboard bridges between programs',
      max_tokens: 100,
      temperature: 0.7
    }
  };
  
  // Calculate checksum
  request.checksum = 'sha256-' + crypto.createHash('sha256')
    .update(JSON.stringify(request))
    .digest('hex');
  
  const requestText = JSON.stringify(request) + '|||CCC_END|||';
  
  // Set clipboard
  sendJavaCommand({ cmd: 'SET_CLIPBOARD', data: requestText });
  
  // Wait longer for clipboard to be set
  setTimeout(() => {
    console.log('[Demo] Request in clipboard, starting clicks...');
    console.log('[Demo] Clicking at calibrated position:', CONFIG.clickPosition);
    
    // Single click first to check clipboard
    sendJavaCommand({
      cmd: 'CLICK_LOOP',
      x: CONFIG.clickPosition.x,
      y: CONFIG.clickPosition.y,
      interval: 100,
      maxDuration: 100  // Just one quick click
    });
    
    // Then start polling for response
    setTimeout(() => pollForResponse(), 1000);
    
  }, 2000); // Wait 2 seconds after setting clipboard
}

// Poll for AI response
function pollForResponse() {
  console.log('[Demo] Waiting for AI response...');
  
  let responseFound = false;
  
  // Poll clipboard
  const pollInterval = setInterval(() => {
    if (!responseFound) {
      sendJavaCommand({ cmd: 'GET_CLIPBOARD' });
    }
  }, 500);
  
  // Also click periodically to trigger bridge
  let clickCount = 0;
  const clickInterval = setInterval(() => {
    if (!responseFound && clickCount < 10) {
      console.log('[Demo] Clicking again to check for response...');
      sendJavaCommand({
        cmd: 'CLICK_LOOP',
        x: CONFIG.clickPosition.x,
        y: CONFIG.clickPosition.y,
        interval: 100,
        maxDuration: 100
      });
      clickCount++;
    } else if (responseFound || clickCount >= 10) {
      clearInterval(clickInterval);
    }
  }, 2000);
  
  // Store intervals in state for cleanup
  state.responseFound = () => {
    responseFound = true;
    clearInterval(pollInterval);
    clearInterval(clickInterval);
  };
  
  // Timeout after 30 seconds
  setTimeout(() => {
    if (!responseFound) {
      clearInterval(pollInterval);
      clearInterval(clickInterval);
      console.error('[Demo] Response timeout!');
      process.exit(1);
    }
  }, 30000);
}

// Main
async function main() {
  console.log('================================');
  console.log('CCC Demo - AI Bridge Test');
  console.log('================================\n');
  
  try {
    // Start Java agent
    await startJavaAgent();
    
    // Start calibration polling
    await pollForCalibration();
    
  } catch (error) {
    console.error('[Demo] Fatal error:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n[Demo] Shutting down...');
  
  if (state.javaAgent) {
    sendJavaCommand({ cmd: 'SET_CLIPBOARD', data: '' });
    state.javaAgent.kill();
  }
  
  process.exit(0);
});

// Start demo
main();