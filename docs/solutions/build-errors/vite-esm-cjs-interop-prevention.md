---
title: "Vite ESM/CJS Interop Prevention Strategy"
slug: vite-esm-cjs-interop-prevention
category: "build-errors"
tags:
  - "vite"
  - "esm"
  - "commonjs"
  - "module-system"
  - "build-configuration"
  - "prevention-patterns"
date: "2026-01-01"
severity: "high"
component: "build-system"
related_files:
  - "client/vite.config.ts"
  - "shared/package.json"
  - "shared/tsconfig.json"
  - "shared/index.ts"
---

# Vite ESM/CJS Interop Prevention Strategy

## Problem Overview

The shared package is CommonJS (required by ADR-016 for Node.js/server compatibility), but Vite in the client assumes ESM. When new exports are added to shared/, they don't automatically work in dev mode without explicit configuration. The issue only appears at runtime (usually in tests), not at build time.

### Symptoms of the Problem

- Tests fail with "Cannot read property of undefined" or similar vague errors
- Dev server works for some imports but not others
- Build succeeds, tests fail
- Only affects new exports or subpath imports
- TypeScript compilation passes (uses path aliases, bypasses package.json)

### Root Cause Chain

```
New export added to shared/index.ts
    ↓
Only sub-paths in optimizeDeps.include, not the main package
    ↓
Vite doesn't pre-bundle the main @rebuild/shared package in dev
    ↓
CommonJS code tries to load in ESM context (browser)
    ↓
"exports is not defined" error or module resolution failure
```

## Prevention Strategies

### 1. Configuration-Level Prevention

#### Add Main Package to optimizeDeps

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/vite.config.ts` (lines 183)

Current (GOOD):
```typescript
optimizeDeps: {
  include: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    'react-router-dom',
    '@supabase/supabase-js',
    '@rebuild/shared', // ← Main package pre-bundled
    '@rebuild/shared/constants/business',
    '@rebuild/shared/config',
  ],
  exclude: [],
},
```

Why this matters:
- `@rebuild/shared` main package must be in `optimizeDeps.include` for Vite to pre-bundle it
- Pre-bundling transforms CommonJS to ESM in dev mode
- Without it, only sub-paths are pre-bundled, but the main package isn't

#### Explicit commonjsOptions

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/vite.config.ts` (lines 163-170)

Required configuration:
```typescript
commonjsOptions: {
  transformMixedEsModules: true,
  include: [
    /node_modules/,
    /shared\/dist/,  // Include shared dist files for CommonJS transformation
  ],
  defaultIsModuleExports: true,
},
```

Why each option:
- `transformMixedEsModules`: Allows ESM modules to import CommonJS
- `include: /shared\/dist/`: Ensures shared package dist files are transformed
- `defaultIsModuleExports`: Treats CommonJS modules as having a default export

### 2. Package Configuration Prevention

