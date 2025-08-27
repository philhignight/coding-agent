# Claude Code Clone (CCC) - System Design Specification

## Executive Summary
A Windows-based clone of Claude Code that interfaces with an internal Claude web UI through an unconventional bridge using clipboard polling and mouse automation, necessitated by strict security restrictions that prevent direct API access or browser extensions.

## System Architecture

### Core Components

#### 1. **CCC Web Server** (Node.js)
- **Purpose**: Main application server and user interface
- **Responsibilities**:
  - Serve web-based IDE interface
  - Manage file system operations
  - Coordinate communication with Java agent
  - Handle WebSocket connections for real-time UI updates
- **Communication**: 
  - Spawns and controls Java agent via stdin/stdout
  - Serves HTTP/WebSocket to user's browser

#### 2. **Java System Tray Agent**
- **Purpose**: Native OS operations that Node.js cannot perform
- **Responsibilities**:
  - Clipboard read/write operations
  - Mouse position capture and movement
  - Automated clicking
  - System tray icon for status/control
- **Communication**:
  - Receives JSON commands via stdin from Node.js
  - Sends JSON responses via stdout

#### 3. **Browser Bridge Script**
- **Purpose**: Interface between clipboard protocol and internal Claude API
- **Responsibilities**:
  - Poll clipboard via click events
  - Make API calls to internal Claude backend
  - Handle SSE streaming responses
  - Manage authentication token
- **Communication**:
  - Reads requests from clipboard
  - Writes responses to clipboard
  - Uses internal API endpoints

#### 4. **CCC Web UI** (Browser Client)
- **Purpose**: User interface for code editing and chat
- **Responsibilities**:
  - Code editor (Monaco)
  - File tree navigation
  - Chat interface
  - Terminal output display
- **Communication**:
  - WebSocket connection to CCC Web Server

## Communication Protocol

### Clipboard Message Format

```json
// Request (CCC → Browser)
{
  "type": "CCC_REQUEST",
  "id": "uuid-v4",
  "timestamp": 1234567890,
  "action": "chat|continue|cancel",
  "payload": {
    // Action-specific data
  },
  "checksum": "sha256-hash"
}
|||CCC_END|||

// Response (Browser → CCC)
{
  "type": "BROWSER_RESPONSE",
  "id": "matching-request-id",
  "timestamp": 1234567891,
  "status": "success|error|streaming",
  "payload": {
    // Response data or error details
  },
  "checksum": "sha256-hash"
}
|||BROWSER_END|||
```

### Button-Based Triggering
The system uses two dedicated buttons for clipboard operations:
- **READ Button**: Clicked multiple times to poll for requests
- **WRITE Button**: Clicked once to trigger response write

### Java Agent Command Protocol

```json
// Commands (Node → Java)
{"cmd": "SAVE_CLIPBOARD"}
{"cmd": "SET_CLIPBOARD", "data": "content"}
{"cmd": "GET_CLIPBOARD"}
{"cmd": "SAVE_MOUSE"}
{"cmd": "CLICK_LOOP", "x": 100, "y": 200, "interval": 100, "maxDuration": 30000}
{"cmd": "STOP_CLICKING"}
{"cmd": "RESTORE_MOUSE"}
{"cmd": "SET_STATUS", "message": "Processing..."}
```

## Risk Mitigation Strategies

### 1. Clipboard Conflict Management
- **Risk**: User clipboard operations interfere with bridge communication
- **Strategies**:
  - **S1.1**: Save and restore clipboard contents before/after operations
  - **S1.2**: Visual indicator in system tray when clipboard is in use
  - **S1.3**: Hotkey to pause/resume bridge operations
  - **S1.4**: Clipboard operation timeout (30 seconds max)
  - **S1.5**: Automatic clipboard restoration on any error

### 2. Browser Focus and Click Reliability
- **Risk**: Browser loses focus, clicks don't register, wrong window clicked
- **Strategies**:
  - **S2.1**: Dedicated READ/WRITE buttons with visual feedback
  - **S2.2**: Color-coded button states (green=ready, yellow=processing)
  - **S2.3**: Button calibration tool with countdown timer
  - **S2.4**: Multiple READ clicks to ensure request detection
  - **S2.5**: Audio feedback for successful operations (optional)

### 3. Message Integrity and Ordering
- **Risk**: Clipboard corruption, duplicate messages, out-of-order processing
- **Strategies**:
  - **S3.1**: SHA-256 checksums on all messages
  - **S3.2**: Unique request IDs with timestamp
  - **S3.3**: Request/response correlation via ID matching
  - **S3.4**: State machine to prevent invalid transitions
  - **S3.5**: Message expiration (ignore if timestamp > 60 seconds old)

