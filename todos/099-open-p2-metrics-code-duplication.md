---
status: open
priority: p2
issue_id: "099"
tags: [code-quality, duplication, refactor, dry]
dependencies: []
created_date: 2025-12-02
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
