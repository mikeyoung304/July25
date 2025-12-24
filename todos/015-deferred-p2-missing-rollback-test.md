# TODO: Missing Optimistic Update Rollback Test

**Priority:** P2 - Important
**Category:** Test Coverage
**Detected:** 2025-12-24 (Code Review)
**Commits:** a6db0e58

## Problem

The WebSocket reconnection changes handle optimistic updates, but there's no test coverage for the rollback scenario when a connection fails mid-update.

## Impact

- Edge case not validated
- Regression risk if reconnection logic changes
- Data consistency issues could go undetected

## Proposed Fix

Add test case:

```typescript
describe('WebSocketService optimistic update rollback', () => {
  it('should rollback optimistic updates on connection failure', async () => {
    const service = new WebSocketService();
    const rollbackSpy = vi.fn();

    // Setup optimistic update with rollback handler
    service.onRollback(rollbackSpy);

    // Start connection with pending optimistic update
    await service.connect();
    service.sendOptimisticUpdate({ orderId: '123', status: 'preparing' });

    // Simulate connection failure before ack
    service.simulateConnectionFailure();

    // Verify rollback was called
    expect(rollbackSpy).toHaveBeenCalledWith({
      orderId: '123',
      status: 'preparing'
    });
  });
});
```

## Files

- `client/src/services/websocket/__tests__/WebSocketService.test.ts`

## Testing

- Run the new test
- Verify rollback mechanism works correctly
