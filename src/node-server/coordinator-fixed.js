const { spawn } = require('child_process');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

// Configuration
const CONFIG = {
  javaAgentPath: path.join(__dirname, '..', 'java-agent', 'agent.jar'),
  serverPort: process.env.COORDINATOR_PORT || 5555,
  clickInterval: 500, // Slower, more deliberate clicks
  maxClickDuration: 30000,
  // Two button positions for the fixed UI
  readButtonPosition: { x: 500, y: 400 }, // Position of READ button
  writeButtonPosition: { x: 700, y: 400 }, // Position of WRITE button
  requestTimeout: 30000
};

// State management
class CoordinatorState {
  constructor() {
    this.javaAgent = null;
    this.pendingRequests = new Map();
    this.isProcessing = false;
    this.calibrated = false;
    this.buttonPositions = {
      read: CONFIG.readButtonPosition,
      write: CONFIG.writeButtonPosition
    };
    this.stats = {
      requestsSent: 0,
      responsesReceived: 0,
      errors: 0,
      startTime: Date.now()
    };
  }
}

const state = new CoordinatorState();

// Java agent management
function startJavaAgent() {
  return new Promise((resolve, reject) => {
    console.log('[Coordinator] Starting Java agent...');
    
    const jarPath = CONFIG.javaAgentPath;
    if (!fs.existsSync(jarPath)) {
      console.error('[Coordinator] agent.jar not found. Please compile the Java agent first.');
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
      console.log(`[Coordinator] Java agent exited with code ${code}`);
      state.javaAgent = null;
      
      if (code !== 0) {
        console.log('[Coordinator] Attempting to restart Java agent...');
        setTimeout(() => startJavaAgent(), 2000);
      }
    });
    
    setTimeout(() => {
      sendJavaCommand({ cmd: 'PING' });
      resolve();
    }, 1000);
  });
}

// Send command to Java agent
function sendJavaCommand(command) {
  if (!state.javaAgent) {
    console.error('[Coordinator] Java agent not running');
    return false;
  }
  
  const commandStr = JSON.stringify(command) + '\n';
  state.javaAgent.stdin.write(commandStr);
  console.log('[Coordinator] Sent to Java:', command.cmd);
  return true;
}

// Handle response from Java agent
function handleJavaResponse(response) {
  console.log('[Coordinator] Java response:', response.type);
  
  switch (response.type) {
    case 'pong':
      console.log('[Coordinator] Java agent is responsive');
      break;
      
    case 'clipboard_content':
      checkClipboardForResponse(response.data);
      break;
      
    case 'click_loop_complete':
      handleClickLoopComplete(response.data);
      break;
  }
}

// Generate UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

// Calculate checksum
function calculateChecksum(data) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(data));
  return 'sha256-' + hash.digest('hex');
}

// Send request through clipboard bridge with button approach
async function sendClipboardRequest(action, payload) {
  return new Promise((resolve, reject) => {
    const requestId = generateUUID();
    const request = {
      type: 'CCC_REQUEST',
      id: requestId,
      timestamp: Date.now(),
      action: action,
      payload: payload
    };
    
    request.checksum = calculateChecksum(request);
    
    state.pendingRequests.set(requestId, {
      request: request,
      resolve: resolve,
      reject: reject,
      startTime: Date.now(),
      retries: 0
    });
    
    setTimeout(() => {
      if (state.pendingRequests.has(requestId)) {
        state.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
        state.stats.errors++;
      }
    }, CONFIG.requestTimeout);
    
    executeButtonFlow(request);
    state.stats.requestsSent++;
  });
}

// Execute the button-based clipboard flow
async function executeButtonFlow(request) {
  try {
    state.isProcessing = true;
    
    console.log('[Coordinator] Starting button-based flow for request:', request.id);
    
    // Step 1: Save current clipboard
    sendJavaCommand({ cmd: 'SAVE_CLIPBOARD' });
    await sleep(100);
    
    // Step 2: Set request in clipboard
    const requestText = JSON.stringify(request) + '|||CCC_END|||';
    sendJavaCommand({ cmd: 'SET_CLIPBOARD', data: requestText });
    await sleep(200);
    
    // Step 3: Click READ button (multiple times to ensure it reads)
    console.log('[Coordinator] Clicking READ button...');
    for (let i = 0; i < 3; i++) {
      sendJavaCommand({
        cmd: 'CLICK_LOOP',
        x: state.buttonPositions.read.x,
        y: state.buttonPositions.read.y,
        interval: 500,
        maxDuration: 2000 // Click for 2 seconds
      });
      await sleep(2500);
      sendJavaCommand({ cmd: 'STOP_CLICKING' });
      await sleep(500);
    }
    
    // Step 4: Click WRITE button to get response
    console.log('[Coordinator] Clicking WRITE button...');
    for (let i = 0; i < 3; i++) {
      sendJavaCommand({
        cmd: 'CLICK_LOOP',
        x: state.buttonPositions.write.x,
        y: state.buttonPositions.write.y,
        interval: 500,
        maxDuration: 2000
      });
      await sleep(2500);
      sendJavaCommand({ cmd: 'STOP_CLICKING' });
      
      // Check clipboard for response
      sendJavaCommand({ cmd: 'GET_CLIPBOARD' });
      await sleep(500);
    }
    
    // Step 5: Final cleanup after timeout
    setTimeout(() => {
      sendJavaCommand({ cmd: 'RESTORE_CLIPBOARD' });
      state.isProcessing = false;
    }, 15000);
    
  } catch (error) {
    console.error('[Coordinator] Button flow error:', error);
    state.isProcessing = false;
    
    sendJavaCommand({ cmd: 'STOP_CLICKING' });
    sendJavaCommand({ cmd: 'RESTORE_CLIPBOARD' });
  }
}

