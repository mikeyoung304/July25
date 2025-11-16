# Render & Vercel Optimization Guide

**Purpose**: Performance and cost optimization strategies for your production deployment

---

## 🎯 RENDER BACKEND OPTIMIZATIONS

### 1. Database Connection Optimization

#### Use Connection Pooling (CRITICAL)
```bash
# ❌ WRONG - Direct connection (will exhaust connections)
DATABASE_URL=postgresql://user:pass@host:5432/postgres

# ✅ CORRECT - Pooled connection (for serverless/web apps)
DATABASE_URL=postgresql://user:pass@host:6543/postgres?pgbouncer=true&connection_limit=1
```

**Why**: Render services can scale to multiple instances. Without pooling, each instance creates multiple connections, quickly exhausting Supabase's connection limit.

#### Connection Pool Settings
- **Development**: 1-2 connections per instance
- **Production**: 2-5 connections per instance
- **Formula**: `(Max Instances × Connections per Instance) < Supabase Plan Limit`

### 2. Memory Optimization

#### Choose the Right Plan
```
Starter ($7): 512MB RAM
  ✅ Good for: Development, <100 concurrent users
  ❌ Bad for: Heavy AI processing, >1000 orders/day

Standard ($25): 2GB RAM
  ✅ Good for: Production, 100-1000 concurrent users
  ❌ Bad for: Memory leaks will crash faster

Pro ($85): 4GB RAM
  ✅ Good for: High traffic, AI features, 1000+ concurrent
  ✅ Best for: Memory-intensive operations
```

#### Monitor Memory Leaks
```javascript
// Add to your health endpoint
const usage = process.memoryUsage();
return {
  memory: {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    rss: Math.round(usage.rss / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024)
  }
};
```

### 3. Auto-Scaling Configuration

#### Recommended Settings
```yaml
Development:
  Min Instances: 1
  Max Instances: 1

Production:
  Min Instances: 1
  Max Instances: 3
  Target CPU: 70%
  Target Memory: 70%
  Scale Down Delay: 5 minutes

High Traffic:
  Min Instances: 2  # Always have redundancy
  Max Instances: 5
  Target CPU: 60%  # Scale earlier
  Target Memory: 60%
```

### 4. Cost Optimization Tips

#### Sleep When Idle (Development Only)
- Enable "Suspend after 15 minutes of inactivity"
- Saves ~50% on development costs
- ⚠️ Never use in production (causes cold starts)

#### Regional Deployment
- Deploy close to Supabase region
- Reduces latency by 50-200ms
- Check Supabase region: Dashboard → Settings → Infrastructure

### 5. Performance Optimizations

#### Enable HTTP/2
- Automatically enabled on Render ✅
- Reduces latency for multiple concurrent requests

#### Implement Caching
```javascript
// Redis for session/cache (if needed)
const redis = new Redis({
  host: process.env.REDIS_URL,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});
```

#### Optimize Startup Time
```javascript
// Lazy load heavy dependencies
let openai;
const getOpenAI = () => {
  if (!openai) {
    openai = require('openai');
  }
  return openai;
};
```

---

## 🚀 VERCEL FRONTEND OPTIMIZATIONS

### 1. Build Optimizations

#### Optimize Bundle Size
```json
// vite.config.ts
{
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'square': ['@square/web-sdk']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
}
```

#### Enable Compression
```json
// Already configured in vercel.json
{
  "headers": [{
    "source": "/assets/(.*)",
    "headers": [
      { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
    ]
  }]
}
```

### 2. Image Optimization

#### Use Next/Image or Vercel OG Image
- Automatic format conversion (WebP/AVIF)
- Responsive image generation
- Lazy loading built-in

#### Optimize Static Assets
```bash
# Before deploying
npm run optimize:images  # If you have image optimization script
```

### 3. Edge Network Configuration

#### Use Edge Functions for Auth
```javascript
// middleware.ts (if using Next.js features)
export const config = {
  matcher: ['/api/auth/:path*', '/protected/:path*']
};
```

#### Regional Edge Config
- **Global**: Best for worldwide users
- **Regional**: Best for specific markets
- Reduces latency by 50-80%

### 4. Performance Monitoring

#### Enable Vercel Analytics
- Free tier: 2,500 events/month
- Shows Core Web Vitals
- Identifies slow pages

#### Set Performance Budgets
```javascript
// vite.config.ts
{
  build: {
    reportCompressedSize: true,
    // Fail build if bundles too large
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'CIRCULAR_DEPENDENCY') {
          throw new Error(warning.message);
        }
        warn(warning);
      }
    }
  }
}
```

### 5. Cost Optimization

#### Optimize Preview Deployments
```
Settings → Git → Ignored Build Step
Add: [docs] in commit message skips build
```

#### Function Configuration
```
Free Tier Limits:
- 100GB bandwidth
- 100K function invocations
- 100 hours build time

Pro Tier ($20/month):
- 1TB bandwidth
- 1M function invocations
- 400 hours build time
```

---

## 📊 MONITORING & ALERTS

### Essential Metrics to Track

