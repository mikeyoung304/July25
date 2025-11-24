# ADR-016: CommonJS Module System for Node.js Compatibility

**Status**: Accepted
**Date**: 2025-11-24
**Decision Makers**: Development Team

## Context

The Restaurant OS monorepo consists of three main packages:
- **client**: React/Vite application (browser environment)
- **server**: Node.js/Express backend
- **shared**: Types and utilities used by both

We encountered critical deployment failures when attempting to use ES Modules (ESM) across the entire codebase, particularly with the shared package that must work in both environments.

### The Problem

1. **Server Requirements**: The Node.js server uses CommonJS (`require()` statements)
2. **Client Features**: Browser-specific files use ESM features like `import.meta`
3. **TypeScript Complications**: ESM requires explicit `.js` extensions which TypeScript doesn't add by default
4. **Deployment Failures**: Mixed module formats caused:
   - `ERR_MODULE_NOT_FOUND` errors on Render (server)
   - Export resolution failures on Vercel (client)

## Decision

We will use **CommonJS as the primary module system** for the shared package, with special handling for ESM-only browser files.

### Implementation Details

1. **No `"type": "module"` in shared/package.json**
   - This ensures Node.js treats `.js` files as CommonJS
   - Prevents module resolution errors on the server

2. **TypeScript compiles to CommonJS**
   ```json
   {
     "module": "CommonJS",
     "moduleResolution": "node",
     "esModuleInterop": true
   }
   ```

3. **ESM-only files excluded from compilation**
   - Files using `import.meta` (like `config/browser.ts`) stay as TypeScript source
   - Vite handles TypeScript files directly during bundling

4. **Vite configured for CommonJS interop**
   - Enhanced `commonjsOptions` to transform shared modules
   - Shared packages included in `optimizeDeps` for proper handling

## Consequences

### Positive
- ✅ Both server and client deployments work reliably
- ✅ No module resolution errors in production
- ✅ Simplified build pipeline (one compilation target)
- ✅ Better compatibility with Node.js ecosystem

### Negative
- ❌ Cannot use modern ESM features in shared code
- ❌ Slightly larger bundle sizes (CommonJS overhead)
- ❌ Must maintain special handling for browser-specific ESM files

### Neutral
- Vite handles the CommonJS-to-ESM transformation transparently
- Development experience remains unchanged
- TypeScript provides modern syntax regardless of output format

## Alternatives Considered

1. **Pure ESM**: Would require converting entire server to ESM, breaking many dependencies
2. **Dual Package Build**: Too complex for our use case, increases maintenance burden
3. **Separate Packages**: Would duplicate code between server and client

## References

- [Node.js Modules Documentation](https://nodejs.org/api/modules.html)
- [Vite CommonJS Interop](https://vitejs.dev/guide/dep-pre-bundling.html)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- Related: [CL-BUILD-008](../../../claude-lessons3/05-build-deployment-issues/CL-BUILD-008-esm-commonjs-incompatibility.md)

## Review Notes

This decision should be revisited when:
- Node.js ESM support becomes more mature and widespread
- Our server dependencies fully support ESM
- We upgrade to a future version of Vite with different module handling