---
status: pending
priority: p1
issue_id: "153"
tags: [css, tailwind, design-system, ui-ux-review]
dependencies: []
created_date: 2025-12-03
source: ui-ux-plan-review
---

# CRITICAL: macon-orange Missing from Tailwind Config

## Problem Statement

`ItemDetailModal.tsx` uses `bg-macon-orange` and `ring-macon-orange` classes, but Tailwind config only defines `macon-teal`. These classes will be purged in production, breaking modal styling.

## Findings

### Pattern Recognition Agent Discovery

**Usage in Code:**
- `ItemDetailModal.tsx` line 148: `bg-macon-orange`
- `ItemDetailModal.tsx` line 167: `ring-macon-orange`

**Tailwind Config (`client/tailwind.config.js`):**
```javascript
// Line 63-75: macon-teal defined
'macon-teal': {
  DEFAULT: '#4ECDC4',
  50: '#E8FAF8',
  // ... shades
},
// macon-orange: NOT DEFINED
```

**CSS Design Tokens (`client/src/styles/design-tokens.css`):**
```css
--macon-orange: #fb923c;  /* Line 9 - exists but not in Tailwind */
```

**Safelist:** Only protects `orange-*` shades (lines 6-16), not `macon-orange`

### Production Impact

1. Build runs Tailwind purge
2. `bg-macon-orange` not in safelist or theme
3. Class removed from production CSS
4. Modal buttons render with no background color

## Proposed Solutions

### Solution A: Add macon-orange to Tailwind Theme (Recommended)

**Effort:** 15 minutes | **Risk:** None

```javascript
// client/tailwind.config.js theme.extend.colors
'macon-orange': {
  DEFAULT: '#fb923c',
  50: '#fff7ed',
  100: '#ffedd5',
  200: '#fed7aa',
  300: '#fdba74',
  400: '#fb923c',
  500: '#f97316',
  600: '#ea580c',
  700: '#c2410c',
  800: '#9a3412',
  900: '#7c2d12',
},
```

### Solution B: Use Standard orange-400

**Effort:** 10 minutes | **Risk:** Low

Replace all `macon-orange` usages with `orange-400` (same hex value #fb923c).

## Recommended Action

Solution A - maintains brand naming consistency with macon-teal.

## Technical Details

**Affected Files:**
- `client/tailwind.config.js` - Add theme color
- Verify no other components use undefined brand colors

**Verification:**
```bash
# Find all macon-* usages
grep -r "macon-" client/src --include="*.tsx" --include="*.ts"
```

## Acceptance Criteria

- [ ] `macon-orange` defined in tailwind.config.js
- [ ] Shades match standard Tailwind orange scale
- [ ] Production build includes macon-orange classes
- [ ] ItemDetailModal renders correctly in production

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-03 | Created | From UI/UX plan pattern review |

## Resources

- Tailwind color palette generator
- `client/src/styles/design-tokens.css` line 9
