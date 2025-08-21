# Grow Fresh Local Food - Restaurant Operating System

> 🏗️ **ARCHITECTURE**: Unified Backend on port 3001 - No microservices  
> 🚀 **STATUS**: Friends & Family Testing Phase  
> ✅ **DEPLOYMENT**: Frontend (Vercel) | Backend (Render) | Database (Supabase)  
> 🔧 **VERSION**: 1.0.0-beta

A modern Restaurant Operating System built with React, TypeScript, and Express.js. Features AI-powered voice ordering with OpenAI Realtime API via WebRTC (unified implementation), real-time kitchen display system, and demo authentication for testing.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for database)
- OpenAI API key (for AI-powered features)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Start development servers
npm run dev
```

This starts both the frontend (http://localhost:5173) and backend (http://localhost:3001).

**Note**: Ports are strictly enforced. If port 5173 is in use, run `npm run dev:clean` to kill the process and restart.

Please see the detailed **[ARCHITECTURE.md](./ARCHITECTURE.md)** for system architecture and design principles.

## 🎯 Key Features

### Working in Production

- 🎤 **Voice Ordering**: WebRTC + OpenAI Realtime API (single unified implementation)
- 🍽️ **Kitchen Display System**: Real-time WebSocket updates for order management
- 🔐 **Demo Authentication**: JWT-based auth for friends & family testing
- 📱 **Kiosk Interface**: Touch-optimized self-service ordering
- 🚗 **Drive-Thru Mode**: Voice-first ordering experience
- 🔊 **Smart Notifications**: Audio alerts for new orders and status changes

### In Development

- 📊 **Analytics Dashboard**: Order history and performance metrics
- 💳 **Payment Processing**: Stripe integration for card payments
- 🎯 **Loyalty Program**: Customer rewards and promotions
- 📋 **Inventory Management**: Real-time stock tracking

## 🏗️ Architecture

```
Frontend (5173) ←→ Unified Backend (3001) ←→ Database (Supabase)
                            ↓
                    Supabase Database
```

**Key Architecture Points**:

- Single backend service handles everything (API, WebSocket, AI processing)
- Integrated AI modules for voice transcription, chat, and order processing
- No external AI services or microservices
- Direct Supabase integration for data persistence
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed decisions

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
├── shared/          # Shared types and utilities
│   ├── types/       # TypeScript type definitions
│   └── package.json
└── package.json     # Root orchestration with workspaces
```

## 🛠️ Tech Stack

### Frontend

- **Framework**: React 19.1.0 + TypeScript 5.8.3
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Custom Design System
- **State Management**: React Context API
- **Testing**: Vitest + React Testing Library
- **Types**: Shared types module (@rebuild/shared)
- **Components**: Unified component architecture
- **Dev Server**: http://localhost:5173 (strict port)
- **Preview**: http://localhost:4173 (strict port)

### Backend (Unified)

- **Server**: Express 4.18.2 + TypeScript 5.3.3
- **Types**: Shared types module (@rebuild/shared)
- **Database**: Supabase 2.39.7 (PostgreSQL)
- **AI/Voice**: OpenAI Realtime API + Whisper
- **Real-time**: WebSocket (ws 8.16.0)
- **Architecture**: RESTful + WebSocket on port 3001

## 🎯 Recent Improvements

### Bug Fixes (August 20, 2025)

#### Critical Fixes ✅
- **Memory Leaks**: Fixed VoiceSocketManager cleanup callbacks not executing
- **WebSocket**: Fixed heartbeat timer memory leak on error
- **Floor Plan**: Fixed save failures for new tables (CREATE vs UPDATE)
- **Voice Processing**: Fixed "Processing voice input..." stuck state
- **Syntax Errors**: Fixed 7 critical syntax errors from automated refactoring

#### Performance Foundations (Created but not integrated)
- **Request Batching**: Service created at `client/src/services/http/RequestBatcher.ts`
- **Response Cache**: LRU cache created at `client/src/services/cache/ResponseCache.ts`
- **Virtual Scrolling**: Hook created at `client/src/hooks/useVirtualization.ts`
- **LocalStorage Manager**: Created at `client/src/services/monitoring/localStorage-manager.ts`
- **Note**: These services need integration into the application

### System Stabilization (August 2025)

- **WebRTC Voice**: Integrated real-time voice (200ms latency vs 4.5s sequential)
- **Type System**: Working on unifying types across client/server
- **Components**: Some consolidation of duplicate implementations
- **Kitchen Display**: Fixed order status handling for all 7 states
- **Authentication**: Demo auth system for testing

### Frontend Stabilization (January 2025)

- **Testing**: Migrated from Jest to Vitest for better ESM support
- **Ports**: Strict port enforcement (dev: 5173, preview: 4173)
- **Dependencies**: Removed unused client-side dependencies (AI SDKs, WebSocket clients)
- **Performance**: Optional performance monitoring with VITE_ENABLE_PERF flag
- **Error Handling**: Simplified error boundaries for better maintainability

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

### AI Setup

The system requires OpenAI for AI-powered features:

