# Voice Ordering Complete Implementation Guide

## 🎯 Overview

The Restaurant OS features a sophisticated voice ordering system with AI-powered speech recognition and natural language processing, integrated with our unified backend architecture.

### Two Customer Interfaces

1. **Kiosk Interface** (`/kiosk`) - Split-screen for in-store touchscreen ordering
2. **Drive-Thru Interface** (`/drive-thru`) - Large-text interface optimized for vehicle ordering

## 🚀 Quick Start

### The ONE Command You Need

```bash
npm run dev
```

This single command starts everything:
- ✅ Frontend (Vite) on http://localhost:5173
- ✅ Unified Backend with AI Service on http://localhost:3001
- ✅ WebSocket server for voice streaming (ws://localhost:3001)
- ✅ Color-coded output with proper orchestration

### Access Points

Once running, visit:
- **Kiosk Interface**: http://localhost:5173/kiosk
- **Drive-Thru Interface**: http://localhost:5173/drive-thru
- **Kitchen Display**: http://localhost:5173/kitchen

## 🎤 How Voice Ordering Works

### Voice Interaction Flow

1. **Press & Hold**: Hold the blue "HOLD ME" button
   - Welcome message: "Welcome to Grow! What can I get started for you today?"

2. **Speak Order**: Keep holding and speak naturally
   - "I'll have a bacon burger with no pickles and a large coke"
   - "Make that two burgers and add fries"
   - "What desserts do you have?"

3. **Release**: Let go of the button
   - Order appears in real-time on the right panel
   - AI confirms and suggests additional items
   - Real-time updates to kitchen display

4. **Continue**: Press again to modify or add items
   - "Actually, make that two burgers"
   - "No pickles on one of them"
   - "Add a shake to that"

## 🏗️ Technical Architecture

### Frontend Components

#### Voice Control Module (`src/modules/voice/`)
```typescript
// VoiceControl.tsx - Main voice interface component
interface VoiceControlProps {
  onOrderUpdate: (order: VoiceOrder) => void;
  currentOrder: VoiceOrder;
  mode: 'kiosk' | 'drive-thru';
}
```

**Features**:
- WebSocket connection to unified backend
- Real-time audio streaming
- Visual feedback for recording state
- Error handling and reconnection logic

#### Voice Order Context (`src/modules/orders/contexts/`)
```typescript
// VoiceOrderContext.tsx - Order state management
interface VoiceOrderContextType {
  order: VoiceOrder;
  addItem: (item: VoiceOrderItem) => void;
  removeItem: (itemId: string) => void;
  updateItem: (itemId: string, updates: Partial<VoiceOrderItem>) => void;
  clearOrder: () => void;
  submitOrder: () => Promise<void>;
}
```

**Capabilities**:
- Real-time order state management
- Automatic total calculation
- Item modification and customization
- Integration with backend order system

### Backend Integration

#### AI Service (Unified Backend)
```javascript
// WebSocket server integrated into unified backend (server/src/ai/websocket.ts)
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  ws.on('message', async (audioData) => {
    // 1. Speech-to-text conversion
    const transcript = await openai.audio.transcriptions.create({
      file: audioData,
      model: 'whisper-1'
    });
    
    // 2. Natural language processing
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: menuContext },
        { role: 'user', content: transcript.text }
      ]
    });
    
    // 3. Send structured response
    ws.send(JSON.stringify({
      transcript: transcript.text,
      response: response.choices[0].message.content,
      items: extractedItems
    }));
  });
});
```

#### Menu Context Integration
```javascript
// Real menu items from Grow Fresh Local Food
const menuContext = `
You are a helpful assistant for Grow Fresh Local Food restaurant.

MENU ITEMS:
Burgers: Bacon Burger ($12), Veggie Burger ($10), Classic Burger ($9)
Sides: Fries ($4), Onion Rings ($5), Side Salad ($6)
Drinks: Coca-Cola ($3), Sprite ($3), Water ($2)
Desserts: Chocolate Cake ($6), Ice Cream ($4)

Always be friendly and suggest complementary items.
`;
```

### Full-Stack Data Flow

```typescript
// Complete voice-to-kitchen workflow
Voice Input → Unified Backend (AI Service) → Frontend Order → Backend API → Database → Kitchen Display

1. Customer speaks into microphone
2. Audio streamed to unified backend via WebSocket (ws://localhost:3001)
3. Speech-to-text + NLP processing via AI service
4. Structured order data returned to frontend
5. Order validated and displayed to customer
6. Confirmed order sent to backend API endpoints
7. Order stored in database with restaurant_id
8. Real-time update pushed to kitchen display
9. Kitchen staff receives order with audio notification
```

## 🧪 Testing Scenarios

### Basic Order Testing
```bash
# Start the system
npm run dev

# Test phrases:
"I'll have a bacon burger"
"Make that two, and add fries"
"Large coke with that"
"No pickles on one burger"
"What desserts do you have?"
"Add chocolate cake"
"Actually, make the coke a sprite"
"That's all for my order"
```

### Edge Case Testing
```bash
# Unclear speech
"Uh, can I get, like, a burger or something?"

# Multiple modifications
"Two burgers, no pickles on one, no onions on the other, extra cheese on both"

# Menu questions
"What's your most popular item?"
"Do you have any healthy options?"
"What comes with the burger?"

# Order changes
"Actually, cancel the fries"
"Change that coke to a water"
"Make everything to-go"
```

## 🔧 Configuration & Environment

### Required Environment Variables

**Frontend (client/.env.local)**:
```env
# Supabase (for user authentication and order storage)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend API (unified backend)
VITE_API_BASE_URL=http://localhost:3001
```

**Unified Backend (server/.env)**:
```env
# Supabase service key for backend operations
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# OpenAI for speech recognition and NLP
OPENAI_API_KEY=your_openai_api_key

# Server configuration
PORT=3001
FRONTEND_URL=http://localhost:5173

# Optional: Custom wake word
WAKE_WORD=grow
```

### Development Without OpenAI

The system works perfectly with mock responses when no OpenAI key is provided:

```javascript
// Mock response for testing
const mockResponse = {
  transcript: "I'll have a bacon burger and fries",
  response: "Great! I've added a bacon burger and fries to your order. Would you like a drink with that?",
  items: [
    { name: "Bacon Burger", price: 12, quantity: 1 },
    { name: "Fries", price: 4, quantity: 1 }
  ]
};
```

## 🚀 Deployment Considerations

### Production Setup

1. **Unified Backend Deployment**:
   ```bash
   # Deploy to Railway, Heroku, or similar
   cd server
   npm run build
   npm start
   ```

2. **WebSocket Configuration**:
   ```javascript
   // Production WebSocket URL
   const wsUrl = process.env.NODE_ENV === 'production' 
     ? 'wss://your-backend.railway.app'
     : 'ws://localhost:3001';
   ```

3. **HTTPS Requirements**:
   - Voice input requires HTTPS in production
   - Ensure SSL certificates for all services
   - Configure CORS for cross-origin WebSocket connections

### Performance Optimization

```typescript
// Audio streaming optimization
const audioConstraints = {
  audio: {
    channelCount: 1,
    sampleRate: 16000,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
};

// Chunk size optimization for real-time streaming
const CHUNK_SIZE = 1024;
const chunks = [];
recorder.ondataavailable = (event) => {
  if (event.data.size > 0) {
    chunks.push(event.data);
    if (chunks.length >= CHUNK_SIZE) {
      sendAudioChunk(chunks.splice(0, CHUNK_SIZE));
    }
  }
};
```

## 🔍 Troubleshooting

### Common Issues

**Backend Connection Failed**:
```bash
# Check if unified backend is running
curl http://localhost:3001/api/v1/health

# Restart the system
npm run dev
```

**Microphone Permission Denied**:
```javascript
// Browser console error handling
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => console.log('Microphone access granted'))
  .catch(err => console.error('Microphone access denied:', err));
```

**WebSocket Connection Issues**:
```typescript
// Connection state monitoring
const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

useEffect(() => {
  const ws = new WebSocket('ws://localhost:3001');
  
  ws.onopen = () => setConnectionState('connected');
  ws.onclose = () => setConnectionState('disconnected');
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    setConnectionState('disconnected');
  };
}, []);
```

**Order Not Appearing in Kitchen**:
```bash
# Check backend API connection
curl http://localhost:3001/api/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Restaurant-ID: YOUR_RESTAURANT_ID"

# Verify WebSocket subscription
# Check browser dev tools Network tab for WebSocket messages
```

### Debug Mode

Enable verbose logging for development:

```javascript
// Unified backend AI service debug mode
const DEBUG_MODE = process.env.NODE_ENV === 'development';

if (DEBUG_MODE) {
  console.log('Audio chunk received:', audioData.length);
  console.log('Transcript:', transcript);
  console.log('AI Response:', response);
}
```

## 📊 Analytics & Monitoring

### Voice Ordering Metrics

```typescript
// Track voice ordering success rates
interface VoiceMetrics {
  totalVoiceOrders: number;
  successfulTranscriptions: number;
  averageOrderValue: number;
  commonPhrases: string[];
  errorRates: {
    transcription: number;
    parsing: number;
    connection: number;
  };
}
```

### Performance Monitoring

```javascript
// WebSocket latency tracking
const startTime = Date.now();
ws.send(audioData);

ws.onmessage = (event) => {
  const latency = Date.now() - startTime;
  console.log(`Voice processing latency: ${latency}ms`);
};
```

## 🔄 Back-Pressure and Flow Control

### Overview

The voice ordering system implements a leaky-bucket flow control mechanism to ensure reliable audio streaming under poor network conditions. This prevents buffer overruns and maintains quality of service.

### How It Works

1. **Client-Side Flow Control**:
   - Maximum of 3 unacknowledged audio chunks in flight
   - Chunks are queued if the limit is reached
   - Automatic retry when acknowledgments are received

2. **Server-Side Progress Tracking**:
   - Sends `progress` messages after processing each chunk
   - Detects overrun conditions and sends error messages
   - Tracks metrics for monitoring

### Implementation Details

**Client Hook (useVoiceSocket)**:
```typescript
const { send, sendJSON, connectionStatus, isConnected } = useVoiceSocket({
  url: 'ws://localhost:3001/voice-stream',
  maxUnacknowledgedChunks: 3,
  reconnectDelay: 3000,
  onMessage: (message) => {
    if (message.type === 'progress') {
      // Chunk acknowledged, can send more
    } else if (message.type === 'error' && message.message === 'overrun') {
      // Buffer overflow detected
    }
  },
  onConnectionChange: (status) => {
    // Handle connection status changes
  }
});

// Audio chunks are automatically flow-controlled
const sent = send(audioBlob);
if (!sent) {
  console.warn('Audio chunk dropped due to flow control');
}
```

**Server Response**:
```json
// Progress acknowledgment
{
  "type": "progress",
  "bytesReceived": 1024,
  "totalBytesReceived": 5120
}

// Overrun error
{
  "type": "error",
  "message": "overrun",
  "unacknowledgedChunks": 4
}
```

### Monitoring

Access Prometheus metrics at `http://localhost:3001/metrics`:

- `voice_chunks_total`: Total audio chunks received
- `voice_overrun_total`: Total overrun events
- `voice_active_connections`: Current active voice connections

### Best Practices

1. **Network Resilience**:
   - System automatically handles reconnections
   - Audio chunks are buffered during brief disconnections
   - Flow control prevents overwhelming slow connections

2. **Error Handling**:
   - Monitor for overrun errors in production
   - Adjust `maxUnacknowledgedChunks` based on network conditions
   - Implement user feedback for buffer overflows

3. **Performance Tuning**:
   ```typescript
   // Adjust based on network conditions
   const CHUNK_SIZE = 100; // ms of audio per chunk
   const MAX_UNACKED = 3;  // max chunks in flight
   
   // Higher values for good networks
   // Lower values for poor/mobile networks
   ```

4. **Connection Management**:
   - WebSocket connections auto-close after 30 seconds of inactivity
   - The system uses native WebSocket ping/pong for keep-alive
   - Automatic reconnection with exponential backoff
   - Monitor the connection status indicator in the UI

### Timeout Matrix

| Parameter | Default Value | Description | Configurable |
|-----------|--------------|-------------|--------------|
| Ping Interval | 30 seconds | Server sends ping to check client health | Via environment variable |
| Idle Close | 30 seconds | Connection closes after no activity | Built into heartbeat |
| Reconnect Delay | 1 second | Initial reconnection delay | Via `useVoiceSocket` options |
| Max Unacked Chunks | 3 | Flow control limit | Via `useVoiceSocket` options |
| Chunk Timeout | N/A | No timeout on individual chunks | Not implemented |
| Backoff Sequence | 1s, 2s, 4s, 8s, 16s (max) | Exponential backoff with max 16s | Implemented in useVoiceSocket |

**Note**: The voice ordering system now implements proper exponential backoff for reconnection attempts. The delay starts at 1 second and doubles with each failed attempt, capping at 16 seconds. After 5 consecutive failures, reconnection attempts stop automatically.

## 🔮 Future Enhancements

### Planned Features

1. **Multi-language Support**: Spanish, French voice recognition
2. **Voice Profiles**: Customer recognition via voice patterns
3. **Smart Suggestions**: AI-powered upselling based on order history
4. **Accessibility**: Voice commands for screen reader users
5. **Drive-thru Integration**: License plate recognition + voice orders

### Technical Roadmap

1. **✅ Backend Migration**: Completed - AI services now integrated into unified backend
2. **Real-time Kitchen Integration**: Direct kitchen display updates
3. **Order Modification**: Voice-based order changes after submission
4. **Payment Integration**: Voice-initiated payment processing
5. **Analytics Dashboard**: Voice ordering insights and optimization

### Architecture References

For more details on the unified backend architecture, see:
- `ARCHITECTURE.md` - Architecture decision record explaining the unified backend
- `FULLSTACK_ARCHITECTURE.md` - Complete full-stack architecture overview
- `server/README.md` - Backend implementation details

---

**This comprehensive voice ordering system represents the cutting edge of restaurant technology, providing customers with an intuitive, natural way to place orders while giving restaurant staff powerful tools to manage the process efficiently.**