### 4. Large Payload Handling
- **Risk**: Clipboard size limitations, memory issues with large responses
- **Strategies**:
  - **S4.1**: Chunk protocol for payloads > 1MB
  - **S4.2**: Compression for large messages (gzip)
  - **S4.3**: Progressive streaming for SSE responses
  - **S4.4**: File-based fallback for extremely large data
  - **S4.5**: Response size limits with user notification

### 5. Authentication and Session Management
- **Risk**: Token expiration, session timeout, authentication failures
- **Strategies**:
  - **S5.1**: Token refresh mechanism in browser script
  - **S5.2**: Token validation before operations
  - **S5.3**: User notification for auth failures
  - **S5.4**: Automatic re-authentication prompt
  - **S5.5**: Secure token storage (not in clipboard)

### 6. Error Recovery and Resilience
- **Risk**: Component crashes, network failures, unexpected states
- **Strategies**:
  - **S6.1**: Exponential backoff for retries
  - **S6.2**: Circuit breaker pattern for API calls
  - **S6.3**: Graceful degradation of features
  - **S6.4**: Automatic Java agent restart on crash
  - **S6.5**: State persistence for recovery
  - **S6.6**: Comprehensive error logging

### 7. Performance and Resource Management
- **Risk**: High CPU usage from polling, memory leaks, system slowdown
- **Strategies**:
  - **S7.1**: Adaptive polling intervals based on activity
  - **S7.2**: Resource usage monitoring and limits
  - **S7.3**: Cleanup of old messages and data
  - **S7.4**: Efficient clipboard polling (only on click)
  - **S7.5**: Process priority management

## Implementation Phases

### Phase 1: Proof of Concept (Week 1-2)
**Goal**: Validate clipboard bridge and basic communication

**Components**:
- Basic Java agent with clipboard and mouse operations
- Simple browser script with click detection
- Minimal Node.js coordinator
- Command-line interface for testing

**Mitigations Implemented**:
- S1.1 (Save/restore clipboard)
- S2.1 (Full-screen click target)
- S2.3 (Initial calibration)
- S3.1 (Checksums)
- S3.2 (Request IDs)
- S6.6 (Error logging)

**Success Criteria**:
- Successfully send message from Node → Browser via clipboard
- Receive response from Browser → Node
- Complete one full API call cycle

### Phase 2: Core Functionality (Week 3-4)
**Goal**: Implement complete API flow and streaming

**Components**:
- Full API integration (3-step chat flow)
- SSE streaming support
- Basic web UI with chat interface
- WebSocket communication
- System tray integration

**Mitigations Added**:
- S1.2 (Visual indicators)
- S1.4 (Operation timeouts)
- S2.2 (Color-coded states)
- S2.4 (Continuous clicking)
- S3.3 (ID correlation)
- S3.4 (State machine)
- S4.3 (Progressive streaming)
- S5.2 (Token validation)
- S6.1 (Exponential backoff)
- S7.4 (Efficient polling)

**Success Criteria**:
- Complete conversation with streaming responses
- Stable clipboard bridge for 30+ minutes
- Basic UI for chat interaction

### Phase 3: IDE Features (Week 5-6)
**Goal**: Add code editing and file management

**Components**:
- Monaco editor integration
- File tree and operations
- Project management
- Code syntax highlighting
- Basic Git operations

**Mitigations Added**:
- S1.3 (Pause/resume hotkey)
- S1.5 (Auto clipboard restoration)
- S3.5 (Message expiration)
- S4.1 (Chunk protocol)
- S5.3 (Auth failure notifications)
- S6.2 (Circuit breaker)
- S6.4 (Auto agent restart)
- S6.5 (State persistence)
- S7.1 (Adaptive polling)
- S7.3 (Cleanup routines)

**Success Criteria**:
- Edit and save files
- Navigate project structure
- Syntax highlighting works
- Can handle 100+ file projects

### Phase 4: Production Hardening (Week 7-8)
**Goal**: Reliability, performance, and user experience

**Components**:
- Comprehensive error handling
- Performance optimizations
- User preferences/settings
- Advanced UI features
- Installation/setup automation

