# System State Documentation

## Current Architecture (January 2025)

### 🏗️ Core Architecture
- **Unified Backend**: Single Express.js server on port 3001
- **Database**: Supabase (PostgreSQL) cloud-hosted
- **Frontend**: React 19 + TypeScript + Vite
- **Real-time**: WebSocket on same port as API
- **Multi-tenant**: Restaurant-based isolation via `restaurant_id`

### ✅ System Status
- **Architecture**: Unified backend fully implemented (Phases 1-6 complete)
- **Code Quality**: TypeScript 0 errors, ESLint 30 warnings, 238 tests passing
- **UI/UX**: MACON brand colors, unified components, WCAG AA compliant
- **Features**: Voice ordering, KDS, analytics, real-time updates all functional

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
- **Backend**: Express.js, OpenAI API, Supabase client
- **Testing**: Jest, React Testing Library
- **Build**: Vite, TypeScript, npm workspaces

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
- `OPENAI_API_KEY`
- `VITE_*` prefixed variables for frontend

### 🎯 Recent Improvements (January 2025)
- Consolidated documentation (61→20 files)
- Unified component architecture
- Standardized MACON brand colors
- Implemented accessibility (WCAG AA)
- Added comprehensive test utilities
- Production monitoring ready

---
*Last Updated: January 24, 2025*