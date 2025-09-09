# Performance Guidelines

## Overview

Performance is critical for Restaurant OS, especially for kitchen displays, POS systems, and customer-facing interfaces. This guide covers optimization strategies, monitoring approaches, and performance targets.

## Performance Targets

### Bundle Size Targets
- **Main chunk**: <100KB (gzipped)
- **Total initial load**: <500KB (gzipped)
- **Individual route chunks**: <50KB (gzipped)
- **Vendor chunks**: <200KB (gzipped)

### Runtime Performance Targets
- **Time to Interactive (TTI)**: <3 seconds
- **First Contentful Paint (FCP)**: <1.5 seconds
- **Largest Contentful Paint (LCP)**: <2.5 seconds
- **Cumulative Layout Shift (CLS)**: <0.1
- **First Input Delay (FID)**: <100ms

### Memory Targets
- **Build memory**: <4GB (optimized from 12GB)
- **Runtime heap**: <50MB sustained, <100MB peak
- **WebSocket connections**: <5MB per connection
- **Long-running pages**: No memory leaks over 24 hours

### API Response Targets
- **Database queries**: <100ms average
- **API endpoints**: <200ms p95, <500ms p99
- **WebSocket events**: <50ms processing time
- **File uploads**: Progress indicators for >2MB files

## Bundle Optimization

### Code Splitting Strategy

```typescript
// Route-based code splitting
import { lazy, Suspense } from 'react';

// Split by major routes
const HomePage = lazy(() => import('@/pages/HomePage'));
const MenuPage = lazy(() => import('@/pages/MenuPage'));
const KitchenDisplay = lazy(() => import('@/pages/KitchenDisplaySimple'));
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));

// Component-based splitting for heavy components
const VoiceControlWebRTC = lazy(() => 
  import('@/modules/voice/components/VoiceControlWebRTC')
);

// Usage with loading states
const App = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/kitchen" element={<KitchenDisplay />} />
    </Routes>
  </Suspense>
);
```

### Dynamic Imports for Features

```typescript
// Load features on demand
const loadVoiceModule = async () => {
  const { VoiceControlWebRTC } = await import('@/modules/voice/components/VoiceControlWebRTC');
  return VoiceControlWebRTC;
};

const MenuPage = () => {
  const [VoiceComponent, setVoiceComponent] = useState<React.ComponentType | null>(null);
  
  const handleVoiceToggle = async () => {
    if (!VoiceComponent) {
      const Component = await loadVoiceModule();
      setVoiceComponent(() => Component);
    }
  };
  
  return (
    <div>
      <MenuItems />
      <button onClick={handleVoiceToggle}>Enable Voice Ordering</button>
      {VoiceComponent && <VoiceComponent />}
    </div>
  );
};
```

### Bundle Analysis

```bash
# Analyze bundle size
npm run analyze

# Monitor bundle size in CI/CD
npm run build && node scripts/check-bundle-size.js
```

```javascript
// scripts/check-bundle-size.js
const fs = require('fs');
const path = require('path');

const BUNDLE_SIZE_LIMITS = {
  'index': 100 * 1024, // 100KB
  'vendor': 200 * 1024, // 200KB
  'total': 500 * 1024,  // 500KB
};

const checkBundleSize = () => {
  const distPath = path.resolve('dist/assets');
  const files = fs.readdirSync(distPath);
  
  let totalSize = 0;
  const chunks = {};
  
  files.forEach(file => {
    if (file.endsWith('.js') && !file.includes('.map')) {
      const filePath = path.join(distPath, file);
      const size = fs.statSync(filePath).size;
      totalSize += size;
      
      // Categorize chunks
      if (file.includes('index')) chunks.index = size;
      else if (file.includes('vendor')) chunks.vendor = size;
    }
  });
  
  // Check limits
  Object.entries(BUNDLE_SIZE_LIMITS).forEach(([chunk, limit]) => {
    const size = chunk === 'total' ? totalSize : chunks[chunk];
    if (size > limit) {
      console.error(`❌ ${chunk} chunk exceeded limit: ${(size/1024).toFixed(2)}KB > ${(limit/1024).toFixed(2)}KB`);
      process.exit(1);
    } else {
      console.log(`✅ ${chunk} chunk within limit: ${(size/1024).toFixed(2)}KB`);
    }
  });
};

checkBundleSize();
```

