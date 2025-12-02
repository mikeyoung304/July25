---
status: pending
priority: p2
issue_id: "141"
tags: [code-review, responsive, ux, kitchen]
dependencies: []
---

# TODO-141: Two-panel layout breaks on tablets

## Problem Statement

ExpoTabContent uses 1 column on mobile, 3-column grid on lg: (1024px+). Tablets (768-1023px) get mobile layout where Kitchen Activity and Ready Orders are stacked vertically, wasting horizontal space.

## Findings

### Current Implementation (ExpoTabContent.tsx:127)
```typescript
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-1">  {/* Kitchen Activity */}
  <div className="lg:col-span-2">  {/* Ready Orders */}
```

### Issue
- iPad (1024px) gets 3-column layout - good
- iPad Mini (768px) gets 1-column stacked layout - wastes space
- Android tablets (768-1023px) also affected

## Proposed Solutions

### Solution 1: Add medium breakpoint (Recommended)
**Effort:** Small | **Risk:** Low

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <div className="md:col-span-1 lg:col-span-1">
  <div className="md:col-span-1 lg:col-span-2">
```

## Technical Details

**Affected Files:**
- `client/src/components/kitchen/ExpoTabContent.tsx:127-128`

## Acceptance Criteria

- [ ] Tablets (768px+) show side-by-side panels
- [ ] Mobile (<768px) shows stacked layout
- [ ] Large screens show 1/3 + 2/3 layout
- [ ] Tested on iPad, iPad Mini, Android tablets

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-02 | Created from code review | Responsive gap identified |
