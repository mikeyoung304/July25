# Lessons: performance optimization issues

> **💡 Debugging Unknown Issues?** If you're encountering an error not documented here, check the [Debugging Protocols](../00-debugging-protocols/) for systematic troubleshooting methods (HTF, EPL, CSP, DDT, PIT).

## Key Incidents

# Performance Optimization Incidents

## Overview

This document chronicles the major performance incidents encountered during Restaurant OS development, their impact, root causes, and resolutions. These serve as learning examples for future development.

---

## Incident 1: P0.8 Memory Leaks

**Date**: 2025-11-10
**Priority**: P0 (Critical - Stability)
**Status**:  RESOLVED
**Duration**: 1.5 hours investigation + implementation

### Impact

- **Memory growth**: 1-20 MB/day from unmanaged timers
- **Active intervals**: 10-15 unmanaged across codebase
- **Event listeners**: 5-10 duplicate global listeners
- **Clean shutdown**: Incomplete, forced exit after 3 seconds

### Root Causes

#### 1. VoiceWebSocketServer Cleanup Interval

**File**: `server/src/voice/websocket-server.ts:32`

**Problem**:
```typescript
constructor() {
  // LEAK: No reference stored, cannot be cleared
  setInterval(() => this.cleanupInactiveSessions(), 60000);
}
```

**Impact**: Interval ran for entire server lifetime, preventing clean shutdown.

#### 2. AuthRateLimiter Cleanup Interval

**File**: `server/src/middleware/authRateLimiter.ts:249-259`

**Problem**:
```typescript
// LEAK: Module-level, no way to clear
setInterval(() => {
  for (const [clientId, attempts] of suspiciousIPs.entries()) {
    if (attempts < 3) {
      suspiciousIPs.delete(clientId);
    }
  }
}, 60 * 60 * 1000); // Every hour
```

**Impact**: Maps (suspiciousIPs, blockedIPs) grew indefinitely, could reach thousands of entries under attack.

#### 3. Error Tracker Window Listeners

**File**: `shared/monitoring/error-tracker.ts:61,71,278,284,288`

**Problem**:
```typescript
// LEAK: 5 global listeners with NO cleanup
window.addEventListener('error', (event) => { ... })
window.addEventListener('unhandledrejection', (event) => { ... })
window.addEventListener('popstate', () => { ... })
window.addEventListener('focus', () => { ... })
window.addEventListener('blur', () => { ... })
```

**Impact**: Multiple ErrorTracker instances created duplicate listeners, causing memory leaks and performance degradation.

#### 4. TwilioBridge Global Interval

**File**: `server/src/voice/twilio-bridge.ts`

**Problem**: Unmanaged 60-second interval identified in timer audit.

#### 5. RealTimeMenuTools Cart Cleanup

**File**: `server/src/ai/functions/realtime-menu-tools.ts`

**Problem**: Unmanaged 300-second (5-minute) cart cleanup interval.

### Investigation Approach

Utilized **5 parallel subagents** to analyze different subsystems:

1. **Graceful Shutdown Agent** - server.ts patterns
2. **Event Listener Agent** - addEventListener/on patterns
3. **WebSocket Agent** - WebSocket lifecycle
4. **AI Services Agent** - AI service cleanup
5. **Timer/Interval Agent** - setTimeout/setInterval usage

**Coverage**: 50+ files, 8,000+ lines reviewed

### Resolution

**Fixes Implemented**:

1.  Stored timer references and added cleanup methods
2.  Created startRateLimiterCleanup() / stopRateLimiterCleanup()
3.  Enhanced graceful shutdown to call all cleanup methods
4.  Added error handler cleanup (stops session on error)
5.  Increased shutdown timeout from 3s to 5s

**Test Coverage**: 16 new tests (100% pass rate)

**Test File**: `server/tests/memory-leak-prevention.test.ts`

### Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Memory growth | 1-20 MB/day | <1 MB/day | 90-95% |
| Active intervals | 10-15 unmanaged | 0 | 100% |
| Event listeners | 5-10 duplicates | 0 | 100% |
| Clean shutdown | 3s force exit | 5s complete |  |

### Post-Mortem Learnings

1. **Module-level intervals** must store references for cleanup
2. **Graceful shutdown** must explicitly call all cleanup methods
3. **Error handlers** must clean up resources before returning
4. **Comprehensive tests** prevent regression

**Documentation**: `/docs/investigations/P0_MEMORY_LEAK_ANALYSIS.md`

---

## Incident 2: 12GB Memory Bloat

**Date**: 2025-08-25
**Priority**: P0 (Critical - Developer Experience)
**Status**:  RESOLVED
**Duration**: Multiple commits over 2 weeks

### Impact

- **Development builds**: Required 12GB RAM
- **Developer machines**: Unable to run on 8GB laptops
- **Build time**: Excessive due to memory pressure
- **Deployment**: Frequent OOM errors in CI/CD

### Root Causes

#### 1. Supabase SDK Version Mismatch

**Problem**: Client using @supabase/supabase-js 2.52.1, server using 2.39.7

**Impact**: Duplicate SDK instances loaded in memory (~150MB)

**Fix**: Updated server to 2.52.1 (commit 128e5dee)

#### 2. Excessive NODE_OPTIONS Limits

**Problem**:
```json
{
  "dev": "NODE_OPTIONS='--max-old-space-size=12288' ..."
}
```

**Impact**: Masking actual memory issues, allowing bloat to grow.

**Fix**: Reduced to 4GB, then 3GB, forcing optimization (commit 8c732642)

