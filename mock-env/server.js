const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.MOCK_PORT || 5556;

// In-memory storage
const conversations = new Map();
const tokens = new Set(['mock-token-12345']);

// Helper to parse JSON body
async function parseBody(req) {
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

// CORS headers for browser access
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Validate auth token
function validateAuth(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return false;
  return tokens.has(auth.substring(7));
}

// Generate message structure
function createMessage(content, role, parentId = null) {
  const id = crypto.randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);
  
  return {
    id,
    role,
    content,
    parentId,
    childrenIds: [],
    timestamp
  };
}

// Handle requests
const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);
  
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Serve UI page
  if (pathname === '/' && req.method === 'GET') {
    const htmlPath = path.join(__dirname, 'ui.html');
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync(htmlPath));
    } else {
      res.writeHead(404);
      res.end('UI page not found');
    }
    return;
  }
  
  // API endpoints
  if (!validateAuth(req) && pathname.startsWith('/api/')) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }
  
  try {
    // Create new chat
    if (pathname === '/api/v1/chats/new' && req.method === 'POST') {
      const body = await parseBody(req);
      const chatId = 'mock-conv-' + Date.now();
      
      const userMessage = createMessage(
        body.message || 'Hello',
        'user',
        null
      );
      
      const conversation = {
        id: chatId,
        created_at: Math.floor(Date.now() / 1000),
        user_id: 'mock-user-123',
        messages: [userMessage],
        history: {
          messages: {
            [userMessage.id]: userMessage
          },
          currentId: userMessage.id
        },
        timestamp: Date.now()
      };
      
      conversations.set(chatId, conversation);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: chatId,
        created_at: conversation.created_at,
        user_id: conversation.user_id
      }));
      return;
    }
    
    // Get conversation state
    if (pathname.match(/^\/api\/v1\/chats\/[^\/]+$/) && req.method === 'GET') {
      const chatId = pathname.split('/').pop();
      const conversation = conversations.get(chatId);
      
      if (!conversation) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Conversation not found' }));
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(conversation));
      return;
    }
    
    // Update conversation
    if (pathname.match(/^\/api\/v1\/chats\/[^\/]+$/) && req.method === 'POST') {
      const chatId = pathname.split('/').pop();
      const conversation = conversations.get(chatId);
      
      if (!conversation) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Conversation not found' }));
        return;
      }
      
      const body = await parseBody(req);
      
      // Update conversation with new data
      if (body.messages) {
        conversation.messages = body.messages;
      }
      if (body.history) {
        conversation.history = body.history;
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(conversation));
      return;
    }
    
    // Stream completions (SSE)
    if (pathname === '/api/chat/completions' && req.method === 'POST') {
      const body = await parseBody(req);
      
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      
      // Simulate streaming response
      const chunks = [
        'Hello! ',
        'This is ',
        'a mock ',
        'streaming ',
        'response ',
        'from the ',
        'CCC mock ',
        'server.'
      ];
      
      let chunkIndex = 0;
      const interval = setInterval(() => {
        if (chunkIndex < chunks.length) {
          const data = {
            id: String(chunkIndex + 1),
            choices: [{
              delta: { content: chunks[chunkIndex] }
            }]
          };
          res.write(`data: ${JSON.stringify(data)}\n\n`);
          chunkIndex++;
        } else {
          const finalData = {
            id: String(chunkIndex + 1),
            choices: [{
              finish_reason: 'stop'
            }]
          };
          res.write(`data: ${JSON.stringify(finalData)}\n\n`);
          res.end();
          clearInterval(interval);
        }
      }, 100); // 100ms between chunks
      
      return;
    }
    
    // 404 for unknown routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

server.listen(PORT, () => {
  console.log(`Mock API server running at http://localhost:${PORT}`);
  console.log('Mock token: mock-token-12345');
});