---
status: ready
priority: p2
issue_id: "012"
tags: [code-quality, logging, conventions]
dependencies: []
---

# TODO: Replace console.warn/error with Logger in WebSocketService

**Priority:** P2 - Important
**Category:** Code Quality
**Detected:** 2025-12-24 (Code Review)
**Commits:** a6db0e58

## Problem

`WebSocketService.ts` uses `console.warn` and `console.error` instead of the project's logger:

```typescript
console.warn('[WebSocket] Already disconnected or disconnecting');
console.error('[WebSocket] Connection failed:', error);
```

This violates the project convention documented in CLAUDE.md:
> Use `logger`, never `console.log` - enforced by pre-commit hook

## Impact

- Inconsistent logging format
- Missing structured metadata
- Log aggregation issues in production
- Pre-commit hook only checks for `console.log`, not warn/error

## Proposed Fix

```typescript
import { logger } from '@/services/logger';

// Replace
console.warn('[WebSocket] Already disconnected...');
// With
logger.warn('Already disconnected or disconnecting', {
  component: 'WebSocket',
  state: this.state
});

// Replace
console.error('[WebSocket] Connection failed:', error);
// With
logger.error('Connection failed', {
  component: 'WebSocket',
  error: error instanceof Error ? error.message : String(error)
});
```

## Files

- `client/src/services/websocket/WebSocketService.ts`

## Testing

- Verify logs appear in correct format
- Check structured metadata is present