#### 3. Unbounded Response Cache

**Problem**:
```typescript
class ResponseCache {
  private maxSize = 100;  // Too large
  private maxMemory = 10 * 1024 * 1024; // 10MB
  private cleanupInterval = 60000; // Too slow
}
```

**Impact**: Cache growing to 100 entries × ~100KB each = ~10MB

**Fix**: Reduced maxSize to 50, maxMemory to 5MB, cleanupInterval to 30s

#### 4. WebRTC Audio Element Leaks

**Problem**: Audio elements not properly disposed after voice sessions.

**Fix**:
```typescript
cleanup(): void {
  if (this.audioElement) {
    this.audioElement.pause();
    this.audioElement.srcObject = null;
    this.audioElement.load(); // Force buffer release
    this.audioElement = null;
  }
}
```

**Impact**: 80-120MB saved per voice session

#### 5. Console.log String Retention

**Problem**: 33 console.log statements in WebRTCConnection.ts retaining strings in production.

**Fix**: Migrated all to logger (20-40MB savings)

#### 6. Dead Code Accumulation

**Problem**: 351 lines of dead code (unifiedApiClient.ts, normalize.ts) still bundled.

**Fix**: Deleted unused files after grep verification (0 imports)

### Resolution Timeline

```
12GB (Initial)
  ↓ Supabase version alignment (-150MB)
8GB
  ↓ NODE_OPTIONS reduction + cache limits (-2GB)
4GB (Commit 8c732642)
  ↓ WebRTC cleanup + console.log migration (-500MB)
3GB (Commit 128e5dee)  Current
  ↓ (Future work)
1GB (Target)
```

### Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Dev memory | 12GB | 3GB | 75% |
| Build memory | 12GB | 3GB | 75% |
| OOM errors | Frequent | Rare | ~90% |
| Developer access | 16GB+ required | 8GB+ sufficient |  |

### Post-Mortem Learnings

1. **Version alignment** critical for shared dependencies
2. **Memory limits** should force optimization, not hide problems
3. **Cache bounds** required on all caching mechanisms
4. **Resource cleanup** must be explicit and tested
5. **Dead code** should be removed promptly

---

## Incident 3: 1MB Bundle Explosion

**Date**: 2025-08-25
**Priority**: P1 (High - User Experience)
**Status**:  RESOLVED
**Duration**: 1 day implementation

### Impact

- **Initial bundle**: 1MB (1024KB)
- **First paint**: ~3-5 seconds on 3G
- **Lighthouse score**: 65/100 (failing)
- **User complaints**: Slow loading

### Root Causes

#### 1. No Code Splitting

**Problem**: All routes bundled into main chunk.

```typescript
//  BAD: Everything loaded upfront
import AdminDashboard from '@/pages/AdminDashboard';
import KitchenDisplay from '@/pages/KitchenDisplayOptimized';
import KioskPage from '@/pages/KioskPage';
```

**Impact**: 1MB main bundle, slow initial load.

#### 2. Heavy Components Not Lazy

**Problem**: VoiceControlWebRTC (~50KB) loaded even when not used.

**Impact**: Voice module loaded for all users, most never use it.

#### 3. Vendor Bundling

**Problem**: React, React-DOM, libraries all in one chunk.

**Impact**: Cache invalidation on any change, large single chunk.

#### 4. No Manual Chunking Strategy

**Problem**: Vite default chunking not optimal for app structure.

**Impact**: Inefficient chunk distribution.

### Resolution

**Commit**: 8e5c7630 - "feat: implement code splitting - reduce main bundle from 1MB to 93KB"

#### 1. Route-Based Lazy Loading

```typescript
//  GOOD: Lazy load all routes
export const LazyRoutes = {
  AdminDashboard: lazy(() =>
    import(/* webpackChunkName: "admin" */ '@/pages/AdminDashboard')
  ),
  KitchenDisplay: lazy(() =>
    import(/* webpackChunkName: "kitchen" */ '@/pages/KitchenDisplayOptimized')
  ),
  // ... all routes
};
```

**File**: `/client/src/routes/LazyRoutes.tsx`

#### 2. Component-Level Lazy Loading

```typescript
// Heavy voice component only loads when modal opens
const VoiceControlWebRTC = lazy(() =>
  import('./VoiceControlWebRTC')
);

{showVoice && (
  <Suspense fallback={<Spinner />}>
    <VoiceControlWebRTC />
  </Suspense>
)}
```

