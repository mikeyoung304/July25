# 🚀 Grow Fresh - Start Here

## One Command to Rule Them All

```bash
cd backend
npm run start:all
```

This opens 3 Terminal windows:
- **Backend API** (port 3001) - Your Express.js server
- **Frontend** (port 5173) - React app  
- **AI Gateway** (port 3002) - Voice processing

## Then Upload Menu & Test

```bash
# Wait 10 seconds for services to start, then:
npm run upload:menu        # Upload Grow Fresh menu to AI
npm run check:integration  # Verify everything works
```

## Test Voice Ordering

1. Open http://localhost:5173/kiosk
2. Click microphone
3. Say "I'd like a soul bowl"

## Available NPM Scripts

### From `/backend`:
- `npm run start:all` - Start everything (recommended)
- `npm run upload:menu` - Sync menu to AI Gateway
- `npm run test:voice:flow` - Test voice recognition
- `npm run check:integration` - System health check

### From root `/`:
- `npm run dev` - Frontend only
- `npm test` - Run tests

## That's It! 

No more confusion. Just `npm run start:all` from backend.

---

### Cleanup Notes
We've archived old startup scripts to `_archive_old_scripts/`:
- start-unified-dev.js
- start-voice-ai-gateway.sh  
- ai-gateway-*.js

The backend's `start:all` script is now the single source of truth.