# 🚀 Unified Development Guide - Macon Restaurant OS

## Quick Start (Recommended)

### One Command to Rule Them All
```bash
npm run dev:ai
```

This single command will:
1. ✅ Check if AI Gateway exists
2. ✅ Install dependencies if needed
3. ✅ Start AI Gateway on port 3002
4. ✅ Start Frontend on port 5173
5. ✅ Show all available endpoints
6. ✅ Handle graceful shutdown with Ctrl+C

## What Gets Started

### 1. **AI Gateway** (Port 3002)
- Voice ordering AI service
- Menu management API
- Chat interface backend
- Mock responses (configurable for OpenAI)

### 2. **Frontend** (Port 5173)
- React + TypeScript application
- Voice ordering interface
- Kitchen display system
- Admin dashboard

## Alternative Startup Methods

### Start Services Individually

**Option 1: Two Terminals**
```bash
# Terminal 1 - AI Gateway
cd ../macon-ai-gateway
npm run dev:simple

# Terminal 2 - Frontend
npm run dev
```

**Option 2: Using Existing Scripts**
```bash
# Start AI Gateway with health checks
./start-ai-gateway.sh

# Or start and test AI Gateway
node start-ai-dev.js
```

## Available Endpoints

### Frontend
- **Main App**: http://localhost:5173
- **Admin**: http://localhost:5173/admin
- **Kitchen**: http://localhost:5173/kitchen
- **Voice Order**: Click microphone icon

### AI Gateway
- **Health Check**: http://localhost:3002/health
- **Detailed Health**: http://localhost:3002/health/detailed
- **AI Chat**: POST http://localhost:3002/api/v1/ai/chat
- **Menu Upload**: POST http://localhost:3002/api/admin/restaurants/{id}/menu

## Testing the Setup

### 1. Check Services Are Running
```bash
# Test AI Gateway
curl http://localhost:3002/health

# Should return:
# {"status":"healthy","service":"macon-ai-gateway","version":"1.0.0"}
```

### 2. Test AI Chat
```bash
curl -X POST http://localhost:3002/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What burgers do you have?", "session_id": "test123"}'
```

### 3. Run Integration Tests
```bash
node test-frontend-ai-integration.js
```

## Configuration

### Enable Real AI (OpenAI)

1. **Add OpenAI API Key**
   ```bash
   # In macon-ai-gateway/.env
   OPENAI_API_KEY=your-key-here
   ```

2. **Switch to AI Mode**
   ```bash
   # In Terminal 1
   cd ../macon-ai-gateway
   npm run dev:ai  # Instead of dev:simple
   ```

### Frontend Configuration
The frontend is already configured to connect to the AI Gateway at `http://localhost:3002` via the `.env.local` file.

## Troubleshooting

### "AI Gateway directory not found"
- Ensure `macon-ai-gateway` folder exists in the parent directory
- Structure should be:
  ```
  /CODING/
    ├── rebuild-6.0/        (current project)
    └── macon-ai-gateway/   (AI service)
  ```

### "Port already in use"
```bash
# Kill processes on ports
lsof -ti:3002 | xargs kill -9  # AI Gateway port
lsof -ti:5173 | xargs kill -9  # Frontend port
```

### "Cannot connect to AI Gateway"
- Check `.env.local` contains: `VITE_API_BASE_URL=http://localhost:3002`
- Ensure AI Gateway is running: `curl http://localhost:3002/health`

### "TypeScript errors in AI Gateway"
- Use `npm run dev:simple` (JavaScript version) instead of `npm run dev`
- The TypeScript version needs fixes

## Development Workflow

### 1. Start Everything
```bash
npm run dev:ai
```

### 2. Make Changes
- Frontend changes: Hot reload automatic
- AI Gateway changes: Restart needed

### 3. Test Your Changes
- Use the frontend UI
- Run integration tests
- Check browser console for errors

### 4. Stop Services
- Press `Ctrl+C` in the terminal
- All services will shut down gracefully

## Next Steps

1. **Add OpenAI Integration**
   - Get API key from OpenAI
   - Add to AI Gateway `.env`
   - Test real AI responses

2. **Upload Menu Data**
   - Use the admin endpoint
   - Or upload `sample-menu.json`

3. **Test Voice Ordering**
   - Click microphone in frontend
   - Speak your order
   - Watch AI process it

4. **Monitor Costs**
   - Check token usage in responses
   - ~$0.002 per interaction with GPT-3.5

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│                 │     │                  │     │             │
│  Frontend       │────▶│  AI Gateway      │────▶│  OpenAI     │
│  (Port 5173)    │     │  (Port 3002)     │     │  API        │
│                 │     │                  │     │             │
└─────────────────┘     └──────────────────┘     └─────────────┘
        │                        │
        │                        │
        ▼                        ▼
┌─────────────────┐     ┌──────────────────┐
│                 │     │                  │
│  Supabase       │     │  Menu Storage    │
│  (Auth)         │     │  (In-Memory)     │
│                 │     │                  │
└─────────────────┘     └──────────────────┘
```

## Summary

The `npm run dev:ai` command is your best friend. It handles everything automatically and provides a clean, unified development experience. No more juggling multiple terminals or remembering which services to start!

Happy coding! 🎉