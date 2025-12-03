---
status: resolved
priority: p2
issue_id: "099"
tags: [code-quality, duplication, refactor, dry]
dependencies: []
created_date: 2025-12-02
resolved_date: 2025-12-02
source: code-review-quality-agent
---

# HIGH: Code Duplication in Metrics Routes

## Problem

The `/metrics` and `/analytics/performance` endpoints have nearly identical implementations:

```typescript
// server/src/routes/metrics.ts:57-77
router.post('/metrics', async (req, res) => {
  try {
    const metrics = req.body;
    logger.info('Client performance metrics', {
      timestamp: metrics.timestamp,
      slowRenders: metrics.slowRenders,
      slowAPIs: metrics.slowAPIs,
      stats: metrics.stats,
    });
    await forwardMetricsToMonitoring(metrics);
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to process metrics', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// server/src/routes/metrics.ts:203-219
router.post('/analytics/performance', async (req, res) => {
  try {
    const metrics = req.body;
    logger.info('Client performance metrics', {
      timestamp: metrics.timestamp,
      slowRenders: metrics.slowRenders,
      slowAPIs: metrics.slowAPIs,
      stats: metrics.stats,
    });
    // MISSING: forwardMetricsToMonitoring call!
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to process metrics', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Issues

1. **Duplication:** ~25 lines of identical code
2. **Bug:** `/analytics/performance` doesn't forward to monitoring
3. **Maintenance burden:** Changes must be made in two places
4. **Inconsistency risk:** Endpoints may diverge over time

## Recommended Fix

Extract shared handler function:

```typescript
/**
 * Process client performance metrics
 */
async function handleMetrics(req: Request, res: Response): Promise<void> {
  try {
    const metrics = req.body;

    logger.info('Client performance metrics', {
      timestamp: metrics.timestamp,
      slowRenders: metrics.slowRenders,
      slowAPIs: metrics.slowAPIs,
      stats: metrics.stats,
    });

    await forwardMetricsToMonitoring(metrics);

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to process metrics', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Primary endpoint
router.post('/metrics', handleMetrics);

// Alias for client compatibility
router.post('/analytics/performance', handleMetrics);
```

## Impact

- Removes ~20 lines of duplication
- Fixes missing monitoring forward bug
- Single point of maintenance
- Consistent behavior guaranteed

## Files to Modify

- `server/src/routes/metrics.ts` - Extract shared handler

## References

- DRY principle
- Related: TODO 094 (metrics auth)

## Resolution

**Fixed in current implementation (2025-12-02)**

The code has been successfully refactored:

1. **Extracted `handleMetrics` function** (lines 171-202 in `server/src/routes/metrics.ts`):
   - Processes and sanitizes metrics data
   - Logs with authentication context (restaurant_id, userId)
   - Forwards to external monitoring services (fire-and-forget)
   - Returns standardized success/error responses

2. **Both endpoints now use shared handler**:
   ```typescript
   router.post('/metrics', authenticate, metricsLimiter, handleMetrics);
   router.post('/analytics/performance', authenticate, metricsLimiter, handleMetrics);
   ```

3. **Bug fixed**: `/analytics/performance` now includes `forwardMetricsToMonitoring` call

4. **Additional improvements**:
   - Input sanitization for metrics values
   - Authentication context in logs (prevents restaurant_id spoofing)
   - Fire-and-forget pattern for monitoring forwarding (non-blocking)
   - Comprehensive JSDoc comments
   - Shared authentication and rate limiting

**Result**: Eliminated ~25 lines of duplication and fixed monitoring forward bug.
