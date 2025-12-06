---
status: complete
priority: p1
issue_id: "094"
tags: [security, api, authentication, dos-risk]
dependencies: []
created_date: 2025-12-02
resolved_date: 2025-12-02
source: code-review-security-agent
resolution: Added 1KB body limit, authentication, and rate limiting middleware
---

# CRITICAL: Unauthenticated Metrics Endpoints

## Problem

The `/metrics` and `/analytics/performance` endpoints accept data without authentication:

```typescript
// server/src/routes/metrics.ts:57-77
router.post('/metrics', async (req, res) => {
  try {
    const metrics = req.body;  // NO AUTH CHECK
    logger.info('Client performance metrics', { ... });
    await forwardMetricsToMonitoring(metrics);
    res.json({ success: true });
  } catch (error) { ... }
});
```

## Risk Assessment

- **Severity:** CRITICAL
- **Impact:**
  - DoS via log flooding
  - Log injection attacks
  - Metric poisoning
  - Disk space exhaustion
- **Likelihood:** High (endpoint is publicly documented)

## Attack Vectors

1. **Log Flooding:** Attacker sends millions of fake metrics
2. **Log Injection:** Malicious payloads in metric fields corrupt logs
3. **Metric Poisoning:** When DataDog/New Relic is enabled, fake data pollutes dashboards
4. **Cost Attack:** External monitoring services may charge per metric

## Required Fix

Add authentication middleware to metrics endpoints:

```typescript
import { requireAuth } from '../middleware/auth';

// Option 1: Require full authentication
router.post('/metrics', requireAuth, async (req, res) => { ... });

// Option 2: Lightweight API key validation (for kiosk/public devices)
router.post('/metrics', validateMetricsApiKey, async (req, res) => { ... });

// Option 3: Rate limiting + origin validation (minimum security)
router.post('/metrics',
  rateLimit({ windowMs: 60000, max: 100 }),
  validateOrigin,
  async (req, res) => { ... }
);
```

## Recommended Approach

For performance metrics from client devices:

1. Add lightweight API key validation (shared secret per restaurant)
2. Add strict rate limiting (100 requests/minute per IP)
3. Validate origin header against allowed domains
4. Add request body size limit (1KB max)

```typescript
// Middleware chain
router.post('/metrics',
  bodyLimit('1kb'),
  rateLimit({ windowMs: 60000, max: 100 }),
  validateMetricsOrigin,
  async (req, res) => { ... }
);
```

## Files to Modify

- `server/src/routes/metrics.ts` - Add auth/rate limiting
- `server/src/middleware/metricsAuth.ts` (new) - Lightweight auth middleware

## Verification

- Test that unauthorized requests are rejected (401)
- Test rate limiting kicks in at threshold
- Test legitimate client metrics still work

## References

- OWASP: Security Misconfiguration (A05:2021)
- CWE-306: Missing Authentication for Critical Function