- **Production**: `OPENAI_API_KEY` is REQUIRED for voice ordering, chat, and order parsing
- **Development**: Set `AI_DEGRADED_MODE=true` for emergency fallbacks (mocks responses)
- **Security**: Never expose AI keys client-side - all processing happens in the backend

### Environment Setup

Create a single `.env` file in the root directory:

```env
# Backend Configuration
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_service_key
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111

# AI Configuration (REQUIRED for AI features)
OPENAI_API_KEY=your_openai_api_key
# AI_DEGRADED_MODE=true  # Emergency fallback mode for dev/testing

# Frontend Configuration (VITE_ prefix required)
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SQUARE_APP_ID=sandbox-sq0idb-xxxxx
VITE_SQUARE_LOCATION_ID=L1234567890
VITE_ENABLE_PERF=false  # Set to 'true' to enable performance monitoring
```

**IMPORTANT**:

- All environment variables go in the root `.env` file only. Do NOT create separate `.env` files in client/ or server/ directories.
- `OPENAI_API_KEY` is REQUIRED for AI features to work
- AI processing is handled internally by the backend service

## 📡 Deployment Status

### Production Environment

- **Frontend**: Deployed on Vercel at `https://july25-client.vercel.app`
- **Backend**: Deployed on Render at `https://july25.onrender.com`
- **Database**: Supabase (PostgreSQL)
- **Status**: ✅ Operational

### Recent Security Improvements (August 2025)

- ✅ **Test-token bypass removed** - Now restricted to local development only
- ✅ **Rate limiting activated** - AI: 50 req/5min, Transcription: 20 req/min
- ✅ **CORS secured** - Strict allowlist for Vercel deployments
- ✅ **Type system fixed** - Unified to single transformation layer

## 🔢 Menu ID Mapping System

The system uses numeric string IDs (101, 201, etc.) for frontend and voice ordering, while the database uses UUIDs. An automatic mapping service handles the conversion:

**ID Ranges by Category**:

- Beverages: 101-199
- Starters: 201-299
- Salads: 301-399
- Sandwiches: 401-499
- Bowls: 501-599
- Vegan: 601-699
- Entrees: 701-799

To seed the menu with proper ID mappings:

```bash
cd server && npx tsx scripts/seed-menu-mapped.ts
```

## 📚 Documentation

### Core Systems

- [**Architecture Overview**](./docs/ARCHITECTURE.md) - System design and decisions
- [**API Reference**](./docs/API.md) - Complete API documentation
- [**Kitchen Display System**](./docs/KITCHEN_DISPLAY.md) - KDS setup and operation
- [**Voice Ordering**](./docs/VOICE_ORDERING.md) - WebRTC/OpenAI integration
- [**Authentication**](./docs/AUTHENTICATION.md) - Demo and production auth flows

### Deployment

- Frontend: [july25-client.vercel.app](https://july25-client.vercel.app)
- Backend: [july25.onrender.com](https://july25.onrender.com)
- Database: Supabase Cloud

## 🎤 Voice Ordering Setup

1. **Configure OpenAI**: Add `OPENAI_API_KEY` to server `.env`
2. **Start the system**: `npm run dev`
3. **Access Kiosk**: http://localhost:5173/kiosk
4. **Enable microphone**: Click the voice button
5. **Speak naturally**: "I'd like a Greek Bowl with extra feta"

### Supported Voice Commands

- Menu inquiries: "What's on the menu today?"
- Order placement: "I'd like a soul bowl please"
- Modifications: "Add extra cheese to that"
- Allergen info: "Does the peanut noodles have nuts?"

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific module
npm test -- --testNamePattern="OrderService"

# Run menu ID mapper tests
cd server && npm test tests/services/menu-id-mapper.test.ts
```

Current test coverage: ~85% with 238 tests passing (including new ID mapper tests)

## 🚀 Deployment

The unified backend simplifies deployment:

1. Build the client: `cd client && npm run build`
2. Build the server: `cd server && npm run build`
3. Deploy server with client's dist folder
4. Set production environment variables
5. Start with: `cd server && npm start`

See [server/README.md](./server/README.md) for detailed deployment instructions.

## 🔒 Security

### AI Service Security

- **Internal Processing**: All AI processing handled by the backend service
- **API Key Security**: OpenAI API key stored securely in backend environment only
- **Authenticated Access**: All AI endpoints require restaurant authentication
- **No Client Exposure**: AI service keys never exposed to frontend

See the security guidelines in [ARCHITECTURE.md](./ARCHITECTURE.md) for security requirements.

## 📚 Documentation

- [Architecture Decision](./ARCHITECTURE.md) - Why unified backend?
- [Backend Migration](./docs/backend-swap.md) - Luis's Express server swap guide
- [Customer Ordering](./client/README_ORDERING.md) - Square checkout & cart flow
- [API Reference](./docs/API.md) - Endpoint documentation
- [Contributing Guide](./CONTRIBUTING_AI.md) - For AI assistants and developers
- [Voice Integration](./docs/VOICE_ORDERING_GUIDE.md) - Voice system details
- [AI Architecture](./ARCHITECTURE.md) - AI integration and security model

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
