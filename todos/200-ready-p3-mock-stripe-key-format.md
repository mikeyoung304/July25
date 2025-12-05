---
status: ready
priority: p3
issue_id: "200"
tags: [testing, security, code-review]
dependencies: []
created_date: 2025-12-05
source: multi-agent-code-review
---

# Mock Stripe Keys Resemble Real Key Format

## Problem Statement

Test files use mock Stripe keys that follow the real key format (`pk_test_...`), which could cause confusion or accidental exposure if copied.

## Findings

### Security Agent Discovery

**Current Mock:**
```typescript
const mockEnv = {
  VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_mock123',
};
```

**Recommendation:**
Use obviously fake keys that can't be confused with real keys:

```typescript
const mockEnv = {
  VITE_STRIPE_PUBLISHABLE_KEY: 'MOCK_STRIPE_KEY_NOT_REAL',
};
```

## Acceptance Criteria

- [ ] Mock keys don't follow real key format
- [ ] Keys are obviously fake (e.g., `MOCK_*`)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent code review |