#### Render Backend
```javascript
// Add custom metrics endpoint
app.get('/api/v1/metrics', authenticate, requireScopes('admin:read'), (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    connections: {
      database: pool.totalCount,
      active: pool.idleCount,
      waiting: pool.waitingCount
    },
    requests: {
      total: requestCounter,
      errors: errorCounter,
      avgResponseTime: responseTimeHistogram.mean()
    }
  });
});
```

#### Vercel Frontend
```javascript
// Track Core Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics service
  console.log(metric);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### Alert Thresholds

```yaml
Critical Alerts:
  - Error rate > 5%
  - Response time > 5s
  - Memory usage > 90%
  - Database connections exhausted
  - Payment failures > 2%

Warning Alerts:
  - Error rate > 1%
  - Response time > 2s
  - Memory usage > 70%
  - Database connections > 80%
  - Slow queries > 1s
```

---

## 🔧 TROUBLESHOOTING OPTIMIZATIONS

### Common Performance Issues

#### 1. Slow Cold Starts (Render)
**Symptoms**: First request after idle takes 10-30s
**Solution**:
- Keep minimum 1 instance always running
- Implement health check pings every 5 minutes
- Reduce dependencies and lazy load

#### 2. Database Connection Errors
**Symptoms**: "Too many connections" or "Connection timeout"
**Solution**:
```javascript
// Implement connection retry logic
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,  // Reduce pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000
});
```

#### 3. Memory Leaks (Node.js)
**Symptoms**: Memory usage grows over time
**Solution**:
```javascript
// Add heap snapshot capability
if (process.env.NODE_ENV === 'production') {
  const v8 = require('v8');
  const fs = require('fs');

  app.get('/api/v1/heap-snapshot', authenticate, requireScopes('admin:write'), (req, res) => {
    const filename = `heap-${Date.now()}.heapsnapshot`;
    const stream = v8.getHeapSnapshot();
    stream.pipe(fs.createWriteStream(filename));
    stream.on('end', () => res.json({ filename }));
  });
}
```

#### 4. Slow Frontend Load (Vercel)
**Symptoms**: Large bundle size, slow initial load
**Solution**:
```javascript
// Implement code splitting
const PaymentModal = lazy(() => import('./components/PaymentModal'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// Use Suspense
<Suspense fallback={<Loading />}>
  <PaymentModal />
</Suspense>
```

---

## 💰 COST OPTIMIZATION STRATEGIES

### Monthly Cost Breakdown (Estimated)

```
Minimal Production Setup:
- Render Starter: $7/month
- Vercel Pro: $20/month
- Supabase Free: $0/month
- Total: ~$27/month

Standard Production:
- Render Standard: $25/month
- Vercel Pro: $20/month
- Supabase Pro: $25/month
- Total: ~$70/month

High Traffic Production:
- Render Pro: $85/month (2 instances = $170)
- Vercel Pro: $20/month
- Supabase Pro: $25/month
- Monitoring: $50/month
- Total: ~$265/month
```

### Cost Saving Tips

1. **Use Reserved Instances** (if available)
   - Save 20-30% with annual commitment

2. **Implement Efficient Caching**
   - Reduce database queries by 50-80%
   - Cache static content at CDN level

3. **Optimize Database Queries**
   ```sql
   -- Add indexes for common queries
   CREATE INDEX idx_orders_restaurant_created
   ON orders(restaurant_id, created_at DESC);
   ```

4. **Schedule Heavy Tasks**
   - Run reports during off-peak hours
   - Batch process webhooks

5. **Monitor and Remove Unused Resources**
   - Delete old preview deployments
   - Remove unused environment variables
   - Clean up old database records

---

## 📈 SCALING CHECKLIST

When you need to scale:

### At 100+ Concurrent Users
- [ ] Upgrade Render to Standard plan
- [ ] Enable auto-scaling (2-3 instances)
- [ ] Implement Redis caching
- [ ] Monitor database slow queries

### At 500+ Concurrent Users
- [ ] Upgrade Render to Pro plan
- [ ] Increase auto-scaling (3-5 instances)
- [ ] Add database read replicas
- [ ] Implement CDN for static assets

### At 1000+ Concurrent Users
- [ ] Multiple Render services (microservices)
- [ ] Database sharding or partition
- [ ] Global CDN deployment
- [ ] Dedicated monitoring infrastructure

---

## 🎯 OPTIMIZATION PRIORITIES

### Phase 1 (Do Now)
1. ✅ Use database connection pooling
2. ✅ Set correct memory limits
3. ✅ Enable caching headers
4. ✅ Configure auto-scaling

### Phase 2 (Next Month)
1. 📅 Add monitoring/alerts
2. 📅 Implement Redis caching
3. 📅 Optimize bundle size
4. 📅 Add performance budgets

### Phase 3 (When Scaling)
1. 🔄 Database optimization
2. 🔄 Microservices architecture
3. 🔄 Global deployment
4. 🔄 Advanced monitoring

---

**Remember**: Optimization is an ongoing process. Start with the basics, monitor constantly, and optimize based on real usage patterns.