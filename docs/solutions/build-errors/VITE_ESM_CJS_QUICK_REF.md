---
title: "Vite ESM/CJS Interop - Quick Reference"
slug: vite-esm-cjs-quick-ref
category: "build-errors"
tags:
  - "vite"
  - "esm"
  - "commonjs"
  - "quick-reference"
  - "cheat-sheet"
date: "2026-01-01"
severity: "high"
component: "build-system"
---

# Vite ESM/CJS Interop - Quick Reference

## The Problem in 10 Seconds

- shared = CommonJS (required for server)
- client = ESM (Vite)
- When they don't match in config → "exports is not defined"
- Appears in **dev mode only**

## The 4-Layer Fix

### 1. Vite Config (CRITICAL)
```typescript
// client/vite.config.ts line 183
optimizeDeps: {
  include: [
    '@rebuild/shared',  // ← MAIN PACKAGE REQUIRED
    '@rebuild/shared/constants/business',
    '@rebuild/shared/config',
  ],
},

// client/vite.config.ts line 163
commonjsOptions: {
  transformMixedEsModules: true,
  include: [/shared\/dist/],
},
```

### 2. Package.json
```json
// shared/package.json - NEVER add "type": "module"
{
  "exports": {
    ".": { "default": "./dist/index.js" },
    "./config": { "default": "./dist/config/index.js" },
    "./*": null  // Block deep imports
  }
}
```

### 3. TypeScript Config
```json
// shared/tsconfig.json
{
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node"
  },
  "exclude": ["config/browser.ts"]
}
```

### 4. Vitest Config
```typescript
// client/vitest.config.ts line 10
resolve: {
  alias: {
    '@rebuild/shared/config/browser': resolve(..., '../shared/config/browser.ts'),
    '@rebuild/shared': resolve(..., '../shared/dist'),
  },
}
```

## Adding New Exports

### Step 1: Add to shared/index.ts
```typescript
export { NewType } from './types/new.types';
```

### Step 2: If subpath, add to shared/package.json
```json
{
  "exports": {
    "./config/new": {
      "default": "./dist/config/new.js"
    }
  }
}
```

### Step 3: If new subpath, add to vite.config.ts
```typescript
optimizeDeps: {
  include: [
    '@rebuild/shared/config/new'  // ← Add here
  ]
}
```

### Step 4: Build and test
```bash
npm run build --workspace shared
npm run test:client
npm run dev:client
```

## Error Patterns

| Error | Cause | Fix |
|-------|-------|-----|
| `exports is not defined` | Main package not in optimizeDeps | Add `@rebuild/shared` to include |
| `Cannot find module @rebuild/shared` | Missing from vite.config | Check resolve aliases |
| `module.js not found in dist` | Not built | Run `npm run build --workspace shared` |
| `Property X undefined` | Missing from index.ts | Add `export` statement to shared/index.ts |
| `Cannot import Joi in browser` | Server code in main export | Remove from shared/index.ts |

## Verification Checklist

### Before Committing
- [ ] `npm run build --workspace shared` ✓
- [ ] New exports in shared/index.ts? ✓
- [ ] If subpath, in package.json exports? ✓
- [ ] `npm run test:client` passes? ✓
- [ ] `npm run dev:client` works? ✓

### In Code Review
- [ ] Check for `"type": "module"` in shared/package.json (should NOT exist)
- [ ] Check for Joi in shared/index.ts (should NOT be exported)
- [ ] If new subpath, verify it's in vite.config.ts optimizeDeps
- [ ] Check that @rebuild/shared is still in optimizeDeps.include

## Quick Fixes

### Issue: Dev mode fails with "exports is not defined"

**Fix 1: Verify @rebuild/shared is in optimizeDeps**
```bash
grep "@rebuild/shared" client/vite.config.ts
# Should show: '@rebuild/shared'
```

**Fix 2: Rebuild shared**
```bash
npm run build --workspace shared
```

**Fix 3: Clear Vite cache**
```bash
rm -rf client/.vite
npm run dev:client
```

### Issue: "Cannot find module @rebuild/shared/config/new"

**Fix 1: Verify subpath is in package.json exports**
```bash
cat shared/package.json | jq '.exports | keys'
# Should show: "./config/new"
```

**Fix 2: Verify file exists**
```bash
ls shared/dist/config/new.js
ls shared/config/new.ts
```

**Fix 3: Rebuild shared**
```bash
npm run build --workspace shared
```

### Issue: Tests fail but dev works

**Fix 1: Verify vitest config alias**
```bash
grep "@rebuild/shared" client/vitest.config.ts
# Should have explicit alias for browser config
```

**Fix 2: Add alias if missing**
```typescript
'@rebuild/shared/config/browser': resolve(__dirname, '../shared/config/browser.ts'),
```

## Decision Tree

```
Need to import something from @rebuild/shared?

├─ From main @rebuild/shared?
│  ├─ YES → Check shared/index.ts has export
│  └─ Then use: import { X } from '@rebuild/shared'
│
├─ From subpath like /config?
│  ├─ Check shared/package.json exports
│  ├─ Add if missing
│  └─ Add to vite.config.ts optimizeDeps.include
│
└─ For server-only (Joi)?
   └─ Keep in separate file, don't export from main
```

## The 3 Critical Rules

1. **Never** add `"type": "module"` to shared/package.json
2. **Always** have `@rebuild/shared` in vite.config.ts optimizeDeps.include
3. **Always** run `npm run build --workspace shared` after changes

## Testing Commands

```bash
# Build
npm run build --workspace shared

# Test imports
npm run test:client -- --grep "module-resolution"

# Dev server
npm run dev:client

# Check config validity
bash .github/scripts/validate-module-system.sh
```

## When to Escalate

If after following all steps above, issues persist:

1. Check git status - maybe dist/ is out of sync
2. Delete node_modules and reinstall: `npm ci`
3. Delete Vite cache: `rm -rf client/.vite`
4. Full rebuild: `npm run build`
5. Ask for help in #engineering on Slack

## Related Docs

- **Full Prevention Strategy**: vite-esm-cjs-interop-prevention.md
- **CI/CD Checks**: vite-esm-cjs-ci-checklist.md
- **Test Cases**: vite-esm-cjs-test-cases.md
- **ADR-016**: CommonJS Module System Decision

## Key Files

| File | Purpose | Lines to Check |
|------|---------|-----------------|
| client/vite.config.ts | Vite ESM/CJS config | 163-188 |
| shared/package.json | Export allowlist | 7-33 |
| shared/tsconfig.json | Build target | 8-9 |
| client/vitest.config.ts | Test config | 10-15 |
| shared/index.ts | Main exports | All |

---

**Bookmark This!** When you see "exports is not defined", come back here first.

