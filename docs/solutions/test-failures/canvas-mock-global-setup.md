---
title: Global Canvas Mock Setup - Eliminating jsdom HTMLCanvasElement Warnings
category: test-failures
severity: minor
components: [testing, vitest, jsdom, canvas]
symptoms:
  - "Not implemented: HTMLCanvasElement.prototype.getContext" console errors
  - jsdom warnings during test runs
  - Canvas-related test noise in CI output
root_cause: Canvas mock existed but was not applied globally in test setup
tags: [jsdom, canvas, vitest, test-setup, mocks, floor-plan]
created_date: 2025-12-27
resolution_commit: f686d70f
related_lessons: []
---

# Global Canvas Mock Setup

## Problem Statement

Client tests were generating "Not implemented: HTMLCanvasElement.prototype.getContext" errors from jsdom. While tests passed, the noise was hiding real issues and cluttering test output.

### Symptoms Observed

```
Error: Not implemented: HTMLCanvasElement.prototype.getContext
    at module.exports (.../jsdom/lib/jsdom/browser/not-implemented.js:9:17)
```

These warnings appeared whenever components using `<canvas>` elements (e.g., `FloorPlanCanvas.tsx`) were rendered in tests.

## Root Cause Analysis

### The Issue

1. A comprehensive canvas mock already existed at `client/src/test/mocks/canvas.ts`
2. The mock was **not imported or applied globally** in `client/test/setup.ts`
3. Instead, a console.error suppression hack was filtering out the warnings:

```typescript
// ❌ WRONG: Suppressing warnings instead of fixing
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render') ||
     args[0].includes('Warning: useLayoutEffect') ||
     args[0].includes('Not implemented: HTMLCanvasElement')) // ← hiding the problem
  ) {
    return
  }
  originalError.call(console, ...args)
}
```

## Solution

### Step 1: Apply Global Canvas Mock

Added import and call to `setupCanvasMock()` at the top of `client/test/setup.ts`:

```typescript
import { setupCanvasMock } from '../src/test/mocks/canvas'

// Setup canvas mock globally (must be before any canvas usage)
setupCanvasMock()
```

### Step 2: Remove Suppression Hack

Removed the canvas error filter from the console.error override:

```typescript
// ✅ CORRECT: Only suppress known React warnings
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render') ||
     args[0].includes('Warning: useLayoutEffect'))
  ) {
    return
  }
  originalError.call(console, ...args)
}
```

## What the Canvas Mock Provides

The `setupCanvasMock()` function mocks:

- `HTMLCanvasElement.prototype.getContext('2d')` - Full 2D context with all drawing methods
- `HTMLCanvasElement.prototype.getContext('webgl')` - Basic WebGL context
- `HTMLCanvasElement.prototype.toDataURL()` - Returns mock data URL
- `HTMLCanvasElement.prototype.toBlob()` - Calls callback with mock blob

This enables proper testing of floor plan rendering, charts, and any canvas-based UI.

## Files Changed

| File | Change |
| ---- | ------ |
| `client/test/setup.ts` | Added canvas mock import + call, removed suppression |

## Verification

```bash
npm run test:client
# All 1241 tests pass, no canvas warnings
```

## Prevention

1. **Don't suppress warnings** - Fix the underlying issue instead
2. **Check for existing mocks** - Search `src/test/mocks/` before creating new ones
3. **Apply mocks globally** - If a mock is needed project-wide, add it to `test/setup.ts`

## Related Files

- `client/src/test/mocks/canvas.ts` - The canvas mock implementation
- `client/test/setup.ts` - Global test setup
- `client/src/modules/floor-plan/components/FloorPlanCanvas.tsx` - Primary canvas consumer
