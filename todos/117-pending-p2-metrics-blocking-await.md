---
status: pending
priority: p2
issue_id: 117
tags: [code-review, performance, metrics, async]
dependencies: []
---

# Blocking External API Calls in Metrics Endpoint

## Problem Statement

The metrics endpoint in `server/src/routes/metrics.ts` uses `await forwardMetricsToMonitoring()` which blocks the HTTP response until external monitoring services (DataDog/NewRelic) respond. This introduces 200-500ms latency per metric submission, potentially reaching 10+ seconds on timeout.

## Findings

**Location**: `server/src/routes/metrics.ts` (handleMetrics function)

**Current Implementation**:
```typescript
// Blocks the response
await forwardMetricsToMonitoring(metricsData);
res.status(200).json({ success: true });
```

**Impact**:
- 200-500ms average latency per metric submission
- Up to 10+ seconds on timeout/network issues
- Degrades user experience for operations that track metrics
- Unnecessary coupling between metric collection and external monitoring

**Risk Level**: P2 IMPORTANT - Affects performance but not correctness

## Proposed Solutions

### Solution 1: Fire-and-Forget Pattern (Recommended)
```typescript
// Don't await - let it run in background
forwardMetricsToMonitoring(metricsData).catch(error => {
  logger.error('Failed to forward metrics', { error });
});
res.status(200).json({ success: true });
```

**Pros**:
- Immediate response to client
- Simpler implementation
- Monitoring failures don't affect user experience

**Cons**:
- No confirmation that metrics were forwarded
- Requires proper error handling in background

### Solution 2: Queue-Based Approach
Use a message queue (Redis, Bull) to process metrics asynchronously.

**Pros**:
- Guaranteed delivery with retry logic
- Better observability

**Cons**:
- More complex infrastructure
- Overkill for this use case

## Technical Details

**Files to Modify**:
- `server/src/routes/metrics.ts` - Remove await from forwardMetricsToMonitoring call

**Testing Requirements**:
- Verify response time improves to <50ms
- Verify metrics still forwarded (check monitoring service)
- Test error handling when monitoring service is down
- Load test to ensure no memory leaks from unhandled promises

**Rollback Plan**:
Revert to blocking await if monitoring delivery reliability drops below acceptable threshold.

## Acceptance Criteria

- [ ] Remove `await` from `forwardMetricsToMonitoring()` call
- [ ] Add `.catch()` error handler with structured logging
- [ ] Response time <50ms (measured via `npm run test:server`)
- [ ] Metrics still appear in monitoring dashboards
- [ ] No unhandled promise rejections in logs
- [ ] Load test confirms no memory leaks (100+ concurrent requests)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-02 | Created | From code review of commit a699c6c6 |
