# 🏗️ Rebuild 6.0 - System & Documentation Overview

## 🎯 What is Rebuild 6.0?

A **Restaurant Operating System** that handles ordering through multiple channels (voice, kiosk, online) with AI-powered voice ordering via OpenAI integration.

## 🏛️ Core Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Frontend      │ <-----> │ Unified Backend │ <-----> │   OpenAI    │
│   React/Vite    │  HTTP/  │    Express.js   │  REST   │   AI Service    │
│   Port: 5173    │   WS    │   Port: 3001    │         │   Port: 3003    │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                    │
                                    ▼
                            ┌─────────────────┐
                            │    Supabase     │
                            │   PostgreSQL    │
                            └─────────────────┘
```

### Key Architectural Decisions

1. **Unified Backend** (Port 3001) - Single backend service handles everything
2. **OpenAI Integration** (Port 3003) - External AI service for voice/chat
3. **No Microservices** - Deliberate simplicity choice by Luis
4. **Multi-tenant** - Restaurant context flows through all operations

## 🚀 Quick Start

```bash
# 1. Start OpenAI service (required for AI features)
cd path/to/buildpanel && npm start

# 2. Start Rebuild 6.0
cd rebuild-6.0
npm install
npm run dev
```

## 📁 Project Structure

```
rebuild-6.0/
├── client/          # React frontend (port 5173)
├── server/          # Express backend (port 3001)
├── shared/          # Shared TypeScript types
├── docs/            # Project documentation
├── scripts/         # Utility scripts
└── .claude/         # AI assistant configuration
```

## 🔄 Core Data Flows

### Voice Order Flow
1. **Audio Capture**: Browser → WebSocket → Backend
2. **AI Processing**: Backend → OpenAI (REST)
3. **Order Creation**: OpenAI → Backend → Database
4. **Real-time Update**: Backend → WebSocket → All clients

### Key Integration Points
- **Authentication**: Supabase JWT → Backend validation
- **AI Proxy**: All AI calls go through backend to OpenAI
- **Multi-tenancy**: Restaurant ID in all requests

## 📚 Documentation System

### Primary Documentation

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | Core architecture decisions (source of truth) |
| `README.md` | Project overview and setup |
| `SYSTEM_OVERVIEW.md` | This file - quick system understanding |
| `docs/` | Detailed technical documentation |

### Documentation Organization

```
docs/
├── archived/        # Obsolete documentation (OpenAI era)
├── sprawl/          # Detailed implementation docs
├── API.md           # API endpoint reference
├── FEATURES.md      # Feature documentation
├── SECURITY_OPENAI.md  # Security boundaries
└── WEBSOCKET_REST_BRIDGE.md  # Voice architecture
```

### Key Documentation Files by Role

**For Developers**
- Start: `README.md` → `DEVELOPMENT.md`
- Architecture: `ARCHITECTURE.md` → `docs/SYSTEM_ARCHITECTURE_OVERVIEW.md`
- API: `docs/API.md` → `server/README.md`

**For DevOps**
- Deployment: `DEPLOYMENT.md` → `docs/OPENAI_DEPLOYMENT_CHECKLIST.md`
- Monitoring: `docs/OPERATIONS_INFRASTRUCTURE.md`
- Health: See `/health/status` endpoint

**For Contributors**
- Guidelines: `CONTRIBUTING_AI.md`
- Security: Run `scripts/check-buildpanel-security.sh`
- Testing: `docs/OPENAI_INTEGRATION_TESTING.md`

## 🔐 Security Model

**Frontend** → Cannot access OpenAI directly
**Backend** → Validates auth, proxies to OpenAI
**OpenAI** → Trusted service, no auth validation
**Database** → Row-level security by restaurant

## 🧪 Development Workflow

```bash
# Check your setup
npm run check:env
npm run check:integration

# Run with OpenAI
export USE_OPENAI=true
export OPENAI_URL=http://localhost:3003
npm run dev

# Test your changes
npm test
npm run lint:fix
npm run typecheck
```

## 📊 System Status Endpoints

- `GET /health` - Basic health check
- `GET /health/status` - Detailed service status
- `GET /api/v1/ai/health` - OpenAI connectivity

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| "OpenAI not connected" | Start OpenAI service on port 3003 |
| "Port 3001 in use" | Kill existing process: `lsof -i :3001` |
| "Voice not working" | Check OpenAI health: `/health/status` |
| "No restaurant context" | Ensure authenticated and restaurant selected |

## 🎯 What Makes This System Special

1. **WebSocket-to-REST Bridge**: Unique pattern for real-time voice with reliable AI processing
2. **Unified Backend**: Everything in one service for simplicity
3. **OpenAI Integration**: Superior AI without managing OpenAI complexity
4. **Multi-tenant**: Built for multiple restaurants from day one

## 📈 Next Steps

- **Feature Development**: See `docs/FEATURES.md`
- **API Integration**: See `docs/API.md`
- **Testing**: See `docs/OPENAI_INTEGRATION_TESTING.md`
- **Deployment**: See `DEPLOYMENT.md`

---

**Remember**: 
- OpenAI (3003) is required for AI features
- All AI goes through backend (3001) proxy
- Frontend (5173) never talks to OpenAI directly
- When in doubt, check `ARCHITECTURE.md`