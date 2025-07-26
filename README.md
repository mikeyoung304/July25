# Grow Fresh Local Food - Restaurant Operating System

> ⚠️ **ARCHITECTURE**: Unified Backend - Everything runs on port 3001  
> See [ARCHITECTURE.md](./ARCHITECTURE.md) for details  
> 🔄 **BACKEND SWAP**: Migration guide available in [docs/backend-swap.md](./docs/backend-swap.md)

> ✅ **QUALITY**: TypeScript 0 errors | ESLint 71 warnings | Tests passing  
> 🔒 **SECURITY**: CSP compliant - no external dependencies (fonts self-hosted)  
> 🆕 **UPDATE**: ID mapping system implemented for consistent order flow

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
├── shared/          # Shared types and utilities
│   ├── types/       # TypeScript type definitions
│   └── package.json
└── package.json     # Root orchestration with workspaces
```

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Custom Design System
- **State Management**: React Context API
- **Testing**: Jest + React Testing Library
- **Types**: Shared types module (@rebuild/shared)
- **Components**: Unified component architecture

### Backend (Unified)
- **Server**: Express.js + TypeScript
- **Types**: Shared types module (@rebuild/shared)
- **Database**: Supabase (PostgreSQL)
- **AI/Voice**: OpenAI Whisper + GPT-4
- **Real-time**: WebSocket (ws)
- **Architecture**: RESTful + WebSocket

## 🎯 Recent Improvements

### Phase 1-3 Completed (January 2025)
- **Documentation**: Reduced from 61 to ~20 files
- **Type System**: Unified types across client/server
- **Components**: Consolidated duplicate implementations
  - `BaseOrderCard` with variants (standard, KDS, compact)
  - `UnifiedVoiceRecorder` replacing multiple voice components
  - Shared UI components (LoadingSpinner, EmptyState, etc.)
- **Performance**: ~40% code reduction through consolidation

### Phase 4-6 Completed (January 2025)
- **Test Infrastructure**: Comprehensive test utilities and helpers
- **Production Monitoring**: Integrated error tracking and performance monitoring
- **Performance Optimization**: Bundle splitting, vendor optimization
- **Technical Debt**: Logger service, TypeScript fixes, error boundaries

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
VITE_SQUARE_APP_ID=sandbox-sq0idb-xxxxx
VITE_SQUARE_LOCATION_ID=L1234567890
```


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

## 🎤 Voice Ordering Setup

1. Start the system: `npm run dev`
2. Seed the menu: `cd server && npx tsx scripts/seed-menu-mapped.ts`
3. Upload to AI: `cd server && npm run upload:menu`
4. Navigate to: http://localhost:5173/kiosk
5. Click microphone and speak naturally

Example commands:
- "I'd like a soul bowl please"
- "Can I get mom's chicken salad"
- "Two sweet teas with lemon"

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific module
npm test -- --testNamePattern="OrderService"

# Run menu ID mapper tests
cd server && npm test
```

Current test coverage: ~24.8% with 46 tests passing (including new ID mapper tests)

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
- [Backend Migration](./docs/backend-swap.md) - Luis's Express server swap guide
- [Customer Ordering](./client/README_ORDERING.md) - Square checkout & cart flow
- [API Reference](./docs/API.md) - Endpoint documentation
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