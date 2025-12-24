# TODO: WebSocket Reconnection State Machine Complexity

**Priority:** P1 - Critical
**Category:** Architecture / Reliability
**Detected:** 2025-12-24 (Code Review)
**Commits:** a6db0e58

## Problem

The WebSocket reconnection logic uses two separate flags (`isConnecting` and `isReconnecting`) creating a complex state machine with potential race conditions:

```typescript
private isConnecting = false;
private isReconnecting = false;

async connect(): Promise<void> {
  if (this.isConnecting) {
    return;  // Skip if connecting
  }
  this.isConnecting = true;
  // ...
}

private scheduleReconnect(): void {
  if (this.isReconnecting) {
    return;  // Skip if reconnecting
  }
  this.isReconnecting = true;
  // ...
}
```

Edge cases not handled:
1. `connect()` called during `scheduleReconnect()` timeout
2. Multiple rapid disconnects before reconnect completes
3. Manual `disconnect()` during reconnection attempt

## Impact

- Potential duplicate connections
- Connection leaks
- Unpredictable behavior under network instability

## Proposed Fix

Consolidate into single state machine:

```typescript
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
private state: ConnectionState = 'disconnected';

private async connect(): Promise<void> {
  if (this.state === 'connecting' || this.state === 'connected') {
    return;
  }

  const wasReconnecting = this.state === 'reconnecting';
  this.state = 'connecting';

  try {
    await this.establishConnection();
    this.state = 'connected';
  } catch (error) {
    this.state = 'disconnected';
    if (wasReconnecting || this.shouldReconnect) {
      this.scheduleReconnect();
    }
  }
}
```

## Files

- `client/src/services/websocket/WebSocketService.ts`

## Testing

- Unit tests for all state transitions
- Stress test with rapid connect/disconnect cycles
- Test network flapping scenarios
