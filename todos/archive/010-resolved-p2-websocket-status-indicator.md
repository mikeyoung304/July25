---
status: ready
priority: p2
issue_id: "010"
tags: [ux, websocket, kds]
dependencies: []
---

# WebSocket Connection Status Not Visible

## Problem Statement
Kitchen Display System (KDS) relies on WebSocket for real-time order updates, but there's no visible indicator showing connection status. Staff won't know if they're disconnected and missing orders.

## Findings
- Location: `client/src/pages/KitchenDisplayOptimized.tsx`
- WebSocket connection status not displayed
- No reconnection indicator
- Critical for kitchen operations

## Proposed Solutions

### Option 1: Add connection status indicator
- **Pros**: Clear visibility of connection state
- **Cons**: Minor UI addition
- **Effort**: Small
- **Risk**: Low

```typescript
// Connection status indicator
<div className={`ws-status ${isConnected ? 'connected' : 'disconnected'}`}>
  {isConnected ? '🟢 Live' : '🔴 Reconnecting...'}
</div>
```

## Recommended Action
Add visible connection status indicator to KDS header. Show reconnection attempts.

## Technical Details
- **Affected Files**: `KitchenDisplayOptimized.tsx`, possibly shared WS hook
- **Related Components**: WebSocket connection, KDS UI
- **Database Changes**: No

## Acceptance Criteria
- [ ] Connection status visible in KDS header
- [ ] Clear indication of connected/disconnected state
- [ ] Reconnection attempts shown
- [ ] Audio alert option for disconnection

## Work Log

### 2025-12-28 - Approved for Work
**By:** Claude Triage System
**Actions:**
- Operational visibility issue identified during testing
- Status set to ready
- Priority P2 - important for kitchen operations

## Notes
Source: User Flow Test Findings (Dec 28, 2025) - KDS Issues #4