// Check clipboard content for response
function checkClipboardForResponse(clipboardContent) {
  if (!clipboardContent) return;
  
  if (clipboardContent.includes('BROWSER_RESPONSE')) {
    try {
      const responseText = clipboardContent.split('|||BROWSER_END|||')[0];
      const response = JSON.parse(responseText);
      
      console.log('[Coordinator] Received response for:', response.id);
      
      const pending = state.pendingRequests.get(response.id);
      if (pending) {
        sendJavaCommand({ cmd: 'RESTORE_CLIPBOARD' });
        
        pending.resolve(response);
        state.pendingRequests.delete(response.id);
        state.stats.responsesReceived++;
        state.isProcessing = false;
      }
      
    } catch (e) {
      console.error('[Coordinator] Failed to parse response:', e);
    }
  }
}

// Handle click loop completion
function handleClickLoopComplete(data) {
  console.log('[Coordinator] Click loop completed:', data);
}

// Calibrate button positions
function calibrateButtons(readX, readY, writeX, writeY) {
  state.buttonPositions.read = { x: readX, y: readY };
  state.buttonPositions.write = { x: writeX, y: writeY };
  state.calibrated = true;
  console.log('[Coordinator] Button positions calibrated:', state.buttonPositions);
  return true;
}

// Utility: sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// HTTP server for testing and control
function startHttpServer() {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    try {
      switch (pathname) {
        case '/':
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>CCC Coordinator (Fixed) Running</h1>');
          break;
          
        case '/api/status':
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            javaAgent: state.javaAgent ? 'active' : 'inactive',
            processing: state.isProcessing,
            calibrated: state.calibrated,
            buttonPositions: state.buttonPositions,
            stats: state.stats,
            pendingRequests: state.pendingRequests.size
          }));
          break;
          
        case '/api/calibrate':
          // Expects: ?readX=X&readY=Y&writeX=X&writeY=Y
          const { readX, readY, writeX, writeY } = parsedUrl.query;
          if (readX && readY && writeX && writeY) {
            calibrateButtons(
              parseInt(readX), parseInt(readY),
              parseInt(writeX), parseInt(writeY)
            );
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, positions: state.buttonPositions }));
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Need readX, readY, writeX, writeY parameters' }));
          }
          break;
          
        case '/api/chat':
          if (req.method === 'POST') {
            const body = await parseBody(req);
            
            if (!state.calibrated) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Buttons not calibrated' }));
              return;
            }
            
            try {
              const response = await sendClipboardRequest('chat', {
                message: body.message || 'Hello'
              });
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(response));
              
            } catch (error) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: error.message }));
            }
          } else {
            res.writeHead(405);
            res.end();
          }
          break;
          
        default:
          res.writeHead(404);
          res.end('Not found');
      }
      
    } catch (error) {
      console.error('[Server] Error:', error);
      res.writeHead(500);
      res.end('Internal server error');
    }
  });
  
  server.listen(CONFIG.serverPort, () => {
    console.log(`[Coordinator] HTTP server running on port ${CONFIG.serverPort}`);
  });
}

// Parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Main initialization
async function initialize() {
  console.log('[Coordinator-Fixed] Starting with button-based approach...');
  console.log('[Coordinator-Fixed] Configuration:', CONFIG);
  
  try {
    await startJavaAgent();
    startHttpServer();
    
    sendJavaCommand({ cmd: 'SET_STATUS', message: 'CCC Ready (Fixed)' });
    
    console.log('[Coordinator-Fixed] Initialization complete');
    console.log('[Coordinator-Fixed] Calibrate buttons at:');
    console.log(`  http://localhost:${CONFIG.serverPort}/api/calibrate?readX=X&readY=Y&writeX=X&writeY=Y`);
    
  } catch (error) {
    console.error('[Coordinator-Fixed] Initialization failed:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n[Coordinator] Shutting down...');
  
  if (state.javaAgent) {
    sendJavaCommand({ cmd: 'RESTORE_CLIPBOARD' });
    state.javaAgent.kill();
  }
  
  process.exit(0);
});

// Start the coordinator
initialize();