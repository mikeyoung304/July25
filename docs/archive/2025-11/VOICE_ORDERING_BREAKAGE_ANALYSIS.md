# Voice Ordering Breakage Analysis - Recent Changes (Last 14 Days)

## Executive Summary

Analysis of commits from Nov 4-6, 2025 reveals **3 critical risk areas** that could have broken voice ordering:

1. **Feature Flag Async Race Condition** (HIGH RISK) - Nov 5
2. **Restaurant ID Migration & Schema Mismatch** (HIGH RISK) - Nov 6
3. **Voice Button Event Handler Timing Issues** (MEDIUM RISK) - Nov 4

All three areas show recent changes that could interact poorly and cause the current breakage.

---

## Critical Risk #1: Feature Flag Service Made Async (Nov 5, 2025)

### Commit Details
- **Hash**: `eef004bb`
- **Date**: Wed Nov 5 12:51:58 2025
- **Message**: `feat(infra): complete phase 1 security hardening and integration`
- **Impact Level**: HIGH - Affects initialization order

### The Problem

The feature flag service was redesigned to be **asynchronous** using SHA-256 cryptographic hashing:

```typescript
// useFeatureFlag.ts - ASYNC call
useEffect(() => {
  featureFlagService.isEnabled(flagName, user?.id, restaurant?.id)
    .then(enabled => {
      if (mounted) setIsEnabled(enabled);
    });
}, [flagName, user?.id, restaurant?.id]);

// Returns boolean synchronously
return isEnabled;  // Initially false!
```

### Breaking Scenario

In `useVoiceOrderWebRTC.ts` (line 31):
```typescript
const useNewCustomerIdFlow = useFeatureFlag(FEATURE_FLAGS.NEW_CUSTOMER_ID_FLOW)
```

**The flag starts as `false`** during the async load, causing:

1. Voice order form loads
2. `useNewCustomerIdFlow = false` (not yet loaded)
3. Restaurant ID falls back to hardcoded 'grow' ID:
```typescript
const restaurantId = useNewCustomerIdFlow
  ? restaurant?.id
  : 'grow'  // WRONG ID - should be dynamic!
```
4. Feature flag eventually loads to `true`
5. Hook dependencies change, but `submitOrder` callback might not re-run
6. Orders submitted with stale 'grow' ID instead of correct restaurant ID

### Root Cause
- **useFeatureFlag** returns synchronous boolean but initializes async
- **No loading state** - can't distinguish "not loaded yet" from "disabled"
- **No await** - component renders before feature flag resolves
- **Dependency array incomplete** - `submitOrder` callback has stale closures

### Evidence
In `useVoiceOrderWebRTC.ts` line 266-268:
```typescript
const restaurantId = useNewCustomerIdFlow  // Might be false initially!
  ? restaurant?.id
  : 'grow'  // Fallback during async load

if (useNewCustomerIdFlow && !restaurantId) {  // Only checks if flag is true
  // Error handling doesn't fire during async load period
}
```

---

## Critical Risk #2: Seats/Capacity Schema Mismatch (Nov 6, 2025)

### Commit Details
- **Hash**: `1b7826ec`
- **Date**: Thu Nov 6 20:45:54 2025
- **Message**: `fix: server voice ordering seats/capacity schema mismatch`
- **Files Changed**: 
  - `server/src/routes/tables.routes.ts` (server seat transform)
  - `server/src/services/orders.service.ts` (validation query)
  - `client/src/pages/components/VoiceOrderModal.tsx`
  - `client/src/pages/hooks/useVoiceOrderWebRTC.ts`
- **Impact Level**: HIGH - Breaks seat selection completely

### The Problem

**Schema mismatch**: Server returns `seats` field but client expected `capacity`:

```typescript
// Server: returns { seats: 4 }
// Client: expected { capacity: 4 }
// Result: SeatSelectionModal breaks and won't render buttons
```

### The Fix Applied

Server-side transformation (tables.routes.ts):
```typescript
// Transform seats → capacity in API response
const tables = await TableService.getTables(restaurantId);
return tables.map(table => ({
  ...table,
  capacity: table.seats,  // Transform for client
  seats: undefined        // Remove original
}));
```

### Why This Could Still Be Breaking

1. **The fix assumes client-side seat selection works**, but:
   - Seat selection modal may have undefined rendering
   - Client might still expect `seats` field elsewhere
   - API response transformation might not apply to all endpoints

2. **Voice order requires seat selection before submission**:
   - If `SeatSelectionModal` can't render seats, voice order can't proceed
   - User can't select a seat → can't submit order

3. **Timing issue with UUID/Slug migration** (same commit window):
   - Seat data might be queried before restaurant context loads
   - UUID vs Slug mismatch could prevent table lookups

---

## Critical Risk #3: Voice Button Event Handler Timing (Nov 4, 2025)

### Commit Details
- **Hash**: `57a2b7e6`
- **Date**: Tue Nov 4 20:49:32 2025
- **Message**: `fix(voice): fix broken voice ordering with auto-chain recording flow`
- **Files Changed**:
  - `VoiceControlWebRTC.tsx` (event handler redesign)
  - `VoiceOrderingMode.tsx`
  - `useVoiceOrderWebRTC.ts`