### Tree Shaking Optimization

```typescript
// Use named imports for better tree shaking
// ❌ BAD - imports entire library
import * as lodash from 'lodash';
import { Button } from '@mui/material';

// ✅ GOOD - only imports needed functions
import { debounce } from 'lodash-es';
import Button from '@mui/material/Button';
```

## React Performance Optimization

### Component Memoization

```typescript
// Memoize expensive components
export const MenuItemCard = React.memo<MenuItemProps>(({ 
  item, 
  onAddToCart, 
  inCart 
}) => {
  return (
    <div className="menu-item-card">
      <img src={item.image} alt={item.name} loading="lazy" />
      <h3>{item.name}</h3>
      <p>${item.price.toFixed(2)}</p>
      <AddToCartButton 
        onClick={() => onAddToCart(item)} 
        disabled={inCart}
      />
    </div>
  );
});

// Use display name for debugging
MenuItemCard.displayName = 'MenuItemCard';
```

### useMemo and useCallback

```typescript
// Expensive calculations
const OrderSummary = ({ orders }: { orders: Order[] }) => {
  // Memoize expensive calculations
  const analytics = useMemo(() => ({
    totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
    averageOrderValue: orders.length > 0 ? 
      orders.reduce((sum, order) => sum + order.total, 0) / orders.length : 0,
    ordersByStatus: orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  }), [orders]);
  
  // Memoize callbacks
  const handleExport = useCallback(() => {
    exportOrderData(orders);
  }, [orders]);
  
  return (
    <div>
      <h2>Total Revenue: ${analytics.totalRevenue.toFixed(2)}</h2>
      <p>Average Order: ${analytics.averageOrderValue.toFixed(2)}</p>
      <button onClick={handleExport}>Export Data</button>
    </div>
  );
};
```

### Virtual Scrolling for Large Lists

```typescript
// Use react-window for large lists
import { FixedSizeList as List } from 'react-window';

interface VirtualizedMenuProps {
  items: MenuItem[];
  onItemClick: (item: MenuItem) => void;
}

const VirtualizedMenu: React.FC<VirtualizedMenuProps> = ({ 
  items, 
  onItemClick 
}) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <MenuItemCard 
        item={items[index]} 
        onAddToCart={onItemClick}
      />
    </div>
  );
  
  return (
    <List
      height={600} // Fixed height for viewport
      itemCount={items.length}
      itemSize={120} // Height of each item
      itemData={items}
    >
      {Row}
    </List>
  );
};
```

### Image Optimization

```typescript
// Lazy loading with intersection observer
const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  width?: number;
  height?: number;
}> = ({ src, alt, width, height }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <div 
      ref={imgRef}
      style={{ width, height }}
      className={`image-container ${isLoaded ? 'loaded' : 'loading'}`}
    >
      {isInView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          style={{ 
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out'
          }}
        />
      )}
    </div>
  );
};
```

## Memory Management

### Cleanup Utilities

```typescript
// shared/utils/cleanup-manager.ts
export class CleanupManager {
  private cleanupFunctions: (() => void)[] = [];
  
  add(cleanupFn: () => void) {
    this.cleanupFunctions.push(cleanupFn);
  }
  
  cleanup() {
    this.cleanupFunctions.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    });
    this.cleanupFunctions = [];
  }
}

// Usage in components
const useCleanupManager = () => {
  const cleanupManager = useRef(new CleanupManager());
  
  useEffect(() => {
    return () => cleanupManager.current.cleanup();
  }, []);
  
  return cleanupManager.current;
};
```

### WebSocket Memory Management

```typescript
// Prevent WebSocket memory leaks
const useWebSocketConnection = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const cleanupManager = useCleanupManager();
  
  useEffect(() => {
    const ws = new WebSocket(url);
    
    const handleOpen = () => setIsConnected(true);
    const handleClose = () => setIsConnected(false);
    const handleError = (error: Event) => console.error('WebSocket error:', error);
    
    ws.addEventListener('open', handleOpen);
    ws.addEventListener('close', handleClose);
    ws.addEventListener('error', handleError);
    
    setSocket(ws);
    
    // Register cleanup functions
    cleanupManager.add(() => {
      ws.removeEventListener('open', handleOpen);
      ws.removeEventListener('close', handleClose);
      ws.removeEventListener('error', handleError);
      ws.close();
    });
    
    return () => cleanupManager.cleanup();
  }, [url]);
  
  return { socket, isConnected };
};
```

