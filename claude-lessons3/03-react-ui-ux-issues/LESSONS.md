# Lessons: react ui ux issues

> **💡 Debugging Unknown Issues?** If you're encountering an error not documented here, check the [Debugging Protocols](../00-debugging-protocols/) for systematic troubleshooting methods (HTF, EPL, CSP, DDT, PIT).

## Key Incidents

# React UI/UX Incidents - Detailed Timeline

This document provides complete timelines for each of the 5 critical React bugs that occurred between November 2-10, 2025.

## Table of Contents

1. [Incident #1: React #318 Hydration Bug](#incident-1-react-318-hydration-bug)
2. [Incident #2: Infinite Loop Bug](#incident-2-infinite-loop-bug)
3. [Incident #3: Cart Provider Isolation](#incident-3-cart-provider-isolation)
4. [Incident #4: React #418 Non-Deterministic Values](#incident-4-react-418-non-deterministic-values)
5. [Incident #5: Auth Hang](#incident-5-auth-hang)

---

## Incident #1: React #318 Hydration Bug

**Date**: November 7-10, 2025
**Duration**: 3 days (72 hours)
**Severity**: CRITICAL - Production Blocking
**Status**: RESOLVED
**Cost**: $4,000-7,650 (40-51 hours)

### Executive Summary

A single line of code (line 81 in VoiceOrderModal.tsx) caused a complete production outage for voice and touch ordering. The bug was an early return statement before an AnimatePresence wrapper, causing React hydration mismatch. Detection was difficult due to component complexity (528 lines), misleading error messages, and SSR invisibility in development builds.

### Timeline

#### Day 0: November 7, 2025 (Feature Deployment)
- **10:00 AM**: Deploy touch ordering feature alongside voice ordering
- **10:30 AM**: Basic smoke testing passes (table selection works)
- **11:00 AM**: Deploy to production (Vercel)
- **11:30 AM**: First user reports: "Can't open voice/touch order modals"

#### Day 1: November 8, 2025 (Initial Investigation)
- **09:00 AM**: Bug report confirmed: "This section couldn't be loaded" error
- **09:15 AM**: Check network tab: All API calls succeed (menu items, tables, auth)
- **09:30 AM**: Check console: React Error #318 visible
- **09:45 AM**: **WRONG ASSUMPTION**: Nested UnifiedCartProvider causing context issues
  - *Reasoning*: Previous fixes involved provider nesting
  - *Reasoning*: Touch mode introduced MenuGrid needing cart context
  - *Reasoning*: Error appeared after touch feature merged
- **11:00 AM**: Attempt Fix #1 (Commit accf09e9)
  - Remove nested UnifiedCartProvider from VoiceOrderModal
  - Result: MenuGrid loses cart context, items can't be added
  - **REVERTED** - Wrong fix
- **02:00 PM**: Investigate provider hierarchy
  - Map out all UnifiedCartProvider instances
  - Document persistKey values
  - Hypothesis: Keys need to match
- **04:00 PM**: Attempt Fix #2 (Commit 6bded64f)
  - Restore nested provider with unique persistKey
  - Result: Provider isolation (creates Cart bug #3)
  - Deploy to production
- **04:30 PM**: User tests: **SAME ERROR PERSISTS**
- **05:00 PM**: Confusion: Why didn't fix work?
  - Check Vercel deployment logs
  - Verify new code deployed
  - Assume edge cache propagation delay
- **06:00 PM**: End of day - planning fresh investigation

**Day 1 Summary**: 8 hours spent, 2 wrong fixes, still broken

#### Day 2: November 9, 2025 (Deep Investigation)
- **08:00 AM**: Fresh look: React Error #318 specific investigation
- **08:30 AM**: Research React #318 documentation
  - "Hydration failed because initial UI does not match server"
  - Common causes: SSR/client mismatch, non-deterministic values
- **09:00 AM**: Launch parallel investigations (4 subagents)
  1. **React #318 Analysis**: Search for hydration-specific patterns
  2. **Render Tree Audit**: Map all 13 hydration hazards in codebase
  3. **KioskPage Comparison**: Why does Kiosk work but ServerView doesn't?
  4. **Git History**: Find previous hydration fixes (Date.now() commits)
- **10:30 AM**: Subagent #1 Reports: Found suspicious pattern
  - Line 81 VoiceOrderModal: `if (!show || !table || !seat) return null`
  - Line 182: `<AnimatePresence>` renders after early return
  - **This creates SSR/client mismatch**
- **11:00 AM**: Subagent #2 Reports: 13 hydration risks found
  - Non-deterministic Date values in ServerView (lines 126, 147, 167)
  - AnimatePresence conditional rendering in 4 components
  - suppressHydrationWarning used in ServerView line 108
- **11:30 AM**: Subagent #3 Reports: Structural differences
  - KioskPage: No early returns before AnimatePresence
  - ServerView: Multiple early returns in nested modals
  - KioskPage uses consistent wrapper patterns
- **12:00 PM**: Synthesis with Sequential Thinking MCP
  - 95% confidence: Line 81 early return is PRIMARY BUG
  - 80% confidence: Date.now() values are SECONDARY BUG
  - Recommendation: Fix both
- **01:00 PM**: Implement Fix (Commit 3949d61a)
  ```diff
  - if (!show || !table || !seat) return null

    return (
      <AnimatePresence>
  -     {show && (
  +     {show && table && seat && (
  ```
- **01:15 PM**: Test locally with production build
  ```bash
  npm run build
  npm run preview
  ```
- **01:30 PM**: **MODAL OPENS SUCCESSFULLY** 
- **02:00 PM**: Deploy to production
- **02:30 PM**: User testing begins
- **03:00 PM**: **VOICE ORDERING WORKS** 
- **03:15 PM**: **TOUCH ORDERING WORKS** 
- **03:30 PM**: Verify no regressions
  - Table selection: 
  - Seat selection: 
  - Voice order submission: 
  - Touch order submission:  (but cart doesn't update - see Incident #3)
- **04:00 PM**: Write post-mortem
- **05:00 PM**: Incident closed

**Day 2 Summary**: 9 hours spent, bug identified and fixed

#### Post-Incident Analysis (Day 3+)
- **November 10**: Discover secondary cart bug (Incident #3)
- **November 10**: Fix Date.now() issues (Incident #4)
- **November 14**: Complete documentation

### Root Cause

**Primary**: Line 81 in VoiceOrderModal.tsx
```typescript
if (!show || !table || !seat) return null  //  Before AnimatePresence
```

**Why It Broke**:
1. When `show=false`, component returns `null` (no DOM)
2. Server renders: `null`
3. Client initial render: `null` (matches server )
4. **BUT** when `show=true`:
   - AnimatePresence NOW renders (creates wrapper div)
   - Server had `null`, client has `<div>` wrapper
   - **Mismatch → React Error #318**

### The Fix

**Commit**: `3949d61a`
**Files Changed**: 1
**Lines Changed**: 2
**Impact**: Fixed 3-day production outage

```typescript
// Remove early return, move conditional inside AnimatePresence
return (
  <AnimatePresence>
    {show && table && seat && (  //  Conditional inside wrapper
      <motion.div>...</motion.div>
    )}
  </AnimatePresence>
)
```

### Why Detection Was Difficult

1. **Component Complexity**: 528 lines, multiple modes, nested modals
2. **Minified Error**: React #318 doesn't say WHERE the issue is
3. **Development Invisibility**: Dev builds don't show hydration issues
4. **Testing Limitations**: Canvas elements can't be automated with Playwright
5. **Misleading Symptoms**: API calls succeeded, suggesting server issue
6. **Pattern Subtlety**: Early returns are common, look normal
7. **Previous Bias**: Recent context provider fixes created confirmation bias

### Lessons Learned

1. **Trust error messages**: React #318 = hydration issue, investigate SSR patterns first
2. **Test with production builds**: `npm run build && npm run preview`
3. **Early returns are dangerous**: Before AnimatePresence, Suspense, Portal
4. **Component size matters**: 528 lines = bugs hide easily
5. **Parallel investigation works**: 4 subagents found bug in 3.5 hours
6. **User evidence critical**: Screenshots with exact errors saved hours

### Cost Breakdown

| Phase | Hours | Cost @ $100/hr | Cost @ $150/hr |
|-------|-------|----------------|----------------|
| Day 1: Wrong fixes | 8 | $800 | $1,200 |
| Day 1 evening: Research | 4 | $400 | $600 |
| Day 2: Investigation | 4.5 | $450 | $675 |
| Day 2: Parallel agents | 3.5 | $350 | $525 |
| Day 2: Fix + testing | 2 | $200 | $300 |
| Day 3: Post-mortem | 4 | $400 | $600 |
| **TOTAL** | **26** | **$2,600** | **$3,900** |

**Note**: This doesn't include the time spent on secondary bugs (Cart, Date.now()) discovered during testing, which adds another 14-25 hours.

---

## Incident #2: Infinite Loop Bug

**Date**: November 8, 2025
**Duration**: Same day (8-10 hours)
**Severity**: HIGH - Functional Blocking
**Status**: RESOLVED
**Cost**: $800-1,500

### Executive Summary

The useToast hook returned a new object on every render, causing useCallback dependencies to change infinitely. This created an infinite re-render loop that manifested as "Loading floor plan..." infinite loading state. The fix was trivial (wrap return in useMemo) but detection required understanding React's reference equality checks.

### Timeline

#### Morning: November 8, 2025

**09:00 AM**: Deploy dual-button feature (voice/touch mode toggle)
- Commit: fd22b968
- Changes: Add touch mode alongside voice mode in ServerView
- Introduces useToast dependency in useServerView

**09:30 AM**: User reports: "Floor plan stuck on 'Loading...'"
- Dashboard shows spinner
- Never progresses to floor plan view
- No error messages visible

**10:00 AM**: Initial investigation
- Check network tab: Floor plan API call succeeds
- Response has table data (20 tables)
- But UI doesn't render tables

**10:30 AM**: Check console
- React warning: "Maximum update depth exceeded"
- React Error #310: "Too many re-renders"
- Indicates infinite loop

**11:00 AM**: Add debug logging
```typescript
useEffect(() => {
  console.log('loadFloorPlan dependency changed')
  loadFloorPlan()
}, [loadFloorPlan])
```
- Log fires continuously (hundreds per second)
- Confirms: loadFloorPlan recreates every render

**11:30 AM**: Investigate useCallback dependencies
```typescript
const loadFloorPlan = useCallback(async () => {
  try {
    // Load logic
  } catch (error) {
    toast.error('Failed')  // Uses toast
  }
}, [toast])  // ← toast changes every render!
```

**12:00 PM**: Check useToast implementation
```typescript
export const useToast = () => {
  return {  //  NEW object every call
    toast: {
      success: (message) => toast.success(message),
      error: (message) => toast.error(message),
    },
  }
}
```
- **ROOT CAUSE FOUND**: Hook returns new object every render
- Objects are compared by reference, not value
- New object = different reference = dependency change

**12:30 PM**: Implement Fix #1 (useToast.ts)
```typescript
export const useToast = () => {
  return useMemo(() => ({  //  Stable reference
    toast: {
      success: (message) => toast.success(message),
      error: (message) => toast.error(message),
    },
  }), [])  // Empty deps = never recreates
}
```

**12:45 PM**: Test locally
- Floor plan loads 
- No infinite loop 
- Console clean 

**01:00 PM**: Discover secondary issue: Mode switching doesn't work
- Click "Switch to Touch" button
- Modal stays in voice mode
- Investigate VoiceOrderModal

**01:15 PM**: Check prop-to-state sync
```typescript
const [inputMode, setInputMode] = useState(initialInputMode)
//  useState ignores prop changes after first render
```

**01:30 PM**: Implement Fix #2 (VoiceOrderModal.tsx)
```typescript
const [inputMode, setInputMode] = useState(initialInputMode)

useEffect(() => {  //  Sync prop changes
  setInputMode(initialInputMode)
}, [initialInputMode])
```

**02:00 PM**: Test both fixes
- Floor plan loads 
- Mode switching works 
- No infinite loop 

**02:30 PM**: Deploy (Commit 982c7cd2)

**03:00 PM**: Verify in production 

**03:30 PM**: Incident closed

### Root Cause

**Primary**: useToast hook returns unstable reference
```typescript
//  WRONG: New object every render
export const useToast = () => {
  return {
    toast: { ... }
  }
}
```

**Secondary**: VoiceOrderModal doesn't sync prop to state
```typescript
//  WRONG: useState ignores prop changes
const [inputMode, setInputMode] = useState(initialInputMode)
```

### The Cascade

```
1. Component renders
   ↓
2. useToast() returns NEW object
   ↓
3. toast reference changes
   ↓
4. useCallback dependency changes
   ↓
5. loadFloorPlan function recreates
   ↓
6. useEffect dependency changes
   ↓
7. loadFloorPlan() executes
   ↓
8. Component re-renders
   ↓
9. Back to step 1 → INFINITE LOOP
```

### The Fix

**Commit**: `982c7cd2`
**Files Changed**: 2
**Lines Changed**: 7 (5 in useToast, 2 in VoiceOrderModal)

**Fix #1: Stabilize hook return**
```typescript
export const useToast = () => {
  return useMemo(() => ({  //  Wrap in useMemo
    toast: {
      success: (message) => toast.success(message),
      error: (message) => toast.error(message),
    },
  }), [])  // Empty deps = stable forever
}
```

**Fix #2: Sync prop to state**
```typescript
const [inputMode, setInputMode] = useState(initialInputMode)

useEffect(() => {  //  Update state when prop changes
  setInputMode(initialInputMode)
}, [initialInputMode])
```

### Why Detection Was Difficult

1. **Subtle Cascade**: useToast → useCallback → useEffect → re-render
2. **Common Pattern**: Returning objects from hooks looks normal
3. **Reference Equality**: JavaScript object comparison is by reference
4. **Multiple Symptoms**: Infinite loop AND mode switching broken
5. **Recent Change**: Bug introduced by dual-button feature (fd22b968)

### Lessons Learned

1. **Hook returns must be stable**: Wrap objects/arrays in useMemo
2. **Watch dependency arrays**: Unstable values cause infinite loops
3. **useState ignores props**: Use useEffect to sync prop-to-state
4. **Debug with logging**: Identify which dependency changes
5. **Test mode switching**: Don't assume useState syncs with props

### Cost Breakdown

| Phase | Hours | Cost @ $100/hr | Cost @ $150/hr |
|-------|-------|----------------|----------------|
| Investigation | 3 | $300 | $450 |
| Debug logging | 1 | $100 | $150 |
| Fix #1 (useToast) | 1 | $100 | $150 |
| Fix #2 (prop sync) | 1 | $100 | $150 |
| Testing | 2 | $200 | $300 |
| **TOTAL** | **8** | **$800** | **$1,200** |

---

## Incident #3: Cart Provider Isolation

**Date**: November 10, 2025
**Duration**: 6-8 hours
**Severity**: HIGH - Functional Blocking
**Status**: RESOLVED
**Cost**: $600-1,200

### Executive Summary

Nested UnifiedCartProvider instances with different persistKeys created isolated state. MenuItemCard wrote to nested provider, CartDrawer read from root provider. Result: Items showed "Added!" feedback but cart stayed empty. The fix was changing one persistKey to match the root provider.

### Timeline

#### November 10, 2025

**10:00 AM**: Test touch ordering after React #318 fix
- Voice ordering works 
- Touch ordering modal opens 
- Click "Add to Cart" on menu item
- See "Added!" checkmark 
- **But cart drawer shows 0 items** 

**10:15 AM**: Initial confusion
- API succeeds (network tab shows POST /cart/add)
- "Added!" feedback appears (component sees update)
- But CartDrawer empty (doesn't see update)
- **Different components seeing different state?**

**10:30 AM**: Check localStorage
```javascript
// In DevTools Application tab
localStorage.getItem('cart_current')  // Empty array
localStorage.getItem('voice_order_modal_touch')  // Has items!
```
- **Two separate cart instances in localStorage**
- This explains the state isolation

**11:00 AM**: Investigate provider hierarchy
```
App.tsx (line 219):
  <UnifiedCartProvider persistKey="cart_current">
    <CartDrawer />  // Reads from "cart_current"
  </UnifiedCartProvider>

VoiceOrderModal.tsx (line 237):
  <UnifiedCartProvider persistKey="voice_order_modal_touch">
    <MenuGrid>
      <MenuItemCard />  // Writes to "voice_order_modal_touch"
    </MenuGrid>
  </UnifiedCartProvider>
```

**11:30 AM**: Understand React Context behavior
- `useContext()` searches UP the component tree
- Returns NEAREST matching provider
- MenuItemCard finds nested provider first
- CartDrawer finds root provider
- **They're reading from different providers!**

**12:00 PM**: Check git history
```bash
git log --oneline -- VoiceOrderModal.tsx
```
- `6bded64f` - "restore nested cart provider with unique persistkey"
- This commit introduced the bug!
- It was attempting to fix React #318 (wrong approach)

**12:30 PM**: Analyze why nested provider exists
- MenuGrid requires cart context to function
- ServerView is lazy-loaded (creates context boundary)
- **But persistKey should match root provider**

**01:00 PM**: Implement fix
```diff
  // VoiceOrderModal.tsx line 237
- <UnifiedCartProvider persistKey="voice_order_modal_touch">
+ <UnifiedCartProvider persistKey="cart_current">
```

**01:15 PM**: Test locally
- Add item to cart
- **Cart drawer updates immediately** 
- Check localStorage: Only one key ("cart_current") 
- Add more items: All accumulate 

**01:30 PM**: Verify no side effects
- Voice ordering: Still works 
- Touch ordering: Works now 
- Cart persistence: Works 
- Cart removal: Works 

**02:00 PM**: Deploy (Commit 3740c782)

**02:30 PM**: User testing in production 

**03:00 PM**: Write analysis document
- TOUCH_ORDERING_CART_BUG_ANALYSIS.md
- Document provider isolation pattern
- Explain React Context behavior

**04:00 PM**: Incident closed

### Root Cause

**Nested providers with different persistKeys**:
```typescript
// Root provider
<UnifiedCartProvider persistKey="cart_current">
  <CartDrawer />  // Reads from this
</UnifiedCartProvider>

// Nested provider (WRONG)
<UnifiedCartProvider persistKey="voice_order_modal_touch">
  <MenuItemCard />  // Writes to this
</UnifiedCartProvider>
```

**Data Flow Problem**:
```
User clicks "Add to Cart"
   ↓
MenuItemCard.addToCart()
   ↓
useUnifiedCart() → Returns NESTED provider
   ↓
Writes to localStorage "voice_order_modal_touch"
   ↓
Shows "Added!" feedback (nested provider updates)
   ↓
CartDrawer.useUnifiedCart() → Returns ROOT provider
   ↓
Reads from localStorage "cart_current"
   ↓
Shows empty cart (root provider unchanged)
```

### The Fix

**Commit**: `3740c782`
**Files Changed**: 1
**Lines Changed**: 1

```typescript
// Change nested provider to use same persistKey
<UnifiedCartProvider persistKey="cart_current">
  <MenuGrid />
</UnifiedCartProvider>
```

**Why This Works**:
- Both providers now share same localStorage key
- Both providers now share same state
- Writes to nested provider update shared state
- CartDrawer sees updates immediately 

### Why Detection Was Moderate

1. **Obvious Symptoms**: "Added!" but empty cart is clear mismatch
2. **localStorage Evidence**: Two keys visible in DevTools
3. **Recent Change**: Bug introduced by known commit (6bded64f)
4. **React Docs**: Context behavior is well-documented
5. **Quick Fix**: One line change once understood

**But still took 6-8 hours because**:
1. Initial confusion about WHY separate state
2. Investigation of git history
3. Understanding React Context lookup behavior
4. Writing comprehensive analysis document
5. Testing all cart operations

### Lessons Learned

1. **Nested providers need same key**: If sharing state
2. **Check localStorage**: Reveals state isolation issues
3. **useContext finds nearest provider**: Not always what you expect
4. **Git blame is helpful**: Find when/why code changed
5. **Document patterns**: Help future debugging

### Cost Breakdown

| Phase | Hours | Cost @ $100/hr | Cost @ $150/hr |
|-------|-------|----------------|----------------|
| Investigation | 2 | $200 | $300 |
| Git history | 1 | $100 | $150 |
| Fix implementation | 0.5 | $50 | $75 |
| Testing | 1.5 | $150 | $225 |
| Documentation | 2 | $200 | $300 |
| **TOTAL** | **7** | **$700** | **$1,050** |

---

## Incident #4: React #418 Non-Deterministic Values

**Date**: November 9, 2025
**Duration**: 4-6 hours
**Severity**: HIGH - Functional Blocking
**Status**: RESOLVED
**Cost**: $400-900

### Executive Summary

`new Date().toISOString()` used in props generated different timestamps on each render, causing React Error #418 during Framer Motion animations. This was actually a recurrence of a previously fixed bug - only 1 of 4 locations had been addressed. The fix was replacing all Date.now() calls with deterministic values.

### Timeline

#### November 9, 2025

**01:00 PM**: Test voice/touch modals after React #318 fix
- Modal opens 
- Voice order works 
- Touch order works 
- **BUT**: Console shows React Error #418

**01:15 PM**: Check error details
```
React Error #418: Hydration failed because the server rendered HTML
didn't match the client. As a result this tree will be regenerated
on the client. This can happen if an SSR-ed Client Component used:
- Variable input such as Date.now() or Math.random()
```

**01:30 PM**: Initial confusion
- This error happened before (Oct 29)
- Was supposedly fixed in commit 5dc74903
- Why is it back?

**02:00 PM**: Check previous fix
```bash
git show 5dc74903
```
- Fixed Date.now() in ONE location (PostOrderPrompt)
- But didn't check other locations!

**02:15 PM**: Search for all Date.now() calls
```bash
git grep "Date.now()" client/src/
git grep "new Date()" client/src/
```

**02:30 PM**: Find 6 more locations
1. ServerView.tsx line 126: SeatSelectionModal created_at
2. ServerView.tsx line 127: SeatSelectionModal updated_at
3. ServerView.tsx line 147: VoiceOrderModal created_at
4. ServerView.tsx line 148: VoiceOrderModal updated_at
5. ServerView.tsx line 167: PostOrderPrompt created_at
6. ServerView.tsx line 168: PostOrderPrompt updated_at
7. useVoiceOrderWebRTC.ts line 79: Voice order ID generation
8. useVoiceOrderWebRTC.ts line 185: Order item ID generation

**03:00 PM**: Understand why it breaks
```typescript
// First render
<VoiceOrderModal created_at="2025-11-09T14:00:00.123Z" />

// AnimatePresence triggers re-render
<VoiceOrderModal created_at="2025-11-09T14:00:00.456Z" />

// Different prop values → React Error #418
```

**03:30 PM**: Implement fixes

**Fix #1: Use stable prop values**
```diff
  <SeatSelectionModal
-   created_at={new Date().toISOString()}
-   updated_at={new Date().toISOString()}
+   created_at={selectedTable?.created_at || ''}
+   updated_at={selectedTable?.updated_at || ''}
  />
```

**Fix #2: Use deterministic counter**
```diff
+ let voiceOrderCounter = 0  // Module-level counter
+
  function useVoiceOrderWebRTC() {
-   const tempId = `voice-${Date.now()}-${Math.random()}`
+   const tempId = `voice-${++voiceOrderCounter}`
  }
```

**04:00 PM**: Test locally
- Modal opens: No React #418 
- Voice order: Works 
- Touch order: Works 
- Console: Clean 

**04:30 PM**: Deploy (Commit 3c3009b8)

**05:00 PM**: Verify in production 

**05:30 PM**: Add prevention note
- Document pattern in CLAUDE.md
- Add pre-commit check for Date.now()
- Add ESLint rule idea

**06:00 PM**: Incident closed

### Root Cause

**Non-deterministic values in render/props**:
```typescript
//  WRONG: Different value every render
created_at={new Date().toISOString()}

//  WRONG: Different value every call
const id = `voice-${Date.now()}-${Math.random()}`
```

### Why This Breaks

**Framer Motion Behavior**:
1. AnimatePresence renders modal
2. Animation starts (opacity 0 → 1)
3. **React re-renders during animation**
4. Props comparison: old value ≠ new value
5. React detects "hydration mismatch"
6. React Error #418 thrown

**The Confusion**:
- This is a SPA (Single Page App), NOT SSR
- But React still checks for consistency
- AnimatePresence triggers re-renders
- Re-renders expose non-deterministic values

### The Fix

**Commit**: `3c3009b8`
**Files Changed**: 2
**Lines Changed**: 13 (8 in ServerView, 5 in useVoiceOrderWebRTC)

**Fix #1: Use stable prop values**
```typescript
//  CORRECT: Value from stable data source
created_at={selectedTable?.created_at || ''}
updated_at={selectedTable?.updated_at || ''}
```

**Fix #2: Deterministic ID generation**
```typescript
//  CORRECT: Counter-based IDs
let voiceOrderCounter = 0

const tempId = `voice-${++voiceOrderCounter}`
// First call: voice-1
// Second call: voice-2
// Predictable, unique, deterministic
```

### Why Detection Was Easy (But Fix Took Time)

**Easy Parts**:
1. Error message clear: "Variable input such as Date.now()"
2. Previous similar bug (commit 5dc74903)
3. Quick search finds all locations
4. Obvious fix once understood

**Time-Consuming Parts**:
1. Recurrence investigation (why wasn't this caught before?)
2. Finding ALL locations (8 total)
3. Testing each fix individually
4. Verifying no side effects
5. Adding prevention measures

### Lessons Learned

1. **Fix all locations**: Don't just fix the symptom
2. **Search entire codebase**: `git grep` for patterns
3. **Add linting rules**: Prevent recurrence
4. **Document pattern**: In CLAUDE.md and code comments
5. **Test with animations**: AnimatePresence exposes issues

### Cost Breakdown

| Phase | Hours | Cost @ $100/hr | Cost @ $150/hr |
|-------|-------|----------------|----------------|
| Investigation | 1.5 | $150 | $225 |
| Search all locations | 1 | $100 | $150 |
| Fix implementation | 1 | $100 | $150 |
| Testing | 1 | $100 | $150 |
| Prevention measures | 0.5 | $50 | $75 |
| **TOTAL** | **5** | **$500** | **$750** |

---

## Incident #5: Auth Hang

**Date**: November 2-10, 2025
**Duration**: 8 days (low priority), 2-3 hours actual work
**Severity**: MEDIUM - Login Blocking
**Status**: RESOLVED
**Cost**: $200-450

### Executive Summary

Login flow hung at "Signing in..." after demo session code removal on Nov 2. The httpClient needed restaurantId set explicitly via setCurrentRestaurantId() to include X-Restaurant-ID header in API calls. Without it, validateRestaurantAccess middleware query would hang. Five calls were added to sync React state with httpClient state.

### Timeline

#### November 2, 2025 (Bug Introduced)
- **Commit 5dc74903**: Remove 430 lines of demo session code
- Removed setCurrentRestaurantId() calls inadvertently
- Deploy to production
- **Login starts hanging** (but low priority, not noticed immediately)

#### November 7-9, 2025 (React #318 Takes Priority)
- Focus on critical voice/touch ordering bugs
- Login hang not addressed (servers using PIN auth instead)

#### November 10, 2025 (Investigation)

**02:00 PM**: User reports: "Can't log in with email/password"
- Enters credentials
- Clicks "Sign In"
- Spinner appears: "Signing in..."
- **Never completes** (no error, no success)

**02:15 PM**: Check network tab
- POST /api/v1/auth/login:  Success (200)
- GET /api/v1/auth/me: ⏳ Pending (hangs)

**02:30 PM**: Check backend logs
```
validateRestaurantAccess: No restaurant_id in headers
Querying user_restaurants without restaurant filter
Query hanging (no timeout configured)
```

**02:45 PM**: Check httpClient state
```javascript
// In browser console
httpClient.currentRestaurantId  // undefined 
```

**03:00 PM**: Trace login flow
```typescript
1. User enters credentials
2. login() calls POST /api/v1/auth/login
3. Success → receives { user, session, restaurantId }
4. Sets React state: setRestaurantId(response.restaurantId)
5.  MISSING: setCurrentRestaurantId(response.restaurantId)
6. Calls GET /api/v1/auth/me
7. httpClient sends request WITHOUT X-Restaurant-ID header
8. Backend middleware query hangs
9. Login stuck
```

**03:15 PM**: Find the pattern
```bash
git log -p --all -S "setCurrentRestaurantId" | grep "^-.*setCurrentRestaurantId"
```
- Shows 5 removed calls in commit 5dc74903

**03:30 PM**: Implement fix
```diff
  // AuthContext.tsx

  // Line 82: initializeAuth
  setUser(response.user)
  setRestaurantId(response.restaurantId)
+ setCurrentRestaurantId(response.restaurantId)  //  Sync with httpClient

  // Line 152: onAuthStateChange SIGNED_IN
  setUser(session.user)
  setRestaurantId(restaurantId)
+ setCurrentRestaurantId(restaurantId)  //  Sync with httpClient

  // Line 227: login (EMAIL/PASSWORD) - PRIMARY FIX
  setUser(response.user)
  setRestaurantId(response.restaurantId)
+ setCurrentRestaurantId(response.restaurantId)  //  Sync with httpClient

  // Line 263: loginWithPin
  setUser(response.user)
  setRestaurantId(response.restaurantId)
+ setCurrentRestaurantId(response.restaurantId)  //  Sync with httpClient

  // Line 315: loginAsStation
  setUser(response.user)
  setRestaurantId(response.restaurantId)
+ setCurrentRestaurantId(response.restaurantId)  //  Sync with httpClient
```

**04:00 PM**: Test locally
- Email/password login:  Works
- PIN login:  Works
- Station login:  Works
- httpClient.currentRestaurantId:  Set correctly

**04:30 PM**: Deploy (Commit acd6125c)

**05:00 PM**: Verify in production 

**05:15 PM**: Incident closed

### Root Cause

**Missing state sync between React and httpClient**:
```typescript
//  WRONG: Only updates React state
setRestaurantId(response.restaurantId)

//  CORRECT: Updates both
setRestaurantId(response.restaurantId)
setCurrentRestaurantId(response.restaurantId)  // Sync with httpClient
```

### Why This Breaks

**Dual Auth Pattern (ADR-006)**:
- React state: `restaurantId` (for UI)
- httpClient state: `currentRestaurantId` (for API headers)
- **Both must be set explicitly**
- No automatic synchronization

**Login Flow**:
```
1. login() succeeds
2. React state updated: restaurantId="11111..."
3. httpClient state NOT updated: currentRestaurantId=undefined
4. Next API call: GET /api/v1/auth/me
5. httpClient sends request WITHOUT X-Restaurant-ID header
6. Backend middleware: validateRestaurantAccess
7. Query: SELECT * FROM user_restaurants WHERE user_id = ?
   (Missing: AND restaurant_id = ?)
8. Query returns all restaurants or hangs
9. Validation fails or times out
10. Login stuck
```

### The Fix

**Commit**: `acd6125c`
**Files Changed**: 1 (AuthContext.tsx)
**Lines Changed**: 9 (5 additions, 2 comment updates, 2 log updates)

**Add setCurrentRestaurantId() at 5 locations**:
1. Line 82: initializeAuth() - Session restoration
2. Line 152: onAuthStateChange() - Supabase SIGNED_IN event
3. Line 227: login() - Email/password (PRIMARY FIX)
4. Line 263: loginWithPin() - PIN auth
5. Line 315: loginAsStation() - Station auth

### Why Detection Was Easy

1. **Clear symptom**: Login hangs at specific step
2. **Network evidence**: Second API call hangs
3. **Recent change**: Demo code removal (commit 5dc74903)
4. **Git history**: Shows removed setCurrentRestaurantId() calls
5. **Quick fix**: Add back missing calls

### Why It Took 8 Days

1. **Low priority**: Servers use PIN auth instead
2. **Other critical bugs**: React #318 took precedence
3. **Workaround available**: PIN login still worked
4. **Not blocking**: Production continued operating

### Lessons Learned

1. **Dual state requires sync**: React + httpClient need explicit updates
2. **Test all auth flows**: Email, PIN, station, session restore
3. **Git blame is powerful**: Find when/why code removed
4. **Document global state**: ADR-006 explains dual pattern
5. **Add timeouts**: Backend queries shouldn't hang forever

### Cost Breakdown

| Phase | Hours | Cost @ $100/hr | Cost @ $150/hr |
|-------|-------|----------------|----------------|
| Investigation | 1 | $100 | $150 |
| Git history | 0.5 | $50 | $75 |
| Fix implementation | 0.5 | $50 | $75 |
| Testing | 1 | $100 | $150 |
| **TOTAL** | **3** | **$300** | **$450** |

---

## Cross-Incident Analysis

### Common Factors

1. **Component Complexity**: Large files (528 lines) hide bugs
2. **Recent Changes**: All bugs introduced within 2 weeks
3. **SSR/Hydration**: 3/5 bugs related to React rendering
4. **State Management**: 3/5 bugs related to state sync
5. **Testing Gaps**: Manual testing required, automation difficult

### Cost Summary

| Incident | Hours | Cost Range |
|----------|-------|------------|
| React #318 | 40-51 | $4,000-7,650 |
| Infinite Loop | 8-10 | $800-1,500 |
| Cart Provider | 6-8 | $600-1,200 |
| React #418 | 4-6 | $400-900 |
| Auth Hang | 2-3 | $200-450 |
| **TOTAL** | **60-78** | **$6,000-11,700** |

### Time Distribution

- **Investigation**: 60% (wrong assumptions, misleading errors)
- **Wrong Fixes**: 20% (incorrect theories, reverted changes)
- **Actual Fix**: 10% (once root cause understood)
- **Testing**: 5% (verification, regression checks)
- **Documentation**: 5% (post-mortems, prevention)

### Prevention Strategies

1. **Component Size Limits**: <200 lines warning, <500 hard limit
2. **Pre-Commit Checks**: Production builds, pattern detection
3. **Code Review**: SSR checklist, hydration awareness
4. **Testing**: Production builds, animation testing
5. **Documentation**: Patterns guide, AI agent guide
6. **Monitoring**: React error codes, infinite loop detection

---

**Created**: 2025-11-19
**Last Updated**: 2025-11-19
**Authority**: Production incidents Nov 2-10, 2025
**Status**: Historical record + learning resource


## Solution Patterns

# React Anti-Patterns - Code Examples

This document shows the exact patterns that caused production bugs, with before/after code examples.

## Table of Contents

1. [Early Return Before AnimatePresence](#pattern-1-early-return-before-animatepresence)
2. [Unstable Hook Returns](#pattern-2-unstable-hook-returns)
3. [Non-Deterministic Values in Render](#pattern-3-non-deterministic-values-in-render)
4. [Nested Context Providers with Different Keys](#pattern-4-nested-context-providers-with-different-keys)
5. [Prop-to-State Sync Without useEffect](#pattern-5-prop-to-state-sync-without-useeffect)

---

## Pattern 1: Early Return Before AnimatePresence

### The Bug

**File**: `/client/src/pages/components/VoiceOrderModal.tsx`
**Lines**: 81, 182
**Incident**: React #318 Hydration Bug
**Impact**: 3-day production outage
**Cost**: $4,000-7,650 (40-51 hours)

### Before (BROKEN)

```typescript
// VoiceOrderModal.tsx - Line 81
export function VoiceOrderModal({ show, table, seat, ...props }) {
  //  ANTI-PATTERN: Early return before wrapper
  if (!show || !table || !seat) return null

  const [inputMode, setInputMode] = useState('voice')
  // ... 100+ lines of component logic ...

  // Line 182 - AnimatePresence never rendered when conditions false
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Modal content */}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

### Why This Breaks

**Server-Side Render (SSR)**:
- When `show=false`, component returns `null`
- Server HTML: (nothing)

**Client-Side Hydration**:
- When `show=false`, component returns `null`
- Initial render matches server: 
- **BUT THEN** when `show=true`:
  - AnimatePresence NOW renders (creates wrapper div)
  - React expects server HTML to match client render
  - Server had `null`, client has `<div>` wrapper
  - **Hydration mismatch → React Error #318**

### After (FIXED)

```typescript
// VoiceOrderModal.tsx - Line 81 removed, line 182 updated
export function VoiceOrderModal({ show, table, seat, ...props }) {
  //  No early return - AnimatePresence always in render tree
  const [inputMode, setInputMode] = useState('voice')
  // ... 100+ lines of component logic ...

  return (
    <AnimatePresence>
      {show && table && seat && (  //  Conditional inside wrapper
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Modal content */}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

### Why This Works

**Server-Side Render**:
- AnimatePresence always renders (empty div wrapper)
- Server HTML: `<div></div>`

**Client-Side Hydration**:
- AnimatePresence always renders (empty div wrapper)
- Client HTML: `<div></div>`
- **Perfect match → No hydration error** 

**When Modal Opens**:
- `show && table && seat` evaluates to true
- Content animates in smoothly
- AnimatePresence handles exit animations correctly

### The Rule

**Never do this:**
```typescript
if (!condition) return null  // Before wrapper

return (
  <AnimatePresence>
    {condition && <Content />}
  </AnimatePresence>
)
```

**Always do this:**
```typescript
return (
  <AnimatePresence>
    {condition && <Content />}  // Inside wrapper
  </AnimatePresence>
)
```

### Applies To

- `<AnimatePresence>` (Framer Motion)
- `<Suspense>` (React)
- `<ErrorBoundary>` (React)
- `<Portal>` (React DOM)
- Any wrapper component that must render consistently

---

## Pattern 2: Unstable Hook Returns

### The Bug

**File**: `/client/src/hooks/useToast.ts`
**Lines**: 4-12
**Incident**: Infinite Loop Bug
**Impact**: "Loading floor plan..." infinite state
**Cost**: $800-1,500 (8-10 hours)

### Before (BROKEN)

```typescript
// useToast.ts - Lines 4-12
import toast, { ToastOptions, Renderable } from 'react-hot-toast'

export const useToast = () => {
  //  ANTI-PATTERN: Returns new object every render
  return {
    toast: {
      success: (message: Renderable, options?: ToastOptions) =>
        toast.success(message, options),
      error: (message: Renderable, options?: ToastOptions) =>
        toast.error(message, options),
      loading: (message: Renderable, options?: ToastOptions) =>
        toast.loading(message, options),
      dismiss: (toastId?: string) =>
        toast.dismiss(toastId),
    },
  }
}
```

### Why This Breaks

**The Cascade**:
1. Component calls `const { toast } = useToast()`
2. Hook returns NEW object (different reference)
3. Component detects change in dependency array
4. Re-renders
5. Calls `useToast()` again
6. Gets NEW object again
7. **Infinite loop → React error #310**

**Real Example**:
```typescript
// useServerView.ts
const { toast } = useToast()  // NEW object every render

const loadFloorPlan = useCallback(async () => {
  try {
    // Load floor plan
  } catch (error) {
    toast.error('Failed to load')  // Uses toast
  }
}, [toast])  //  toast changes every render → infinite loop

useEffect(() => {
  loadFloorPlan()
}, [loadFloorPlan])  //  loadFloorPlan recreates every render
```

### After (FIXED)

```typescript
// useToast.ts - Lines 1-13
import { useMemo } from 'react'
import toast, { ToastOptions, Renderable } from 'react-hot-toast'

export const useToast = () => {
  //  Wrap return value in useMemo with empty deps
  return useMemo(() => ({
    toast: {
      success: (message: Renderable, options?: ToastOptions) =>
        toast.success(message, options),
      error: (message: Renderable, options?: ToastOptions) =>
        toast.error(message, options),
      loading: (message: Renderable, options?: ToastOptions) =>
        toast.loading(message, options),
      dismiss: (toastId?: string) =>
        toast.dismiss(toastId),
    },
  }), [])  //  Empty deps = stable reference
}
```

### Why This Works

**Stable Reference**:
1. Component calls `const { toast } = useToast()`
2. Hook returns SAME object (useMemo caches it)
3. Component dependency array sees no change
4. No unnecessary re-renders
5. **No infinite loop** 

### The Rule

**Never do this:**
```typescript
export const useMyHook = () => {
  return {
    method1: () => {},
    method2: () => {},
  }
}
```

**Always do this:**
```typescript
export const useMyHook = () => {
  return useMemo(() => ({
    method1: () => {},
    method2: () => {},
  }), [])  // Or proper dependencies
}
```

### Applies To

- Hook return values used in dependency arrays
- Objects returned from hooks
- Arrays returned from hooks
- Functions returned from hooks (use useCallback instead)

---

## Pattern 3: Non-Deterministic Values in Render

### The Bug

**File**: `/client/src/pages/ServerView.tsx`
**Lines**: 126-127, 147-148, 167-168
**File**: `/client/src/pages/hooks/useVoiceOrderWebRTC.ts`
**Lines**: 79, 185
**Incident**: React #418 Bug
**Impact**: "This section couldn't be loaded"
**Cost**: $400-900 (4-6 hours)

### Before (BROKEN)

```typescript
// ServerView.tsx - Lines 126-127
<SeatSelectionModal
  show={!voiceOrder.showVoiceOrder && !!selectedTable}
  table={selectedTable}
  selectedSeat={selectedSeat}
  orderedSeats={voiceOrder.orderedSeats}
  onSeatSelect={setSelectedSeat}
  onStartVoiceOrder={handleStartVoiceOrder}
  created_at={new Date().toISOString()}  //  ANTI-PATTERN: Different every render
  updated_at={new Date().toISOString()}  //  ANTI-PATTERN: Different every render
/>

// useVoiceOrderWebRTC.ts - Line 79
const tempId = `voice-${Date.now()}-${Math.random()}`  //  Different every render

// useVoiceOrderWebRTC.ts - Line 185
id: `voice-${Date.now()}-${Math.random()}`  //  Different every render
```

### Why This Breaks

**Framer Motion Re-Render**:
1. Modal opens with AnimatePresence animation
2. During animation, React re-renders component
3. Props comparison: `created_at` was "2025-11-10T10:00:00.123Z"
4. Props comparison: `created_at` now "2025-11-10T10:00:00.456Z"
5. **Different values → React Error #418**

**The Error**:
```
React Error #418: Hydration failed because the server rendered HTML
didn't match the client. As a result this tree will be regenerated
on the client. This can happen if an SSR-ed Client Component used:
- A server/client branch `if (typeof window !== 'undefined')`
- Variable input such as `Date.now()` or `Math.random()`
```

### After (FIXED)

```typescript
// ServerView.tsx - Lines 126-127
<SeatSelectionModal
  show={!voiceOrder.showVoiceOrder && !!selectedTable}
  table={selectedTable}
  selectedSeat={selectedSeat}
  orderedSeats={voiceOrder.orderedSeats}
  onSeatSelect={setSelectedSeat}
  onStartVoiceOrder={handleStartVoiceOrder}
  created_at={selectedTable?.created_at || ''}  //  Use stable value
  updated_at={selectedTable?.updated_at || ''}  //  Use stable value
/>

// useVoiceOrderWebRTC.ts - Lines 19, 79
let voiceOrderCounter = 0  //  Module-level counter

function useVoiceOrderWebRTC() {
  const tempId = `voice-${++voiceOrderCounter}`  //  Deterministic

  // Line 185
  id: `voice-${++voiceOrderCounter}`  //  Deterministic
}
```

### Why This Works

**Stable Values**:
1. Modal opens with AnimatePresence animation
2. During animation, React re-renders component
3. Props comparison: `created_at` was "2025-11-10T08:30:00.000Z"
4. Props comparison: `created_at` still "2025-11-10T08:30:00.000Z"
5. **Same values → No error** 

**Deterministic IDs**:
1. Counter starts at 0
2. First call: `voice-1`
3. Second call: `voice-2`
4. Predictable, unique, stable

### The Rule

**Never do this:**
```typescript
const id = `order-${Date.now()}`          //  Non-deterministic
const id = `item-${Math.random()}`        //  Non-deterministic
const timestamp = new Date().toISOString() //  Non-deterministic
const value = window.innerWidth           //  Non-deterministic
```

**Always do this:**
```typescript
// Option 1: Use stable prop/state
const id = item.id

// Option 2: Use counter
let counter = 0
const id = `temp-${++counter}`

// Option 3: Generate once in useEffect
const [id, setId] = useState<string>()
useEffect(() => {
  if (!id) setId(`order-${Date.now()}`)
}, [id])

// Option 4: Use crypto.randomUUID() (stable across renders)
const id = useMemo(() => crypto.randomUUID(), [])
```

### Applies To

- `Date.now()` in render or props
- `Math.random()` in render or props
- `new Date()` in render or props
- `window.innerWidth` or DOM measurements
- Any value that changes between renders

---

## Pattern 4: Nested Context Providers with Different Keys

### The Bug

**File**: `/client/src/pages/components/VoiceOrderModal.tsx`
**Line**: 237
**File**: `/client/src/App.tsx`
**Line**: 219
**Incident**: Cart Provider Isolation
**Impact**: Touch ordering showed "Added!" but cart stayed empty
**Cost**: $600-1,200 (6-8 hours)

### Before (BROKEN)

```typescript
// App.tsx - Line 219
export function App() {
  return (
    <UnifiedCartProvider persistKey="cart_current">  {/* Root provider */}
      <Router>
        <Routes>
          <Route path="/server" element={<ServerView />} />
        </Routes>
      </Router>
      <CartDrawer />  {/* Reads from root provider */}
    </UnifiedCartProvider>
  )
}

// VoiceOrderModal.tsx - Line 237
export function VoiceOrderModal({ show, table, seat }) {
  return (
    <AnimatePresence>
      {show && table && seat && (
        <motion.div>
          {/*  ANTI-PATTERN: Nested provider with DIFFERENT persistKey */}
          <UnifiedCartProvider persistKey="voice_order_modal_touch">
            <MenuGrid />  {/* MenuItemCard components inside */}
          </UnifiedCartProvider>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

### Why This Breaks

**State Isolation**:
```
┌──────────────────────────────────────────┐
│ ROOT PROVIDER                             │
│ persistKey: "cart_current"                │
│ localStorage: cart_current                │
│                                           │
│ ┌─────────────────┐                      │
│ │ CartDrawer      │ ← Reads from root    │
│ │ items: []       │   Shows EMPTY        │
│ └─────────────────┘                      │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ NESTED PROVIDER (Inside VoiceOrderModal) │
│ persistKey: "voice_order_modal_touch"    │
│ localStorage: voice_order_modal_touch    │
│                                           │
│ ┌─────────────────┐                      │
│ │ MenuItemCard    │ ← Writes to nested   │
│ │ addToCart()     │   Has ITEMS          │
│ │ items: [...]    │                      │
│ └─────────────────┘                      │
└──────────────────────────────────────────┘
```

**Data Flow Problem**:
1. User clicks "Add to Cart" in MenuItemCard
2. MenuItemCard calls `useUnifiedCart()` hook
3. Hook returns **nested provider** context (closest ancestor)
4. `addToCart()` updates nested provider state
5. Nested provider shows "Added!" feedback (works correctly)
6. CartDrawer calls `useUnifiedCart()` hook
7. Hook returns **root provider** context
8. Root provider state is empty → Cart shows nothing

**Result**: Two separate localStorage keys, two isolated states

### After (FIXED)

```typescript
// VoiceOrderModal.tsx - Line 237
export function VoiceOrderModal({ show, table, seat }) {
  return (
    <AnimatePresence>
      {show && table && seat && (
        <motion.div>
          {/*  Use SAME persistKey as root provider */}
          <UnifiedCartProvider persistKey="cart_current">
            <MenuGrid />  {/* MenuItemCard components inside */}
          </UnifiedCartProvider>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

### Why This Works

**Shared State**:
```
┌──────────────────────────────────────────┐
│ ROOT PROVIDER                             │
│ persistKey: "cart_current"                │
│ localStorage: cart_current                │
│                                           │
│ ┌─────────────────┐  ┌─────────────────┐ │
│ │ CartDrawer      │  │ VoiceOrderModal │ │
│ │ items: [...]    │  │ (nested)        │ │
│ │                 │  │ persistKey:     │ │
│ │                 │  │ "cart_current"  │ │
│ │                 │  │                 │ │
│ │                 │  │ ┌─────────────┐ │ │
│ │                 │  │ │ MenuItemCard│ │ │
│ │                 │  │ │ items: [...] │ │ │
│ │                 │  │ └─────────────┘ │ │
│ └─────────────────┘  └─────────────────┘ │
│                                           │
│ All read/write from same state          │
└──────────────────────────────────────────┘
```

**Data Flow Fixed**:
1. User clicks "Add to Cart" in MenuItemCard
2. MenuItemCard calls `useUnifiedCart()` hook
3. Hook returns **nested provider** context (closest ancestor)
4. Nested provider has persistKey="cart_current"
5. Both providers share same localStorage key
6. Both providers share same state
7. `addToCart()` updates shared state
8. CartDrawer sees update immediately 

### The Rule

**Never do this:**
```typescript
<MyProvider key="parent">
  <Component />
  <MyProvider key="child">  {/*  Different key = isolated state */}
    <OtherComponent />
  </MyProvider>
</MyProvider>
```

**Always do this:**
```typescript
// Option 1: Same key (shared state)
<MyProvider key="shared">
  <Component />
  <MyProvider key="shared">  {/*  Same key = shared state */}
    <OtherComponent />
  </MyProvider>
</MyProvider>

// Option 2: Don't nest (preferred)
<MyProvider key="shared">
  <Component />
  <OtherComponent />  {/*  No nesting needed */}
</MyProvider>
```

### Applies To

- Context providers with persistence (localStorage, sessionStorage)
- Context providers with unique identifiers
- Any provider where state isolation would break functionality

---

## Pattern 5: Prop-to-State Sync Without useEffect

### The Bug

**File**: `/client/src/pages/components/VoiceOrderModal.tsx`
**Lines**: 68-76
**Incident**: Infinite Loop Bug (secondary issue)
**Impact**: Modal didn't switch between voice/touch modes
**Cost**: Included in $800-1,500 (8-10 hours)

### Before (BROKEN)

```typescript
// VoiceOrderModal.tsx - Lines 68-76
export function VoiceOrderModal({
  initialInputMode,  // Prop that can change
  ...props
}) {
  //  ANTI-PATTERN: useState ignores prop changes after first render
  const [inputMode, setInputMode] = useState(initialInputMode)

  // initialInputMode changes from 'voice' to 'touch'
  // But inputMode stays as 'voice' (useState only uses initial value)

  return (
    <div>
      {inputMode === 'voice' && <VoiceOrderView />}
      {inputMode === 'touch' && <TouchOrderView />}
    </div>
  )
}
```

### Why This Breaks

**useState Behavior**:
1. Component mounts with `initialInputMode='voice'`
2. `useState(initialInputMode)` sets `inputMode='voice'`
3. User clicks "Switch to Touch" button
4. Parent updates `initialInputMode='touch'`
5. Component re-renders
6. **useState IGNORES new initialInputMode value**
7. `inputMode` stays as `'voice'`
8. Wrong view displays

**The Confusion**:
- `useState(initialValue)` **only uses initialValue on FIRST render**
- Subsequent renders ignore the parameter
- This is by design (React optimization)
- But it breaks prop-to-state synchronization

### After (FIXED)

```typescript
// VoiceOrderModal.tsx - Lines 68-76
export function VoiceOrderModal({
  initialInputMode,  // Prop that can change
  ...props
}) {
  const [inputMode, setInputMode] = useState(initialInputMode)

  //  Sync prop changes to local state
  useEffect(() => {
    setInputMode(initialInputMode)
  }, [initialInputMode])  // Re-run when prop changes

  return (
    <div>
      {inputMode === 'voice' && <VoiceOrderView />}
      {inputMode === 'touch' && <TouchOrderView />}
    </div>
  )
}
```

### Why This Works

**Prop Synchronization**:
1. Component mounts with `initialInputMode='voice'`
2. `useState(initialInputMode)` sets `inputMode='voice'`
3. `useEffect` runs, calls `setInputMode('voice')` (no change)
4. User clicks "Switch to Touch" button
5. Parent updates `initialInputMode='touch'`
6. Component re-renders
7. **useEffect detects prop change**
8. Calls `setInputMode('touch')`
9. Triggers another re-render with correct mode 

### The Rule

**Never do this:**
```typescript
function MyComponent({ initialValue }) {
  const [value, setValue] = useState(initialValue)
  //  value won't update when initialValue changes
  return <div>{value}</div>
}
```

**Always do this:**
```typescript
// Option 1: Sync with useEffect (when you need local state)
function MyComponent({ initialValue }) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  return <div>{value}</div>
}

// Option 2: Don't use local state (when you don't need it)
function MyComponent({ value }) {
  //  Just use the prop directly
  return <div>{value}</div>
}

// Option 3: Controlled component (parent manages state)
function MyComponent({ value, onChange }) {
  return <input value={value} onChange={e => onChange(e.target.value)} />
}
```

### Applies To

- Props that initialize state but can change later
- "Initial" props (`initialValue`, `defaultValue`, etc.)
- Props that should update component's internal state
- Derived state that depends on props

---

## Summary of Anti-Patterns

| Pattern | Error Type | Detection Difficulty | Production Risk |
|---------|-----------|---------------------|-----------------|
| Early Return Before AnimatePresence | React #318 Hydration | Very High | Critical |
| Unstable Hook Returns | React #310 Infinite Loop | High | High |
| Non-Deterministic Values | React #418 Hydration | High | High |
| Nested Providers Different Keys | State Isolation | Medium | High |
| Prop-to-State Sync Missing | UI Behavior | Low | Medium |

## Detection Strategy

### In Code Review
1. Search for `return` statements before `<AnimatePresence>`
2. Search for hooks that return objects without `useMemo`
3. Search for `Date.now()`, `Math.random()` in render or props
4. Search for nested providers with `persistKey` or similar
5. Search for `useState(props.initial...)` without `useEffect`

### In Testing
1. Run production build: `npm run build && npm run preview`
2. Check console for React errors #318, #418, #310
3. Test modal open/close (hydration issues)
4. Test rapid interactions (infinite loop detection)
5. Verify state updates across component boundaries

### In Monitoring
1. Alert on React error codes in production logs
2. Track infinite loop detection (>50 renders/second)
3. Monitor modal interaction success rates
4. Track localStorage inconsistencies

---

**Last Updated**: 2025-11-19
**Based On**: 5 production incidents (Nov 2-10, 2025)
**Files Referenced**:
- `/client/src/pages/components/VoiceOrderModal.tsx` (528 lines)
- `/client/src/hooks/useToast.ts` (13 lines)
- `/client/src/pages/ServerView.tsx`
- `/client/src/App.tsx`


## Quick Reference

# React UI/UX Issues - Quick Reference

A quick-lookup guide for React error codes, common console errors, and debugging checklists.

## React Error Codes

### Error #318: Hydration Mismatch

**Full Error**:
```
Minified React error #318; visit https://react.dev/errors/318
for the full message or use the non-minified dev environment for
full errors and additional helpful warnings.

Hydration failed because the initial UI does not match what was
rendered on the server.
```

**Meaning**: Server-rendered HTML doesn't match client-rendered HTML

**Common Causes**:
1. **Early return before AnimatePresence** (90% of cases)
   ```typescript
   //  BAD
   if (!show) return null
   return <AnimatePresence>...</AnimatePresence>
   ```

2. **Non-deterministic values** (see Error #418)

3. **Browser APIs without SSR guards**
   ```typescript
   //  BAD
   const isChrome = navigator.userAgent.includes('Chrome')
   ```

**First Steps**:
1. Search for `return null` before `<AnimatePresence>`
2. Search for `Date.now()` or `Math.random()` in props
3. Check for `window` or `document` access without guards
4. Test with: `npm run build && npm run preview`

**Fix Time**: 5 minutes once identified, 4-40 hours to identify

---

### Error #418: Non-Deterministic Values

**Full Error**:
```
Minified React error #418

This Suspense boundary received an update before it finished
hydrating. This caused the boundary to switch to client rendering.
```

**Meaning**: Component values changed between server and client render, or between initial and subsequent renders

**Common Causes**:
1. **Date.now() in render or props**
   ```typescript
   //  BAD
   <Component timestamp={Date.now()} />
   ```

2. **Math.random() for keys or IDs**
   ```typescript
   //  BAD
   const id = `temp-${Math.random()}`
   ```

3. **new Date() without stable value**
   ```typescript
   //  BAD
   const now = new Date().toISOString()
   ```

**First Steps**:
1. Search codebase for `Date.now()`, `Math.random()`, `new Date()`
2. Check props passed to modals/animated components
3. Look for timestamp generation in render functions

**Quick Fix**:
```typescript
//  GOOD: Use stable values
<Component timestamp={item.created_at} />

//  GOOD: Use counter
let counter = 0
const id = `temp-${++counter}`

//  GOOD: Generate once
const id = useMemo(() => crypto.randomUUID(), [])
```

**Fix Time**: 15 minutes once identified

---

### Error #310: Too Many Re-Renders

**Full Error**:
```
Minified React error #310

Too many re-renders. React limits the number of renders to prevent
an infinite loop.
```

**Meaning**: Component stuck in infinite render loop

**Common Causes**:
1. **Unstable hook return values**
   ```typescript
   //  BAD: New object every render
   function useToast() {
     return { toast: {...} }
   }
   ```

2. **setState in render**
   ```typescript
   //  BAD
   function Component() {
     setState(newValue)  // Triggers re-render → loop
     return <div>...</div>
   }
   ```

3. **Unstable useCallback/useMemo dependencies**
   ```typescript
   //  BAD: New object in deps every render
   const handler = useCallback(() => {...}, [{ value }])
   ```

**First Steps**:
1. Check recently modified hooks (especially return values)
2. Look for hook returns without `useMemo`
3. Add console.log to identify which dependency changes
4. Use React DevTools Profiler

**Quick Fix**:
```typescript
//  GOOD: Stable return value
function useToast() {
  return useMemo(() => ({ toast: {...} }), [])
}
```

**Fix Time**: 30 minutes

---

### Error #425: Rendered More Hooks Than Previous Render

**Full Error**:
```
Minified React error #425

Rendered more hooks than during the previous render.
```

**Meaning**: Conditional hooks or hooks after early return

**Common Cause**:
```typescript
//  BAD: Hook after conditional return
function Component({ show }) {
  if (!show) return null

  const [state, setState] = useState()  // Only called when show=true
  return <div>...</div>
}
```

**Quick Fix**:
```typescript
//  GOOD: All hooks before conditional
function Component({ show }) {
  const [state, setState] = useState()  // Always called

  if (!show) return null
  return <div>...</div>
}
```

**Fix Time**: 5 minutes

---

## Common Console Errors

### "Cannot read property 'X' of undefined"

**During Modal Open**:
- Check if data loaded before modal opens
- Add null checks: `data?.property`
- Wait for data: `if (!data) return <Loading />`

### "Maximum update depth exceeded"

Same as Error #310. See above.

### "Warning: Cannot update a component while rendering a different component"

**Cause**: setState called during render (usually in child affecting parent)

**Fix**:
```typescript
//  BAD
function Child({ onUpdate }) {
  onUpdate(value)  // Called during render
  return <div>...</div>
}

//  GOOD
function Child({ onUpdate }) {
  useEffect(() => {
    onUpdate(value)
  }, [value, onUpdate])

  return <div>...</div>
}
```

### "Warning: Each child in a list should have a unique 'key' prop"

**Quick Fix**:
```typescript
//  BAD
items.map((item, index) => <Item key={index} />)

//  GOOD
items.map(item => <Item key={item.id} />)
```

---

## Debugging Checklists

### Hydration Error Checklist

When you see React Error #318:

- [ ] Check for early returns before `<AnimatePresence>`
- [ ] Search for `Date.now()`, `Math.random()` in components
- [ ] Check for `window`, `document` access without guards
- [ ] Look for `suppressHydrationWarning` (might be masking issue)
- [ ] Test with production build: `npm run build && npm run preview`
- [ ] Check React DevTools → Components → Search for mismatch
- [ ] Enable React Strict Mode (if not already)
- [ ] Check for non-deterministic class names (CSS-in-JS)

### Infinite Loop Checklist

When you see Error #310 or browser freezes:

- [ ] Check recently modified hooks
- [ ] Look for hook returns without `useMemo`/`useCallback`
- [ ] Add `console.log` in useEffect to identify triggering dependency
- [ ] Check for setState in render body
- [ ] Use React DevTools Profiler → Check render count
- [ ] Look for objects in dependency arrays
- [ ] Check for unstable callback props
- [ ] Verify useCallback dependencies

### Modal Won't Open Checklist

- [ ] Check console for React errors (#318, #418, #310)
- [ ] Verify `show` prop is true
- [ ] Check if AnimatePresence is rendered (even when closed)
- [ ] Verify no early returns before AnimatePresence
- [ ] Check z-index (might be behind other elements)
- [ ] Verify data props are not null/undefined
- [ ] Check network tab for API errors
- [ ] Test in production build

### State Not Updating Checklist

- [ ] Check if using correct state setter
- [ ] Verify no state isolation (nested providers with different keys)
- [ ] Check if state is read-only (props not synced to state)
- [ ] Look for race conditions (multiple setStates)
- [ ] Check if component is unmounting/remounting unexpectedly
- [ ] Verify useEffect dependencies are correct
- [ ] Use React DevTools → Components → Check state values

---

## Testing Commands

### Local Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
# or
npx vite preview --port 5173

# Open in browser
open http://localhost:5173
```

### Check for React Errors

```bash
# Development mode (shows unminified errors)
npm run dev

# Production mode (shows minified errors like #318)
npm run build && npm run preview
```

### Test SSR/Hydration

```bash
# 1. Clear browser cache (important!)
# Chrome: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# 2. Open DevTools Console BEFORE loading page

# 3. Load page
open http://localhost:5173/server

# 4. Look for hydration warnings in console
# "Hydration failed"
# "Warning: Text content did not match"
# React Error #318 or #418
```

### Debug Infinite Loops

```bash
# 1. Open React DevTools → Profiler

# 2. Start recording

# 3. Trigger the component (e.g., open modal)

# 4. Stop recording after 2 seconds

# 5. Look for:
# - Components with >50 renders
# - Render count increasing rapidly
# - "Why did this render?" shows dependency changes

# 6. Click on component to see:
# - Which props changed
# - Which state changed
# - Which context changed
```

---

## Quick Fixes

### Fix Hydration Mismatch (AnimatePresence)

```diff
- if (!show) return null
-
  return (
    <AnimatePresence>
-     {show && (
+     {show && data && (
        <motion.div>...</motion.div>
      )}
    </AnimatePresence>
  )
```

### Fix Infinite Loop (Unstable Hook)

```diff
  function useMyHook() {
-   return { value, method }
+   return useMemo(() => ({ value, method }), [value])
  }
```

### Fix Non-Deterministic Values

```diff
  <Component
-   timestamp={Date.now()}
+   timestamp={item.created_at}
-   id={`temp-${Math.random()}`}
+   id={`temp-${counter++}`}
  />
```

### Fix Prop-to-State Sync

```diff
  function Component({ initialValue }) {
    const [value, setValue] = useState(initialValue)
+
+   useEffect(() => {
+     setValue(initialValue)
+   }, [initialValue])

    return <div>{value}</div>
  }
```

### Fix Nested Provider Isolation

```diff
  <CartProvider persistKey="cart_root">
    <CartDrawer />
-   <CartProvider persistKey="cart_nested">
+   <CartProvider persistKey="cart_root">
      <MenuGrid />
    </CartProvider>
  </CartProvider>
```

---

## Search Patterns

### Find Early Returns Before AnimatePresence

```bash
# Find files with AnimatePresence
git grep -l "AnimatePresence" client/src/

# Check each file manually for:
# - return null statements
# - return statements before AnimatePresence
# - early exits before wrappers
```

### Find Non-Deterministic Values

```bash
# Search for Date.now()
git grep "Date\.now()" client/src/

# Search for Math.random()
git grep "Math\.random()" client/src/

# Search for new Date() (excluding known safe usage)
git grep "new Date()" client/src/ | grep -v "new Date(knownValue)"
```

### Find Unstable Hook Returns

```bash
# Find hooks that return objects
git grep -A 3 "export.*function use" client/src/hooks/ | grep "return {"

# Check if wrapped in useMemo
git grep -B 2 -A 3 "return {" client/src/hooks/ | grep useMemo
```

### Find Large Components

```bash
# Find components over 200 lines
find client/src -name "*.tsx" -type f -exec sh -c '
  lines=$(wc -l < "$1")
  if [ "$lines" -gt 200 ]; then
    echo "$lines $1"
  fi
' _ {} \; | sort -rn

# Find components over 300 lines (critical)
find client/src -name "*.tsx" -type f -exec sh -c '
  lines=$(wc -l < "$1")
  if [ "$lines" -gt 300 ]; then
    echo "  CRITICAL: $lines lines in $1"
  fi
' _ {} \;
```

---

## Component Size Warnings

```
< 50 lines    Excellent
50-100 lines  Good
100-200 lines   OK (watch for complexity)
200-300 lines   Warning (consider decomposition)
300-500 lines 🚨 Critical (must decompose)
> 500 lines   🔥 Emergency (blocking bug risk)
```

**Current Status**:
- VoiceOrderModal: 528 lines 🔥
- FloorPlanEditor: 224 lines 

---

## Git Commands for Investigation

### Find When Bug Was Introduced

```bash
# Search for specific pattern (e.g., early return)
git log -p -- path/to/file.tsx | grep -B 5 "return null"

# Find commit that added problematic line
git blame path/to/file.tsx | grep "return null"

# See full commit
git show <commit-hash>
```

### Find Related Changes

```bash
# Show commits touching file
git log --oneline -- path/to/file.tsx

# Show commits with "hydration" in message
git log --all --grep="hydration"

# Show commits in date range
git log --since="2025-11-01" --until="2025-11-15" --oneline
```

### Compare Working Version vs Broken

```bash
# Find last working commit
git bisect start
git bisect bad HEAD
git bisect good <last-known-good-commit>

# Git will checkout commits to test
# Test each: npm run build && npm run preview
git bisect good  # if works
git bisect bad   # if broken

# Git will identify breaking commit
```

---

## Performance Debugging

### Check for Unnecessary Re-Renders

```javascript
// In browser DevTools console
import { StrictMode } from 'react'

// React will highlight components that re-render
// 1. Open React DevTools
// 2. Go to Profiler tab
// 3. Click record
// 4. Interact with component
// 5. Stop recording
// 6. Look for components with high render count
```

### Check Memory Leaks

```bash
# Take heap snapshot before and after
# Chrome DevTools → Memory → Take Snapshot

# Look for:
# - Increasing heap size
# - Detached DOM nodes
# - Event listeners not cleaned up
# - Timers not cleared
```

---

## Emergency Procedures

### Production is Down - Quick Triage

1. **Check Error Boundary logs**
   ```bash
   # Server logs
   heroku logs --tail --app your-app
   # or Vercel logs
   vercel logs
   ```

2. **Identify Error Type**
   - React #318? → Hydration issue
   - React #418? → Non-deterministic values
   - React #310? → Infinite loop
   - Network errors? → API/backend issue

3. **Quick Rollback**
   ```bash
   # Vercel
   vercel rollback

   # Or revert commit
   git revert HEAD
   git push
   ```

4. **Emergency Hotfix**
   ```bash
   # Create hotfix branch
   git checkout -b hotfix/react-318

   # Make minimal fix
   # Test locally: npm run build && npm run preview

   # Deploy immediately
   git commit -m "hotfix: resolve react #318 hydration"
   git push
   ```

5. **Post-Mortem After Stabilization**
   - Document what went wrong
   - Add test to prevent recurrence
   - Update this guide if new pattern found

---

## Quick Contact

### When to Escalate

- React error not in this guide
- Bug persists after applying fixes
- Affecting multiple components
- Can't reproduce locally
- Production critical

### What to Include

1. **Error message** (exact text, including #)
2. **Steps to reproduce**
3. **Environment** (dev/staging/production)
4. **Browser** (Chrome/Firefox/Safari + version)
5. **Recent changes** (commits in last 24 hours)
6. **Network tab** (any failed requests?)
7. **Console screenshot** (full error stack)

---

## Additional Resources

### Documentation
- [React Error Decoder](https://react.dev/errors)
- [Framer Motion AnimatePresence](https://www.framer.com/motion/animate-presence/)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)

### Internal Docs
- [PATTERNS.md](./PATTERNS.md) - Anti-patterns with code examples
- [INCIDENTS.md](./INCIDENTS.md) - Full incident timelines
- [PREVENTION.md](./PREVENTION.md) - Prevention strategies
- [AI-AGENT-GUIDE.md](./AI-AGENT-GUIDE.md) - For Claude Code

### Related Files
- `/docs/postmortems/2025-11-10-react-318-hydration-bug.md`
- `/client/src/pages/components/VoiceOrderModal.tsx` (528 lines)
- `/client/src/hooks/useToast.ts` (stable hook example)

---

**Last Updated**: 2025-11-19
**Version**: 1.0.0
**Status**: Active quick reference


