// CCC Browser Bridge Script - Real API Flow Version
// This follows the actual Claude API flow from SPEC.md
(function() {
  'use strict';
  
  console.log('[CCC Bridge API] Initializing with real API flow...');
  
  // Configuration
  const CONFIG = {
    apiBase: window.location.origin, // Use same origin as the page
    colors: {
      calibrating: '#1a1a2e',
      ready: '#16213e',
      processing: '#0f3460',
      streaming: '#2d5016',
      success: '#53bf9d',
      error: '#e94560'
    },
    sessionId: '11111111111111111111' // 20 ones as per spec
  };
  
  // State
  let bridgeState = 'calibrating';
  let lastRequest = null;
  let clickCount = 0;
  
  // Get auth token from localStorage (mock server sets this)
  const authToken = localStorage.getItem('token') || 'mock-token-12345';
  
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
    max-width: 600px;
  `;
  
  const title = document.createElement('h1');
  title.style.cssText = `margin: 0 0 20px 0; font-size: 36px;`;
  title.textContent = 'CCC Bridge API';
  
  const status = document.createElement('div');
  status.style.cssText = `font-size: 24px; margin-bottom: 10px;`;
  status.textContent = 'Click to calibrate';
  
  const info = document.createElement('div');
  info.style.cssText = `font-size: 16px; opacity: 0.8;`;
  info.textContent = 'Ready for calibration';
  
  const streamingContent = document.createElement('div');
  streamingContent.style.cssText = `
    margin-top: 20px;
    padding: 20px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 5px;
    text-align: left;
    font-size: 14px;
    max-height: 200px;
    overflow-y: auto;
    display: none;
  `;
  
  statusDisplay.appendChild(title);
  statusDisplay.appendChild(status);
  statusDisplay.appendChild(info);
  statusDisplay.appendChild(streamingContent);
  overlay.appendChild(statusDisplay);
  
  // Helper functions
  function updateDisplay(state, message = '', showStreaming = false) {
    bridgeState = state;
    overlay.style.background = CONFIG.colors[state] || CONFIG.colors.ready;
    status.textContent = state.charAt(0).toUpperCase() + state.slice(1);
    info.textContent = message;
    streamingContent.style.display = showStreaming ? 'block' : 'none';
  }
  
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  // API Functions following the spec
  async function createNewChat(prompt) {
    const userMessageId = generateUUID();
    const timestamp = Math.floor(Date.now() / 1000);
    
    const body = {
      message: prompt,
      messages: [{
        id: userMessageId,
        role: 'user',
        content: prompt,
        parentId: null,
        childrenIds: [],
        timestamp: timestamp
      }],
      history: {
        messages: {
          [userMessageId]: {
            id: userMessageId,
            role: 'user',
            content: prompt,
            parentId: null,
            childrenIds: [],
            timestamp: timestamp
          }
        },
        currentId: userMessageId
      },
      timestamp: Date.now() // 13-digit for chat
    };
    
    const response = await fetch(`${CONFIG.apiBase}/api/v1/chats/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) throw new Error(`Chat creation failed: ${response.status}`);
    return await response.json();
  }
  
  async function getConversationState(chatId) {
    const response = await fetch(`${CONFIG.apiBase}/api/v1/chats/${chatId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) throw new Error(`Get state failed: ${response.status}`);
    return await response.json();
  }
  
  async function createAssistantMessage(chatId, conversation, parentMessageId) {
    const assistantId = generateUUID();
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Clone conversation data
    const updatedConv = JSON.parse(JSON.stringify(conversation));
    
    // Create assistant message
    const assistantMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      parentId: parentMessageId,
      childrenIds: [],
      timestamp: timestamp
    };
    
    // Add to messages array
    updatedConv.messages.push(assistantMessage);
    
    // Add to history.messages
    updatedConv.history.messages[assistantId] = assistantMessage;
    
    // Update parent's childrenIds
    if (updatedConv.history.messages[parentMessageId]) {
      updatedConv.history.messages[parentMessageId].childrenIds.push(assistantId);
    }
    
    // Update currentId
    updatedConv.history.currentId = assistantId;
    
    const response = await fetch(`${CONFIG.apiBase}/api/v1/chats/${chatId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(updatedConv)
    });
    
    if (!response.ok) throw new Error(`Update failed: ${response.status}`);
    return assistantId;
  }
  
  async function streamCompletion(chatId, messageId, onChunk) {
    const body = {
      session_uuid: CONFIG.sessionId,
      chat_id: chatId,
      id: messageId,
      stream: true,
      model: 'claude-3-opus',
      max_tokens: 1000,
      temperature: 0.7
    };
    
    const response = await fetch(`${CONFIG.apiBase}/api/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) throw new Error(`Stream failed: ${response.status}`);
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.choices?.[0]?.delta?.content) {
              accumulated += data.choices[0].delta.content;
              onChunk(accumulated, false);
            }
            if (data.choices?.[0]?.finish_reason === 'stop') {
              onChunk(accumulated, true);
              return accumulated;
            }
          } catch (e) {
            console.error('[CCC Bridge API] Parse error:', e);
          }
        }
      }
    }
    
    return accumulated;
  }
  
  // Process AI request using real API flow
  async function processAIRequest(request) {
    try {
      updateDisplay('processing', 'Step 1: Creating new chat...');
      
      // Step 1: Create new chat
      const chatData = await createNewChat(request.payload.prompt);
      const chatId = chatData.id;
      console.log('[CCC Bridge API] Created chat:', chatId);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      updateDisplay('processing', 'Step 2: Getting conversation state...');
      
      // Step 2: Get conversation state and create assistant message
      const conversation = await getConversationState(chatId);
      const userMessageId = conversation.messages[0].id;
      
      const assistantId = await createAssistantMessage(chatId, conversation, userMessageId);
      console.log('[CCC Bridge API] Created assistant message:', assistantId);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      updateDisplay('streaming', 'Step 3: Streaming response...', true);
      
      // Step 3: Stream completion
      let finalContent = '';
      streamingContent.textContent = '';
      
      finalContent = await streamCompletion(chatId, assistantId, (content, isComplete) => {
        streamingContent.textContent = content;
        streamingContent.scrollTop = streamingContent.scrollHeight;
        
        if (!isComplete) {
          // Send progress update
          const progressResponse = {
            type: 'BROWSER_PROGRESS',
            id: request.id,
            status: 'streaming',
            payload: {
              accumulated: content,
              chatId: chatId,
              messageId: assistantId
            }
          };
          // In real implementation, we'd write this to clipboard periodically
        }
      });
      
      // Return final response
      return {
        type: 'BROWSER_RESPONSE',
        id: request.id,
        timestamp: Date.now(),
        status: 'success',
        payload: {
          content: finalContent,
          chatId: chatId,
          messageId: assistantId,
          model: 'claude-3-opus'
        }
      };
      
    } catch (error) {
      console.error('[CCC Bridge API] Error:', error);
      return {
        type: 'BROWSER_RESPONSE',
        id: request.id,
        timestamp: Date.now(),
        status: 'error',
        payload: {
          error: error.message
        }
      };
    }
  }
  
  // Handle clicks
  overlay.addEventListener('click', async (e) => {
    clickCount++;
    console.log(`[CCC Bridge API] Click #${clickCount} at ${e.clientX}, ${e.clientY}`);
    
    if (bridgeState === 'calibrating') {
      try {
        const calibrationMsg = JSON.stringify({
          type: 'CCC_CALIBRATION',
          clicked: true,
          timestamp: Date.now()
        }) + '|||CCC_END|||';
        
        await navigator.clipboard.writeText(calibrationMsg);
        console.log('[CCC Bridge API] Calibration click written to clipboard');
        updateDisplay('ready', 'Waiting for AI requests...');
        
      } catch (err) {
        console.error('[CCC Bridge API] Calibration failed:', err);
        updateDisplay('error', 'Clipboard access failed');
      }
      return;
    }
    
    if (bridgeState === 'ready') {
      try {
        const clipboardText = await navigator.clipboard.readText();
        console.log('[CCC Bridge API] Clipboard content:', clipboardText.substring(0, 100) + '...');
        
        if (clipboardText.includes('CCC_REQUEST')) {
          const requestEnd = clipboardText.indexOf('|||CCC_END|||');
          if (requestEnd > 0) {
            const requestJson = clipboardText.substring(0, requestEnd);
            lastRequest = JSON.parse(requestJson);
            console.log('[CCC Bridge API] Found request:', lastRequest.id);
            
            // Process using real API
            const response = await processAIRequest(lastRequest);
            
            // Write response to clipboard
            const responseText = JSON.stringify(response) + '|||BROWSER_END|||';
            await navigator.clipboard.writeText(responseText);
            
            console.log('[CCC Bridge API] Response written to clipboard');
            updateDisplay('success', 'Response sent!');
            
            setTimeout(() => updateDisplay('ready', 'Waiting for AI requests...'), 3000);
          }
        } else {
          console.log('[CCC Bridge API] No CCC_REQUEST found in clipboard');
        }
      } catch (err) {
        console.error('[CCC Bridge API] Error:', err);
        updateDisplay('error', err.message);
      }
    }
  });
  
  // Add to page
  document.body.appendChild(overlay);
  
  // Set mock token if needed
  if (!localStorage.getItem('token')) {
    localStorage.setItem('token', 'mock-token-12345');
  }
  
  console.log('[CCC Bridge API] Ready with real API flow');
  
  // Export for debugging
  window.CCCBridgeAPI = {
    getState: () => ({ state: bridgeState, clicks: clickCount, lastRequest }),
    recalibrate: () => updateDisplay('calibrating'),
    remove: () => overlay.remove()
  };
})();