### Event Listener Cleanup

```typescript
// Proper event listener cleanup
const useEventListener = (
  eventName: string, 
  handler: (event: Event) => void,
  element: HTMLElement | Window = window
) => {
  const savedHandler = useRef(handler);
  
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);
  
  useEffect(() => {
    const eventListener = (event: Event) => savedHandler.current(event);
    element.addEventListener(eventName, eventListener);
    
    return () => {
      element.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]);
};
```

## Database Performance

### Query Optimization

```sql
-- Add proper indexes for common queries
CREATE INDEX CONCURRENTLY idx_orders_restaurant_status 
ON orders(restaurant_id, status) 
WHERE status IN ('new', 'pending', 'preparing');

CREATE INDEX CONCURRENTLY idx_orders_created_at_desc 
ON orders(created_at DESC);

CREATE INDEX CONCURRENTLY idx_menu_items_restaurant_active 
ON menu_items(restaurant_id) 
WHERE active = true;
```

### Efficient Data Fetching

```typescript
// Use pagination for large datasets
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

const usePaginatedOrders = (restaurantId: string) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: true,
  });
  
  const loadMore = useCallback(async () => {
    if (!pagination.hasMore) return;
    
    const response = await fetch(
      `/api/v1/orders?restaurant_id=${restaurantId}&page=${pagination.page}&limit=${pagination.limit}`
    );
    
    const result: PaginatedResponse<Order> = await response.json();
    
    setOrders(prev => [...prev, ...result.data]);
    setPagination(result.pagination);
  }, [restaurantId, pagination.page, pagination.hasMore]);
  
  return { orders, loadMore, hasMore: pagination.hasMore };
};
```

### Connection Pooling

```typescript
// server/src/database/pool.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Wait 2s for connection
});

// Monitor pool health
setInterval(() => {
  console.log('Pool status:', {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  });
}, 60000); // Log every minute
```

## Caching Strategies

### Browser Caching

```typescript
// Service worker for aggressive caching
// public/sw.js
const CACHE_NAME = 'restaurant-os-v6.0.3';
const STATIC_ASSETS = [
  '/',
  '/static/js/main.js',
  '/static/css/main.css',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  // Cache-first strategy for static assets
  if (event.request.url.includes('/static/')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
  
  // Network-first strategy for API calls
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
  }
});
```

### React Query for API Caching

```typescript
// Use React Query for intelligent caching
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const useMenuItems = (restaurantId: string) => {
  return useQuery({
    queryKey: ['menu-items', restaurantId],
    queryFn: () => fetchMenuItems(restaurantId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
};

const useCreateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createOrder,
    onSuccess: (newOrder) => {
      // Invalidate and refetch orders
      queryClient.invalidateQueries(['orders']);
      
      // Optimistically update cache
      queryClient.setQueryData(['orders'], (oldOrders: Order[]) => [
        newOrder,
        ...(oldOrders || [])
      ]);
    },
  });
};
```

### Memory Caching

```typescript
// LRU cache for expensive computations
class LRUCache<K, V> {
  private maxSize: number;
  private cache = new Map<K, V>();
  
  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }
  
  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      const value = this.cache.get(key)!;
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return undefined;
  }
  
  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first entry)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}

// Usage for menu calculations
const menuCache = new LRUCache<string, ProcessedMenuItem[]>(50);

const useProcessedMenu = (menuItems: MenuItem[]) => {
  return useMemo(() => {
    const cacheKey = JSON.stringify(menuItems.map(item => ({ id: item.id, updated_at: item.updated_at })));
    
    let processed = menuCache.get(cacheKey);
    if (!processed) {
      processed = processMenuItems(menuItems); // Expensive operation
      menuCache.set(cacheKey, processed);
    }
    
    return processed;
  }, [menuItems]);
};
```

## Performance Monitoring

### Runtime Performance Monitoring

