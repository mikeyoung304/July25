# Performance Optimization Prevention Guide

## Overview

This document provides actionable solutions and prevention strategies to avoid performance regressions in Restaurant OS. Based on lessons learned from the optimization initiative that reduced memory usage by 75% and bundle size by 91%.

---

## Memory Leak Prevention

### Solution 1: Timer Cleanup Pattern

**Always cleanup timers and intervals.**

```typescript
// Template for timer cleanup
class ServiceClass {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    // Clear existing timer first (defensive)
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(() => {
      this.doWork();
    }, 60000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // CRITICAL: Call stop() on shutdown
  destroy(): void {
    this.stop();
    // Other cleanup
  }
}
```

**Integration with graceful shutdown**:

```typescript
// server/src/server.ts
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  // Stop all services with timers
  serviceInstance.stop();

  // ... other cleanup

  setTimeout(() => {
    process.exit(0);
  }, 5000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

**Testing**:

```typescript
describe('Timer Cleanup', () => {
  it('clears interval on stop', () => {
    const service = new ServiceClass();
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    service.start();
    service.stop();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('handles multiple stop calls safely', () => {
    const service = new ServiceClass();
    service.start();

    service.stop();
    service.stop(); // Should not throw

    expect(service['timer']).toBeNull();
  });
});
```

**Checklist**:
- [ ] Timer reference stored as private field
- [ ] clearInterval/clearTimeout called in stop/destroy method
- [ ] Null check before clearing
- [ ] Integrated with graceful shutdown
- [ ] Unit tests for cleanup

---

### Solution 2: Event Listener Cleanup

**Store handler references for removal.**

```typescript
// Template for event listener cleanup
class EventManager {
  private errorHandler: ((event: ErrorEvent) => void) | null = null;
  private resizeHandler: (() => void) | null = null;

  attach(): void {
    // Store as arrow functions or bind
    this.errorHandler = (event) => this.handleError(event);
    this.resizeHandler = () => this.handleResize();

    window.addEventListener('error', this.errorHandler);
    window.addEventListener('resize', this.resizeHandler);
  }

  detach(): void {
    if (this.errorHandler) {
      window.removeEventListener('error', this.errorHandler);
      this.errorHandler = null;
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }

  private handleError(event: ErrorEvent): void {
    // Handle error
  }

  private handleResize(): void {
    // Handle resize
  }
}
```

**React pattern**:

```typescript
// React component pattern
function MyComponent() {
  useEffect(() => {
    const handleResize = () => {
      // Handle resize
    };

    window.addEventListener('resize', handleResize);

    // CRITICAL: Return cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []); // Empty deps for mount/unmount only
}
```

**Checklist**:
- [ ] Handler stored as reference (not inline)
- [ ] removeEventListener called in cleanup
- [ ] React: cleanup returned from useEffect
- [ ] Server: detach() called on shutdown
- [ ] Tests verify listener removal

---

### Solution 3: WebRTC Resource Cleanup

**Explicitly release media resources.**

```typescript
// Template for WebRTC cleanup
class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private mediaStream: MediaStream | null = null;
  private audioElement: HTMLAudioElement | null = null;

  async connect(): Promise<void> {
    // Setup connection
    this.peerConnection = new RTCPeerConnection(config);
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioElement = new Audio();
  }

  disconnect(): void {
    // 1. Stop all tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
      });
      this.mediaStream = null;
    }

    // 2. Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // 3. Release audio element (CRITICAL)
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.srcObject = null;
      this.audioElement.load(); // Force buffer release
      this.audioElement = null;
    }
  }
}
```

**Checklist**:
- [ ] Stop all media tracks
- [ ] Close peer connection
- [ ] Release audio element with .load()
- [ ] Set all references to null
- [ ] Test memory usage before/after session

---

### Solution 4: Cache Bounds

**Implement size and memory limits on all caches.**

```typescript
// Template for bounded cache
class BoundedCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private readonly maxSize: number;
  private readonly maxMemory: number;
  private readonly ttl: number;

  constructor(options: {
    maxSize: number;
    maxMemory: number;
    ttl: number;
  }) {
    this.maxSize = options.maxSize;
    this.maxMemory = options.maxMemory;
    this.ttl = options.ttl;

    // Start cleanup interval
    this.startCleanup();
  }

  set(key: K, value: V): void {
    // 1. Enforce max size
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    // 2. Add entry with metadata
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      size: this.estimateSize(value)
    });

    // 3. Enforce memory limit
    this.enforceMemoryLimit();
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
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
        totalSize -= entries.find(e => e[0] === key)![1].size;
        if (totalSize <= this.maxMemory) break;
      }
    }
  }

  private estimateSize(value: V): number {
    // Rough estimation
    return JSON.stringify(value).length;
  }

  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > this.ttl) {
          this.cache.delete(key);
        }
      }
    }, 30000); // Every 30s
  }
}

