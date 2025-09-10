# ADR-002: Unified Backend Architecture

**Status**: Accepted ✅ **IMPLEMENTED & ACTIVE**  
**Date**: September 2, 2025  
**Deciders**: Architecture Team

**Status Update (September 2025)**: Successfully implemented. Single Express server on port 3001 handles all services as designed.

## Context

Early versions of Restaurant OS attempted a microservices architecture with separate services on different ports. This led to:
- Complex service discovery
- Difficult debugging across services
- Increased deployment complexity
- CORS issues between services
- Duplicated authentication logic

## Decision

We will use a **single unified Express backend** on port 3001 that handles:
- REST API endpoints
- WebSocket connections
- AI/Voice services
- Static file serving (in production)

## Consequences

### Positive
- Simplified deployment (single process)
- Easier debugging and monitoring
- Shared middleware and utilities
- No service discovery needed
- Single authentication layer
- Reduced operational complexity

### Negative
- All services scale together
- Single point of failure
- Potential for service interference
- Larger codebase in one repository

### Mitigation
- Modular code organization
- Clear service boundaries
- Comprehensive testing
- Health checks per service area
- Future: Can split if needed when scale demands

## Implementation

```javascript
// server/src/index.ts
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// All services on same port
app.use('/api/v1', apiRoutes);
app.use('/realtime', realtimeRoutes);
server.listen(3001);
```

## Related
- ADR-001: Authentication Strategy
- ADR-007: Order Status Alignment