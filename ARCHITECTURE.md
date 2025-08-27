# Architecture

See [docs/02-architecture/overview.md](./docs/02-architecture/overview.md) for complete architecture documentation.

## Quick Reference

### Unified Backend (Port 3001)
- ALL services in one Express backend
- NO microservices
- NO port 3002

### Key Decisions
1. **One Backend**: API + AI + WebSocket on port 3001
2. **One Frontend**: React on port 5173
3. **Direct Integration**: WebRTC to OpenAI (client-side)
4. **Cloud Database**: Supabase (no local Docker)

### Critical Rules
- ✅ Handle all 7 order statuses
- ✅ Include restaurant_id in all operations
- ✅ Never expose API keys to client
- ✅ Always validate input