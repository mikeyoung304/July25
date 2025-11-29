# TODO-009: Decouple VoiceCheckoutOrchestrator from React

## Metadata
- **Status**: completed
- **Priority**: P2 (Important)
- **Issue ID**: 009
- **Tags**: architecture, voice, testing, decoupling
- **Dependencies**: 003
- **Created**: 2025-11-24
- **Completed**: 2025-11-28
- **Source**: Code Review - Architecture Strategist Agent

---

## Problem Statement

`VoiceCheckoutOrchestrator` is a service class that requires React hooks injected at runtime (`useHttpClient`, `useToast`, `useNavigate`). This:

1. Breaks separation of concerns
2. Makes unit testing impossible without React
3. Forces null checks everywhere
4. Can't be used in Node.js or non-React contexts

---

## Findings

### Current Design
```typescript
// VoiceCheckoutOrchestrator.ts:57-60
private apiClient: ReturnType<typeof useHttpClient> | null = null;
private toast: ReturnType<typeof useToast> | null = null;
private navigate: ReturnType<typeof useNavigate> | null = null;

// Lines 75-87: Must be initialized separately
initialize(
  apiClient: ReturnType<typeof useHttpClient>,
  toast: ReturnType<typeof useToast>,
  navigate: ReturnType<typeof useNavigate>
): void {
  this.apiClient = apiClient;
  this.toast = toast;
  this.navigate = navigate;
}
```

### Null Checks Everywhere
```typescript
// Lines 133-136
this.toast?.toast.error('No items in cart');  // Optional chaining

// Lines 162-166
if (!this.navigate) {
  logger.error('[VoiceCheckoutOrchestrator] Navigate function not available');
  return;
}
```

---

## Proposed Solutions

### Option A: EventEmitter Pattern (Recommended)
Replace direct calls with event emissions. Let parent component handle side effects.

**Pros**: Clean decoupling, testable, no React dependency
**Cons**: Requires parent to wire up handlers
**Effort**: Medium (2-3 hours)
**Risk**: Low

### Option B: Constructor Injection
Pass dependencies in constructor, remove initialize().

**Pros**: Type-safe, no null checks
**Cons**: Still coupled to React hook types
**Effort**: Low (1-2 hours)
**Risk**: Low

---

## Recommended Action

**Option A** - EventEmitter pattern:

```typescript
// VoiceCheckoutOrchestrator.ts - REFACTORED
class VoiceCheckoutOrchestrator extends EventEmitter {
  // Remove all React dependencies

  // Instead of calling toast directly:
  showError(message: string): void {
    this.emit('error', { message, timestamp: Date.now() });
  }

  // Instead of calling navigate directly:
  requestNavigation(path: string): void {
    this.emit('navigate', { path });
  }

  // Instead of calling apiClient directly:
  async submitOrder(items: CartItem[]): Promise<void> {
    this.emit('order.submit', { items });
    // Parent handles actual submission
  }
}

// VoiceOrderingMode.tsx - Parent handles events
orchestrator.on('error', ({ message }) => toast.error(message));
orchestrator.on('navigate', ({ path }) => navigate(path));
orchestrator.on('order.submit', async ({ items }) => {
  const result = await httpClient.post('/orders', items);
  orchestrator.handleSubmitResult(result);
});
```

---

## Technical Details

### Affected Files
- `client/src/modules/voice/services/VoiceCheckoutOrchestrator.ts`
- `client/src/components/kiosk/VoiceOrderingMode.tsx`

---

## Acceptance Criteria

- [ ] VoiceCheckoutOrchestrator has zero React imports
- [ ] All side effects emitted as events
- [ ] Parent component wires up event handlers
- [ ] No null checks needed for dependencies
- [ ] Unit tests work without React
- [ ] Existing functionality preserved

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | From architecture review |
| 2025-11-28 | Completed | Already fixed in previous commit - VoiceCheckoutOrchestrator now uses constructor injection with callback functions (onToast, onNavigate) instead of React hooks |
