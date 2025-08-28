// CCC Browser Bridge Script - Auto-Calibration Version
// This creates a full-page overlay that handles calibration and AI requests
(function() {
  'use strict';
  
  console.log('[CCC Bridge] Initializing auto-calibration bridge...');
  
  // Configuration
  const CONFIG = {
    colors: {
      calibrating: '#1a1a2e',
      ready: '#16213e',
      processing: '#0f3460',
      success: '#53bf9d',
      error: '#e94560'
    }
  };
  
  // State
  let bridgeState = 'calibrating'; // calibrating, ready, processing
  let lastRequest = null;
  let clickCount = 0;
  
  // Remove any existing bridge
  const existing = document.getElementById('ccc-bridge-overlay');
  if (existing) existing.remove();
  
  // Create full-page overlay
  const overlay = document.createElement('div');
  overlay.id = 'ccc-bridge-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: ${CONFIG.colors.calibrating};
    z-index: 999999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.3s;
    font-family: 'Courier New', monospace;
    color: white;
  `;
  
  // Create status display
  const statusDisplay = document.createElement('div');
  statusDisplay.style.cssText = `
    text-align: center;
    padding: 40px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  `;
  
  const title = document.createElement('h1');
  title.style.cssText = `
    margin: 0 0 20px 0;
    font-size: 36px;
    font-weight: bold;
  `;
  title.textContent = 'CCC Bridge';
  
  const status = document.createElement('div');
  status.style.cssText = `
    font-size: 24px;
    margin-bottom: 10px;
  `;
  status.textContent = 'Click anywhere to calibrate';
  
  const info = document.createElement('div');
  info.style.cssText = `
    font-size: 16px;
    opacity: 0.8;
  `;
  info.textContent = 'The coordinator will detect this click and save your position';
  
  statusDisplay.appendChild(title);
  statusDisplay.appendChild(status);
  statusDisplay.appendChild(info);
  overlay.appendChild(statusDisplay);
  
  // Add click counter
  const clickCounter = document.createElement('div');
  clickCounter.style.cssText = `
    position: absolute;
    bottom: 20px;
    right: 20px;
    font-size: 14px;
    opacity: 0.6;
  `;
  clickCounter.textContent = 'Clicks: 0';
  overlay.appendChild(clickCounter);
  
  // Update display based on state
  function updateDisplay(state, message = '') {
    bridgeState = state;
    
    switch (state) {
      case 'calibrating':
        overlay.style.background = CONFIG.colors.calibrating;
        status.textContent = 'Click anywhere to calibrate';
        info.textContent = 'The coordinator will detect this click and save your position';
        break;
        
      case 'ready':
        overlay.style.background = CONFIG.colors.ready;
        status.textContent = 'Bridge Ready';
        info.textContent = 'Waiting for AI requests...';
        break;
        
      case 'processing':
        overlay.style.background = CONFIG.colors.processing;
        status.textContent = 'Processing AI Request';
        info.textContent = message || 'Please wait...';
        break;
        
      case 'success':
        overlay.style.background = CONFIG.colors.success;
        status.textContent = 'Success!';
        info.textContent = message || 'Response sent';
        setTimeout(() => updateDisplay('ready'), 2000);
        break;
        
      case 'error':
        overlay.style.background = CONFIG.colors.error;
        status.textContent = 'Error';
        info.textContent = message || 'Something went wrong';
        setTimeout(() => updateDisplay('ready'), 3000);
        break;
    }
  }
  
  // Handle clicks
  overlay.addEventListener('click', async (e) => {
    clickCount++;
    clickCounter.textContent = `Clicks: ${clickCount}`;
    console.log(`[CCC Bridge] Click #${clickCount} at ${e.clientX}, ${e.clientY}`);
    
    if (bridgeState === 'calibrating') {
      // Put calibration message in clipboard
      try {
        const calibrationMsg = JSON.stringify({
          type: 'CCC_CALIBRATION',
          x: e.clientX,
          y: e.clientY,
          timestamp: Date.now()
        }) + '|||CCC_END|||';
        
        await navigator.clipboard.writeText(calibrationMsg);
        console.log('[CCC Bridge] Calibration coordinates written to clipboard');
        updateDisplay('ready');
        
      } catch (err) {
        console.error('[CCC Bridge] Failed to write calibration:', err);
        updateDisplay('error', 'Clipboard access failed');
      }
      return;
    }
    
    // Check clipboard for requests
    if (bridgeState === 'ready') {
      try {
        const clipboardText = await navigator.clipboard.readText();
        
        if (clipboardText.includes('CCC_REQUEST')) {
          const requestEnd = clipboardText.indexOf('|||CCC_END|||');
          if (requestEnd > 0) {
            const requestJson = clipboardText.substring(0, requestEnd);
            lastRequest = JSON.parse(requestJson);
            console.log('[CCC Bridge] Found request:', lastRequest.id, lastRequest.action);
            
            updateDisplay('processing', `Processing ${lastRequest.action} request...`);
            
            // Simulate AI API call
            setTimeout(async () => {
              try {
                const response = {
                  type: 'BROWSER_RESPONSE',
                  id: lastRequest.id,
                  timestamp: Date.now(),
                  status: 'success',
                  payload: {
                    content: `AI Response: ${lastRequest.payload.prompt}\n\nThis is a simulated response from the Claude API. In production, this would make a real API call.`,
                    model: 'claude-3-opus',
                    tokens: 42
                  }
                };
                
                const responseText = JSON.stringify(response) + '|||BROWSER_END|||';
                await navigator.clipboard.writeText(responseText);
                
                console.log('[CCC Bridge] Response written to clipboard');
                updateDisplay('success', 'Response sent to coordinator');
                lastRequest = null;
                
              } catch (err) {
                console.error('[CCC Bridge] Failed to write response:', err);
                updateDisplay('error', 'Failed to write response');
              }
            }, 2000); // Simulate API delay
          }
        }
      } catch (err) {
        console.error('[CCC Bridge] Error checking clipboard:', err);
      }
    }
  });
  
  // Add to page
  document.body.appendChild(overlay);
  
  // Log status
  console.log('[CCC Bridge] Full-page overlay created');
  console.log('[CCC Bridge] Waiting for calibration click...');
  
  // Export for debugging
  window.CCCBridge = {
    getState: () => ({ state: bridgeState, clicks: clickCount, lastRequest }),
    recalibrate: () => updateDisplay('calibrating'),
    remove: () => overlay.remove()
  };
})();