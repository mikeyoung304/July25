# Revert Instructions

If you need to revert these changes:

## 1. Remove CORS Header Addition
```bash
# Edit server/src/server.ts
# Change line 92 from:
allowedHeaders: ['Content-Type', 'Authorization', 'x-restaurant-id', 'x-request-id', 'X-CSRF-Token', 'X-Restaurant-ID', 'X-Demo-Token-Version'],

# Back to:
allowedHeaders: ['Content-Type', 'Authorization', 'x-restaurant-id', 'x-request-id'],

# Remove line 98:
app.options('*', cors());
```

## 2. Remove Frontend URL from env
```bash
# Edit .env
# Remove line 3:
FRONTEND_URL=http://localhost:5173
```

## 3. Remove WebSocket Import Fix
```bash
# Edit client/src/App.tsx
# Change line 16 from:
import { orderUpdatesHandler, webSocketService } from '@/services/websocket'

# Back to:
import { orderUpdatesHandler } from '@/services/websocket'
```

## Quick Revert Command
```bash
git checkout prod-dryrun-20250904 -- server/src/server.ts client/src/App.tsx .env
```

## Disable Kiosk Route (if needed for production)
Add this guard to server/src/routes/auth.routes.ts line 26:
```typescript
if (process.env.NODE_ENV === 'production') {
  throw BadRequest('Demo mode is not available in production');
}
```