---
status: complete
priority: p3
issue_id: "107"
tags: [code-quality, cleanup, yagni, code-review]
dependencies: []
resolved_date: 2025-12-02
resolution: Reduced monitoring stubs from 106 to 6 lines
---

# Unimplemented Monitoring Stubs in metrics.ts

## Problem Statement

40+ lines of stub code for DataDog/New Relic monitoring that may never be implemented, including 15 lines of commented example code.

## Findings

### Code Simplicity Agent Discovery
From `server/src/routes/metrics.ts:43-83`:
```typescript
async function forwardMetricsToMonitoring(metrics: {...}): Promise<void> {
  const datadogApiKey = process.env['DATADOG_API_KEY'];
  const newRelicApiKey = process.env['NEW_RELIC_API_KEY'];

  if (!datadogApiKey && !newRelicApiKey) {
    return; // Silent return - 99% of executions
  }

  if (datadogApiKey) {
    // TODO: Implement DataDog integration
    // Example: [15 lines of commented code that will be stale when actually implemented]
    logger.info('[Metrics] DataDog forwarding configured but not yet implemented', {...});
  }
  // ... similar for New Relic
}
```

### Issues
1. **YAGNI Violation**: No indication monitoring will be added soon
2. **Commented Code**: 15 lines of stale example code
3. **Misleading**: Function name suggests it works, but just logs

## Proposed Solutions

### Option A: Minimal Stub (Recommended)
**Pros:** Clear intent, minimal code
**Cons:** Removes example (but examples should come from official docs anyway)
**Effort:** Small (10 min)
**Risk:** Low

```typescript
async function forwardMetricsToMonitoring(metrics: MetricsPayload): Promise<void> {
  // TODO: Implement DataDog/New Relic forwarding
  // Tracking issue: [link]
  const hasMonitoring = process.env['DATADOG_API_KEY'] || process.env['NEW_RELIC_API_KEY'];
  if (hasMonitoring) {
    logger.debug('[Metrics] External monitoring not yet implemented', { metrics });
  }
}
```

### Option B: Remove Entirely
**Pros:** No dead code
**Cons:** Loses placeholder for future work
**Effort:** Small
**Risk:** Low

## Recommended Action

Option A - Minimal stub with tracking issue

## Technical Details

### Affected Files
- `server/src/routes/metrics.ts` (lines 43-83)

### Impact
- Removes ~30 lines of speculative code
- Clearer that it's a stub

## Acceptance Criteria

- [ ] Commented example code removed
- [ ] Stub function is minimal (<10 lines)
- [ ] Tracking issue created/linked
- [ ] Tests pass

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-02 | Created | Discovered during PR #150 review |

## Resources

- PR #150: https://github.com/owner/repo/pull/150
