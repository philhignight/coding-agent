// CCC Browser Bridge Script - Mock UI Version
// This version works with the button-based mock UI for testing
(function() {
  'use strict';
  
  console.log('[CCC Bridge Mock] Initializing for button-based UI...');
  
  // State
  let bridgeActive = false;
  let lastRequest = null;
  let clickCount = 0;
  
  // Find the buttons
  const readBtn = document.getElementById('clipboard-read-btn');
  const writeBtn = document.getElementById('clipboard-write-btn');
  
  if (!readBtn || !writeBtn) {
    console.error('[CCC Bridge Mock] Buttons not found! Make sure you\'re on the mock UI page.');
    return;
  }
  
  console.log('[CCC Bridge Mock] Found buttons, enhancing...');
  
  // Enhanced click handler for READ button
  const originalReadClick = readBtn.onclick;
  readBtn.onclick = async function(e) {
    console.log('[CCC Bridge Mock] READ button clicked by', e.isTrusted ? 'user/robot' : 'script');
    
    // Call original handler if exists
    if (originalReadClick) originalReadClick.call(this, e);
    
    // Our enhancement - check for CCC requests
    if (bridgeActive) {
      clickCount++;
      console.log('[CCC Bridge Mock] Checking clipboard for CCC_REQUEST...');
      
      try {
        const clipboardText = await navigator.clipboard.readText();
        
        if (clipboardText.includes('CCC_REQUEST')) {
          console.log('[CCC Bridge Mock] Found CCC_REQUEST!');
          const requestEnd = clipboardText.indexOf('|||CCC_END|||');
          if (requestEnd > 0) {
            const requestJson = clipboardText.substring(0, requestEnd);
            lastRequest = JSON.parse(requestJson);
            console.log('[CCC Bridge Mock] Parsed request:', lastRequest.id, lastRequest.action);
            
            // Visual feedback
            readBtn.style.background = '#ffc107';
            setTimeout(() => {
              readBtn.style.background = '#28a745';
            }, 500);
          }
        }
      } catch (err) {
        console.error('[CCC Bridge Mock] Error reading clipboard:', err);
      }
    }
  };
  
  // Enhanced click handler for WRITE button
  const originalWriteClick = writeBtn.onclick;
  writeBtn.onclick = async function(e) {
    console.log('[CCC Bridge Mock] WRITE button clicked by', e.isTrusted ? 'user/robot' : 'script');
    
    // Call original handler if exists
    if (originalWriteClick) originalWriteClick.call(this, e);
    
    // Our enhancement - write response if we have a request
    if (bridgeActive && lastRequest) {
      console.log('[CCC Bridge Mock] Writing response for request:', lastRequest.id);
      
      try {
        const response = {
          type: 'BROWSER_RESPONSE',
          id: lastRequest.id,
          timestamp: Date.now(),
          status: 'success',
          payload: {
            content: 'Mock response via bridge script - buttons working!',
            chat_id: 'mock-' + Date.now(),
            clickCount: clickCount,
            trusted: e.isTrusted
          }
        };
        
        const responseText = JSON.stringify(response) + '|||BROWSER_END|||';
        await navigator.clipboard.writeText(responseText);
        
        console.log('[CCC Bridge Mock] Response written to clipboard');
        
        // Visual feedback
        writeBtn.style.background = '#28a745';
        setTimeout(() => {
          writeBtn.style.background = '#17a2b8';
        }, 500);
        
        // Clear the request
        lastRequest = null;
        
      } catch (err) {
        console.error('[CCC Bridge Mock] Error writing clipboard:', err);
      }
    }
  };
  
  // Add visual indicator
  const indicator = document.createElement('div');
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    padding: 10px 20px;
    background: #28a745;
    color: white;
    border-radius: 5px;
    font-family: monospace;
    font-weight: bold;
    z-index: 10000;
  `;
  indicator.textContent = 'CCC BRIDGE ACTIVE';
  document.body.appendChild(indicator);
  
  // Activate bridge
  bridgeActive = true;
  
  console.log('[CCC Bridge Mock] Bridge active! The existing buttons will now handle CCC requests.');
  console.log('[CCC Bridge Mock] Calibrate the button positions and start testing.');
  
  // Export for debugging
  window.CCCBridgeMock = {
    status: () => ({ active: bridgeActive, clickCount, lastRequest }),
    deactivate: () => { bridgeActive = false; indicator.style.background = '#dc3545'; }
  };
})();