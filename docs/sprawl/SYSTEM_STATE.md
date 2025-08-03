# System State Documentation

## Current Architecture (January 2025)

### 🏗️ Core Architecture
- **Unified Backend**: Single Express.js server on port 3001 (proxy to BuildPanel)
- **BuildPanel Integration**: AI processing service on port 3003
- **Database**: Supabase (PostgreSQL) cloud-hosted
- **Frontend**: React 19 + TypeScript + Vite
- **Real-time**: WebSocket on port 3001 (enhanced for voice streaming)
- **Multi-tenant**: Restaurant-based isolation via `restaurant_id`
- **AI Processing**: Voice transcription, order parsing, chat via BuildPanel

### ✅ System Status
- **Architecture**: Unified backend + BuildPanel integration complete
- **AI Integration**: BuildPanel service fully operational for voice/text processing
- **Code Quality**: TypeScript 0 errors, ESLint warnings minimal, tests passing
- **UI/UX**: MACON brand colors, unified components, WCAG AA compliant
- **Features**: Enhanced voice ordering via BuildPanel, KDS, analytics, real-time updates
- **Performance**: BuildPanel proxy adds <100ms latency, acceptable for UX

### 📁 Project Structure
```
rebuild-6.0/
├── client/          # React frontend
├── server/          # Express backend (includes AI)
├── shared/          # Shared TypeScript types
├── docs/            # Current documentation
│   └── archive/     # Historical docs
└── .env            # Single environment file (root only)
```

### 🔑 Key Technologies
- **Frontend**: React 19, Tailwind CSS, Framer Motion, Lucide Icons
- **Backend**: Express.js, BuildPanel proxy client, Supabase client
- **AI Processing**: BuildPanel service (OpenAI Whisper, GPT-4)
- **Testing**: Jest, React Testing Library, BuildPanel integration tests
- **Build**: Vite, TypeScript, npm workspaces
- **Audio**: WebRTC capture, WebSocket streaming, FormData upload

### 🚀 Development Commands
```bash
npm install         # Install all dependencies
npm run dev         # Start development servers
npm test            # Run all tests
npm run lint:fix    # Fix linting issues
npm run typecheck   # Check TypeScript
```

### 📋 Environment Variables
All variables in root `.env` file:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY` (legacy fallback, not actively used)
- `BUILDPANEL_URL=http://localhost:3003` (BuildPanel service)
- `USE_BUILDPANEL=true` (enable BuildPanel integration)
- `DEFAULT_RESTAURANT_ID` (for BuildPanel context)
- `VITE_*` prefixed variables for frontend

### 🎯 Recent Improvements (January 2025)
- **BuildPanel Integration**: Full AI processing via external service
- **Enhanced Voice Ordering**: Improved transcription accuracy via Whisper
- **Text Chat Orders**: Natural language order processing
- **Audio Response**: BuildPanel generates spoken responses to orders
- Consolidated documentation (61→20 files)
- Unified component architecture
- Standardized MACON brand colors
- Implemented accessibility (WCAG AA)
- Added comprehensive test utilities
- Production monitoring ready with BuildPanel health checks

---
*Last Updated: January 24, 2025*