```typescript
// client/src/utils/performance-monitor.ts
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  // Measure function execution time
  measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}_error`, duration);
      throw error;
    }
  }
  
  // Measure async function execution
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}_error`, duration);
      throw error;
    }
  }
  
  private recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
    
    // Log slow operations
    if (value > 1000) { // > 1 second
      console.warn(`Slow operation detected: ${name} took ${value.toFixed(2)}ms`);
    }
  }
  
  getStats(name: string) {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: values.reduce((a, b) => a + b) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();
```

### Bundle Size Monitoring

```typescript
// Monitor bundle size in production
const trackBundleSize = () => {
  if ('performance' in window && 'getEntriesByType' in performance) {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    let totalSize = 0;
    const resourceSizes: Record<string, number> = {};
    
    resources.forEach(resource => {
      if (resource.name.includes('.js') || resource.name.includes('.css')) {
        const size = resource.transferSize || 0;
        totalSize += size;
        resourceSizes[resource.name] = size;
      }
    });
    
    // Send to analytics
    analytics.track('bundle_size', {
      total_size: totalSize,
      main_js_size: resourceSizes['/static/js/main.js'] || 0,
      vendor_size: resourceSizes['/static/js/vendor.js'] || 0,
    });
  }
};

// Call after page load
window.addEventListener('load', trackBundleSize);
```

## Performance Best Practices

### 1. Optimize Critical Rendering Path

```typescript
// Preload critical resources
const preloadCriticalResources = () => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.href = '/fonts/roboto.woff2';
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
};

// Use resource hints
<link rel="dns-prefetch" href="https://api.your-domain.com" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
```

### 2. Minimize Layout Shifts

```css
/* Reserve space for images */
.image-placeholder {
  aspect-ratio: 16 / 9;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Use CSS containment for performance */
.menu-item-card {
  contain: layout style paint;
}
```

### 3. Optimize Web Workers

```typescript
// Use web workers for heavy calculations
// workers/menu-processor.ts
self.onmessage = function(event) {
  const { menuItems, filters } = event.data;
  
  // Heavy processing in background
  const processedItems = menuItems
    .filter(applyFilters(filters))
    .map(calculateNutrition)
    .sort(sortByRelevance);
  
  self.postMessage({ processedItems });
};

// Usage in main thread
const useMenuProcessor = () => {
  const [worker, setWorker] = useState<Worker | null>(null);
  
  useEffect(() => {
    const worker = new Worker('/workers/menu-processor.js');
    setWorker(worker);
    
    return () => worker.terminate();
  }, []);
  
  const processMenu = useCallback((menuItems: MenuItem[], filters: MenuFilters) => {
    return new Promise<ProcessedMenuItem[]>((resolve) => {
      if (!worker) return resolve([]);
      
      worker.onmessage = (event) => {
        resolve(event.data.processedItems);
      };
      
      worker.postMessage({ menuItems, filters });
    });
  }, [worker]);
  
  return { processMenu };
};
```

### 4. Implement Progressive Loading

```typescript
// Progressive enhancement for features
const ProgressiveFeature: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    // Check browser support
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    
    if (supported) {
      // Load feature progressively
      import('./advanced-features').then(() => {
        setIsLoaded(true);
      });
    }
  }, []);
  
  if (!isSupported) {
    return <BasicFallback />;
  }
  
  if (!isLoaded) {
    return <LoadingPlaceholder />;
  }
  
  return <>{children}</>;
};
```

### 5. Monitor and Alert on Performance Regressions

```typescript
// Performance budget enforcement
const PERFORMANCE_BUDGETS = {
  FCP: 1500, // First Contentful Paint
  LCP: 2500, // Largest Contentful Paint
  FID: 100,  // First Input Delay
  CLS: 0.1,  // Cumulative Layout Shift
  TTI: 3000, // Time to Interactive
};

const checkPerformanceBudgets = () => {
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    
    entries.forEach((entry) => {
      const metric = entry.name;
      const value = entry.startTime || entry.value;
      const budget = PERFORMANCE_BUDGETS[metric as keyof typeof PERFORMANCE_BUDGETS];
      
      if (budget && value > budget) {
        console.warn(`Performance budget exceeded: ${metric} = ${value}ms (budget: ${budget}ms)`);
        
        // Send alert to monitoring service
        analytics.track('performance_budget_exceeded', {
          metric,
          value,
          budget,
          url: window.location.href,
        });
      }
    });
  });
  
  observer.observe({ entryTypes: ['paint', 'navigation', 'measure'] });
};
```