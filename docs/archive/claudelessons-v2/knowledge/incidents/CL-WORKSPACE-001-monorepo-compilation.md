# CL-WORKSPACE-001: Monorepo Cross-Compilation Issues

## Pattern
Shared workspaces force compilation of incompatible code.

## Root Cause
```typescript
// shared/utils/index.ts exports everything
export * from './browser-stuff';  // Has window, document
export * from './server-stuff';   // Has fs, crypto

// Server tries to compile ALL exports
// Even with excludes in tsconfig!
```

## Why Excludes Don't Work
```json
// tsconfig.build.json
{
  "exclude": ["../shared/browser.ts"],  // DOESN'T WORK
  "include": ["../shared/**/*"]          // Forces compilation anyway
}
```

**Barrel exports bypass excludes!**

## The Fix
```typescript
// Option 1: Environment-specific exports
// shared/utils/index.server.ts
export * from './server-stuff';

// shared/utils/index.browser.ts
export * from './browser-stuff';
```

```json
// Option 2: Don't include shared in server build
{
  "include": ["src/**/*"],  // Only server source
  "exclude": ["../shared/**/*"]
}
```

## Detection
```bash
# Find cross-compilation issues
grep -r "window\|document\|fs\|crypto" shared/ | \
  awk -F: '{print $1}' | sort -u | \
  xargs -I {} sh -c 'echo "File: {}"; grep -l {} server/src/**/*.ts 2>/dev/null'
```

## Prevention
```javascript
// eslint-rule: no-mixed-environment-exports
module.exports = {
  create(context) {
    const browserAPIs = ['window', 'document', 'navigator'];
    const nodeAPIs = ['fs', 'crypto', 'process.env'];

    return {
      'ExportAllDeclaration': (node) => {
        // Flag barrel exports in shared/
        context.report({
          node,
          message: 'Avoid barrel exports in shared workspaces'
        });
      }
    };
  }
};
```

## Cost: 3 months of disabled TypeScript (skipLibCheck), 105 minutes per incident