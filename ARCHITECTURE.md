# Architecture Decision Record #001: Unified Backend

## Status
**ACTIVE** - This decision is in effect and MUST be followed

## Decision
"For simplicity, let's put it all in the same backend" - Luis, Backend Architect

## What This Means
- ONE backend service on port 3001 (includes API + AI + WebSocket)  
- ONE frontend on port 5173
- NO microservices
- NO separate AI Gateway
- NO port 3002 (this port should not exist anywhere)

## The Law of the Land
1. If documentation conflicts with this, the documentation is WRONG
2. If code conflicts with this, the code is WRONG  
3. This document is the TRUTH

## Architecture Diagram
```
┌─────────────────┐         ┌─────────────────┐
│   Frontend      │ <-----> │   Backend       │
│   (React)       │  HTTP   │   (Express)     │
│   Port: 5173    │  WS     │   Port: 3001    │
└─────────────────┘         └─────────────────┘
                                   │
                                   ▼
                            ┌─────────────────┐
                            │   Supabase      │
                            │   (Database)    │
                            └─────────────────┘
```

## Historical Context (Why This Matters)
We started with microservices (AI Gateway on 3002) but Luis made the architectural decision to unify. Some code and documentation still references the old architecture. These are BUGS to be fixed, not patterns to follow.

## Enforcement
- Any PR that introduces port 3002 must be rejected
- Any documentation referencing "AI Gateway" as separate service must be corrected
- Any code attempting to connect to port 3002 must be refactored

## Implementation Details

### What Goes Where
- **Frontend** (`client/`): All React/UI code
- **Backend** (`server/`): ALL server-side code including:
  - REST API endpoints
  - AI/Voice processing
  - WebSocket handlers
  - Database operations

### Correct Endpoints
- REST API: `http://localhost:3001/api/v1/*`
- AI endpoints: `http://localhost:3001/api/v1/ai/*`
- WebSocket: `ws://localhost:3001`

### Environment Variables
```env
# Frontend (.env.local)
VITE_API_BASE_URL=http://localhost:3001

# Backend (.env)
PORT=3001
```

## Common Violations and Fixes

### ❌ WRONG
```javascript
const ws = new WebSocket('ws://localhost:3002/voice-stream');
fetch('http://localhost:3002/chat');
```

### ✅ CORRECT
```javascript
const ws = new WebSocket('ws://localhost:3001/voice-stream');
fetch('http://localhost:3001/api/v1/ai/chat');
```

## Decision Rationale
Luis evaluated microservices architecture and determined:
1. **Unnecessary Complexity**: Multiple services added overhead without benefit
2. **Development Friction**: Developers had to manage multiple services
3. **Deployment Complexity**: More services = more failure points
4. **Performance**: Inter-service communication added latency

## Consequences
- ✅ **Positive**: Simpler development, deployment, and debugging
- ⚠️ **Trade-off**: Less granular scaling (acceptable for our scale)

## Review Date
This decision will be reviewed if we reach 10,000+ concurrent users or require independent scaling of AI services. Until then, this architecture is NON-NEGOTIABLE.

---

**Last Updated**: July 2024  
**Decision Maker**: Luis, Backend Architect  
**Status**: ENFORCED - This is the law