// Usage
const cache = new BoundedCache({
  maxSize: 50,
  maxMemory: 5 * 1024 * 1024, // 5MB
  ttl: 5 * 60 * 1000 // 5 minutes
});
```

**Checklist**:
- [ ] maxSize limit enforced
- [ ] maxMemory limit enforced
- [ ] TTL (time-to-live) implemented
- [ ] Automatic cleanup interval
- [ ] LRU eviction when full

---

## Bundle Size Prevention

### Solution 5: Route-Based Code Splitting

**Lazy load all major routes.**

```typescript
// client/src/routes/LazyRoutes.tsx
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

// Loading fallback
const RouteLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner message="Loading..." />
  </div>
);

// Lazy load routes
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

// Wrapper component
export const LazyRoute = ({ component: Component, ...props }) => (
  <Suspense fallback={<RouteLoader />}>
    <Component {...props} />
  </Suspense>
);
```

**Usage in router**:

```typescript
// App.tsx or router config
import { LazyRoute, LazyRoutes } from './routes/LazyRoutes';

function App() {
  return (
    <Routes>
      <Route
        path="/admin"
        element={<LazyRoute component={LazyRoutes.AdminDashboard} />}
      />
      <Route
        path="/kitchen"
        element={<LazyRoute component={LazyRoutes.KitchenDisplay} />}
      />
    </Routes>
  );
}
```

**Checklist**:
- [ ] All major routes lazy loaded
- [ ] webpackChunkName comments for debugging
- [ ] Suspense fallback implemented
- [ ] Loading state user-friendly
- [ ] Bundle size tested in CI

---

### Solution 6: Component-Level Code Splitting

**Lazy load heavy components.**

```typescript
// For components only used conditionally
import { lazy, Suspense } from 'react';

// Heavy component loaded on demand
const VoiceControlWebRTC = lazy(() =>
  import('./VoiceControlWebRTC')
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

**When to use**:
- Component >30KB
- Used conditionally (modals, tabs)
- Not needed on initial render
- Heavy dependencies (charts, editors)

**Checklist**:
- [ ] Component only loads when needed
- [ ] Suspense fallback provided
- [ ] No layout shift on load
- [ ] Bundle analyzer confirms chunk

---

### Solution 7: Vite Manual Chunking

**Configure intelligent chunk strategy.**

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core framework (rarely changes)
          'react-core': ['react', 'react-dom', 'react-router-dom'],

          // Shared utilities (stable)
          'vendor': [
            '@tanstack/react-query',
            'axios',
            'zod'
          ],

          // UI components (medium stability)
          'ui': [
            'lucide-react',
            'sonner',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu'
          ],

          // Feature modules (change frequently)
          'order-system': ['./src/modules/order-system'],
          'voice-module': ['./src/modules/voice'],
          'kitchen-display': ['./src/pages/KitchenDisplayOptimized']
        }
      }
    }
  }
});
```

**Strategy**:
1. **react-core**: Framework (rarely changes)
2. **vendor**: Stable libraries
3. **ui**: UI components (medium change frequency)
4. **feature modules**: App code (change frequently)

**Benefits**:
- Better caching (core rarely invalidated)
- Parallel loading
- Smaller initial bundle

**Checklist**:
- [ ] Manual chunks configured
- [ ] Chunks grouped by change frequency
- [ ] Bundle analyzer run
- [ ] No chunk >100KB
- [ ] Total JS <500KB

---

## React Performance Prevention

### Solution 8: React.memo for List Items

**Memoize components rendered in lists.**

```typescript
// Template for memoized list item
interface ItemProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

