---
status: deferred
priority: p3
issue_id: "123"
tags: [performance, cost, rate-limiting, external-api, monitoring, yagni]
dependencies: ["121"]
created_date: 2025-12-02
deferred_date: 2025-12-02
source: code-review-pr-151
---

# Missing Rate Limiting on External API Calls

## Status: DEFERRED (YAGNI)

**Decision Date:** 2025-12-02
**Reviewed By:** Multi-agent review (DHH-style, Pragmatic, Code Quality)
**Verdict:** Unanimous rejection - speculative optimization

### Why Deferred

1. **Prerequisite not met** - TODO-121 (monitoring abstraction) deferred; no monitoring APIs configured
2. **No proven need** - No evidence of rate limiting issues or cost problems
3. **Speculative savings** - $219/year theoretical savings doesn't justify engineering effort
4. **Race conditions** - Proposed batching queue design had concurrency bugs identified in review

### Reopen When

- [ ] TODO-121 is completed (monitoring actually configured)
- [ ] Rate limiting observed from external APIs (429 responses logged)
- [ ] Cost data shows batching would save meaningful money
- [ ] Actual traffic justifies optimization (>1000 events/sec sustained)

### If Needed Later (Simple Approach)

Don't build the full batching queue. Use this 30-line approach instead:

```typescript
// server/src/utils/SimpleBatcher.ts
class SimpleBatcher<T> {
  private queue: T[] = [];
  private timer: NodeJS.Timeout;

  constructor(
    private flushFn: (batch: T[]) => Promise<void>,
    private intervalMs = 30_000
  ) {
    this.timer = setInterval(() => this.flush(), intervalMs);
  }

  add(item: T): void {
    this.queue.push(item);
    if (this.queue.length >= 100) this.flush();
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, 100);
    try {
      await this.flushFn(batch);
    } catch (err) {
      logger.warn('Batch flush failed', { err });
    }
  }

  shutdown(): void {
    clearInterval(this.timer);
    this.flush();
  }
}
```

---

## Original Problem (For Reference)

The `forwardMetricsToMonitoring` function makes external API calls without rate limiting or batching.

**Theoretical Impact:**
- 100 users × 2 metrics/pageload × 3 providers = 600 external API calls
- Potential cost: $219/year

**Reality:**
- No monitoring APIs configured in production
- The forwarding code early-returns (doesn't run)
- Zero actual API calls being made

## References

- **Plan Review:** `plans/large-refactors-monitoring-batching-constants.md`
- **Related:** TODO-121 (monitoring abstraction - prerequisite, also deferred)
- **Lessons:** Measure before optimizing - speculative savings don't justify engineering cost