- **Impact Level**: MEDIUM - Event handlers work but timing is critical

### The Problem

Button handlers were refactored with **state-dependent triggering**:

```typescript
// VoiceControlWebRTC.tsx line 126-149
const handleRecordStart = async () => {
  setShouldStartRecording(true);  // Set flag

  if (permissionState === 'prompt') {
    await handleRequestPermission();  // Async
    return;  // Don't start recording yet!
  }

  if (!isConnected && connectionState !== 'connecting') {
    await connect();  // Async
    return;  // Don't start recording yet!
  }

  if (isConnected && !isRecording) {
    startRecording();  // Finally!
  }
};
```

**Separate effect auto-starts when conditions met**:
```typescript
useEffect(() => {
  if (shouldStartRecording && isConnected && !isRecording) {
    startRecording();
    setShouldStartRecording(false);
  }
}, [shouldStartRecording, isConnected, isRecording, startRecording]);
```

### Breakage Scenario

1. **User holds button** → `handleRecordStart()` fires
2. **Permission prompt shows** → `handleRequestPermission()` called
3. **User grants permission** → sets state, returns from handler
4. **User still holding button** but handler already returned
5. **Effect watches `shouldStartRecording && isConnected`**
6. **Race condition**: What if connection fails silently?
   - Effect waits indefinitely for `isConnected = true`
   - User releases button, nothing happens
   - No error message

### Event Handler Chain Risks

From `HoldToRecordButton.tsx`:
```typescript
onMouseDown={handleMouseDown}    // Line 161
onMouseUp={handleMouseUp}        // Line 162
onMouseLeave={handleMouseLeave}  // Line 163
onTouchStart={handleTouchStart}  // Line 164
onTouchMove={handleTouchMove}    // Line 165
onTouchEnd={handleTouchEnd}      // Line 166
onTouchCancel={handleTouchEnd}   // Line 167
```

If any handler:
- Doesn't update state correctly
- Has missing dependency in useCallback
- Clashes with asynchronous operations above

Then the **entire permission → connection → recording chain breaks**.

---

## Interaction Points: How All Three Converge

```
┌─────────────────────────────────────────────────────┐
│ User Holds Voice Button (Nov 4 event handlers)      │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────▼─────────────┐
        │ Request Microphone     │
        │ Permission             │
        └──────────┬─────────────┘
                   │
     ┌─────────────▼──────────────┐
     │ Connect WebRTC (Async)     │
     │ (Nov 5: async flow flag)   │
     └──────────┬─────────────────┘
                │
   ┌────────────▼────────────────────┐
   │ User Selects Seat              │
   │ (Nov 6: schema mismatch)        │
   │ SeatSelectionModal may fail     │
   └────────────┬─────────────────────┘
                │
  ┌─────────────▼──────────────────┐
  │ Submit Order                    │
  │ (Nov 5: feature flag race cond) │
  │ Uses stale restaurantId         │
  └─────────────────────────────────┘
```

If ANY step fails silently, voice ordering breaks.

---

## Commit Timeline (Reverse Chronological)

### Nov 6, 2025 - 20:45 (Most Recent)
| Commit | Message | Risk | Issue |
|--------|---------|------|-------|
| `1b7826ec` | fix: server voice ordering seats/capacity schema mismatch | HIGH | Seat selection may still fail if client queries seats field elsewhere |
| `e103ec38` | refactor: replace all hardcoded uuid fallbacks with 'grow' slug | MEDIUM | Slug migration could affect restaurant ID lookups |
| `efe375cc` | fix: logout before login when switching workspace users | LOW | Auth session handling |

### Nov 5, 2025 - 12:51
| Commit | Message | Risk | Issue |
|--------|---------|------|-------|
| `eef004bb` | feat(infra): complete phase 1 security hardening and integration | **HIGH** | **ASYNC RACE CONDITION** - Feature flags load asynchronously, causing stale restaurant ID in voice orders |
| `e14f0d12` | feat(infra): implement phase 1 week 2 infrastructure (feature flags + metrics) | HIGH | Feature flag infrastructure introduced |

### Nov 4, 2025 - 20:49
| Commit | Message | Risk | Issue |
|--------|---------|------|-------|
| `57a2b7e6` | fix(voice): fix broken voice ordering with auto-chain recording flow | MEDIUM | Complex async event handler chain - race condition possible |

### Earlier
| Commit | Message | Risk | Impact |
|--------|---------|------|--------|
| `8015b03d` (Nov 5) | fix(voice): implement phase 1 critical p0 bug fixes | MEDIUM | Added isSubmitting guard, good for preventing duplicates |
| `15e956cf` (Nov 6) | fix: support uuid and slug formats in env validator | LOW | Accepts both UUID and slug formats - positive |

---

## Specific Code Locations of Risk

### Risk Location 1: Feature Flag Race Condition
**File**: `client/src/services/featureFlags/useFeatureFlag.ts`
**Lines**: 32-50
**Issue**: Async load with no loading state

