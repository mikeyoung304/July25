# TODO: WebSocket Token Exposed in URL Query Parameters

**Priority:** P1 - Critical
**Category:** Security
**Detected:** 2025-12-24 (Code Review)
**Commits:** a6db0e58

## Problem

The WebSocket connection passes the authentication token as a URL query parameter:

```typescript
// In WebSocketService.ts
const wsUrl = `${baseUrl}?token=${token}&clientId=${clientId}`;
```

This exposes the token in:
- Browser history
- Server access logs
- Proxy logs
- Network debugging tools
- Referrer headers (if page navigates)

## Impact

- Token leakage through logs
- Session hijacking if logs are compromised
- Violates security best practices for token handling

## Proposed Fix

Send token after connection establishment:

```typescript
// Option 1: First message authentication
socket.onopen = () => {
  socket.send(JSON.stringify({
    type: 'auth',
    token: token
  }));
};

// Option 2: Use subprotocol (less common)
const socket = new WebSocket(url, [`token-${token}`]);
```

Server-side changes needed to authenticate on first message instead of connection URL.

## Files

- `client/src/services/websocket/WebSocketService.ts`
- `server/src/services/websocket/WebSocketServer.ts`

## Testing

- Verify WebSocket connection works with new auth flow
- Check token not visible in browser dev tools Network tab
- Confirm logs don't contain tokens
