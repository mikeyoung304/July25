# Grow Fresh Local Food - Restaurant Operating System

> ⚠️ **ARCHITECTURE**: Unified Backend - Everything runs on port 3001  
> See [ARCHITECTURE.md](./ARCHITECTURE.md) for details  
> 🔄 **BACKEND SWAP**: Migration guide available in [docs/backend-swap.md](./docs/backend-swap.md)

> ✅ **QUALITY**: TypeScript 0 errors | ESLint 30 warnings | Tests passing  
> 🔒 **SECURITY**: CSP compliant - no external dependencies | BuildPanel service integration  
> 🆕 **UPDATE**: ID mapping system implemented for consistent order flow

A modern Restaurant Operating System built with React, TypeScript, and Express.js. Features AI-powered voice ordering, real-time kitchen management, and a unified backend architecture.

## 🚀 Quick Start

### Prerequisites

**REQUIRED: BuildPanel Service**
- BuildPanel must be running on port 3003 for AI features (voice/chat)
- No external AI API keys needed - BuildPanel handles all AI processing
- Download and start BuildPanel before running the application

### Setup

```bash
# 1. Start BuildPanel service (required for AI features)
# Download and run BuildPanel on port 3003

# 2. Install dependencies
npm install:all

# 3. Start development servers
npm run dev
```

This starts both the frontend (http://localhost:5173) and backend (http://localhost:3001).

**Note**: Ports are strictly enforced. If port 5173 is in use, run `npm run dev:clean` to kill the process and restart.

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
Frontend (5173) ←→ Unified Backend (3001) ←→ BuildPanel (3003) ←→ Supabase Database
```

**Unified Backend + BuildPanel AI**:
- REST API endpoints (`/api/v1/*`)
- AI/Voice processing via BuildPanel (`/api/v1/ai/*`)
- WebSocket connections for real-time updates
- BuildPanel handles all AI operations (voice transcription, chat, menu processing)
- Direct Supabase integration for data persistence

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
- **Testing**: Vitest + React Testing Library
- **Types**: Shared types module (@rebuild/shared)
- **Components**: Unified component architecture
- **Dev Server**: http://localhost:5173 (strict port)
- **Preview**: http://localhost:4173 (strict port)

### Backend (Unified)
- **Server**: Express.js + TypeScript
- **Types**: Shared types module (@rebuild/shared)
- **Database**: Supabase (PostgreSQL)
- **AI/Voice**: BuildPanel Service (port 3003)
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

### Environment Setup

Create a single `.env` file in the root directory:

```env
# Backend Configuration
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_service_key
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111

# BuildPanel Configuration (REQUIRED for AI features)
USE_BUILDPANEL=true
BUILDPANEL_URL=http://localhost:3003

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
- `USE_BUILDPANEL=true` is REQUIRED for AI features to work
- BuildPanel must be running on port 3003 before starting the application


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

1. **Start BuildPanel**: Ensure BuildPanel is running on port 3003
2. **Start the system**: `npm run dev`
3. **Seed the menu**: `cd server && npx tsx scripts/seed-menu-mapped.ts`
4. **Upload to BuildPanel**: `cd server && npm run upload:menu` (syncs menu with BuildPanel service)
5. **Test Voice Ordering**: Navigate to http://localhost:5173/kiosk
6. **Speak naturally**: Click microphone and speak your order

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
- **External Service**: BuildPanel handles all AI processing externally
- **No API Keys Required**: No sensitive AI API keys stored in the application
- **Authenticated Access**: All AI endpoints require restaurant authentication
- **Service Isolation**: AI operations isolated to BuildPanel service

Run security checks manually:
```bash
./scripts/check-buildpanel-security.sh
```

See [docs/SECURITY_BUILDPANEL.md](./docs/SECURITY_BUILDPANEL.md) for security requirements.

## 📚 Documentation

- [Architecture Decision](./ARCHITECTURE.md) - Why unified backend?
- [Backend Migration](./docs/backend-swap.md) - Luis's Express server swap guide
- [Customer Ordering](./client/README_ORDERING.md) - Square checkout & cart flow
- [API Reference](./docs/API.md) - Endpoint documentation
- [Contributing Guide](./CONTRIBUTING_AI.md) - For AI assistants and developers
- [Voice Integration](./docs/VOICE_ORDERING_GUIDE.md) - Voice system details
- [BuildPanel Security](./docs/SECURITY_BUILDPANEL.md) - AI security boundary enforcement
- [BuildPanel Migration](./docs/MIGRATION_BUILDPANEL.md) - Migration from OpenAI to BuildPanel service

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