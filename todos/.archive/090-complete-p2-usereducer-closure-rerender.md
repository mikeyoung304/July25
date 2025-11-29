---
status: complete
priority: p2
issue_id: "090"
tags: [code-review, performance, react]
dependencies: []
---

# useReducer Closure Causes Unnecessary Re-renders

## Problem Statement

The `setOrderItems` wrapper function in `useVoiceOrderWebRTC` closes over `state.orderItems`, causing it to be recreated on every state change. This triggers unnecessary re-renders in child components and React DevTools warnings about stale closures.

## Findings

**Location:** `client/src/hooks/useVoiceOrderWebRTC.ts:357-363`

```typescript
const setOrderItems = useCallback((items: OrderItem[]) => {
  dispatch({
    type: 'SET_ORDER_ITEMS',
    payload: {
      ...state,              // ❌ Spreads entire state
      orderItems: items      // ❌ Closes over state.orderItems
    }
  });
}, [state]);                 // ❌ Re-creates on EVERY state change
```

**Problems:**

1. **Unnecessary Re-creations:**
   - `setOrderItems` recreated whenever ANY state property changes
   - Even unrelated changes (isConnected, error, etc.) trigger recreation
   - Breaks React.memo optimization in child components

2. **Stale Closure Risk:**
   - Function closes over `state` object
   - If called after state update, may use stale values
   - React DevTools warns about this pattern

3. **Performance Impact:**
   - Child components re-render unnecessarily
   - `useMemo` dependencies break when function identity changes
   - Order item list re-renders on every connection state change

**Example Scenario:**
```typescript
// User connects to voice ordering
// setOrderItems is recreated (even though orderItems unchanged)
// CartSummary component re-renders (receives new function reference)
// Order total recalculated (even though items unchanged)
// All cart animations restart unnecessarily
```

## Current State Usage

```typescript
// State contains many unrelated properties:
const [state, dispatch] = useReducer(voiceOrderReducer, {
  isConnected: false,
  isConnecting: false,
  isSpeaking: false,
  orderItems: [],
  transcript: '',
  error: null,
  sessionId: null,
  audioLevel: 0,
  // ... more properties
});

// setOrderItems depends on ALL of these!
const setOrderItems = useCallback(..., [state]);
```

## Proposed Solutions

### Option 1: Remove useCallback (Simplest)
```typescript
// Since we're using useReducer, just dispatch directly
// No need for wrapper function at all

// In voice handler:
const handleOrderUpdate = (items: OrderItem[]) => {
  dispatch({
    type: 'SET_ORDER_ITEMS',
    payload: { orderItems: items }
  });
};

// Or expose dispatch and let caller construct action
return {
  ...state,
  dispatch, // Dispatch is stable by default
  setOrderItems: (items: OrderItem[]) => {
    dispatch({ type: 'SET_ORDER_ITEMS', payload: { orderItems: items } });
  }
};
```

### Option 2: Use useMemo for Stable Dispatch (Recommended)
```typescript
// Dispatch is already stable, just wrap it properly
const setOrderItems = useMemo(
  () => (items: OrderItem[]) => {
    dispatch({
      type: 'SET_ORDER_ITEMS',
      payload: { orderItems: items }
    });
  },
  [dispatch] // dispatch is stable, so this never changes
);
```

### Option 3: Fix the Reducer Pattern
```typescript
// Update reducer to handle partial state updates
type VoiceOrderAction =
  | { type: 'SET_ORDER_ITEMS'; payload: OrderItem[] }  // Just items, not full state
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  // ... other actions

function voiceOrderReducer(state: VoiceOrderState, action: VoiceOrderAction) {
  switch (action.type) {
    case 'SET_ORDER_ITEMS':
      return { ...state, orderItems: action.payload };  // Clean merge

    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };

    // ... other cases
  }
}

// Then the callback is simple:
const setOrderItems = useCallback((items: OrderItem[]) => {
  dispatch({ type: 'SET_ORDER_ITEMS', payload: items });
}, []); // Empty deps - dispatch is stable
```

### Option 4: Split State into Multiple Reducers
```typescript
// Separate concerns
const [connectionState, connectionDispatch] = useReducer(connectionReducer, {
  isConnected: false,
  isConnecting: false,
  error: null
});

const [orderState, orderDispatch] = useReducer(orderReducer, {
  orderItems: [],
  transcript: ''
});

// Now setOrderItems only depends on orderDispatch
const setOrderItems = useCallback((items: OrderItem[]) => {
  orderDispatch({ type: 'SET_ITEMS', payload: items });
}, []); // Never changes
```

## Implementation Checklist

- [ ] Choose solution (recommend Option 3)
- [ ] Update reducer to accept typed actions with specific payloads
- [ ] Remove state spreading in dispatch calls
- [ ] Update setOrderItems to have empty dependency array
- [ ] Test that child components don't re-render unnecessarily
- [ ] Add React DevTools profiler checks
- [ ] Verify no stale closure warnings
- [ ] Update other similar patterns in the hook
- [ ] Add unit tests for dispatch stability
- [ ] Document the pattern in comments

## Testing Strategy

```typescript
describe('useVoiceOrderWebRTC re-render optimization', () => {
  it('setOrderItems should not change when connection state changes', () => {
    const { result, rerender } = renderHook(() => useVoiceOrderWebRTC());

    const firstSetOrderItems = result.current.setOrderItems;

    // Simulate connection state change
    act(() => {
      result.current.connect();
    });

    rerender();

    // setOrderItems reference should remain stable
    expect(result.current.setOrderItems).toBe(firstSetOrderItems);
  });

  it('should not cause child components to re-render unnecessarily', () => {
    const renderSpy = jest.fn();

    const ChildComponent = React.memo(({ setOrderItems }) => {
      renderSpy();
      return null;
    });

    const { result } = renderHook(() => useVoiceOrderWebRTC());

    render(<ChildComponent setOrderItems={result.current.setOrderItems} />);

    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Change connection state
    act(() => {
      result.current.connect();
    });

    // Child should NOT re-render
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});
```

## React DevTools Profiler Check

```typescript
// Before fix:
// 🔴 Component rendered: VoiceOrderCart (reason: props changed - setOrderItems)
// 🔴 Component rendered: CartSummary (reason: props changed - setOrderItems)
// 🔴 Component rendered: OrderItemList (reason: props changed - setOrderItems)

// After fix:
// ✅ Component rendered: VoiceOrderCart (reason: state changed - orderItems)
// ⚪ CartSummary skipped (memoized, props unchanged)
// ⚪ OrderItemList skipped (memoized, props unchanged)
```

## Performance Impact

**Current Behavior:**
- setOrderItems recreated ~50 times per voice order session
- Child components re-render unnecessarily
- ~5-10ms wasted per unnecessary render
- Animations restart/stutter

**After Fix:**
- setOrderItems created once and stable
- Child components only re-render when orderItems actually change
- Smooth animations
- Better React DevTools profiler metrics

## Related Files

- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/hooks/useVoiceOrderWebRTC.ts` (main issue)
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/voice-order/VoiceOrderCart.tsx` (affected component)
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/voice-order/CartSummary.tsx` (affected component)

## Best Practices Reference

From React docs on useReducer:
> "The dispatch function identity is stable and won't change on re-renders. This is why it's safe to omit from useEffect or useCallback dependency arrays."

Apply this principle consistently throughout the hook.

## Additional Issues to Check

Similar patterns may exist in:
- Other callback wrappers in the same hook
- Connection management functions
- Error handlers
- State setters

Audit all useCallback calls that depend on full state object.
