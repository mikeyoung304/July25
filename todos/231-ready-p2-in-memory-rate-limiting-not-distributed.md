# TODO-231: In-Memory Rate Limiting Not Distributed

**Priority:** P2 (Important - Scalability)
**Category:** Architecture / DevOps
**Source:** Code Review - Security, Performance, Architecture, DevOps Agents (2025-12-27)
**Commit:** 66773b6d (fix: resolve TODO items from enterprise audit review)

## Problem Statement

The `MenuEmbeddingService` rate limiting uses an in-memory `Map<string, number[]>` that:
1. Resets on server restart (allowing rate limit bypass)
2. Does not share state across multiple instances (each replica allows independent limits)
3. Has no cleanup mechanism for stale entries (potential memory growth)

## Findings

### Evidence

```typescript
// server/src/services/menu-embedding.service.ts:68
private static generationHistory = new Map<string, number[]>();
```

### Risk Assessment

| Scenario | Impact |
|----------|--------|
| Single instance (current) | Works, but resets on restart |
| Multiple replicas | Rate limit is N x 5 calls/hour |
| Attacker-triggered restart | Immediate bypass |

### Mitigating Factor

- Feature is disabled by default (`ENABLE_SEMANTIC_SEARCH=false`)
- Not exposed via HTTP endpoints (only internal AI tools)

## Proposed Solutions

### Option 1: Database-Backed Rate Limiting
- Store generation timestamps in a `embedding_rate_limits` table
- Query existing timestamps before allowing generation
- **Pros:** Persistent, distributed, auditable
- **Cons:** Additional database queries
- **Effort:** Medium
- **Risk:** Low

### Option 2: Redis-Based Rate Limiting
- Use Redis LPUSH/EXPIRE for sliding window
- Shared state across all instances
- **Pros:** Fast, distributed, auto-expiring
- **Cons:** Requires Redis infrastructure
- **Effort:** Medium
- **Risk:** Low (if Redis already available)

### Option 3: Add Cleanup + Documentation (Minimal)
- Add cleanup interval for stale Map entries
- Document limitation in CLAUDE.md
- Accept for single-instance deployment
- **Pros:** Minimal code change
- **Cons:** Doesn't solve multi-instance
- **Effort:** Small
- **Risk:** Low

## Recommended Action

**Option 3 (Short-term)** - Add cleanup and documentation for current single-instance deployment.
**Option 1 or 2 (Future)** - Implement distributed rate limiting before horizontal scaling.

## Technical Details

**Files Affected:**
- `server/src/services/menu-embedding.service.ts`

**Dependencies:**
- None (for Option 3)
- Redis setup (for Option 2)

## Acceptance Criteria

- [ ] Rate limit Map has cleanup mechanism for entries older than 1 hour
- [ ] Limitation documented in CLAUDE.md under "Known Considerations"
- [ ] Logging added when rate limit is hit (for monitoring)

## Work Log

| Date | Action | Result |
|------|--------|--------|
| 2025-12-27 | Created from code review | Identified by 4 agents |
| 2025-12-27 | Triage: APPROVED | Status: pending → ready |

## Resources

- Related: #217 (original rate limiting implementation)
- Similar pattern: `server/src/middleware/authRateLimiter.ts` (has cleanup)