#### 3. Intelligent Manual Chunking

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-core': ['react', 'react-dom', 'react-router-dom'],
        'vendor': ['@tanstack/react-query', 'axios', 'zod'],
        'ui': ['lucide-react', 'sonner', '@radix-ui/react-dialog'],
        'order-system': ['./src/modules/order-system'],
        'voice-module': ['./src/modules/voice']
      }
    }
  }
}
```

### Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Main bundle | 1024KB | 93KB | 91% |
| React Core | (bundled) | 45KB |  Isolated |
| Vendor | (bundled) | 50KB |  Isolated |
| Voice Module | (bundled) | 50KB |  Lazy |
| Initial load time | 3-5s | 0.9-1.5s | 70% |
| Lighthouse score | 65/100 | 92/100 | +27 points |

### Post-Mortem Learnings

1. **Lazy loading** should be default for all routes
2. **Heavy components** need component-level code splitting
3. **Manual chunking** provides better control than defaults
4. **Performance budgets** enforce good patterns (CI/CD)

**Documentation**: `/docs/analysis/bundle-report.md`

---

## Incident 4: Voice Processing Latency

**Date**: 2025-11-07
**Priority**: P1 (High - Feature Usability)
**Status**:  PARTIALLY RESOLVED
**Duration**: Ongoing optimization

### Impact

- **Total latency**: 1800-2500ms (best to worst case)
- **Budget**: 1000ms target
- **User experience**: Perceived lag, repeat orders
- **Feature adoption**: Lower than expected

### Root Causes

#### Voice Pipeline Breakdown

```
User presses button     →  0ms
Audio capture starts    →  +120ms  (Browser API)
WebRTC connection ready →  +280ms  (Connection establishment)
User speaks             →  +500ms  (Variable)
AI transcription        →  +350ms  (OpenAI API)
Fuzzy matching          →  +15ms   (Local)
Order added to cart     →  +10ms   (State update)
UI updated              →  +25ms   (React render)
--------------------------------
Total (best case):        ~1300ms
Total (typical):          ~1800ms 
Total (worst case):       ~2500ms 
```

#### Bottlenecks Identified

1. **WebRTC Connection** (280ms)
   - Connection established after button press
   - Could be pre-established when modal opens
   - **Potential savings**: -280ms

2. **Network Latency** (150-400ms variable)
   - OpenAI API round-trip time
   - Cannot be controlled
   - **Mitigation**: Optimistic UI, progress indicators

3. **AI Transcription** (350ms)
   - OpenAI Realtime API processing
   - Service dependency, cannot optimize
   - **Mitigation**: Streaming transcription (not yet implemented)

### Partial Resolution

**Optimizations Applied**:

1.  Reduced fuzzy matching time (100ms → 15ms)
2.  Optimized state updates (batching)
3.  Improved UI feedback (immediate "listening" state)

**Results**:
- Best case: 1300ms (within budget )
- Typical: 1800ms (over budget by 800ms )
- Worst case: 2500ms (over budget by 1500ms )

### Remaining Work

**High Priority**:

1. **Pre-establish WebRTC Connection** (-280ms)
   ```typescript
   useEffect(() => {
     if (showVoiceModal) {
       // Pre-connect when modal opens
       preConnectWebRTC();
     }
   }, [showVoiceModal]);
   ```

2. **Optimistic UI Updates** (perceived performance)
   ```typescript
   // Show "transcribing..." immediately
   // Add item to cart optimistically
   // Rollback on error
   ```

3. **Streaming Transcription** (lower perceived latency)
   - Show partial transcription as it arrives
   - User sees progress immediately

4. **Response Caching** (for common phrases)
   - Cache "burger", "fries", "coke" → menu items
   - Instant response for cached phrases

**Expected Results After Fixes**:
- Best case: 1020ms (within budget )
- Typical: 1520ms (over by 520ms, but acceptable )
- Worst case: 2220ms (better, with good UX )

### Post-Mortem Learnings

1. **Network latency** is the primary bottleneck (uncontrollable)
2. **Perceived performance** matters more than actual latency
3. **Optimistic UI** can mask latency effectively
4. **Pre-connection** is critical for real-time features
5. **Performance budgets** may need adjustment for external dependencies

**Documentation**: `/docs/archive/2025-11/PERFORMANCE_REPORT.md`

---

## Incident 5: React Re-render Storms

**Date**: 2025-10-15 (ongoing)
**Priority**: P2 (Medium - Performance)
**Status**:  MOSTLY RESOLVED
**Duration**: Multiple commits

### Impact

- **Menu scrolling**: Lag on 200+ item menus
- **Cart updates**: 100-200ms delay on quantity change
- **Kitchen display**: Slow updates on new orders
- **CPU usage**: High on order-heavy pages

### Root Causes

#### 1. Missing React.memo

**Problem**: Heavy components re-rendering on parent updates.

```typescript
//  BAD: MenuItem re-renders when parent updates
function MenuItem({ item, onAdd }) {
  return (
    <div onClick={() => onAdd(item)}>
      {item.name} - ${item.price}
    </div>
  );
}
```

**Impact**: 200 menu items = 200 re-renders on unrelated state change.

#### 2. Unstable Handler References

**Problem**: New function instances breaking memoization.

```typescript
//  BAD: New handleAdd function every render
function MenuGrid({ items }) {
  const handleAdd = (item) => { /* ... */ };

  return items.map(item =>
    <MenuItem item={item} onAdd={handleAdd} />
  );
}
```

**Impact**: React.memo useless if props always different.

#### 3. Expensive Inline Calculations

**Problem**: Filtering/sorting on every render.

```typescript
//  BAD: Re-runs on every render
function MenuGrid({ items, searchTerm }) {
  const filteredItems = items.filter(/* ... */).sort(/* ... */);
  return <div>{filteredItems.map(/* ... */)}</div>;
}
```

**Impact**: 200ms+ calculation on every parent update.

#### 4. Infinite Re-render Loop

**Problem**: Modal props triggering parent updates.

```typescript
//  BAD: Infinite loop in useToast
useEffect(() => {
  setModalProps({ onClose: () => closeModal() });
}, [closeModal]); // closeModal changes, triggers effect, changes modalProps, triggers effect...
```

**Impact**: Browser hang, 100% CPU usage.

**Fix**: Commit 982c7cd2 - "fix: critical infinite loop bug in useToast and modal prop sync"

### Resolution

**Optimizations Applied**:

1.  Added React.memo to MenuItem components
2.  Wrapped handlers in useCallback
3.  Added useMemo for expensive calculations
4.  Fixed infinite loop in useToast
5.  Stabilized modal prop references

**Commit**: 597278eb - "perf: memoize heavy components, stabilize handlers, cleanup timers/listeners"

### Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Menu scroll FPS | 30-40 | 55-60 | ~50% |
| Cart update time | 100-200ms | 30-50ms | 70% |
| Re-renders/action | 200+ | 10-20 | 90% |
| Infinite loops | 1 critical | 0 | 100% |

### Post-Mortem Learnings

1. **React.memo** required for list item components
2. **useCallback** critical for handler stability
3. **useMemo** for expensive filtering/sorting
4. **Effect dependencies** must be carefully managed
5. **Performance profiling** should be regular, not reactive

---

## Summary Statistics

### Issues Resolved

| Incident | Priority | Impact | Resolution Time | Status |
|----------|----------|--------|-----------------|--------|
| P0.8 Memory Leaks | P0 | Critical | 1.5 hours |  Complete |
| 12GB Memory Bloat | P0 | Critical | 2 weeks |  Complete |
| 1MB Bundle Explosion | P1 | High | 1 day |  Complete |
| Voice Processing Latency | P1 | High | Ongoing |  Partial |
| React Re-render Storms | P2 | Medium | Multiple |  Mostly Complete |

### Overall Impact

- **Memory usage**: 12GB → 3GB (75% reduction)
- **Bundle size**: 1MB → 93KB (91% reduction)
- **Memory leaks**: 1-20 MB/day → <1 MB/day (90-95% reduction)
- **Re-renders**: 200+ → 10-20 (90% reduction)
- **Developer experience**:  Dramatically improved
- **User experience**:  Significantly improved

### Key Learnings

1. **Performance is a feature** - Must be tracked and enforced
2. **Proactive monitoring** - Don't wait for issues to appear
3. **Incremental optimization** - 12GB → 4GB → 3GB → 1GB (target)
4. **Comprehensive testing** - 16 tests prevent regression
5. **Documentation matters** - Future developers learn from incidents

---

**Version**: 1.0
**Last Updated**: 2025-11-19
**Next Review**: 2026-02-19 (3 months)


## Solution Patterns

# Performance Optimization Patterns

## Overview

This document details the performance patterns, techniques, and best practices discovered and implemented during the Restaurant OS performance optimization initiative.

## Memory Leak Prevention

### Pattern 1: Timer Cleanup Pattern

**Problem**: Intervals and timeouts running indefinitely without cleanup.

**Solution**: Always store timer references and clear them.

```typescript
//  BAD: No cleanup possible
class Service {
  constructor() {
    setInterval(() => this.cleanup(), 60000);
  }
}

