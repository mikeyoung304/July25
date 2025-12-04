---
status: complete
priority: p1
issue_id: "154"
tags: [accessibility, wcag, design-system, ui-ux-review]
dependencies: ["153"]
created_date: 2025-12-03
completed_date: 2025-12-03
source: ui-ux-plan-review
---

# CRITICAL: Orange Button Colors Fail WCAG AA Contrast

## Problem Statement

Login and CTA buttons use `orange-500` (#fb923c) with white text, which has a **2.57:1 contrast ratio**. WCAG AA requires **4.5:1** for normal text. This is a legal compliance risk.

## Findings

### UX Expert Agent Discovery

**Color Contrast Audit:**

| Color | Hex | On White | WCAG AA (4.5:1) |
|-------|-----|----------|-----------------|
| orange-400 | #fb923c | 2.57:1 | ❌ FAIL |
| orange-500 | #f97316 | 3.12:1 | ❌ FAIL |
| orange-600 | #ea580c | 4.35:1 | ❌ FAIL (close) |
| orange-700 | #c2410c | 5.81:1 | ✅ PASS |
| macon-navy | #1a365d | 10.8:1 | ✅ PASS |

**Affected Components:**
- `Login.tsx` line 160: `bg-orange-500` with white text
- Potentially all CTA buttons across the app

### Legal/Compliance Risk

WCAG 2.1 Level AA is legally required in many jurisdictions:
- Americans with Disabilities Act (ADA) - US
- European Accessibility Act - EU
- Accessibility for Ontarians with Disabilities Act - Canada

## Proposed Solutions

### Solution A: Use orange-700 for Text on Light Backgrounds (Recommended)

**Effort:** 1-2 hours | **Risk:** Low

Audit all orange text/button usages and ensure:
- `orange-700` (#c2410c) minimum for text on white
- `orange-600` acceptable for large text (18px+) only
- White text on orange backgrounds: use orange-600+ background

### Solution B: Use Navy for Primary CTAs

**Effort:** 2-3 hours | **Risk:** Medium (brand change)

Switch primary CTA buttons to `macon-navy` (10.8:1 ratio), reserve orange for accents only.

## Recommended Action

Solution A - maintains brand orange while achieving compliance.

## Technical Details

**Audit Command:**
```bash
# Find all orange color usages
grep -rn "orange-[345]00" client/src --include="*.tsx"
grep -rn "bg-orange" client/src --include="*.tsx"
```

**Verification Tool:**
Use WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/

**Semantic Color Roles (from design-tokens.css):**
```css
--color-primary: var(--macon-navy);      /* 10.8:1 - use for text */
--color-secondary: var(--macon-orange);   /* 2.57:1 - accents only */
--color-success: var(--macon-teal);       /* Check contrast */
```

## Acceptance Criteria

- [ ] All text on white backgrounds uses orange-700+ or navy
- [ ] WebAIM audit shows 4.5:1+ for all text elements
- [ ] Login button passes contrast check
- [ ] axe DevTools reports 0 color contrast violations
- [ ] Document which orange shades to use where

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-03 | Created | From UI/UX plan accessibility review |

## Resources

- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- axe DevTools browser extension
- WCAG 2.1 Success Criterion 1.4.3