**Mitigations Added**:
- S2.5 (Audio feedback)
- S4.2 (Compression)
- S4.4 (File-based fallback)
- S4.5 (Size limits)
- S5.1 (Token refresh)
- S5.4 (Re-auth prompt)
- S5.5 (Secure token storage)
- S6.3 (Graceful degradation)
- S7.2 (Resource monitoring)
- S7.5 (Process priority)

**Success Criteria**:
- 99% success rate for operations
- Handle 8-hour work sessions
- Graceful handling of all error cases
- Intuitive user experience

## Setup and Calibration Process

### Initial Setup (One-time)
1. Install Node.js and Java runtime
2. Run CCC installer
3. System tray icon appears
4. Open internal Claude UI in browser
5. Navigate to second monitor
6. Run browser bridge script in console
7. Browser shows green full-screen overlay
8. Return to primary monitor

### Session Calibration (Per-session)
1. Start CCC components
2. Run calibration tool (CalibrateButtons.java)
3. Tool shows 3-second countdown
4. User clicks READ button when prompted
5. User clicks WRITE button when prompted
6. Tool generates calibration command
7. User runs calibration command
8. System shows "Ready" status

## Failure Modes and Recovery

### Scenario 1: Browser Script Crashes
- **Detection**: No response within timeout
- **Recovery**: 
  1. Stop clicking
  2. Restore mouse position
  3. Show error in UI
  4. Prompt user to restart browser script

### Scenario 2: Java Agent Crashes
- **Detection**: Node.js loses stdin/stdout connection
- **Recovery**:
  1. Automatic restart attempt (3 times)
  2. If fails, prompt user to check Java installation
  3. Offer diagnostic information

### Scenario 3: Clipboard Conflict
- **Detection**: Unexpected clipboard content
- **Recovery**:
  1. Immediate restore of saved clipboard
  2. Retry with exponential backoff
  3. If persistent, pause and notify user

### Scenario 4: API Rate Limiting
- **Detection**: 429 errors from API
- **Recovery**:
  1. Implement request queue
  2. Show queue status in UI
  3. Respect retry-after headers
  4. Gradual request rate reduction

## Performance Targets

- **Latency**: < 500ms for clipboard round-trip
- **Click Interval**: 100ms (10 clicks/second)
- **Timeout**: 30 seconds for any operation
- **Memory Usage**: < 200MB for Java agent, < 500MB for Node.js
- **CPU Usage**: < 5% idle, < 25% active
- **Clipboard Size**: Support up to 10MB payloads
- **Streaming**: Handle 100KB/s SSE streams

## Security Considerations

1. **Token Management**: Never log or display tokens
2. **Clipboard Sanitization**: Clean sensitive data immediately
3. **Process Isolation**: Run components with minimal privileges
4. **Audit Logging**: Log all API operations (without sensitive data)
5. **Validation**: Validate all inter-process messages

## Testing Strategy

### Unit Tests
- Clipboard protocol encoding/decoding
- Checksum calculation
- State machine transitions
- API request formatting

### Integration Tests
- Full message round-trip
- Error recovery scenarios
- Large payload handling
- Concurrent request handling

### System Tests
- 8-hour stability test
- Multi-project switching
- Network interruption recovery
- Resource limitation testing

### User Acceptance Tests
- Setup process completion
- Basic coding workflow
- Chat interaction patterns
- Error message clarity

## Mock Environment Specification

### Purpose
Create a local development environment that mimics the production internal Claude UI and API, allowing full testing without accessing the actual internal system.

### Mock API Server (Node.js/Express)

```javascript
// Mock server structure - key endpoints to implement
POST   /api/v1/chats/new          // Create conversation
GET    /api/v1/chats/:id          // Get conversation state  
POST   /api/v1/chats/:id          // Update conversation
POST   /api/chat/completions      // Stream completions (SSE)
```

### Mock Authentication
- Serve a mock localStorage with token: `{"token": "mock-token-12345"}`
- Accept "Bearer mock-token-12345" in Authorization headers
- No actual validation, just presence check

### Mock UI Page
Create a minimal HTML page that:
1. Stores mock token in localStorage
2. Provides same-origin API endpoints
3. Allows bridge script injection
4. Simulates the internal UI URL structure
5. Includes READ and WRITE buttons for clipboard operations
6. Provides visual feedback when buttons are clicked

### Mock Data Flows

#### Chat Creation Response
```json
{
  "id": "mock-conv-[timestamp]",
  "created_at": 1704067200,
  "user_id": "mock-user-123"
}
```

