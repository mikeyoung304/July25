# TODO-010: Consolidate Competing Timeout Mechanisms

## Metadata
- **Status**: pending
- **Priority**: P2 (Important)
- **Issue ID**: 010
- **Tags**: state-machine, voice, timeout, reliability
- **Dependencies**: 001
- **Created**: 2025-11-24
- **Source**: Code Review - State Machine Debugger + WebRTC Specialist Agents

---

## Problem Statement

Multiple timeout mechanisms compete for the same state transitions:

1. **VoiceStateMachine**: 5000ms for AWAITING_SESSION_READY
2. **WebRTCVoiceClient**: 3000ms setTimeout fallback

The 3s timeout fires first, but this creates fragile coupling and ghost timeouts.

---

## Findings

### Competing Timeouts
```typescript
// VoiceStateMachine.ts:184
[VoiceState.AWAITING_SESSION_READY]: 5000,  // 5s timeout

// WebRTCVoiceClient.ts:221-231
setTimeout(() => {
  if (this.stateMachine.isState(VoiceState.AWAITING_SESSION_READY)) {
    this.stateMachine.transition(VoiceEvent.SESSION_READY, { confirmed_via: 'timeout' });
  }
}, 3000);  // 3s - FIRES FIRST
```

### Recent Fix
Commit d93e543b extended state machine timeout from 3000ms to 5000ms to ensure client's 3s fallback wins.

### Problem
- Two independent timeout systems
- If timing changes, race condition returns
- Hard to understand which timeout is authoritative

---

## Proposed Solutions

### Option A: Single Source - State Machine Only (Recommended)
Remove WebRTCVoiceClient setTimeout, let FSM handle all timeouts.

**Pros**: Single source of truth, cleaner code
**Cons**: Must ensure FSM timeout is appropriate
**Effort**: Low (1 hour)
**Risk**: Low

### Option B: Document and Enforce Margin
Keep both but document the required margin (2s).

**Pros**: No code changes
**Cons**: Fragile, easy to break
**Effort**: Very Low
**Risk**: Medium

---

## Recommended Action

**Option A** - Remove duplicate timeout:

```typescript
// WebRTCVoiceClient.ts - REMOVE this setTimeout
// setTimeout(() => {
//   if (this.stateMachine.isState(VoiceState.AWAITING_SESSION_READY)) {
//     this.stateMachine.transition(VoiceEvent.SESSION_READY, { confirmed_via: 'timeout' });
//   }
// }, 3000);

// VoiceStateMachine.ts - single authoritative timeout
[VoiceState.AWAITING_SESSION_READY]: 5000,  // Only timeout
```

State machine's onTimeout callback handles the fallback:
```typescript
onTimeout: (state) => {
  if (state === VoiceState.AWAITING_SESSION_READY) {
    // Graceful fallback to IDLE
  }
}
```

---

## Technical Details

### Affected Files
- `client/src/modules/voice/services/WebRTCVoiceClient.ts:219-231`
- `client/src/modules/voice/services/VoiceStateMachine.ts:184`

### Timeout Hierarchy (After Fix)
| State | Timeout | Owner |
|-------|---------|-------|
| CONNECTING | 15000ms | VoiceStateMachine |
| AWAITING_SESSION_CREATED | 5000ms | VoiceStateMachine |
| AWAITING_SESSION_READY | 5000ms | VoiceStateMachine |
| COMMITTING_AUDIO | 3000ms | VoiceStateMachine |
| AWAITING_TRANSCRIPT | 10000ms | VoiceStateMachine |
| AWAITING_RESPONSE | 30000ms | VoiceStateMachine |

---

## Acceptance Criteria

- [ ] Single timeout per state (FSM only)
- [ ] WebRTCVoiceClient setTimeout removed
- [ ] FSM onTimeout handles all fallbacks
- [ ] No race conditions in timeout handling
- [ ] Tests verify timeout behavior

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | From state machine + WebRTC review |
