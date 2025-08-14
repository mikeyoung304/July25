# API Reference

Base URL: `http://localhost:3001/api/v1`

## Authentication

All API endpoints require:
- **Authorization Header**: `Bearer <jwt-token>`
- **Restaurant ID Header**: `X-Restaurant-ID: <restaurant-uuid>`

## Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /orders | List orders (query: status, type, date) |
| GET | /orders/:id | Get order details |
| POST | /orders | Create order |
| POST | /orders/voice | Create order from voice transcript |
| PATCH | /orders/:id | Update order status |
| DELETE | /orders/:id | Cancel order |

## Menu

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /menu | Get full menu with categories |
| GET | /menu/items | List menu items |
| GET | /menu/categories | List categories |
| POST | /menu/items | Add menu item |
| PUT | /menu/items/:id | Update item |
| DELETE | /menu/items/:id | Remove item |
| POST | /menu/sync-ai | Sync menu to AI context |

## AI/Voice (Integrated in Unified Backend)

| Method | Endpoint | Description | Response Type |
|--------|----------|-------------|---------------|
| POST | /ai/transcribe | Process voice audio via OpenAI API | audio/mpeg |
| POST | /ai/transcribe-with-metadata | Process voice with transcription data | application/json |
| POST | /ai/parse-order | Parse text to order via OpenAI API | application/json |
| POST | /ai/chat | Chat with AI assistant via OpenAI API | application/json |
| POST | /ai/menu | Sync menu for AI context | application/json |
| GET | /ai/menu | Get current AI menu | application/json |
| GET | /ai/health | AI service health check | application/json |

### Voice Endpoint Details

#### POST /ai/transcribe
Process voice audio through OpenAI API's speech-to-text and text-to-speech pipeline (integrated in backend).

**Request:**
- Content-Type: `multipart/form-data`
- Body: 
  - `audio`: Audio file (webm, mp4, wav, etc.) - max 25MB

**Response:**
- Content-Type: `audio/mpeg`
- Body: MP3 audio buffer containing AI response

**Example:**
```javascript
const formData = new FormData();
formData.append('audio', audioBlob, 'recording.webm');

const response = await fetch('/api/v1/ai/transcribe', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'X-Restaurant-ID': '<restaurant-id>'
  },
  body: formData
});

const audioBuffer = await response.arrayBuffer();
const audioUrl = URL.createObjectURL(new Blob([audioBuffer], { type: 'audio/mpeg' }));
```

#### POST /ai/transcribe-with-metadata
Alternative endpoint that returns transcription and metadata along with audio URL.

**Request:** Same as `/ai/transcribe`

**Response:**
```json
{
  "success": true,
  "transcription": "I'd like to order a large pizza",
  "response": "I'll help you order a large pizza. What toppings would you like?",
  "audioUrl": "data:audio/mpeg;base64,...",
  "orderData": {
    "items": [{
      "name": "Large Pizza",
      "quantity": 1
    }]
  }
}
```

## Tables & Floor Plan

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tables | List all tables |
| GET | /tables/:id | Get table details |
| PATCH | /tables/:id | Update table status |
| GET | /floor-plan | Get floor plan layout |
| PUT | /floor-plan | Save floor plan layout |

## Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Basic health check |
| GET | /status | System status with service health |
| POST | /metrics | Submit performance metrics |
| GET | /metrics | Prometheus metrics endpoint |

## WebSocket

Connect: `ws://localhost:3001`

Events:
- `order-created` - New order created
- `order-updated` - Order status changed
- `order-completed` - Order finished
- `voice-response` - AI voice interaction response
- `join-restaurant` - Join restaurant room

## Environment Variables

- `OPENAI_API_KEY` - OpenAI API key for AI/voice features
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:5173)