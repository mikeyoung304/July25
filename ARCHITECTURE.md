# Architecture Decision Record: Unified Backend

## Status: ACTIVE

## Decision: Unified Backend on Port 3001

**Luis's Directive**: _"For simplicity, let's put it all in the same backend"_

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────┐
│                 │         │                      │         │             │
│  Frontend       │ ──────► │  Unified Backend     │ ──────► │  Supabase   │
│  (React)        │         │  (Express + AI)      │         │  (Database) │
│                 │         │                      │         │             │
│  Port: 5173     │         │  Port: 3001          │         │             │
│                 │         │                      │         │             │
└─────────────────┘         └──────────────────────┘         └─────────────┘
        ↑                              ↑
        │                              │
        └────── WebSocket ─────────────┘
              (ws://localhost:3001)
```

## What This Means

### ✅ YES - Current Architecture
- **ONE backend** on port 3001 handles everything:
  - REST API (`/api/v1/*`)
  - AI Services (`/api/v1/ai/*`)
  - WebSocket connections (`ws://localhost:3001`)
- **ONE frontend** on port 5173
- **ONE database** (Supabase)

### ❌ NO - What We DON'T Have
- **NO** separate AI Gateway
- **NO** port 3002 (doesn't exist)
- **NO** microservices
- **NO** separate services to coordinate

## Context: Why This Decision Was Made

### Historical Context: Why Not Microservices

We initially started with a microservices architecture:
- Backend API on port 3001
- AI Gateway on port 3002
- Separate WebSocket servers
- Multiple deployment targets

**Luis evaluated this and decided**: Too complex for our needs. The overhead of managing multiple services, inter-service communication, and deployment complexity wasn't justified for our use case.

### Benefits of Unified Architecture

1. **Simplicity**: One codebase, one deployment, one set of logs
2. **Developer Experience**: `npm run dev` starts everything
3. **Reduced Latency**: No inter-service HTTP calls
4. **Easier Debugging**: All logs in one place
5. **Simplified DevOps**: One service to monitor and scale

## Consequences (Accepted Trade-offs)

### Positive Consequences
- ✅ Dramatically simplified development
- ✅ Faster onboarding for new developers
- ✅ Reduced infrastructure costs
- ✅ Easier local development
- ✅ Simplified deployment pipeline

### Negative Consequences (Acceptable)
- ⚠️ Less granular scaling (must scale entire backend)
- ⚠️ All services share same memory/CPU resources
- ⚠️ Cannot update AI features independently
- ⚠️ Single point of failure (mitigated by good practices)

## Implementation Details

### Directory Structure
```
rebuild-6.0/
├── client/          # Frontend (React + Vite)
├── server/          # Unified Backend
│   ├── src/
│   │   ├── routes/  # All API routes
│   │   ├── services/
│   │   └── ai/      # AI functionality (NOT separate service)
│   └── package.json
└── package.json     # Root orchestration
```

### Key Files
- `server/src/server.ts` - Main server entry point
- `server/src/routes/ai.routes.ts` - AI endpoints
- `server/src/services/ai.service.ts` - AI business logic
- `server/src/ai/websocket.ts` - WebSocket handling

### Environment Variables
```env
# Server (all in one .env file)
PORT=3001
OPENAI_API_KEY=your-key
SUPABASE_URL=your-url
SUPABASE_ANON_KEY=your-key

# Client
VITE_API_BASE_URL=http://localhost:3001
```

## Development Workflow

### Starting the System
```bash
# From root directory
npm install      # Installs all dependencies
npm run dev      # Starts both client and server
```

That's it. No complex orchestration needed.

### API Endpoints
All endpoints are under one domain:
- REST API: `http://localhost:3001/api/v1/*`
- AI API: `http://localhost:3001/api/v1/ai/*`
- WebSocket: `ws://localhost:3001`

## Migration Guide

If you see documentation or code referencing:
- Port 3002 → Update to 3001
- AI Gateway → Replace with "AI Service" or "AI endpoints"
- `npm run dev:ai` → Remove, use `npm run dev`
- Three services → Update to two (client + server)

## Future Considerations

While we maintain the unified architecture, future scaling options include:
1. Horizontal scaling of the entire backend
2. Caching layers for AI responses
3. Queue systems for heavy AI processing
4. CDN for static assets

**Important**: Any future architectural changes must be discussed with the team and update this document.

---

**Last Updated**: July 2024
**Decision Maker**: Luis
**Document Status**: Source of Truth for All Architecture Decisions