#### Conversation State Response
Must include proper message structure with:
- Nested history object with messages map
- Parent/children ID relationships  
- Correct timestamp formats (10-digit for messages, 13-digit for chat)
- Empty assistant message slot creation

#### SSE Streaming Response
```
data: {"id":"1","choices":[{"delta":{"content":"Hello"}}]}

data: {"id":"2","choices":[{"delta":{"content":" there"}}]}

data: {"id":"3","choices":[{"finish_reason":"stop"}]}
```

### Mock Testing Scenarios

1. **Happy Path**: Complete conversation flow
2. **Slow Response**: Delayed SSE chunks (500ms between)
3. **Large Response**: 10KB+ response text
4. **Error Responses**: 429 rate limit, 401 auth, 500 server error
5. **Token Expiration**: Token becomes invalid after N requests
6. **Network Interruption**: Connection drops mid-stream
7. **Malformed Response**: Invalid JSON, missing fields

### Development Environment Setup

```
/ccc-project
  /mock-env
    server.js           # Express mock API server
    ui.html            # Mock internal UI page
    fixtures/          # Sample conversations
    scenarios/         # Scripted test scenarios
  /src
    /node-server       # CCC Node.js server
    /java-agent        # System tray agent
    /browser-bridge    # Injection script
    /web-ui           # CCC web interface
  /tests
    /integration      # Full flow tests
    /stress          # Performance tests
```

## API Flow Details (from Documentation)

### Critical Implementation Notes

#### Step 1: Create New Chat
- Must include user message with proper structure
- Message ID should be UUID format
- Parent ID is null for first message
- Timestamp is 10-digit (seconds) for messages
- Chat timestamp is 13-digit (milliseconds)

#### Step 2: Two-Part Process
**Step 2a - GET current state:**
- Poll until assistant message appears in response
- OR create our own assistant message slot (Step 2b)

**Step 2b - POST with assistant message:**
- Generate new UUID for assistant message
- Add to both `messages` array AND `history.messages` object  
- Update parent's `childrenIds` array
- Set `history.currentId` to new assistant ID
- Maintain parent/child chain integrity

#### Step 3: Stream Completions
- Session ID: Use `"11111111111111111111"` (20 ones)
- Include both `chat_id` and assistant message `id`
- Set `stream: true` for SSE response
- Handle chunks until `finish_reason: "stop"`
- Accumulate content from all chunks

### SSE Streaming Handler Design

```javascript
// Pseudo-code for SSE handling in browser bridge
const eventSource = new EventSource(url);
let accumulated = '';

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.choices?.[0]?.delta?.content) {
    accumulated += data.choices[0].delta.content;
    // Send progress update via clipboard
    sendProgress(accumulated);
  }
  
  if (data.choices?.[0]?.finish_reason === 'stop') {
    eventSource.close();
    // Send final response
    sendComplete(accumulated);
  }
};
```

### Clipboard Protocol for Streaming

```json
// Progress updates during streaming
{
  "type": "BROWSER_PROGRESS",
  "id": "request-id",
  "status": "streaming",
  "payload": {
    "accumulated": "Current text...",
    "chunk": "Latest chunk"
  }
}
|||BROWSER_PROGRESS|||

// Final completion
{
  "type": "BROWSER_RESPONSE",  
  "id": "request-id",
  "status": "complete",
  "payload": {
    "content": "Full response text",
    "finish_reason": "stop"
  }
}
|||BROWSER_END|||
```

## Future Enhancements

1. **Native API Support**: Replace clipboard bridge when API available
2. **Multi-window Support**: Handle multiple browser windows
3. **Collaborative Features**: Share sessions with team members
4. **Custom Prompts**: Template system for common tasks
5. **Metrics Dashboard**: Usage statistics and performance monitoring
6. **Plugin System**: Extensibility for custom workflows
7. **Cloud Sync**: Settings and history synchronization

## Appendix: Key Technical Decisions

### Why Clipboard Instead of Other IPC?
- Network sockets blocked by firewall
- Named pipes require admin privileges
- Shared memory not accessible from browser
- File system too slow and leaves traces
- Clipboard is only permitted data channel

### Why Java for System Agent?
- Robot class provides reliable mouse control
- Native clipboard access without dependencies
- System tray support built-in
- Easier distribution than C++ binaries
- Good JSON handling libraries

### Why Button-Based Click Targets?
- More reliable than coordinate-based clicking
- Visual feedback on each operation
- Easy calibration with just two points
- Works across different screen resolutions
- Clear indication of operation type (READ vs WRITE)
- Simplified debugging with visible buttons in test mode