//  GOOD: Cleanup enabled
class Service {
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
```

**Implementation**: Fixed in 5 critical locations (P0.8)
- VoiceWebSocketServer (60s cleanup)
- AuthRateLimiter (hourly cleanup)
- TwilioBridge
- RealTimeMenuTools (5min cart cleanup)

**Test**: `/server/tests/memory-leak-prevention.test.ts`

### Pattern 2: Event Listener Cleanup

**Problem**: Global event listeners never removed, accumulating on re-instantiation.

**Solution**: Store handler references, remove on cleanup.

```typescript
//  BAD: Inline handlers can't be removed
window.addEventListener('error', (event) => {
  this.trackError(event);
});

//  GOOD: Stored references for cleanup
class ErrorTracker {
  private errorHandler: ((event: ErrorEvent) => void) | null = null;

  attachListeners(): void {
    this.errorHandler = (event) => this.trackError(event);
    window.addEventListener('error', this.errorHandler);
  }

  cleanup(): void {
    if (this.errorHandler) {
      window.removeEventListener('error', this.errorHandler);
      this.errorHandler = null;
    }
  }
}
```

**Fixed in**: Error tracker (5 global listeners), cleanup-manager integration

### Pattern 3: WebRTC Resource Cleanup

**Problem**: Audio elements and media streams not released, causing memory accumulation.

**Solution**: Explicit cleanup with .load() to force buffer release.

```typescript
//  GOOD: Complete WebRTC cleanup
cleanup(): void {
  // 1. Stop media streams
  if (this.mediaStream) {
    this.mediaStream.getTracks().forEach(track => track.stop());
    this.mediaStream = null;
  }

  // 2. Close peer connection
  if (this.peerConnection) {
    this.peerConnection.close();
    this.peerConnection = null;
  }

  // 3. Release audio element buffers
  if (this.audioElement) {
    this.audioElement.pause();
    this.audioElement.srcObject = null;
    this.audioElement.load(); // Force buffer release
    this.audioElement = null;
  }
}
```

**Impact**: Prevented 80-120MB leaks per voice session

## Bundle Optimization

### Pattern 4: Route-Based Code Splitting

**Problem**: 1MB initial bundle loading everything upfront.

**Solution**: Lazy load routes with React.lazy() and Suspense.

```typescript
//  Lazy Routes Implementation
import { lazy, Suspense } from 'react';

export const LazyRoutes = {
  AdminDashboard: lazy(() =>
    import(/* webpackChunkName: "admin" */ '@/pages/AdminDashboard')
  ),
  KitchenDisplay: lazy(() =>
    import(/* webpackChunkName: "kitchen" */ '@/pages/KitchenDisplayOptimized')
  ),
  KioskPage: lazy(() =>
    import(/* webpackChunkName: "kiosk" */ '@/pages/KioskPage')
  ),
};

// Wrapper with suspense
export const LazyRoute = ({ component: Component, ...props }) => (
  <Suspense fallback={<LoadingSpinner />}>
    <Component {...props} />
  </Suspense>
);
```

**Results**:
- Main bundle: 1MB → 93KB (91% reduction)
- Initial load: ~70% faster
- All routes split into separate chunks

**Implementation**: `/client/src/routes/LazyRoutes.tsx`

### Pattern 5: Intelligent Vite Chunking

**Problem**: Vendor libraries bundled together causing large chunks.

**Solution**: Manual chunking strategy in vite.config.ts.

```typescript
//  Vite Manual Chunks Strategy
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-core': ['react', 'react-dom', 'react-router-dom'],
        'vendor': ['@tanstack/react-query', 'axios', 'zod'],
        'ui': ['lucide-react', 'sonner', '@radix-ui/react-dialog'],
        'order-system': [
          './src/modules/order-system',
          './src/contexts/UnifiedCartContext'
        ],
        'voice-module': [
          './src/modules/voice',
          './src/modules/voice/services'
        ]
      }
    }
  }
}
```

**Results**:
- React Core: 45KB (isolated)
- Vendor: 50KB (isolated)
- Feature modules: 30-80KB each
- Better caching (core rarely changes)

### Pattern 6: Component-Level Code Splitting

**Problem**: Heavy components loading even when not used.

**Solution**: Lazy load heavy components independently.

```typescript
//  Lazy Component Pattern
import { lazy, Suspense } from 'react';

