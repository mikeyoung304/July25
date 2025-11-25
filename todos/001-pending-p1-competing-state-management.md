# TODO-001: Eliminate Competing State Management Systems

## Metadata
- **Status**: pending
- **Priority**: P1 (Critical)
- **Issue ID**: 001
- **Tags**: architecture, voice, state-machine, refactor
- **Dependencies**: None
- **Created**: 2025-11-24
- **Source**: Code Review - Architecture Strategist Agent

---

## Problem Statement

The voice ordering system uses THREE overlapping state management approaches simultaneously, creating race conditions and making debugging nearly impossible:

1. **VoiceStateMachine** (Phase 2 - Event-driven FSM)
2. **VoiceEventHandler.turnState** (Legacy manual state)
3. **WebRTCVoiceClient.connectionState** (Ad-hoc boolean flags)

This violates the single source of truth principle and causes state divergence bugs.

---

## Findings

### Evidence Location
- `client/src/modules/voice/services/VoiceEventHandler.ts:131-133` - turnState definition
- `client/src/modules/voice/services/VoiceEventHandler.ts:524` - Direct mutation: `this.turnState = 'waiting_response'`
- `client/src/modules/voice/services/WebRTCVoiceClient.ts:71` - connectionState flags
- `client/src/modules/voice/services/VoiceStateMachine.ts:220-330` - FSM transitions

### Race Condition Example
```typescript
// VoiceEventHandler line 524
this.turnState = 'waiting_response'; // Direct mutation bypasses FSM

// VoiceStateMachine doesn't know about this!
// If VoiceEventHandler crashes, FSM is still in AWAITING_TRANSCRIPT
// Component sees FSM is ready, but VoiceEventHandler is broken
```

### Impact
- Loss of single source of truth - three systems can disagree
- Silent failures - invalid transitions don't propagate errors
- Debugging nightmare - must track state across 3 files
- Both kiosk AND server affected equally

---

## Proposed Solutions

### Option A: Remove turnState, Use FSM Only (Recommended)
**Pros**: Clean architecture, single source of truth, testable
**Cons**: Requires careful refactoring, must update all callers
**Effort**: Medium (4-6 hours)
**Risk**: Medium - must verify all state transitions are covered

### Option B: Sync turnState to FSM via Events
**Pros**: Less invasive, gradual migration
**Cons**: Still two systems, complexity remains
**Effort**: Low (2-3 hours)
**Risk**: Low - additive change

### Option C: Replace FSM with turnState Pattern
**Pros**: Simpler mental model
**Cons**: Loses FSM benefits (guards, history, timeouts)
**Effort**: High (8+ hours)
**Risk**: High - regression risk

---

## Recommended Action

**Option A** - Remove `turnState` from VoiceEventHandler entirely:

1. Audit all `turnState` usages in VoiceEventHandler
2. Map each turnState value to corresponding VoiceState
3. Replace `this.turnState = X` with `this.emit('stateChange', VoiceEvent.X)`
4. Have WebRTCVoiceClient listen and call `fsm.transition()`
5. Remove turnState property entirely
6. Update tests

---

## Technical Details

### Affected Files
- `client/src/modules/voice/services/VoiceEventHandler.ts`
- `client/src/modules/voice/services/WebRTCVoiceClient.ts`
- `client/src/modules/voice/services/VoiceStateMachine.ts`

### State Mapping
| turnState | VoiceState Equivalent |
|-----------|----------------------|
| 'idle' | IDLE |
| 'recording' | RECORDING |
| 'committing' | COMMITTING_AUDIO |
| 'waiting_user_final' | AWAITING_TRANSCRIPT |
| 'waiting_response' | AWAITING_RESPONSE |

---

## Acceptance Criteria

- [ ] `turnState` property removed from VoiceEventHandler
- [ ] All state changes go through VoiceStateMachine
- [ ] WebRTCVoiceClient uses FSM as single source of truth
- [ ] No direct state mutations outside FSM
- [ ] All existing tests pass
- [ ] Manual test: complete voice order flow works

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | From code review findings |

---

## Resources

- [ADR-012: Voice State Machine](docs/explanation/architecture-decisions/ADR-012-voice-state-machine.md)
- [VoiceStateMachine Tests](client/src/modules/voice/services/__tests__/VoiceStateMachine.test.ts)
