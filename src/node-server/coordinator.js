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
  clickInterval: 100,
  maxClickDuration: 30000,
  clickPosition: { x: 500, y: 500 }, // Default, should be calibrated
  requestTimeout: 30000
};

// State management
class CoordinatorState {
  constructor() {
    this.javaAgent = null;
    this.pendingRequests = new Map();
    this.isProcessing = false;
    this.calibrated = false;
    this.browserPosition = CONFIG.clickPosition;
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
    
    // Check if agent.jar exists
    const jarPath = CONFIG.javaAgentPath;
    if (!fs.existsSync(jarPath)) {
      console.error('[Coordinator] agent.jar not found. Please compile the Java agent first.');
      reject(new Error('Java agent not found'));
      return;
    }
    
    // Spawn Java process
    state.javaAgent = spawn('java', ['-jar', jarPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Handle Java agent output
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
    
    // Handle Java agent errors
    state.javaAgent.stderr.on('data', (data) => {
      console.error('[Java Agent Error]', data.toString());
    });
    
    // Handle Java agent exit
    state.javaAgent.on('exit', (code) => {
      console.log(`[Coordinator] Java agent exited with code ${code}`);
      state.javaAgent = null;
      
      // Auto-restart if unexpected exit
      if (code !== 0) {
        console.log('[Coordinator] Attempting to restart Java agent...');
        setTimeout(() => startJavaAgent(), 2000);
      }
    });
    
    // Test connection
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
  
  // Handle specific response types
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
      
    default:
      // Generic response handling
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

// Send request through clipboard bridge
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
    
    // Store pending request
    state.pendingRequests.set(requestId, {
      request: request,
      resolve: resolve,
      reject: reject,
      startTime: Date.now(),
      retries: 0
    });
    
    // Set timeout
    setTimeout(() => {
      if (state.pendingRequests.has(requestId)) {
        state.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
        state.stats.errors++;
      }
    }, CONFIG.requestTimeout);
    
    // Start the clipboard bridge flow
    executeClipboardFlow(request);
    state.stats.requestsSent++;
  });
}

// Execute clipboard bridge flow
async function executeClipboardFlow(request) {
  try {
    state.isProcessing = true;
    
    console.log('[Coordinator] Starting clipboard flow for request:', request.id);
    
    // Step 1: Save current clipboard
    sendJavaCommand({ cmd: 'SAVE_CLIPBOARD' });
    await sleep(100);
    
    // Step 2: Save mouse position
    sendJavaCommand({ cmd: 'SAVE_MOUSE' });
    await sleep(100);
    
    // Step 3: Set request in clipboard
    const requestText = JSON.stringify(request) + '|||CCC_END|||';
    sendJavaCommand({ cmd: 'SET_CLIPBOARD', data: requestText });
    await sleep(100);
    
    // Step 4: Start click loop
    sendJavaCommand({
      cmd: 'CLICK_LOOP',
      x: state.browserPosition.x,
      y: state.browserPosition.y,
      interval: CONFIG.clickInterval,
      maxDuration: CONFIG.maxClickDuration
    });
    
    // Step 5: Start polling for response
    pollForResponse(request.id);
    
  } catch (error) {
    console.error('[Coordinator] Clipboard flow error:', error);
    state.isProcessing = false;
    
    // Cleanup
    sendJavaCommand({ cmd: 'STOP_CLICKING' });
    sendJavaCommand({ cmd: 'RESTORE_CLIPBOARD' });
    sendJavaCommand({ cmd: 'RESTORE_MOUSE' });
  }
}

// Poll for response in clipboard
function pollForResponse(requestId) {
  const pollInterval = setInterval(() => {
    sendJavaCommand({ cmd: 'GET_CLIPBOARD' });
  }, 500);
  
  // Stop polling after timeout
  setTimeout(() => {
    clearInterval(pollInterval);
    
    // Cleanup
    sendJavaCommand({ cmd: 'STOP_CLICKING' });
    sendJavaCommand({ cmd: 'RESTORE_CLIPBOARD' });
    sendJavaCommand({ cmd: 'RESTORE_MOUSE' });
    
    state.isProcessing = false;
  }, CONFIG.requestTimeout);
}

// Check clipboard content for response
function checkClipboardForResponse(clipboardContent) {
  if (!clipboardContent) return;
  
  // Check for acknowledgment
  if (clipboardContent.includes('|||BROWSER_ACK:')) {
    const ackId = clipboardContent.match(/\|\|\|BROWSER_ACK:([^|]+)\|\|\|/)?.[1];
    console.log('[Coordinator] Received ACK for:', ackId);
    return;
  }
  
  // Check for progress update
  if (clipboardContent.includes('BROWSER_PROGRESS')) {
    try {
      const progressText = clipboardContent.split('|||BROWSER_PROGRESS|||')[0];
      const progress = JSON.parse(progressText);
      console.log('[Coordinator] Progress update:', progress.payload?.accumulated?.length, 'chars');
    } catch (e) {
      // Ignore parse errors
    }
    return;
  }
  
  // Check for final response
  if (clipboardContent.includes('BROWSER_RESPONSE')) {
    try {
      const responseText = clipboardContent.split('|||BROWSER_END|||')[0];
      const response = JSON.parse(responseText);
      
      console.log('[Coordinator] Received response for:', response.id);
      
      // Find pending request
      const pending = state.pendingRequests.get(response.id);
      if (pending) {
        // Stop clicking
        sendJavaCommand({ cmd: 'STOP_CLICKING' });
        
        // Restore clipboard and mouse
        sendJavaCommand({ cmd: 'RESTORE_CLIPBOARD' });
        sendJavaCommand({ cmd: 'RESTORE_MOUSE' });
        
        // Resolve request
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
  
  // Restore state
  sendJavaCommand({ cmd: 'RESTORE_CLIPBOARD' });
  sendJavaCommand({ cmd: 'RESTORE_MOUSE' });
  
  state.isProcessing = false;
}

// Calibrate browser position
function calibrateBrowser(x, y) {
  state.browserPosition = { x, y };
  state.calibrated = true;
  console.log('[Coordinator] Browser position calibrated:', state.browserPosition);
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
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    try {
      // API endpoints
      switch (pathname) {
        case '/':
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>CCC Coordinator Running</h1><p>Java Agent: ' + 
                  (state.javaAgent ? 'Active' : 'Inactive') + '</p>');
          break;
          
        case '/api/status':
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            javaAgent: state.javaAgent ? 'active' : 'inactive',
            processing: state.isProcessing,
            calibrated: state.calibrated,
            stats: state.stats,
            pendingRequests: state.pendingRequests.size
          }));
          break;
          
        case '/api/calibrate':
          const { x, y } = parsedUrl.query;
          if (x && y) {
            calibrateBrowser(parseInt(x), parseInt(y));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, position: state.browserPosition }));
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing x or y parameter' }));
          }
          break;
          
        case '/api/chat':
          if (req.method === 'POST') {
            const body = await parseBody(req);
            
            if (!state.calibrated) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Browser not calibrated' }));
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
          
        case '/api/test':
          // Test clipboard bridge
          sendJavaCommand({ cmd: 'SET_CLIPBOARD', data: 'Test from coordinator' });
          setTimeout(() => {
            sendJavaCommand({ cmd: 'GET_CLIPBOARD' });
          }, 100);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ test: 'initiated' }));
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
  console.log('[Coordinator] CCC Node.js Coordinator Starting...');
  console.log('[Coordinator] Configuration:', CONFIG);
  
  try {
    // Start Java agent
    await startJavaAgent();
    
    // Start HTTP server
    startHttpServer();
    
    // Set initial status
    sendJavaCommand({ cmd: 'SET_STATUS', message: 'CCC Ready' });
    
    console.log('[Coordinator] Initialization complete');
    console.log(`[Coordinator] Please calibrate browser position at http://localhost:${CONFIG.serverPort}/api/calibrate?x=X&y=Y`);
    
  } catch (error) {
    console.error('[Coordinator] Initialization failed:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n[Coordinator] Shutting down...');
  
  if (state.javaAgent) {
    sendJavaCommand({ cmd: 'RESTORE_CLIPBOARD' });
    sendJavaCommand({ cmd: 'RESTORE_MOUSE' });
    state.javaAgent.kill();
  }
  
  process.exit(0);
});

// Start the coordinator
initialize();