```typescript
export function useFeatureFlag(flagName: string): boolean {
  const { user } = useAuth();
  const { restaurant } = useRestaurant();
  const [isEnabled, setIsEnabled] = useState(false);  // Defaults to FALSE

  useEffect(() => {
    featureFlagService.isEnabled(
      flagName,
      user?.id,
      restaurant?.id
    ).then(enabled => {
      if (mounted) {
        setIsEnabled(enabled);  // ASYNC - updates after render
      }
    });
  }, [flagName, user?.id, restaurant?.id]);

  return isEnabled;  // Returns FALSE until async completes!
}
```

### Risk Location 2: Stale Restaurant ID in useVoiceOrderWebRTC
**File**: `client/src/pages/hooks/useVoiceOrderWebRTC.ts`
**Lines**: 266-274
**Issue**: Stale closure during async feature flag load

```typescript
const submitOrder = useCallback(async (selectedTable, selectedSeat) => {
  const restaurantId = useNewCustomerIdFlow  // FALSE during async load!
    ? restaurant?.id
    : 'grow'

  if (useNewCustomerIdFlow && !restaurantId) {  // This won't trigger when flag is false
    return false
  }

  // ... Submit with wrong restaurantId
}, [orderItems, menuItems, toast, taxRate, isSubmitting, 
    useNewCustomerIdFlow,  // This dependency updates async
    restaurant?.id, orderSessionId, metrics])
```

### Risk Location 3: Event Handler Chain
**File**: `client/src/modules/voice/components/VoiceControlWebRTC.tsx`
**Lines**: 126-149
**Issue**: Complex async coordination without timeout handling

```typescript
const handleRecordStart = async () => {
  setShouldStartRecording(true);

  // These returns leave the system waiting for async effects
  if (permissionState === 'prompt') {
    await handleRequestPermission();
    return;  // Wait for effect to trigger
  }

  if (!isConnected && connectionState !== 'connecting') {
    await connect();
    return;  // Wait for effect to trigger
  }
  // ... 
};
```

---

## Testing the Hypothesis

To verify these are the actual causes of current breakage:

### Test 1: Feature Flag Race Condition
1. Open DevTools Console
2. Check value of `useNewCustomerIdFlow` during voice order flow
3. If it changes from `false` → `true` during the session, that's the race condition
4. Check submitted orders - do they use 'grow' ID or correct restaurant ID?

### Test 2: Seat Selection Schema
1. Try to manually select a seat
2. Check browser console for errors about missing `seats` field
3. Check what fields the table API returns (`seats` vs `capacity`)
4. Verify `SeatSelectionModal` handles transformation correctly

### Test 3: Event Handler Timing
1. Hold the voice button and watch connection state
2. Release while connecting - does it properly stop?
3. Try rapid button presses - does debounce work?
4. Check if `shouldStartRecording` flag ever gets stuck as true

---

## Recommended Fixes

### Priority 1: Feature Flag Race Condition (CRITICAL)
```typescript
// FIX: Add loading state to feature flags
export function useFeatureFlag(flagName: string): boolean | null {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);  // null = loading
  
  return isEnabled;  // Return null while loading
}

// In useVoiceOrderWebRTC:
const useNewCustomerIdFlow = useFeatureFlag(FEATURE_FLAGS.NEW_CUSTOMER_ID_FLOW)

// Only submit when flag is resolved
if (useNewCustomerIdFlow === null) {
  toast.error('Still loading configuration, please wait...');
  return false;
}

const restaurantId = useNewCustomerIdFlow ? restaurant?.id : 'grow';
```

### Priority 2: Seat Selection Schema (HIGH)
```typescript
// FIX: Ensure consistent seat/capacity field naming
const tables = response.tables.map(t => ({
  ...t,
  // Normalize field name for consistent client handling
  seatsCount: t.seats ?? t.capacity,
  // Don't include both fields
  seats: undefined,
  capacity: undefined
}));
```

### Priority 3: Event Handler Timing (MEDIUM)
```typescript
// FIX: Add explicit timeout for connection
const handleRecordStart = async () => {
  setShouldStartRecording(true);

  try {
    if (permissionState === 'prompt') {
      await handleRequestPermission();
    }
    
    if (!isConnected && connectionState !== 'connecting') {
      // Add 15-second timeout (from commit 8015b03d)
      await Promise.race([
        connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 15000)
        )
      ]);
    }
  } catch (err) {
    toast.error('Failed to connect to voice service: ' + err.message);
    setShouldStartRecording(false);
  }
};
```

---

## Summary Table

| Risk | Commit | Date | Impact | Status |
|------|--------|------|--------|--------|
| Feature Flag Race Condition | `eef004bb` | Nov 5 | CRITICAL - Orders sent with wrong restaurant ID | Unresolved |
| Seat Schema Mismatch | `1b7826ec` | Nov 6 | HIGH - Seat selection may fail | Partially fixed |
| Event Handler Timing | `57a2b7e6` | Nov 4 | MEDIUM - Complex async coordination | Needs review |
| UUID→Slug Migration | `e103ec38` | Nov 6 | MEDIUM - ID lookups might use wrong format | Check endpoints |