#### Use Explicit package.json Exports

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/shared/package.json` (lines 7-33)

Pattern:
```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./config": {
      "types": "./dist/config/index.d.ts",
      "default": "./dist/config/index.js"
    },
    "./config/browser": {
      "types": "./config/browser.ts",
      "default": "./config/browser.ts"
    },
    "./*": null  // Block unlisted subpath imports
  }
}
```

Why explicit exports matter:
- Declares what consumers CAN import (allowlist approach)
- Runtime (Node.js) enforces this; TypeScript paths bypass it
- Any new export MUST be added here or it fails at runtime
- `./*: null` prevents accidental deep imports

**Action:** When adding new exports to shared:
1. Add to `shared/index.ts` (barrel export)
2. Add to `package.json` exports if it's a subpath export
3. Test in dev mode first before committing

### 3. TypeScript Configuration Prevention

#### Exclude Browser-Only Files

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/shared/tsconfig.json` (line 18)

```typescript
{
  "exclude": ["dist", "node_modules", "**/__tests__/**", "config/browser.ts"]
}
```

Why exclude `config/browser.ts`:
- Uses `import.meta` (ESM-only feature)
- CommonJS compilation would fail
- Should remain as TypeScript source file
- Vite handles it directly

#### Module Compilation Target

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/shared/tsconfig.json` (lines 8-9)

```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node"
  }
}
```

Why:
- Compiles to CommonJS for server
- Vite will transform to ESM for client
- Must NOT use `"type": "module"` in package.json

### 4. Vitest Configuration Prevention

#### Explicit Alias Mapping for Browser Config

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/vitest.config.ts` (lines 10-11)

```typescript
resolve: {
  alias: {
    '@': resolve(__dirname, './src'),
    // Browser config needs to resolve to TypeScript source (not in dist)
    '@rebuild/shared/config/browser': resolve(__dirname, '../shared/config/browser.ts'),
    '@rebuild/shared': resolve(__dirname, '../shared/dist'),
  },
},
```

Why:
- Browser config is TypeScript source, not compiled
- Vitest needs explicit mapping for source files not in dist
- Without this, vitest tries to load non-existent dist file

### 5. Build Script Prevention

#### Ensure shared Package Builds First

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/.github/workflows/quick-tests.yml` (line 44)

```yaml
- run: npm run build --workspace shared
```

Why:
- Shared must compile before tests run
- Exports dist files that other workspaces depend on
- Build failures here reveal export/type issues early

## CI/CD Prevention Checks

### 1. Add Exports Validation to PR Checks

**Purpose:** Catch missing package.json exports before runtime

**Suggested workflow addition:**

```bash
# .github/workflows/pr-validation.yml (new step)
- name: Validate shared package exports
  run: |
    echo "::group::Checking shared package exports"

    # Get list of exports in package.json
    EXPORTS=$(cat shared/package.json | jq -r '.exports | keys[]')

    # For each export, verify it exists
    for export in $EXPORTS; do
      if [[ "$export" == "./*" ]]; then
        continue  # Skip wildcard
      fi

      # Convert export path to file path
      FILE_PATH=$(echo "$export" | sed 's|^\./||')

      if [ ! -f "shared/$FILE_PATH"* ]; then
        echo "❌ Export '${export}' declared but not found"
        exit 1
      fi
    done

    echo "✅ All package.json exports have corresponding files"
    echo "::endgroup::"
```

### 2. Add optimizeDeps Validation to Build Checks

**Purpose:** Ensure main package and critical subpaths are in optimizeDeps

**Suggested check:**

```bash
# Verify @rebuild/shared is in optimizeDeps.include
if ! grep -q "'@rebuild/shared'" client/vite.config.ts; then
  echo "❌ @rebuild/shared main package not in optimizeDeps.include"
  exit 1
fi

# Verify commonjsOptions are configured
if ! grep -q "transformMixedEsModules: true" client/vite.config.ts; then
  echo "❌ transformMixedEsModules not enabled in vite.config.ts"
  exit 1
fi
```

### 3. Add ESM/CJS Type Check to TypeScript Validation

**Purpose:** Catch module system mismatches early

```typescript
// scripts/validate-module-system.ts (new script)
import fs from 'fs';
import path from 'path';

// Check shared/package.json doesn't have "type": "module"
const sharedPkg = JSON.parse(fs.readFileSync('shared/package.json', 'utf8'));
if (sharedPkg.type === 'module') {
  console.error('❌ shared/package.json has "type": "module" - breaks server!');
  process.exit(1);
}

// Check shared/tsconfig.json has module: CommonJS
const sharedTsconfig = JSON.parse(fs.readFileSync('shared/tsconfig.json', 'utf8'));
if (sharedTsconfig.compilerOptions.module !== 'CommonJS') {
  console.error('❌ shared/tsconfig.json module is not CommonJS');
  process.exit(1);
}

console.log('✅ Module system configuration is correct');
```

## Development Prevention Checklist

### When Adding New Exports to shared/

- [ ] Add to `shared/index.ts` as a barrel export
- [ ] Run `npm run build --workspace shared`
- [ ] If it's a subpath, add to `shared/package.json` exports
- [ ] Test in dev mode: `npm run dev`
- [ ] Test in tests: `npm run test:client`
- [ ] Check that TypeScript compilation passes: `npm run typecheck`
- [ ] Verify no "Cannot read property of undefined" errors in browser

### When Modifying vite.config.ts

- [ ] Verify `@rebuild/shared` is in `optimizeDeps.include`
- [ ] Verify `commonjsOptions.transformMixedEsModules` is true
- [ ] Verify `commonjsOptions.include` has `/shared\/dist/`
- [ ] Run dev server to test: `npm run dev:client`
- [ ] Run tests: `npm run test:client`

### When Modifying shared/package.json

- [ ] Ensure `"type": "module"` is NOT set
- [ ] All exports in `exports` field point to real files
- [ ] Added new export? Verify it compiles to dist/
- [ ] Run `npm run build --workspace shared`
- [ ] Verify TypeScript compilation passes: `npm run typecheck`

### When Modifying shared/tsconfig.json

- [ ] `module` must be `"CommonJS"`
- [ ] `moduleResolution` must be `"node"`
- [ ] Don't add browser-only files to `include`
- [ ] `config/browser.ts` should be in `exclude`

## Test Cases That Could Catch This

### 1. Module Resolution Integration Test

```typescript
// client/tests/module-resolution.test.ts
import { describe, it, expect } from 'vitest';

describe('Module Resolution', () => {
  it('should resolve @rebuild/shared main package', async () => {
    // This import should work in dev mode
    const shared = await import('@rebuild/shared');
    expect(shared).toBeDefined();
    expect(typeof shared.Restaurant).not.toBeUndefined();
  });

  it('should resolve @rebuild/shared subpaths', async () => {
    // Subpath imports should work
    const config = await import('@rebuild/shared/config');
    expect(config).toBeDefined();
  });

  it('should have all declared exports', async () => {
    const shared = await import('@rebuild/shared');

    // List of critical exports that must exist
    const requiredExports = [
      'Order',
      'MenuItem',
      'Table',
      'Restaurant',
      'ApiResponse',
    ];

    for (const exported of requiredExports) {
      expect(shared).toHaveProperty(exported,
        `Missing required export: ${exported}`);
    }
  });
});
```

### 2. Build Configuration Validation Test

```typescript
// scripts/test-vite-config.ts
import fs from 'fs';
import { fileURLToPath } from 'url';

const viteConfig = fs.readFileSync('client/vite.config.ts', 'utf8');

console.log('Validating Vite ESM/CJS configuration...');

const checks = [
  {
    name: '@rebuild/shared in optimizeDeps.include',
    pattern: /'@rebuild\/shared'/,
    required: true
  },
  {
    name: 'transformMixedEsModules enabled',
    pattern: /transformMixedEsModules:\s*true/,
    required: true
  },
  {
    name: 'shared dist in commonjsOptions.include',
    pattern: /\/shared\\\/dist/,
    required: true
  },
];

let passed = 0;
for (const check of checks) {
  if (check.pattern.test(viteConfig)) {
    console.log(`✅ ${check.name}`);
    passed++;
  } else if (check.required) {
    console.error(`❌ ${check.name}`);
    process.exit(1);
  }
}

console.log(`\nPassed: ${passed}/${checks.length}`);
```

### 3. Package.json Exports Sync Test

```typescript
// scripts/test-package-exports.ts
import fs from 'fs';
import path from 'path';

const pkg = JSON.parse(fs.readFileSync('shared/package.json', 'utf8'));
const indexTs = fs.readFileSync('shared/index.ts', 'utf8');

console.log('Validating shared package exports...');

// Check that exported subpaths exist
for (const exportPath of Object.keys(pkg.exports || {})) {
  if (exportPath === './*' || exportPath === '.') {
    continue; // Skip wildcard and main
  }

  const filePath = exportPath.replace(/^\.\//, '');
  const fullPath = path.join('shared', filePath);

  // Check if file exists (either .ts or .js or directory/index)
  const exists =
    fs.existsSync(fullPath + '.ts') ||
    fs.existsSync(fullPath + '.js') ||
    fs.existsSync(path.join(fullPath, 'index.ts')) ||
    fs.existsSync(path.join(fullPath, 'index.js'));

  if (!exists) {
    console.error(`❌ Export "${exportPath}" declared but not found`);
    process.exit(1);
  }
}

console.log('✅ All package exports validated');
```

## Decision Tree: New Export Troubleshooting

```
Import from @rebuild/shared fails?
│
├─ TypeScript error (won't compile)?
│  └─ Check: Is it exported from shared/index.ts?
│     └─ Add export statement to shared/index.ts
│
├─ Works in TypeScript, fails at runtime?
│  └─ Check: Is it a subpath import (e.g., @rebuild/shared/utils/foo)?
│     ├─ YES → Add to shared/package.json exports field
│     └─ NO → Use barrel import from @rebuild/shared
│
├─ Works in tests, fails in dev?
│  └─ Check: Is @rebuild/shared in vite.config.ts optimizeDeps.include?
│     └─ YES → Rebuild shared: npm run build --workspace shared
│
└─ Works in dev, fails in production build?
   └─ Check: Does dist/ have the exported file?
      └─ Run: npm run build --workspace shared
```

## Related Documentation

- **ADR-016:** [CommonJS Module System](../../explanation/architecture-decisions/ADR-016-module-system-commonjs.md)
- **Shared Package Exports:** [Barrel Imports Pattern](./shared-package-exports-barrel-imports.md)
- **Vite Documentation:** [CommonJS Interop](https://vitejs.dev/guide/dep-pre-bundling.html)
- **Node.js Packages:** [Package Entry Points](https://nodejs.org/api/packages.html)

## Key Principles

1. **Explicit is better than implicit:** All exports must be:
   - Listed in `shared/index.ts`
   - Listed in `shared/package.json` (if subpath)
   - In `optimizeDeps.include` (if main package)

2. **Compile-time vs Runtime:** TypeScript paths work at compile time, `package.json` exports work at runtime
   - Always test imports at runtime
   - Dev mode is the first place issues appear

3. **Configuration is documentation:** Vite config and package.json exports are contracts
   - Each tells a different system what's available
   - Mismatch between them causes silent failures

4. **Prevention beats debugging:** ESM/CJS issues are hard to debug
   - Add configuration checks to CI/CD
   - Document the decision (ADR-016) for future maintainers
   - Automate validation with test cases

---

**Last Updated:** 2026-01-01
**Related Issues:** ESM/CJS interop failures in dev mode, missing exports at runtime
**Prevention Impact:** Eliminates cryptic "Cannot read property" errors by catching configuration issues early

