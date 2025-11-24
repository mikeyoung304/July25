# CL-BUILD-008: ESM/CommonJS Module Format Incompatibility

## Category
Build & Deployment Issues

## Problem Statement
Deployment failures on Render and/or Vercel due to incompatible module formats between ESM and CommonJS, particularly when the shared workspace package needs to work with both server (CommonJS) and client (ESM) environments.

## Error Signatures
```
# Render (Server) Errors:
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/opt/render/project/src/shared/dist/types/order.types' imported from /opt/render/project/src/shared/dist/index.js

# Vercel (Client) Errors:
"DEFAULT_TAX_RATE" is not exported by "../shared/dist/constants/business.js"

# TypeScript Compilation Errors:
error TS1343: The 'import.meta' meta-property is only allowed when the '--module' option is 'es2020', 'es2022', 'esnext'...
```

## Root Cause Analysis

### Primary Issue
The fundamental incompatibility between:
1. **Server requirements**: Node.js server uses CommonJS (`require()`)
2. **Client requirements**: Browser files use ESM features (`import.meta`)
3. **TypeScript defaults**: ESM compilation doesn't add `.js` extensions
4. **Package.json confusion**: `"type": "module"` affects how Node.js interprets files

### Contributing Factors
- TypeScript module resolution strategies differ between bundler and node
- Vite/Rollup has stricter module resolution than development mode
- CommonJS exports aren't automatically compatible with ESM imports
- Files using `import.meta` cannot be compiled to CommonJS

## Solution Pattern

### 1. Configure Shared Module as Pure CommonJS
```json
// shared/package.json
{
  "name": "@rebuild/shared",
  // DO NOT include: "type": "module"
  "main": "dist/index.js",
  "exports": {
    "./config/browser": {
      "types": "./config/browser.ts",  // Point to source
      "default": "./config/browser.ts"  // Vite handles TS directly
    }
  }
}
```

### 2. TypeScript Configuration
```json
// shared/tsconfig.json
{
  "compilerOptions": {
    "module": "CommonJS",        // Compile to CommonJS
    "moduleResolution": "node",   // Node resolution
    "esModuleInterop": true,      // Better interop
    "allowSyntheticDefaultImports": true
  },
  "exclude": [
    "config/browser.ts"  // Exclude ESM-only files
  ]
}
```

### 3. Handle ESM-Only Files Separately
```typescript
// shared/config/browser.ts
// This file uses import.meta and stays as TypeScript source
import * as configExports from '../dist/config/index.js';
export const { getConfig, validateConfig } = configExports;
```

### 4. Configure Vite for CommonJS Interop
```javascript
// client/vite.config.ts
export default {
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [
        /node_modules/,
        /shared\/dist/,  // Transform shared CommonJS
      ],
      defaultIsModuleExports: true
    }
  },
  optimizeDeps: {
    include: [
      '@rebuild/shared/constants/business',
      '@rebuild/shared/config'
    ],
    exclude: []  // Don't exclude workspace packages
  }
}
```

## Prevention Strategies

1. **Choose One Module System**: Prefer CommonJS for Node.js compatibility
2. **Isolate ESM Features**: Keep `import.meta` usage in separate files
3. **Test Both Environments**: Always test builds for both server and client
4. **Document Module Strategy**: Make module format decisions explicit in ADRs

## Related Patterns
- [CL-BUILD-001: Vite Build Memory Issues](./CL-BUILD-001-vite-memory-issues.md)
- [CL-BUILD-002: TypeScript Configuration](./CL-BUILD-002-typescript-config.md)

## Detection Commands
```bash
# Check for module type in package.json
grep '"type"' shared/package.json

# Verify CommonJS output
head -5 shared/dist/index.js  # Should show "use strict"

# Test builds
npm run build:vercel  # Client build
npm run build         # Server build
```

## Quick Fix Checklist
- [ ] Remove `"type": "module"` from shared/package.json
- [ ] Set TypeScript to compile to CommonJS
- [ ] Exclude ESM-only files from compilation
- [ ] Update Vite config for CommonJS interop
- [ ] Rebuild shared module: `cd shared && npm run build`
- [ ] Test both Vercel and Render builds locally

## Lesson Metadata
- **Date Created**: 2025-11-24
- **Last Updated**: 2025-11-24
- **Frequency**: High (5+ occurrences)
- **Impact**: Critical - Prevents all deployments
- **Time to Fix**: 30-60 minutes