# Voice Ordering Complete Implementation Guide

## 🎯 Overview

The Restaurant OS features a sophisticated voice ordering system with AI-powered speech recognition and natural language processing, integrated with our full-stack architecture.

### Two Customer Interfaces

1. **Kiosk Interface** (`/kiosk`) - Split-screen for in-store touchscreen ordering
2. **Drive-Thru Interface** (`/drive-thru`) - Large-text interface optimized for vehicle ordering

## 🚀 Quick Start

### The ONE Command You Need

```bash
npm run dev:ai
```

This single command starts everything:
- ✅ Frontend (Vite) on http://localhost:5173
- ✅ AI Gateway on http://localhost:3002
- ✅ WebSocket server for voice streaming
- ✅ Backend API server on http://localhost:3001 (when implemented)
- ✅ Color-coded output in one terminal

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
- WebSocket connection to AI Gateway
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

#### AI Gateway (`macon-ai-gateway/`)
```javascript
// WebSocket server for real-time voice processing
const wss = new WebSocketServer({ port: 3002 });

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
Voice Input → AI Gateway → Frontend Order → Backend API → Database → Kitchen Display

1. Customer speaks into microphone
2. Audio streamed to AI Gateway via WebSocket
3. Speech-to-text + NLP processing
4. Structured order data returned to frontend
5. Order validated and displayed to customer
6. Confirmed order sent to backend API
7. Order stored in database with restaurant_id
8. Real-time update pushed to kitchen display
9. Kitchen staff receives order with audio notification
```

## 🧪 Testing Scenarios

### Basic Order Testing
```bash
# Start the system
npm run dev:ai

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

**Frontend (.env.local)**:
```env
# Supabase (for user authentication and order storage)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend API
VITE_API_BASE_URL=http://localhost:3001

# AI Gateway
VITE_AI_GATEWAY_URL=http://localhost:3002
```

**AI Gateway (../macon-ai-gateway/.env)**:
```env
# OpenAI for speech recognition and NLP
OPENAI_API_KEY=your_openai_api_key

# Server configuration
PORT=3002
FRONTEND_URL=http://localhost:5173

# Optional: Custom wake word
WAKE_WORD=grow
```

**Backend (backend/.env)**:
```env
# Supabase service key for backend operations
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# Server configuration
PORT=3001
FRONTEND_URL=http://localhost:5173
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

1. **AI Gateway Deployment**:
   ```bash
   # Deploy to Railway, Heroku, or similar
   cd macon-ai-gateway
   npm run build
   npm start
   ```

2. **WebSocket Configuration**:
   ```javascript
   // Production WebSocket URL
   const wsUrl = process.env.NODE_ENV === 'production' 
     ? 'wss://your-ai-gateway.railway.app'
     : 'ws://localhost:3002';
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

**AI Gateway Connection Failed**:
```bash
# Check if AI Gateway is running
curl http://localhost:3002/health

# Restart AI Gateway
npm run dev:ai
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
  const ws = new WebSocket('ws://localhost:3002');
  
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
// AI Gateway debug mode
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

## 🔮 Future Enhancements

### Planned Features

1. **Multi-language Support**: Spanish, French voice recognition
2. **Voice Profiles**: Customer recognition via voice patterns
3. **Smart Suggestions**: AI-powered upselling based on order history
4. **Accessibility**: Voice commands for screen reader users
5. **Drive-thru Integration**: License plate recognition + voice orders

### Technical Roadmap

1. **Backend Migration**: Move from AI Gateway to integrated backend services
2. **Real-time Kitchen Integration**: Direct kitchen display updates
3. **Order Modification**: Voice-based order changes after submission
4. **Payment Integration**: Voice-initiated payment processing
5. **Analytics Dashboard**: Voice ordering insights and optimization

---

**This comprehensive voice ordering system represents the cutting edge of restaurant technology, providing customers with an intuitive, natural way to place orders while giving restaurant staff powerful tools to manage the process efficiently.**