// Heavy voice component only loads when needed
const VoiceControlWebRTC = lazy(() =>
  import('./VoiceControlWebRTC').then(m => ({ default: m.VoiceControlWebRTC }))
);

function VoiceOrderingMode() {
  const [showVoice, setShowVoice] = useState(false);

  return (
    <>
      <button onClick={() => setShowVoice(true)}>
        Start Voice Order
      </button>

      {showVoice && (
        <Suspense fallback={<Spinner />}>
          <VoiceControlWebRTC onClose={() => setShowVoice(false)} />
        </Suspense>
      )}
    </>
  );
}
```

**Impact**: Voice module only loads when activated (~50KB saved initially)

## React Performance Optimization

### Pattern 7: React.memo for Heavy Components

**Problem**: Components re-rendering unnecessarily on parent updates.

**Solution**: Memoize components with stable props.

```typescript
//  BAD: Re-renders on every parent update
function MenuItem({ item, onAdd }) {
  return (
    <div onClick={() => onAdd(item)}>
      {item.name} - ${item.price}
    </div>
  );
}

//  GOOD: Only re-renders when item or onAdd changes
const MenuItem = React.memo(({ item, onAdd }) => {
  return (
    <div onClick={() => onAdd(item)}>
      {item.name} - ${item.price}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better control
  return prevProps.item.id === nextProps.item.id &&
         prevProps.onAdd === nextProps.onAdd;
});
```

**Applied to**:
- MenuGrid components
- KitchenDisplay order cards
- FloorPlanCanvas elements
- ServerMenuGrid items

**Results**: 60-70% fewer re-renders on menu/order updates

### Pattern 8: useMemo for Expensive Calculations

**Problem**: Expensive filtering/sorting running on every render.

**Solution**: Memoize calculations with dependency arrays.

```typescript
//  BAD: Re-runs on every render
function MenuGrid({ items, searchTerm }) {
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sortedItems = filteredItems.sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return <div>{sortedItems.map(/* ... */)}</div>;
}

//  GOOD: Only recalculates when dependencies change
function MenuGrid({ items, searchTerm }) {
  const filteredAndSorted = useMemo(() => {
    const filtered = items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [items, searchTerm]);

  return <div>{filteredAndSorted.map(/* ... */)}</div>;
}
```

**Use cases**:
- Fuzzy matching (45ms → cached)
- Menu filtering (~85ms → cached)
- Order grouping
- Price calculations

**Results**: ~200ms saved per keystroke on search

### Pattern 9: useCallback for Stable Handlers

**Problem**: New function instances breaking memoization.

**Solution**: Wrap handlers in useCallback.

```typescript
//  BAD: New function on every render breaks MenuItem memo
function MenuGrid({ items }) {
  const handleAdd = (item) => {
    // Add to cart
  };

  return items.map(item =>
    <MenuItem item={item} onAdd={handleAdd} />
  );
}

//  GOOD: Stable reference preserves memoization
function MenuGrid({ items }) {
  const handleAdd = useCallback((item) => {
    // Add to cart
  }, []); // Empty deps if no external dependencies

  return items.map(item =>
    <MenuItem item={item} onAdd={handleAdd} />
  );
}
```

**Critical for**: Preventing infinite re-render loops in modals and forms

### Pattern 10: Debounced Search Input

**Problem**: Search triggers on every keystroke, causing lag.

**Solution**: Debounce input with useMemo wrapper.

```typescript
//  Debounced Search Pattern
import { useMemo } from 'react';

function SearchBar({ onSearch }) {
  const debouncedSearch = useMemo(
    () => debounce((value: string) => onSearch(value), 150),
    [onSearch]
  );

  return (
    <input
      type="text"
      onChange={(e) => debouncedSearch(e.target.value)}
    />
  );
}
```

**Results**: Reduced search operations from 1/keystroke to 1/150ms

## Cache Management

### Pattern 11: Bounded Cache Pattern

**Problem**: Unbounded caches growing indefinitely.

**Solution**: Implement size and memory limits with TTL.

```typescript
//  Bounded Cache Implementation
class ResponseCache {
  private cache = new Map();
  private maxSize = 50; // Was 100
  private maxMemory = 5 * 1024 * 1024; // 5MB (was 10MB)
  private cleanupInterval = 30000; // 30s (was 60s)

  set(key: string, value: any): void {
    // Enforce max size
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      size: this.estimateSize(value)
    });

    this.enforceMemoryLimit();
  }

  private enforceMemoryLimit(): void {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }

    if (totalSize > this.maxMemory) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      for (const [key] of entries) {
        this.cache.delete(key);
        totalSize -= entries.find(e => e[0] === key)[1].size;
        if (totalSize <= this.maxMemory) break;
      }
    }
  }
}
```

**Impact**: 30-50MB memory savings from cache limits

## State Machine Safety

### Pattern 12: XState for Complex Flows

**Problem**: Voice ordering had deadlock in waiting_user_final state.

**Solution**: Use XState for complex state management.

```typescript
//  State Machine Pattern
import { createMachine, assign } from 'xstate';

