# Current Architecture Overview

**Last Updated**: July 2025

## 🏛️ Architecture Summary

This project uses a **unified backend architecture** with cloud-only Supabase integration.

## 🎯 Key Design Decisions

1. **Unified Backend** - Single Express.js server handles everything
2. **Cloud-Only Database** - Supabase cloud (no Docker/local DB)
3. **Monorepo Structure** - Frontend and backend in same repository
4. **Service Layer Pattern** - Clean separation of concerns
5. **Real-time WebSocket** - Integrated into main backend

## 📁 Project Structure

```
rebuild-6.0/
├── client/                 # React + TypeScript frontend
│   ├── src/
│   │   ├── modules/       # Feature-based modules
│   │   ├── services/      # API service layer
│   │   └── pages/         # Route components
│   └── package.json
├── server/                # Express.js backend (unified)
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   ├── ai/           # AI/Voice features
│   │   └── utils/        # WebSocket, helpers
│   └── package.json
├── supabase/             # Database configuration
│   ├── config.toml       # Supabase CLI config
│   └── migrations/       # Historical migrations
└── package.json          # Root orchestration
```

## 🔌 Service Architecture

### Frontend (Port 5173)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: React Context API
- **Styling**: Tailwind CSS
- **API Client**: Custom HTTP client with auth

### Backend (Port 3001) - UNIFIED
- **Framework**: Express.js + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase JWT
- **Real-time**: WebSocket (ws)
- **AI Integration**: OpenAI API

### Database (Cloud Supabase)
- **Provider**: Supabase Cloud
- **Type**: PostgreSQL with RLS
- **Access**: Direct from backend only
- **Auth**: Service role key

## 🔗 API Structure

All endpoints served from unified backend on port 3001:

### Standard REST API
```
GET    /api/v1/health
GET    /api/v1/status
GET    /api/v1/menu
POST   /api/v1/orders
PATCH  /api/v1/orders/:id/status
GET    /api/v1/tables
```

### AI/Voice Endpoints
```
POST   /api/v1/ai/transcribe
POST   /api/v1/ai/chat
POST   /api/v1/ai/parse-order
POST   /api/v1/ai/menu-upload
```

### WebSocket
```
ws://localhost:3001          # Development
wss://production.com         # Production
```

## 🔄 Data Flow

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Frontend      │ <-----> │   Backend       │ <-----> │   Supabase      │
│   React App     │  HTTP   │   Express.js    │  SQL    │   Cloud DB      │
│   Port: 5173    │  WS     │   Port: 3001    │         │   PostgreSQL    │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                   │
                                   ▼
                            ┌─────────────────┐
                            │   OpenAI API    │
                            │   (Voice/AI)    │
                            └─────────────────┘
```

## 🚀 Development Workflow

### Quick Start
```bash
# Clone and install
git clone <repo>
cd rebuild-6.0
npm install

# Configure environment
cp client/.env.example client/.env.local
cp server/.env.example server/.env
# Edit both files with your credentials

# Start everything
npm run dev
```

### Key Commands
- `npm run dev` - Start frontend + backend
- `npm test` - Run all tests
- `npm run lint:fix` - Fix code style
- `npm run typecheck` - Check TypeScript

## 🔐 Security Architecture

### Authentication Flow
1. User authenticates via Supabase Auth
2. Frontend receives JWT token
3. Token sent with API requests
4. Backend validates with Supabase
5. RLS policies enforce access

### Multi-tenancy
- Restaurant ID in JWT claims
- X-Restaurant-ID header
- Database RLS policies
- Service-level validation

## 📊 Performance Considerations

### Optimizations
- Menu caching (5-minute TTL)
- WebSocket connection pooling
- Lazy-loaded React components
- Database connection pooling
- Gzip compression

### Monitoring
- Health check endpoints
- Structured JSON logging
- Error tracking
- Performance metrics

## 🌐 Deployment Architecture

### Production Setup
```
┌─────────────────┐
│   CloudFlare    │
│   CDN/WAF       │
└────────┬────────┘
         │
┌────────▼────────┐
│   Load Balancer │
└────────┬────────┘
         │
┌────────▼────────┐
│   Node.js       │
│   Server        │
│   (Port 3001)   │
└────────┬────────┘
         │
┌────────▼────────┐
│   Supabase      │
│   Cloud         │
└─────────────────┘
```

### Environment Variables

**Frontend Production**:
```env
VITE_API_BASE_URL=https://api.growfresh.com
VITE_SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

**Backend Production**:
```env
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co
SUPABASE_SERVICE_KEY=<service_key>
OPENAI_API_KEY=<openai_key>
FRONTEND_URL=https://app.growfresh.com
```

## 🔄 Migration History

### From Microservices to Unified (July 2024)
- **Before**: Separate AI Gateway (3002) + API Backend (3001)
- **Decision**: "For simplicity, let's put it all in the same backend" - Luis
- **After**: Single backend service on port 3001

### From Docker to Cloud (July 2025)
- **Before**: Local Supabase via Docker
- **Decision**: Simplify development with cloud-only approach
- **After**: Direct cloud Supabase connection

## 📋 Current Status

### ✅ Completed
- Unified backend architecture
- Cloud Supabase migration
- Voice ordering integration
- Kitchen display system
- Multi-tenant support
- WebSocket real-time updates

### 🚧 In Progress
- Performance optimization
- Enhanced error handling
- Deployment automation

### 📅 Planned
- Horizontal scaling strategy
- Enhanced monitoring
- API rate limiting
- Backup strategies

## 🔗 Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture decision record
- [README.md](./README.md) - Quick start guide
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup
- [server/README.md](./server/README.md) - Backend details
- [VOICE_ORDERING_GUIDE.md](./docs/VOICE_ORDERING_GUIDE.md) - Voice system

---

**Remember**: This is a living document. Update it when architecture changes occur.