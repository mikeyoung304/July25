# TODO-055: KDS FocusOverlay Modal Accessibility - Focus Trap & Keyboard Navigation

## Metadata
- **Status**: pending
- **Priority**: P1 (Critical)
- **Issue ID**: 055
- **Tags**: accessibility, kds, wcag, keyboard, modal
- **Dependencies**: None
- **Created**: 2025-11-26
- **Source**: Code Review - KDS Declutter Implementation

---

## Problem Statement

The new `FocusOverlay.tsx` modal component lacks essential accessibility features:
1. **No focus trap** - Keyboard users can tab outside the modal to background content
2. **No Escape key handler** - Cannot close modal with keyboard
3. **No auto-focus** - Modal doesn't focus first interactive element on open
4. **Missing ARIA attributes** - No `role="dialog"` or `aria-modal="true"`

This violates WCAG 2.1.2 (Level A) - No Keyboard Trap and WCAG 2.1.1 (Level A) - Keyboard accessibility.

---

## Findings

### Evidence Location
- `client/src/components/kitchen/FocusOverlay.tsx:55-131` - Modal implementation
- Lines 56-59: Click handler on backdrop but no keyboard equivalent
- Lines 79-85: Close button exists but not auto-focused

### Current Implementation
```tsx
// No focus trap, no escape handler, no auto-focus
<div
  className="fixed inset-0 bg-black/50 z-50..."
  onClick={onClose}
>
  <div onClick={e => e.stopPropagation()}>
    {/* Content without focus management */}
  </div>
</div>
```

### Impact
- Kitchen staff using keyboard cannot effectively navigate modal
- Screen reader users trapped in unusable state
- Violates WCAG Level A requirements
- Restaurant may face ADA compliance issues

---

## Proposed Solutions

### Option A: Add Focus Trap with useEffect (Recommended)
**Pros**: Complete accessibility fix, follows modal best practices
**Cons**: Adds ~40 lines of code
**Effort**: Small (1-2 hours)
**Risk**: Low - additive change

### Option B: Use Radix UI Dialog Primitive
**Pros**: Battle-tested accessibility, less custom code
**Cons**: New dependency, may conflict with existing styling
**Effort**: Medium (2-3 hours)
**Risk**: Medium - dependency management

---

## Recommended Action

**Option A** - Add focus trap implementation:

```tsx
import { useEffect, useRef } from 'react';

export function FocusOverlay({ onClose, ... }: FocusOverlayProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Auto-focus close button on mount
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trap
      if (e.key !== 'Tab') return;

      const focusable = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;

      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="focus-modal-title"
      className="fixed inset-0 bg-black/50 z-50..."
      onClick={onClose}
    >
      <div ref={modalRef} onClick={e => e.stopPropagation()}>
        <h2 id="focus-modal-title">{primaryLabel}</h2>
        <button ref={closeButtonRef} onClick={onClose} aria-label="Close order details dialog">
          <X aria-hidden="true" />
        </button>
        {/* rest of content */}
      </div>
    </div>
  );
}
```

---

## Technical Details

### Affected Files
- `client/src/components/kitchen/FocusOverlay.tsx`

### WCAG Criteria Affected
- 2.1.1 Keyboard (Level A) - FAIL → PASS
- 2.1.2 No Keyboard Trap (Level A) - FAIL → PASS
- 4.1.2 Name, Role, Value (Level A) - FAIL → PASS

---

## Acceptance Criteria

- [ ] Modal traps focus - Tab cycles within modal only
- [ ] Escape key closes modal
- [ ] First interactive element auto-focused on open
- [ ] `role="dialog"` and `aria-modal="true"` present
- [ ] Modal title has `id` referenced by `aria-labelledby`
- [ ] Close button has `aria-label`
- [ ] Icon has `aria-hidden="true"`
- [ ] Manual test: Navigate modal with keyboard only

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-26 | Created | From KDS declutter code review |

---

## Resources

- [WAI-ARIA Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [WCAG 2.1.2 No Keyboard Trap](https://www.w3.org/WAI/WCAG21/Understanding/no-keyboard-trap.html)
