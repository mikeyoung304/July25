# Quick Start: Macon AI Gateway

## 🚀 Current Status
The AI Gateway is fully integrated with the frontend and ready for use. Both services communicate perfectly with automatic case transformation.

## 🔧 Start Everything

### 1. Start AI Gateway (Terminal 1)
```bash
cd ../macon-ai-gateway
npm run dev:simple
```
You should see:
```
🚀 Simple AI Gateway running on port 3002
✅ Ready for integration testing!
```

### 2. Start Frontend (Terminal 2)
```bash
npm run dev
```
Navigate to: http://localhost:5173

## ✅ What's Working

1. **AI Chat Endpoint**
   - Route: `POST /api/v1/ai/chat`
   - Currently returns mock responses
   - Case transformation working (camelCase ↔ snake_case)

2. **Menu Management**
   - Upload: `POST /api/admin/restaurants/{id}/menu`
   - Retrieve: `GET /api/v1/restaurants/{id}/menu`
   - In-memory storage (resets on restart)

3. **Frontend Integration**
   - HTTP client configured for port 3002
   - Auth headers automatically added
   - Response transformation automatic

## 🧪 Test Commands

### Test AI Gateway Health
```bash
curl http://localhost:3002/health
```

### Test AI Chat
```bash
curl -X POST http://localhost:3002/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Do you have burgers?", "session_id": "test123"}'
```

### Run Integration Tests
```bash
node test-frontend-ai-integration.js
```

## 📝 Key Files

### AI Gateway
- `macon-ai-gateway/src/simple.js` - Working server (JavaScript)
- `macon-ai-gateway/src/index.ts` - Full TypeScript version (needs fixes)
- `macon-ai-gateway/.env` - Configuration (add OpenAI key)

### Frontend
- `.env.local` - Contains `VITE_API_BASE_URL=http://localhost:3002`
- `src/services/http/httpClient.ts` - Configured HTTP client
- `src/services/utils/caseTransform.ts` - Case transformation

## 🔮 Next Steps

1. **Add OpenAI Integration**
   - Add `OPENAI_API_KEY` to `macon-ai-gateway/.env`
   - Implement real AI responses in `simple.js`
   - Add Whisper for voice transcription

2. **Fix TypeScript Version**
   - Complete type definitions
   - Fix remaining compilation errors
   - Migrate from `simple.js` to full TypeScript

3. **Add Voice Pipeline**
   - Implement WebSocket voice streaming
   - Add Whisper transcription
   - Add TTS responses

4. **Production Features**
   - Redis for menu storage
   - Cost tracking implementation
   - Rate limiting per restaurant

## 🐛 Troubleshooting

### "AI Gateway not running"
Start it with: `cd ../macon-ai-gateway && npm run dev:simple`

### "Cannot connect to frontend"
Check `.env.local` has `VITE_API_BASE_URL=http://localhost:3002`

### "Auth errors"
The simple version doesn't validate tokens. Add real Supabase validation for production.

### "Menu not found"
Upload sample menu using the admin endpoint or `sample-menu.json`

## 📊 Architecture

```
Frontend (5173) → AI Gateway (3002) → OpenAI API
     ↓                    ↓
 Supabase Auth      Menu Storage
                    (In-memory)
```

The frontend sends camelCase, AI Gateway internally uses snake_case, and returns snake_case which frontend auto-converts back to camelCase. Perfect integration! 🎉