// CCC Browser Bridge Script
// This script is injected into the internal Claude UI console
(function() {
  'use strict';
  
  console.log('[CCC Bridge] Initializing...');
  
  // Configuration
  const CONFIG = {
    pollInterval: 100,
    maxPollDuration: 30000,
    clickTargetSize: '100%',
    colors: {
      ready: '#003300',
      processing: '#333300',
      error: '#330000',
      success: '#003333'
    }
  };
  
  // State
  let bridgeActive = false;
  let lastClipboard = '';
  let processingRequest = false;
  let activeRequest = null;
  
  // Create visual overlay
  function createOverlay() {
    // Remove existing overlay
    const existing = document.getElementById('ccc-overlay');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'ccc-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: ${CONFIG.clickTargetSize};
      height: ${CONFIG.clickTargetSize};
      background: ${CONFIG.colors.ready};
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color 0.3s;
      font-family: monospace;
    `;
    
    const status = document.createElement('div');
    status.id = 'ccc-status';
    status.style.cssText = `
      color: white;
      font-size: 48px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    `;
    status.textContent = 'CCC BRIDGE READY - CLICK TO POLL';
    
    overlay.appendChild(status);
    document.body.appendChild(overlay);
    
    // Add click handler
    overlay.addEventListener('click', handleClick);
    
    return overlay;
  }
  
  // Update visual status
  function setStatus(state, message) {
    const overlay = document.getElementById('ccc-overlay');
    const status = document.getElementById('ccc-status');
    
    if (overlay) {
      overlay.style.background = CONFIG.colors[state] || CONFIG.colors.ready;
    }
    
    if (status) {
      const messages = {
        ready: 'CCC BRIDGE READY - CLICK TO POLL',
        processing: 'PROCESSING REQUEST...',
        error: 'ERROR - CHECK CONSOLE',
        success: 'SUCCESS - RESPONSE SENT'
      };
      status.textContent = message || messages[state] || 'UNKNOWN STATE';
    }
  }
  
  // Calculate checksum
  function calculateChecksum(data) {
    // Simple hash for demo (in production, use crypto.subtle.digest)
    let hash = 0;
    const str = JSON.stringify(data);
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'sha256-' + Math.abs(hash).toString(16);
  }
  
  // Handle click event
  async function handleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!bridgeActive) {
      console.log('[CCC Bridge] Bridge not active');
      return;
    }
    
    if (processingRequest) {
      console.log('[CCC Bridge] Already processing a request');
      return;
    }
    
    try {
      // Read clipboard
      const clipboardText = await navigator.clipboard.readText();
      
      if (!clipboardText || clipboardText === lastClipboard) {
        console.log('[CCC Bridge] No new clipboard content');
        return;
      }
      
      lastClipboard = clipboardText;
      
      // Check for CCC request
      if (!clipboardText.includes('CCC_REQUEST')) {
        console.log('[CCC Bridge] Not a CCC request');
        return;
      }
      
      console.log('[CCC Bridge] Processing CCC request');
      setStatus('processing');
      processingRequest = true;
      
      // Parse request
      const requestText = clipboardText.split('|||CCC_END|||')[0];
      const request = JSON.parse(requestText);
      
      // Validate checksum
      const expectedChecksum = request.checksum;
      delete request.checksum;
      const actualChecksum = calculateChecksum(request);
      request.checksum = expectedChecksum;
      
      if (expectedChecksum !== actualChecksum) {
        console.warn('[CCC Bridge] Checksum mismatch');
      }
      
      activeRequest = request;
      console.log('[CCC Bridge] Request:', request.action, request.id);
      
      // Send acknowledgment
      await navigator.clipboard.writeText(`|||BROWSER_ACK:${request.id}|||`);
      
      // Process request
      let response;
      
      switch (request.action) {
        case 'chat':
          response = await handleChatRequest(request.payload);
          break;
          
        case 'continue':
          response = await handleContinueRequest(request.payload);
          break;
          
        case 'cancel':
          response = await handleCancelRequest();
          break;
          
        default:
          throw new Error(`Unknown action: ${request.action}`);
      }
      
      // Send response
      await sendResponse(request.id, 'success', response);
      
      console.log('[CCC Bridge] Request completed successfully');
      setStatus('success');
      
    } catch (error) {
      console.error('[CCC Bridge] Error:', error);
      setStatus('error', error.message);
      
      if (activeRequest) {
        await sendResponse(activeRequest.id, 'error', {
          error: error.message,
          stack: error.stack
        });
      }
      
    } finally {
      processingRequest = false;
      activeRequest = null;
      setTimeout(() => setStatus('ready'), 2000);
    }
  }
  
  // Send response to clipboard
  async function sendResponse(requestId, status, payload) {
    const response = {
      type: 'BROWSER_RESPONSE',
      id: requestId,
      timestamp: Date.now(),
      status: status,
      payload: payload
    };
    
    response.checksum = calculateChecksum(response);
    
    const responseText = JSON.stringify(response) + '|||BROWSER_END|||';
    await navigator.clipboard.writeText(responseText);
    
    console.log('[CCC Bridge] Response written to clipboard');
  }
  
  // Send progress update for streaming
  async function sendProgress(requestId, accumulated, chunk) {
    const progress = {
      type: 'BROWSER_PROGRESS',
      id: requestId,
      timestamp: Date.now(),
      status: 'streaming',
      payload: {
        accumulated: accumulated,
        chunk: chunk
      }
    };
    
    progress.checksum = calculateChecksum(progress);
    
    const progressText = JSON.stringify(progress) + '|||BROWSER_PROGRESS|||';
    await navigator.clipboard.writeText(progressText);
  }
  
  // Handle chat request (3-step API flow)
  async function handleChatRequest(payload) {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    console.log('[CCC Bridge] Step 1: Creating new chat');
    
    // Step 1: Create new chat
    const userMessage = {
      id: generateUUID(),
      role: 'user',
      content: payload.message,
      parentId: null,
      childrenIds: [],
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    const createPayload = {
      message: userMessage,
      timestamp: Date.now()
    };
    
    const createResponse = await fetch('/api/v1/chats/new', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createPayload)
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create chat: ${createResponse.status}`);
    }
    
    const chat = await createResponse.json();
    console.log('[CCC Bridge] Chat created:', chat.id);
    
    // Step 2a: Get conversation state
    console.log('[CCC Bridge] Step 2a: Getting conversation state');
    
    const stateResponse = await fetch(`/api/v1/chats/${chat.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!stateResponse.ok) {
      throw new Error(`Failed to get conversation state: ${stateResponse.status}`);
    }
    
    let state = await stateResponse.json();
    
    // Step 2b: Create assistant message slot if needed
    if (!state.history?.messages || Object.keys(state.history.messages).length === 1) {
      console.log('[CCC Bridge] Step 2b: Creating assistant message slot');
      
      const assistantMessage = {
        id: generateUUID(),
        role: 'assistant',
        content: '',
        parentId: userMessage.id,
        childrenIds: [],
        timestamp: Math.floor(Date.now() / 1000)
      };
      
      // Update state
      state.messages = state.messages || [];
      state.messages.push(assistantMessage);
      
      state.history = state.history || { messages: {} };
      state.history.messages[assistantMessage.id] = assistantMessage;
      state.history.currentId = assistantMessage.id;
      
      // Update parent's children
      if (state.history.messages[userMessage.id]) {
        state.history.messages[userMessage.id].childrenIds.push(assistantMessage.id);
      }
      
      // POST updated state
      const updateResponse = await fetch(`/api/v1/chats/${chat.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(state)
      });
      
      if (!updateResponse.ok) {
        throw new Error(`Failed to update conversation: ${updateResponse.status}`);
      }
      
      state = await updateResponse.json();
    }
    
    // Step 3: Stream completions
    console.log('[CCC Bridge] Step 3: Streaming completions');
    
    const assistantId = state.history.currentId;
    
    const streamPayload = {
      chat_id: chat.id,
      id: assistantId,
      session_id: '11111111111111111111',
      stream: true,
      model: payload.model || 'claude-3-opus',
      temperature: payload.temperature || 0.7
    };
    
    const streamResponse = await fetch('/api/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(streamPayload)
    });
    
    if (!streamResponse.ok) {
      throw new Error(`Failed to stream completions: ${streamResponse.status}`);
    }
    
    // Handle SSE stream
    const reader = streamResponse.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            
            if (data.choices?.[0]?.delta?.content) {
              const chunk = data.choices[0].delta.content;
              accumulated += chunk;
              
              // Send progress update
              if (activeRequest) {
                await sendProgress(activeRequest.id, accumulated, chunk);
              }
            }
            
            if (data.choices?.[0]?.finish_reason === 'stop') {
              console.log('[CCC Bridge] Stream completed');
            }
            
          } catch (e) {
            console.warn('[CCC Bridge] Failed to parse SSE data:', e);
          }
        }
      }
    }
    
    return {
      chat_id: chat.id,
      assistant_id: assistantId,
      content: accumulated,
      finish_reason: 'stop'
    };
  }
  
  // Handle continue request
  async function handleContinueRequest(payload) {
    // Similar to chat request but continues existing conversation
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    // Implementation would follow similar pattern to chat request
    // but use existing chat_id and create new message pair
    
    return {
      content: 'Continue functionality to be implemented',
      chat_id: payload.chat_id
    };
  }
  
  // Handle cancel request
  async function handleCancelRequest() {
    // Cancel any ongoing operations
    processingRequest = false;
    activeRequest = null;
    
    return {
      status: 'cancelled'
    };
  }
  
  // Generate UUID v4
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  // Initialize bridge
  function initialize() {
    console.log('[CCC Bridge] Creating overlay');
    createOverlay();
    
    bridgeActive = true;
    setStatus('ready');
    
    console.log('[CCC Bridge] Bridge active and ready');
    console.log('[CCC Bridge] Token:', localStorage.getItem('token') ? 'Found' : 'Not found');
  }
  
  // Auto-initialize after a short delay
  setTimeout(initialize, 1000);
  
  // Export for debugging
  window.CCCBridge = {
    activate: () => { bridgeActive = true; setStatus('ready'); },
    deactivate: () => { bridgeActive = false; setStatus('error', 'BRIDGE INACTIVE'); },
    status: () => ({ active: bridgeActive, processing: processingRequest }),
    test: () => handleClick({ preventDefault: () => {}, stopPropagation: () => {} })
  };
  
})();