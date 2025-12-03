---
status: deferred
priority: p3
issue_id: "124"
tags: [code-quality, maintainability, configuration, magic-numbers, yagni]
dependencies: []
created_date: 2025-12-02
deferred_date: 2025-12-02
source: code-review-pr-151
---

# Magic Numbers Throughout Code

## Status: DEFERRED (Simplified)

**Decision Date:** 2025-12-02
**Reviewed By:** Multi-agent review (DHH-style, Pragmatic, Code Quality)
**Verdict:** Over-aggressive extraction proposed - simplify or defer

### Why Deferred

1. **Over-aggressive** - Original plan extracted values used only once (e.g., `SIZE_LIMITS.KB = 1024`)
2. **Low priority** - P3 nice-to-have, not blocking production readiness
3. **Focus elsewhere** - 99% production ready, should focus on P1 issues instead
4. **Cognitive load** - Extracting every number increases indirection without benefit

### What NOT to Extract

- Values used only once
- HTTP status codes (TypeScript already has these)
- Standard math constants (1024 for KB, etc.)
- One-off business logic values

### If Needed Later (Minimal Approach)

Only extract constants used in **2+ places** or **runtime-configurable**:

```typescript
// server/src/config/constants.ts (~30 lines total)

/**
 * Server-side constants. Only values used in 2+ places.
 */
export const TIMEOUTS = {
  EXTERNAL_API_MS: 5_000,
  WEBSOCKET_PING_MS: 30_000,
} as const;

export const SECURITY = {
  HSTS_MAX_AGE_SECONDS: 31_536_000,
  MAX_EVENT_BUFFER_SIZE: 10_000,
} as const;

export const RATE_LIMITS = {
  METRICS_WINDOW_MS: 60_000,
  METRICS_MAX_DEV: 300,
  METRICS_MAX_PROD: 100,
} as const;
```

**That's it.** 30 lines, not 200+.

---

## Original Problem (For Reference)

Hardcoded numeric values scattered throughout codebase:

```typescript
// Examples
refetchInterval: 60000  // What is 60000?
timeout = 5000          // Why 5 seconds?
max: 100                // Why 100?
```

**Impact:** Low - code works, just harder to understand

**Original Proposal:** 200+ lines across 3 files with elaborate domain organization

**Simplified Proposal:** 30 lines in 1 file, only multi-use values

## Reopen When

- [ ] Actively tuning performance and need central config
- [ ] Adding new developers who need clear documentation
- [ ] Business rules change frequently and need easy updates

## References

- **Plan Review:** `plans/large-refactors-monitoring-batching-constants.md`
- **Clean Code (Martin):** Chapter 17 - "G25: Replace Magic Numbers with Named Constants"
- **Lesson:** Only extract when you feel the pain of duplication