const voiceMachine = createMachine({
  id: 'voice',
  initial: 'idle',
  states: {
    idle: {
      on: { START: 'connecting' }
    },
    connecting: {
      on: {
        CONNECTED: 'listening',
        ERROR: 'error'
      }
    },
    listening: {
      on: {
        SPEECH_DETECTED: 'processing',
        TIMEOUT: 'idle'
      }
    },
    processing: {
      on: {
        COMPLETE: 'idle',
        ERROR: 'error'
      },
      // FIXED: Add timeout to prevent deadlock
      after: {
        5000: 'idle' // Auto-return after 5s
      }
    },
    error: {
      on: { RETRY: 'connecting' }
    }
  }
});
```

**Fixed**: Deadlock issues in voice ordering workflow

## Large List Virtualization

### Pattern 13: Virtual Scrolling (Recommended)

**Problem**: Rendering 500+ menu items causes lag (850ms).

**Solution**: Use react-window for virtualization.

```typescript
//  Virtual List Pattern (not yet implemented, documented for future)
import { FixedSizeList as List } from 'react-window';

function MenuGrid({ items }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <MenuItem item={items[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={items.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

**Expected results**: 850ms → 200ms for 500 items (75% improvement)

**Status**: Recommended for future implementation

## Memory Profiling

### Pattern 14: Continuous Memory Monitoring

**Problem**: Memory leaks difficult to detect without monitoring.

**Solution**: Add memory metrics to production.

```typescript
//  Memory Monitoring Pattern
setInterval(() => {
  if (typeof process !== 'undefined') {
    const used = process.memoryUsage();
    logger.metric('memory.heap.used', Math.round(used.heapUsed / 1024 / 1024));
    logger.metric('memory.heap.total', Math.round(used.heapTotal / 1024 / 1024));
    logger.metric('memory.external', Math.round(used.external / 1024 / 1024));
  }
}, 60000); // Every minute
```

**Metrics tracked**:
- Heap used (MB)
- Heap total (MB)
- External memory (MB)
- GC frequency

## Performance Budget Enforcement

### Pattern 15: CI/CD Bundle Checks

**Problem**: Bundle size creeps up without enforcement.

**Solution**: Automated checks in CI/CD.

```bash
#!/bin/bash
# scripts/check-bundle-size.sh

MAX_SIZE=100000 # 100KB
BUNDLE_SIZE=$(stat -f%z client/dist/assets/index*.js)

if [ $BUNDLE_SIZE -gt $MAX_SIZE ]; then
  echo " Bundle size ${BUNDLE_SIZE} exceeds limit ${MAX_SIZE}"
  exit 1
fi

echo " Bundle size ${BUNDLE_SIZE} within limit ${MAX_SIZE}"
```

**GitHub Action**:
```yaml
- name: Check Bundle Size
  run: npm run build:client && ./scripts/check-bundle-size.sh
```

## Anti-Patterns to Avoid

### 1. Console.log in Production
```typescript
//  NEVER: Retains strings in memory
console.log('Order created', orderData);

//  ALWAYS: Use logger
logger.info('Order created', { orderId: orderData.id });
```

### 2. Unmanaged Subscriptions
```typescript
//  NEVER: No cleanup
useEffect(() => {
  const subscription = observable.subscribe(handler);
}, []);

//  ALWAYS: Return cleanup
useEffect(() => {
  const subscription = observable.subscribe(handler);
  return () => subscription.unsubscribe();
}, []);
```

### 3. Circular References
```typescript
//  NEVER: Prevents garbage collection
const obj1 = { name: 'First' };
const obj2 = { name: 'Second' };
obj1.ref = obj2;
obj2.ref = obj1; // Circular!

//  ALWAYS: Use weak references or break cycles
const obj1 = { name: 'First' };
const obj2 = { name: 'Second' };
obj1.refId = obj2.id; // Reference by ID
```

## Summary

These patterns represent hard-won lessons from the performance optimization initiative:

- **Memory leaks**: Always cleanup timers, listeners, and resources
- **Bundle size**: Lazy load routes and heavy components
- **React optimization**: Memo, useMemo, useCallback strategically
- **Caching**: Implement bounds on all caches
- **State management**: Use state machines for complex flows
- **Monitoring**: Track metrics continuously

**Key principle**: Performance is a feature, not a refactor.

---

**Version**: 1.0
**Last Updated**: 2025-11-19
**Status**: Production Proven


## Quick Reference

# Performance Optimization Quick Reference

## Memory Limits

### Environment Targets

```bash
# Current enforced limits (NODE_OPTIONS)
Development:  3072MB (3GB)
Build:        3072MB (3GB)
Test:         3072MB (3GB)
Production:   1024MB (1GB target)

# Historic progression
v1: 12288MB (12GB)  # Initial bloat
v2:  4096MB (4GB)   # First reduction (commit 8c732642)
v3:  3072MB (3GB)   # Current (commit 128e5dee)
v4:  1024MB (1GB)   # Target (future)
```

### Check Memory Usage

```bash
# Development
ps aux | grep -E "node|vite" | awk '{sum+=$6} END {printf "%.0f MB\n", sum/1024}'

# CI/CD
npm run memory:check

# Runtime monitoring
node --expose-gc --inspect server/src/index.ts
```

---

## Bundle Size Budgets

### Enforced Limits (Gzipped)

From `/config/performance-budget.json`:

```json
{
  "Main Bundle":      "80KB",
  "React Core":       "45KB",
  "Vendor Bundle":    "50KB",
  "Order System":     "80KB",
  "Voice Module":     "50KB",
  "CSS Bundle":       "30KB",
  "Total JavaScript": "500KB"
}
```

### Check Bundle Size

```bash
# Build and analyze
npm run build:client

# Check main bundle
ls -lh client/dist/assets/index*.js

# Run bundle analyzer
npm run build:client -- --mode=analyze

# CI/CD check
npm run bundle:check
```

### Current Sizes (Actual)

```
Main bundle:       93KB    (target: 80KB)
React Core:        45KB   
Vendor:            50KB   
Order System:      72KB   
Voice Module:      48KB   
Total JS:          308KB   (target: 500KB)
```

---

## Performance Metrics

### Core Web Vitals

```
Metric                    Target    Current   Status
─────────────────────────────────────────────────────
LCP (Largest Paint)       <2.5s     2.1s      
FID (First Input Delay)   <100ms    62ms      
CLS (Layout Shift)        <0.1      0.04      
FCP (First Paint)         <1.8s     1.65s     
TTFB (Time to Byte)       <600ms    280ms     
```

### Lighthouse Scores

```
Category          Target    Desktop   Mobile    Status
──────────────────────────────────────────────────────
Performance       >90       92/100    78/100    
Accessibility     >95       95/100    95/100    
Best Practices    >90       88/100    88/100    
SEO               >90       91/100    91/100    
```

### Application-Specific

```
Metric                    Target    Current   Status
─────────────────────────────────────────────────────
Menu render (200 items)   <500ms    480ms     
Fuzzy match              <100ms    45ms      
Voice response           <1500ms   1300-1800ms 
Order submission         <2000ms   1250ms    
Cart operations          <100ms    45ms      
```

---

## Memory Leak Indicators

### Healthy System

```bash
# Memory growth <1 MB/day
# Active intervals: 0 unmanaged
# Event listeners: No duplicates
# Clean shutdown: <5 seconds

# Check active handles
node -e "setInterval(() => {}, 1000); setTimeout(() => {
  console.log('Active handles:', process._getActiveHandles().length);
  process.exit();
}, 2000)"
```

### Warning Signs

```
 Memory growth >5 MB/day
 Active intervals increasing
 Event listener count growing
 Shutdown taking >5 seconds
 Heap size increasing steadily
```

### Test for Leaks

```typescript
// Memory leak test pattern
describe('Memory Leaks', () => {
  it('cleans up resources', () => {
    const service = new Service();
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    service.start();
    service.stop();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
```

---

## Optimization Checklist

### Before Committing

```
 Timers
  ☐ All setInterval/setTimeout have stored references
  ☐ clearInterval/clearTimeout called in cleanup
  ☐ Integrated with graceful shutdown

 Event Listeners
  ☐ Handler references stored
  ☐ removeEventListener called in cleanup
  ☐ React: cleanup returned from useEffect

 WebRTC/Media
  ☐ Media tracks stopped
  ☐ Peer connections closed
  ☐ Audio elements released (.load() called)

 Caching
  ☐ maxSize limit set
  ☐ maxMemory limit set
  ☐ TTL implemented
  ☐ Cleanup interval running

 React
  ☐ React.memo on list items
  ☐ useMemo for expensive calculations
  ☐ useCallback for handlers
  ☐ No inline functions in maps

 Bundle
  ☐ Routes lazy loaded
  ☐ Heavy components lazy loaded
  ☐ Suspense fallbacks provided
  ☐ webpackChunkName comments added

 Code Quality
  ☐ No console.log (use logger)
  ☐ No unbounded arrays/maps
  ☐ No circular references
  ☐ Type checking passes
```

### Before PR

```
☐ npm run typecheck        # Types pass
☐ npm test                  # Tests pass
☐ npm run build:client      # Build succeeds
☐ npm run bundle:check      # Bundle under limit
☐ npm run memory:check      # Memory under limit
☐ Manual testing            # Feature works
```

### Before Production

```
☐ Load testing completed
☐ Memory profiling verified
☐ Performance monitoring enabled
☐ Rollback plan documented
☐ Lighthouse audit run
```

---

## Common Issues & Quick Fixes

### Issue: Memory Growing

```bash
# 1. Check for unmanaged timers
grep -r "setInterval" --include="*.ts" --include="*.tsx" | grep -v "clearInterval"

# 2. Check for event listeners
grep -r "addEventListener" --include="*.ts" --include="*.tsx" | grep -v "removeEventListener"

# 3. Take heap snapshot
node --inspect --expose-gc server/src/index.ts
# Chrome DevTools → Memory → Take Snapshot
```

### Issue: Bundle Too Large

```bash
# 1. Analyze bundle
npm run build:client -- --mode=analyze

# 2. Check for missing lazy loading
grep -r "import.*from '@/pages'" client/src/App.tsx

# 3. Verify manual chunks
grep "manualChunks" client/vite.config.ts
```

### Issue: Slow Renders

```bash
# 1. Profile with React DevTools
# Enable Profiler → Record → Identify slow components

# 2. Check for missing React.memo
grep -r "map(" client/src/components | grep -v "React.memo"

# 3. Check for unstable handlers
grep -r "onClick={() =>" client/src/components
```

### Issue: Voice Latency High

```bash
# 1. Check WebRTC connection time
# Look for connection establishment in logs

# 2. Verify pre-connection
grep "preConnect" client/src/modules/voice

# 3. Check network latency
# Use browser DevTools Network tab
```

---

## Commands Reference

### Development

```bash
# Start with memory monitoring
NODE_OPTIONS='--max-old-space-size=3072 --expose-gc' npm run dev

# Check memory during development
watch -n 5 'ps aux | grep -E "node|vite" | awk "{sum+=\$6} END {printf \"%.0f MB\n\", sum/1024}"'

# Profile with Node inspector
node --inspect --max-old-space-size=3072 server/src/index.ts
```

### Testing

```bash
# Run all tests with memory limit
npm test

# Run with memory monitoring
NODE_OPTIONS='--max-old-space-size=3072 --expose-gc' npm test

# Run specific performance tests
npm run test:performance

# Run with coverage
npm run test:coverage
```

### Build

```bash
# Build client
npm run build:client

# Build server
npm run build:server

# Build for Vercel
npm run build:vercel

# Build with bundle analysis
npm run build:client -- --mode=analyze
```

### Monitoring

```bash
# Check bundle sizes
npm run bundle:check

# Check memory usage
npm run memory:check

# Check for memory leaks
npm run test:memory

# Lighthouse audit
npx lighthouse http://localhost:5173 --view
```

---

## Key Files

### Configuration

```
/config/performance-budget.json     # Bundle size limits
/client/vite.config.ts              # Build config with chunking
/package.json                       # Memory limits (NODE_OPTIONS)
```

### Monitoring

```
/server/tests/memory-leak-prevention.test.ts
/client/src/hooks/useMemoryMonitor.ts
/scripts/check-bundle-size.sh
/scripts/check-memory.sh
```

### Lazy Loading

```
/client/src/routes/LazyRoutes.tsx   # Route lazy loading
/client/src/App.tsx                 # Router config
```

### Documentation

```
/docs/investigations/P0_MEMORY_LEAK_ANALYSIS.md
/docs/investigations/P0.8_MEMORY_LEAK_COMPLETION_SUMMARY.md
/docs/archive/2025-11/PERFORMANCE_REPORT.md
```

---

## Performance Budget Formula

```typescript
// Calculate if change acceptable
const budgetCheck = {
  currentSize: 93, // KB
  newSize: 105,    // KB
  limit: 100,      // KB
  acceptable: newSize <= limit
};

// Memory budget
const memoryBudget = {
  current: 2800,   // MB
  limit: 3072,     // MB
  headroom: 272,   // MB
  acceptable: current < limit * 0.9 // 90% threshold
};
```

---

## Emergency Procedures

### If Memory Exceeds Limit

```bash
# 1. Identify process
ps aux | grep node | sort -k4 -r | head -1

# 2. Take heap snapshot immediately
kill -USR2 <PID>  # Triggers heap dump

# 3. Analyze snapshot
node --inspect dist/server.js
# Chrome DevTools → Memory → Load snapshot

# 4. Quick fix: Restart service
npm run dev
```

### If Bundle Exceeds Budget

```bash
# 1. Identify large chunks
npm run build:client -- --mode=analyze

# 2. Quick fix: Lazy load largest route
# Move import to LazyRoutes.tsx

# 3. Remove largest dependency (if possible)
npm uninstall <large-package>

# 4. Retest
npm run bundle:check
```

### If Production Performance Degraded

```bash
# 1. Check monitoring dashboard
# Look for memory/CPU spikes

# 2. Check error logs
# Look for memory warnings

# 3. Rollback if critical
npm run deploy:rollback

# 4. Investigate in staging
# Reproduce issue with production data
```

---

## Resource Cleanup Template

```typescript
class ResourceManager {
  private timer: NodeJS.Timeout | null = null;
  private listener: ((e: Event) => void) | null = null;

  start(): void {
    // Setup timer
    this.timer = setInterval(() => this.work(), 60000);

    // Setup listener
    this.listener = (e) => this.handleEvent(e);
    window.addEventListener('event', this.listener);
  }

  stop(): void {
    // Cleanup timer
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Cleanup listener
    if (this.listener) {
      window.removeEventListener('event', this.listener);
      this.listener = null;
    }
  }

  private work(): void { /* ... */ }
  private handleEvent(e: Event): void { /* ... */ }
}
```

---

## Version History

- **v1.0** (2025-11-19): Initial quick reference
- **Current limits**: 3GB memory, 93KB main bundle
- **Next target**: 1GB memory, 80KB main bundle

---

**Status**: Active Reference
**Last Updated**: 2025-11-19
**Maintained By**: Engineering Team


