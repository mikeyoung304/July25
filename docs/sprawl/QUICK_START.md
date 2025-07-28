# 🚀 Quick Start Guide

Get Rebuild 6.0 running in 5 minutes!

## Prerequisites
```bash
node --version  # Should be 18.x or higher
npm --version   # Should be 8.x or higher
```

## 1️⃣ Install & Setup (2 minutes)
```bash
# Clone repository
git clone <repo-url>
cd rebuild-6.0

# Install all dependencies
npm install

# Set up environment file (create .env in root directory)
cp .env.example .env
# Edit .env with your Supabase and OpenAI credentials
```

## 2️⃣ Start Everything (1 minute)
```bash
# From root directory - starts both frontend and backend
npm run dev
```

Your system is now running:
- **Frontend**: http://localhost:5173 
- **Unified Backend**: http://localhost:3001 (API + AI + WebSocket)

## 3️⃣ Voice Ordering Setup (2 minutes)

### Upload Menu to AI Service
Wait 10 seconds after starting, then:
```bash
cd server && npm run upload:menu
```

### Test Voice Recognition
1. Open http://localhost:5173/kiosk
2. Click the microphone button
3. Try saying: "I'd like a soul bowl please"
4. Verify it recognizes menu items correctly

### Check System Health
```bash
cd server && npm run check:integration
```

## 🎯 Key Features to Explore

### Kitchen Display
Navigate to http://localhost:5173/kitchen to see:
- Real-time order cards
- Status management (New → Preparing → Ready)
- Sound notifications

### Voice Kiosk
Visit http://localhost:5173/kiosk to:
- Test voice capture
- Create orders using natural language
- See real-time transcription

### Order History
Check http://localhost:5173/history for:
- Historical orders
- Filters and search
- Order analytics

### 📊 Monitoring & Performance

Access monitoring features:
- Performance metrics: Built into each view
- Error logs: Check browser console in development
- Health status: http://localhost:3001/api/v1/health

## 💻 Development Commands

```bash
# Testing
npm test              # Run all tests
npm test:watch        # Watch mode for TDD

# Code Quality
npm run lint:fix      # Auto-fix linting issues
npm run typecheck     # TypeScript checks

# Backend Scripts
cd server
npm run upload:menu   # Upload menu to AI
npm run test:voice:flow  # Test voice flow
```

## 🏗️ Architecture Overview

```
Frontend (5173) → Unified Backend (3001) → Supabase
                  ├── REST API (/api/v1/*)
                  ├── AI/Voice (/api/v1/ai/*)
                  └── WebSocket (ws://localhost:3001)
```

**Important**: This project uses a unified backend architecture. Everything runs on port 3001 - there is NO separate AI Gateway. See [ARCHITECTURE.md](./ARCHITECTURE.md) for details.

## 🐛 Common Issues

### Port Already in Use
```bash
# Kill processes
lsof -ti:5173 | xargs kill -9  # Frontend
lsof -ti:3001 | xargs kill -9  # Backend
```

### Voice Not Recognizing Menu Items
1. Ensure backend is fully started (wait 10 seconds)
2. Run `cd server && npm run upload:menu`
3. Check menu uploaded: `npm run check:integration`

### TypeScript Errors
```bash
rm -rf node_modules/.cache
npm run typecheck
```

## 📚 Next Steps

1. **Explore the codebase structure** - See [DEVELOPMENT.md](./DEVELOPMENT.md)
2. **Understand the architecture** - Read [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Review API endpoints** - Check [API_ENDPOINTS.md](./API_ENDPOINTS.md)
4. **Run tests** - `npm test` to ensure everything works

## ⌨️ Keyboard Shortcuts

- `Ctrl+K` → Kitchen Display
- `Ctrl+O` → Voice Kiosk
- `Ctrl+H` → Order History
- `/` → Focus search

---

Ready to build! 🎉 For detailed setup instructions, see [DEVELOPMENT.md](./DEVELOPMENT.md).