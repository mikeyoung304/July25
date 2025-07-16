# Grow Fresh Local Food - Restaurant Operating System

> ⚠️ **ARCHITECTURE**: Unified Backend - Everything runs on port 3001  
> See [ARCHITECTURE.md](./ARCHITECTURE.md) for details

> ✅ **QUALITY**: TypeScript 0 errors | ESLint 30 warnings | Tests passing  
> 🔒 **SECURITY**: CSP compliant - no external dependencies (fonts self-hosted)

A modern Restaurant Operating System built with React, TypeScript, and Express.js. Features AI-powered voice ordering, real-time kitchen management, and a unified backend architecture.

## 🚀 Quick Start

```bash
# Install dependencies
npm install:all

# Start development servers
npm run dev
```

This starts both the frontend (http://localhost:5173) and backend (http://localhost:3001).

Please see the detailed **[DEVELOPMENT.md](./DEVELOPMENT.md)** for first-time setup instructions.

## 🎯 Key Features

- 🎤 **Voice Ordering**: Natural language processing for customer orders
- 🍽️ **Kitchen Display System**: Real-time order management
- 📊 **Analytics Dashboard**: Order history and performance metrics
- 🔊 **Smart Notifications**: Audio alerts for kitchen staff
- ♿ **Accessibility First**: Full keyboard navigation and screen reader support
- 🏢 **Multi-tenant Ready**: Built for multiple restaurant locations

## 🏗️ Architecture

```
Frontend (5173) ←→ Unified Backend (3001) ←→ Supabase Database
```

**One Backend, All Services**:
- REST API endpoints (`/api/v1/*`)
- AI/Voice processing (`/api/v1/ai/*`)
- WebSocket connections for real-time updates
- Direct Supabase integration

## 📁 Project Structure

```
rebuild-6.0/
├── client/          # React frontend
│   ├── src/
│   └── package.json
├── server/          # Express backend (includes AI)
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── ai/      # AI functionality
│   └── package.json
└── package.json     # Root orchestration
```

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Custom Design System
- **State Management**: React Context API
- **Testing**: Jest + React Testing Library

### Backend (Unified)
- **Server**: Express.js + TypeScript
- **Database**: Supabase (PostgreSQL)
- **AI/Voice**: OpenAI Whisper + GPT-4
- **Real-time**: WebSocket (ws)
- **Architecture**: RESTful + WebSocket

## 🔧 Development

### Quality Gates

Before committing code, ensure all quality gates pass:

```bash
# Fix code style issues
npm run lint:fix

# Check TypeScript types
npm run typecheck

# Run all tests
npm test

# Verify no forbidden ports (3002, AI_GATEWAY)
npm run verify:ports
```

### Environment Setup

Create `.env` files:

**Server** (`server/.env`):
```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_service_key
OPENAI_API_KEY=your_openai_key
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
```

**Client** (`client/.env.local`):
```env
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```


## 🎤 Voice Ordering Setup

1. Start the system: `npm run dev`
2. Upload menu data: `cd server && npm run upload:menu`
3. Navigate to: http://localhost:5173/kiosk
4. Click microphone and speak naturally

Example commands:
- "I'd like a soul bowl please"
- "Can I get mom's chicken salad"
- "Two green goddess salads"

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific module
npm test -- --testNamePattern="OrderService"
```

Current test coverage: ~85% with 229 tests passing

## 🚀 Deployment

The unified backend simplifies deployment:

1. Build the client: `cd client && npm run build`
2. Build the server: `cd server && npm run build`
3. Deploy server with client's dist folder
4. Set production environment variables
5. Start with: `cd server && npm start`

See [server/README.md](./server/README.md) for detailed deployment instructions.

## 📚 Documentation

- [Architecture Decision](./ARCHITECTURE.md) - Why unified backend?
- [API Reference](./docs/API_REFERENCE.md) - Endpoint documentation
- [Contributing Guide](./CONTRIBUTING_AI.md) - For AI assistants and developers
- [Voice Integration](./docs/VOICE_ORDERING_GUIDE.md) - Voice system details

## 🤝 Contributing

Please read [CONTRIBUTING_AI.md](./CONTRIBUTING_AI.md) for important context about the architecture and common pitfalls to avoid.

## 📄 License

Proprietary - Macon AI Solutions

---

**Quick Links**:
- 🎤 Voice Kiosk: http://localhost:5173/kiosk
- 🍳 Kitchen Display: http://localhost:5173/kitchen
- 📊 Dashboard: http://localhost:5173/dashboard
- 🛠️ Admin: http://localhost:5173/admin