const MenuItem = React.memo<ItemProps>(({ item, onAdd }) => {
  return (
    <div
      className="menu-item"
      onClick={() => onAdd(item)}
    >
      <h3>{item.name}</h3>
      <p>${item.price}</p>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better control
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.price === nextProps.item.price &&
    prevProps.onAdd === nextProps.onAdd
  );
});
```

**When to use React.memo**:
- Components in lists
- Components with expensive render
- Child components with stable props
- Components re-rendering frequently

**When NOT to use**:
- Props change frequently
- Render is cheap
- Top-level components
- Comparison cost > render cost

**Checklist**:
- [ ] Memoized with React.memo
- [ ] Custom comparison if needed
- [ ] Stable props (useCallback handlers)
- [ ] Profiler confirms benefit

---

### Solution 9: useMemo for Expensive Calculations

**Cache expensive computations.**

```typescript
// Template for useMemo
function MenuGrid({ items, searchTerm, category }) {
  // Expensive filtering and sorting
  const filteredAndSorted = useMemo(() => {
    let filtered = items;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (category) {
      filtered = filtered.filter(item => item.category === category);
    }

    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [items, searchTerm, category]);

  return (
    <div>
      {filteredAndSorted.map(item => (
        <MenuItem key={item.id} item={item} />
      ))}
    </div>
  );
}
```

**When to use useMemo**:
- Expensive filtering/sorting
- Complex calculations
- Derived state
- Object/array creation passed as props

**When NOT to use**:
- Simple calculations
- Primitive values
- Already stable references
- Premature optimization

**Checklist**:
- [ ] Calculation actually expensive (>10ms)
- [ ] Dependencies correct
- [ ] Profiler confirms benefit
- [ ] No stale closures

---

### Solution 10: useCallback for Stable Handlers

**Prevent breaking memoization with stable function references.**

```typescript
// Template for useCallback
function MenuGrid({ items, onAddToCart }) {
  // Stable handler reference
  const handleItemClick = useCallback((item: MenuItem) => {
    onAddToCart(item);
    // Additional logic
  }, [onAddToCart]);

  return (
    <div>
      {items.map(item => (
        <MenuItem
          key={item.id}
          item={item}
          onClick={handleItemClick} // Stable reference
        />
      ))}
    </div>
  );
}
```

**When to use useCallback**:
- Props passed to memoized components
- Dependencies for other hooks
- Event handlers in lists
- Preventing infinite loops

**When NOT to use**:
- Handlers not passed to children
- No memoization involved
- Performance not impacted
- Premature optimization

**Common mistake**:

```typescript
//  BAD: Missing onAddToCart in deps
const handleItemClick = useCallback((item) => {
  onAddToCart(item); // Stale closure
}, []); // Empty deps

//  GOOD: Include all dependencies
const handleItemClick = useCallback((item) => {
  onAddToCart(item);
}, [onAddToCart]);
```

**Checklist**:
- [ ] Used for props to memoized components
- [ ] All dependencies included
- [ ] No stale closures
- [ ] ESLint exhaustive-deps passing

---

## Performance Monitoring

### Solution 11: CI/CD Performance Budget Enforcement

**Automate performance checks in CI/CD.**

```yaml
# .github/workflows/performance.yml
name: Performance Checks

on: [pull_request]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm ci

      - name: Build client
        run: npm run build:client

      - name: Check bundle size
        run: |
          npm run bundle:check

  memory-usage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Check memory usage
        run: |
          npm run memory:check
```

**Bundle check script**:

```bash
#!/bin/bash
# scripts/check-bundle-size.sh

MAX_SIZE=100000  # 100KB for main bundle
MAIN_BUNDLE=$(find client/dist/assets -name "index*.js" -type f)
BUNDLE_SIZE=$(stat -f%z "$MAIN_BUNDLE")

if [ $BUNDLE_SIZE -gt $MAX_SIZE ]; then
  echo " Bundle size ${BUNDLE_SIZE} exceeds limit ${MAX_SIZE}"
  echo "Main bundle: $MAIN_BUNDLE"
  exit 1
fi

echo " Bundle size ${BUNDLE_SIZE} within limit ${MAX_SIZE}"
```

**Memory check script**:

```bash
#!/bin/bash
# scripts/check-memory.sh

MAX_MEMORY=3072  # 3GB in MB

# Start dev server
npm run dev &
DEV_PID=$!

sleep 10  # Let it stabilize

# Check memory
MEMORY=$(ps -o rss= -p $DEV_PID | awk '{sum+=$1} END {print sum/1024}')

kill $DEV_PID

if (( $(echo "$MEMORY > $MAX_MEMORY" | bc -l) )); then
  echo " Memory ${MEMORY}MB exceeds limit ${MAX_MEMORY}MB"
  exit 1
fi

echo " Memory ${MEMORY}MB within limit ${MAX_MEMORY}MB"
```

**Checklist**:
- [ ] Bundle size check in CI
- [ ] Memory check in CI
- [ ] Lighthouse checks (optional)
- [ ] Blocks PR if failing
- [ ] Automated reports

---

### Solution 12: Memory Profiling Hook

**Track memory usage in production.**

```typescript
// hooks/useMemoryMonitor.ts
import { useEffect } from 'react';
import { logger } from '@/utils/logger';

export function useMemoryMonitor(componentName: string) {
  useEffect(() => {
    if (!('performance' in window)) return;

    const monitor = setInterval(() => {
      // @ts-ignore - memory API not in all browsers
      const memory = (performance as any).memory;

      if (memory) {
        logger.metric(`memory.${componentName}.used`, {
          usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        });
      }
    }, 60000); // Every minute

    return () => clearInterval(monitor);
  }, [componentName]);
}

// Usage
function HeavyComponent() {
  useMemoryMonitor('HeavyComponent');

  // Component logic
}
```

**Server-side monitoring**:

```typescript
// server/src/utils/memory-monitor.ts
import { logger } from './logger';

export function startMemoryMonitoring(): NodeJS.Timeout {
  return setInterval(() => {
    const used = process.memoryUsage();

    logger.metric('memory.server', {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      external: Math.round(used.external / 1024 / 1024),
      rss: Math.round(used.rss / 1024 / 1024)
    });

    // Alert if memory high
    if (used.heapUsed > 1 * 1024 * 1024 * 1024) { // 1GB
      logger.warn('High memory usage detected', {
        heapUsed: Math.round(used.heapUsed / 1024 / 1024)
      });
    }
  }, 60000); // Every minute
}
```

**Checklist**:
- [ ] Memory monitoring in production
- [ ] Metrics sent to logging service
- [ ] Alerts for high usage
- [ ] Dashboard for visualization
- [ ] Historical trend tracking

---

## Anti-patterns to Avoid

### 1. Console.log in Production

```typescript
//  NEVER
console.log('User logged in', userData);

//  ALWAYS
import { logger } from '@/utils/logger';
logger.info('User logged in', { userId: userData.id });
```

**Why**: console.log retains string references, preventing garbage collection.

### 2. Unbounded Arrays/Maps

```typescript
//  NEVER
const cache = new Map();
cache.set(key, value); // Grows forever

//  ALWAYS
const cache = new BoundedCache({
  maxSize: 100,
  ttl: 300000
});
```

### 3. Circular References

```typescript
//  NEVER
obj1.ref = obj2;
obj2.ref = obj1;

//  ALWAYS
obj1.refId = obj2.id;
// Look up by ID when needed
```

### 4. Inline Functions in Lists

```typescript
//  NEVER
{items.map(item => (
  <Item onClick={() => handleClick(item)} />
))}

//  ALWAYS
const handleClick = useCallback((item) => { ... }, []);
{items.map(item => (
  <Item onClick={handleClick} item={item} />
))}
```

### 5. Missing Cleanup

```typescript
//  NEVER
useEffect(() => {
  const timer = setInterval(() => { ... }, 1000);
}, []);

//  ALWAYS
useEffect(() => {
  const timer = setInterval(() => { ... }, 1000);
  return () => clearInterval(timer);
}, []);
```

---

## Quick Prevention Checklist

**Before every commit**:

- [ ] All timers have cleanup
- [ ] All event listeners removed
- [ ] WebRTC resources released
- [ ] Caches have bounds
- [ ] Routes lazy loaded
- [ ] Heavy components lazy loaded
- [ ] React.memo on list items
- [ ] useMemo for expensive calculations
- [ ] useCallback for handlers
- [ ] No console.log statements
- [ ] Memory profiling run
- [ ] Bundle size checked

**Before every PR**:

- [ ] Performance tests passing
- [ ] Memory usage <3GB
- [ ] Bundle size <100KB
- [ ] No new memory leaks
- [ ] Lighthouse score >90

**Before production**:

- [ ] Load testing completed
- [ ] Memory profiling verified
- [ ] Performance monitoring enabled
- [ ] Rollback plan ready

---

**Version**: 1.0
**Last Updated**: 2025-11-19
**Status**: Active
