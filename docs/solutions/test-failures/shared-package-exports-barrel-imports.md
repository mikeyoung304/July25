---
title: "Missing @rebuild/shared Subpath Exports - Use Barrel Imports"
category: "test-failures"
tags:
  - "module-resolution"
  - "package-exports"
  - "barrel-imports"
  - "shared-package"
  - "runtime-errors"
date: "2025-11-28"
severity: "medium"
component: "shared-package"
related_files:
  - "server/src/ai/functions/realtime-menu-tools.ts"
  - "server/src/models/order.model.ts"
  - "shared/package.json"
  - "shared/index.ts"
  - "shared/utils/index.ts"
---

# Missing @rebuild/shared Subpath Exports - Use Barrel Imports

## Problem

Tests fail at runtime with the error:

```
Missing "./utils/price-validation" specifier in "@rebuild/shared" package
```

TypeScript compilation succeeds, but tests fail when Node.js tries to resolve deep subpath imports.

## Symptoms

- Test suite fails (e.g., `realtime-menu-tools.test.ts`)
- Error mentions "Missing specifier" or "not exported from package"
- TypeScript shows no errors (`npm run typecheck` passes)
- Only fails at runtime, not compile time

## Root Cause

The `@rebuild/shared` package uses an **explicit package export allowlist** in `package.json`:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./config": { ... },
    "./constants/business": { ... },
    "./*": null  // <-- BLOCKS all other subpath imports
  }
}
```

The `./*: null` rule **intentionally blocks** any deep import not explicitly listed.

### Why TypeScript Works But Runtime Fails

| Resolution | Method | Result |
|------------|--------|--------|
| **TypeScript** | Uses `tsconfig.json` paths (`@rebuild/shared/*` → `../shared/*`) | Bypasses package.json |
| **Node.js** | Uses `package.json` exports field | Blocked by `./*: null` |

This mismatch means code compiles but fails at runtime.

## Solution

**Use barrel imports** from `@rebuild/shared` instead of deep subpath imports.

### Before (Broken)

```typescript
// Deep imports blocked by package.json exports
import { sanitizePrice, validateCartTotals } from '@rebuild/shared/utils/price-validation';
import { ORDER_STATUSES } from '@rebuild/shared/utils/order-constants';
```

### After (Fixed)

```typescript
// Barrel import works - everything re-exported from index.ts
import { sanitizePrice, validateCartTotals } from '@rebuild/shared';
import { ORDER_STATUSES } from '@rebuild/shared';
```

### Files Changed

1. **`server/src/ai/functions/realtime-menu-tools.ts:6`**
   ```typescript
   // Before
   import { sanitizePrice, validateCartTotals } from '@rebuild/shared/utils/price-validation';

   // After
   import { sanitizePrice, validateCartTotals } from '@rebuild/shared';
   ```

2. **`server/src/models/order.model.ts:38-41`**
   ```typescript
   // Before
   } from '@rebuild/shared/utils/order-constants';

   // After
   } from '@rebuild/shared';
   ```

## Exception: Server-Only Modules

Some modules are **intentionally excluded** from the barrel export because they break in browsers:

```typescript
// shared/index.ts
// DO NOT EXPORT JOI VALIDATION TO CLIENT
// export * from './validation/order.schema'; // Joi causes "exports is not defined" in browser
```

For server-only code (like Joi validation), keep the deep import:

```typescript
// This is correct - Joi schemas are server-only
export {
  orderSchemas,
  createOrderSchema,
  // ...
} from '@rebuild/shared/validation/order.schema';
```

## Prevention

### Best Practice: Always Use Barrel Imports

```typescript
// PREFERRED - Use barrel export
import { Order, OrderStatus, DEFAULT_TAX_RATE } from '@rebuild/shared';

// AVOID - Deep imports (unless explicitly allowed in package.json)
import { Order } from '@rebuild/shared/types/order.types';
```

### Decision Tree

```
Need to import from @rebuild/shared?
│
├─ Is it available from barrel (`@rebuild/shared`)?
│  └─ YES → Use barrel import
│
├─ Is it server-only (Joi, Node APIs)?
│  └─ YES → Use deep import (verify it's in package.json exports)
│
└─ Not in barrel and not server-only?
   └─ Add to shared/utils/index.ts or shared/index.ts
```

### ESLint Rule (Optional)

```javascript
// eslint.config.js
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@rebuild/shared/utils/*', '@rebuild/shared/types/*'],
        message: 'Use barrel import: `import { X } from "@rebuild/shared"`'
      }]
    }]
  }
}
```

## Verification

```bash
# Run tests to verify fix
npm run test:server

# Check typecheck still passes
npm run typecheck:quick
```

## Related Documentation

- [ADR-016: CommonJS Module System](/docs/explanation/architecture-decisions/ADR-016-module-system-commonjs.md) - Why shared uses CommonJS
- [Node.js Package Exports](https://nodejs.org/api/packages.html#package-entry-points) - Official documentation

## Commit Reference

```
9b8f329c fix(shared): use barrel imports for shared package utilities
```

---

**Key Insight**: Package.json `exports` is a runtime access control mechanism. TypeScript paths bypass it, causing a compile-vs-runtime mismatch. Always prefer barrel imports to avoid this issue.
