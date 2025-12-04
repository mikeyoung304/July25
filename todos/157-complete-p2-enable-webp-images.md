---
status: complete
priority: p2
issue_id: "157"
tags: [performance, images, optimization, ui-ux-review]
dependencies: []
created_date: 2025-12-03
completed_date: 2025-12-03
source: ui-ux-plan-review
---

# Enable WebP Image Support (Already Implemented, Just Commented Out)

## Problem Statement

OptimizedImage component has WebP support code that's commented out. WebP images already exist in `/public/images/menu/` with 30-50% size savings. Just need to uncomment the code.

## Findings

### Performance Agent Discovery

**WebP Images Already Exist:**
```
asian-noodles.jpg     205KB
asian-noodles.webp    140KB  (-32% savings)

chicken-salad.jpg     240KB
chicken-salad.webp    117KB  (-51% savings)
```

**Code is Ready (OptimizedImage.tsx lines 97-100):**
```tsx
<picture>
  {/* Future: Add WebP source when available */}
  {/* <source type="image/webp" srcSet={...} /> */}
  <img ... />
</picture>
```

**Browser Support:** WebP supported by 97%+ of browsers. `<picture>` element handles fallback automatically.

## Proposed Solutions

### Solution A: Uncomment Existing Code (Recommended)

**Effort:** 5 minutes | **Risk:** None

```tsx
<picture>
  <source
    type="image/webp"
    srcSet={src.replace(/\.(jpg|jpeg|png)$/, '.webp')}
  />
  <img src={src} ... />
</picture>
```

### Solution B: Full Picture Element with Fallback

**Effort:** 15 minutes | **Risk:** None

Add error handling for missing WebP files:

```tsx
const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
const [webpFailed, setWebpFailed] = useState(false);

<picture>
  {!webpFailed && (
    <source
      type="image/webp"
      srcSet={webpSrc}
      onError={() => setWebpFailed(true)}
    />
  )}
  <img src={src} ... />
</picture>
```

## Recommended Action

Solution A - WebP files already exist for all menu images.

## Technical Details

**Affected Files:**
- `client/src/components/shared/OptimizedImage.tsx`

**Verification:**
1. Open Network tab in DevTools
2. Load menu page
3. Verify .webp files are loaded (not .jpg)
4. Check "Type" column shows "webp"

**Expected Savings:**
- Current: ~2.5MB images per menu load
- After: ~1.3MB images (48% reduction)

## Acceptance Criteria

- [ ] OptimizedImage renders `<picture>` with WebP source
- [ ] Browser DevTools shows .webp files loading
- [ ] JPEG fallback works in older browsers
- [ ] No visual quality degradation
- [ ] Page load time improved

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-03 | Created | From UI/UX plan performance review |

## Resources

- WebP browser support: https://caniuse.com/webp
- `<picture>` element: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/picture
