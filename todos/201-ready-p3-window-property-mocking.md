---
status: ready
priority: p3
issue_id: "201"
tags: [testing, best-practices, code-review]
dependencies: []
created_date: 2025-12-05
source: multi-agent-code-review
---

# Window Property Mocking Anti-Pattern

## Problem Statement

Tests mock window properties directly which can leak between tests and cause flakiness.

## Findings

### Pattern Recognition Agent Discovery

**Current Pattern:**
```typescript
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  value: 1024,
});
```

**Better Pattern:**
```typescript
const originalInnerWidth = window.innerWidth;
beforeEach(() => {
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1024);
});
afterEach(() => {
  vi.restoreAllMocks();
});
```

## Acceptance Criteria

- [ ] Window properties mocked via vi.spyOn
- [ ] All mocks restored in afterEach

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent code review |
