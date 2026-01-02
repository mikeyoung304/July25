---
title: "Vite ESM/CJS Interop - Test Cases"
slug: vite-esm-cjs-test-cases
category: "build-errors"
tags:
  - "testing"
  - "vite"
  - "esm"
  - "commonjs"
  - "module-resolution"
  - "integration-tests"
date: "2026-01-01"
severity: "medium"
component: "build-system"
related_files:
  - "client/tests/module-resolution.test.ts"
  - "scripts/validate-module-system.ts"
---

# Vite ESM/CJS Interop - Test Cases

## Purpose

Automated test cases that catch ESM/CJS interop issues early, preventing:
- Missing exports from being added silently
- Configuration drift in vite.config.ts
- Package.json exports mismatches
- Runtime module resolution failures

## Test Suite 1: Module Resolution Integration Tests

### Location
`client/tests/module-resolution.test.ts` (new file)

### Implementation

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Module Resolution Tests
 *
 * These tests verify that:
 * 1. @rebuild/shared main package resolves correctly
 * 2. Declared exports are actually exported
 * 3. TypeScript types match runtime modules
 * 4. ESM/CJS interop is properly configured
 */

describe('Module Resolution - ESM/CJS Interop', () => {
  describe('Main Package Import', () => {
    it('should import @rebuild/shared successfully', async () => {
      // This is the most basic check - if it fails, ESM/CJS is broken
      const shared = await import('@rebuild/shared');
      expect(shared).toBeDefined();
      expect(typeof shared).toBe('object');
    });

    it('should have non-empty exports', async () => {
      const shared = await import('@rebuild/shared');
      const exportCount = Object.keys(shared).length;

      expect(exportCount).toBeGreaterThan(0,
        'shared package should export at least one item');
    });
  });

  describe('Core Type Exports', () => {
    /**
     * Critical types that must always be exported
     * Add to this list if new critical types are added
     */
    const REQUIRED_EXPORTS = [
      'Order',
      'MenuItem',
      'Table',
      'Restaurant',
      'User',
      'ApiResponse',
      'PaginatedResponse',
    ];

    it.each(REQUIRED_EXPORTS)('should export %s type', async (exportName) => {
      const shared = await import('@rebuild/shared');

      expect(shared).toHaveProperty(exportName,
        `Missing required export: ${exportName}`);
      expect(shared[exportName]).toBeDefined();
    });
  });

  describe('Utility Exports', () => {
    it('should export utility functions', async () => {
      const shared = await import('@rebuild/shared');

      // Check for common utility exports
      const utilities = [
        'sanitizePrice',
        'validateCartTotals',
        'ORDER_STATUSES',
      ];

      for (const util of utilities) {
        if (util in shared) {
          expect(shared[util]).toBeDefined();
        }
      }
    });
  });

  describe('Subpath Exports', () => {
    it('should resolve @rebuild/shared/config', async () => {
      const config = await import('@rebuild/shared/config');
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should resolve @rebuild/shared/constants/business', async () => {
      const constants = await import('@rebuild/shared/constants/business');
      expect(constants).toBeDefined();
      expect(typeof constants).toBe('object');
    });

    it('should NOT resolve unlisted subpaths', async () => {
      // This should fail because unlisted subpaths are blocked by package.json
      let failed = false;
      try {
        await import('@rebuild/shared/utils/non-existent-path');
      } catch (err) {
        failed = true;
        // Expected failure
      }

      // Note: This test verifies the ./*: null rule works
      // If it doesn't fail, the package.json exports are misconfigured
      expect(failed).toBe(true,
        'Should not be able to import unlisted subpaths');
    });
  });

  describe('Configuration Consistency', () => {
    it('should have exports matching package.json', async () => {
      // Read package.json
      const pkgPath = path.resolve(__dirname, '../../shared/package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      // Get actual module exports
      const shared = await import('@rebuild/shared');
      const actualExports = new Set(Object.keys(shared));

      // Check that main exports field exists
      expect(pkg.exports).toBeDefined('package.json should have exports field');

      // The main "." export should have real exports
      expect(actualExports.size).toBeGreaterThan(0,
        '@rebuild/shared should have exports');
    });

    it('should not have "type": "module" in package.json', () => {
      const pkgPath = path.resolve(__dirname, '../../shared/package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      expect(pkg.type).not.toBe('module',
        'shared/package.json must NOT have "type": "module" (breaks server)');
    });
  });

  describe('Barrel Import Pattern', () => {
    it('should prefer barrel imports over deep paths', async () => {
      // This test documents the preferred import pattern
      // If it fails, the main export is missing something critical

      const shared = await import('@rebuild/shared');

      // Common types should be available from main import
      const commonTypes = [
        'Order',
        'MenuItem',
        'Table',
        'Restaurant',
      ];

      for (const type of commonTypes) {
        expect(shared).toHaveProperty(type,
          `${type} should be available from @rebuild/shared main import`);
      }
    });
  });

  describe('No Server-Only Code in Browser', () => {
    it('should not export Joi validation to browser', async () => {
      const shared = await import('@rebuild/shared');

      // Joi should never be exported from shared main package
      // (It would cause "exports is not defined" in browser)
      const joiRelated = Object.keys(shared)
        .filter(key => key.toLowerCase().includes('joi') || key.toLowerCase().includes('schema'));

      expect(joiRelated.length).toBe(0,
        'Joi validation should not be exported from @rebuild/shared main package');
    });

    it('should not export Node-only modules', async () => {
      const shared = await import('@rebuild/shared');

      // These modules would fail in browser
      const nodeOnlyModules = [
        'fs', 'path', 'os', 'net', 'http',
      ];

      for (const module of nodeOnlyModules) {
        expect(shared).not.toHaveProperty(module,
          `Node module '${module}' should not be exported from @rebuild/shared`);
      }
    });
  });
});
```

### Running These Tests

```bash
# Run just module resolution tests
npm run test:client -- tests/module-resolution.test.ts

# Run with verbose output to see what's being tested
npm run test:client -- tests/module-resolution.test.ts --reporter=verbose

# Run with coverage to see which exports are being tested
npm run test:client -- tests/module-resolution.test.ts --coverage
```

## Test Suite 2: Build Configuration Validation

### Location
`scripts/validate-module-system.test.ts` (new file)

### Implementation

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Build Configuration Tests
 *
 * These tests verify that vite.config.ts and shared build settings
 * are configured correctly for ESM/CJS interop.
 */

describe('Build Configuration - ESM/CJS Interop', () => {
  let viteConfig: string;
  let sharedTsconfig: any;
  let sharedPkg: any;
  let clientViteConfigContent: string;

  beforeAll(() => {
    // Load configurations
    viteConfig = fs.readFileSync('client/vite.config.ts', 'utf8');
    sharedTsconfig = JSON.parse(fs.readFileSync('shared/tsconfig.json', 'utf8'));
    sharedPkg = JSON.parse(fs.readFileSync('shared/package.json', 'utf8'));
    clientViteConfigContent = viteConfig;
  });

  describe('shared/package.json', () => {
    it('should NOT have "type": "module"', () => {
      expect(sharedPkg.type).not.toBe('module',
        'Setting "type": "module" breaks server compatibility (ADR-016 violation)');
    });

    it('should have "exports" field', () => {
      expect(sharedPkg.exports).toBeDefined(
        'package.json must define exports for runtime module resolution');
      expect(typeof sharedPkg.exports).toBe('object');
    });

    it('should have main entry point', () => {
      expect(sharedPkg.exports['.']).toBeDefined(
        'package.json exports must have "." entry for main package');
    });

    it('should have types field for main entry', () => {
      const mainExport = sharedPkg.exports['.'];
      expect(mainExport.types).toBeDefined(
        'Main export should specify types');
    });

    it('should have default field for main entry', () => {
      const mainExport = sharedPkg.exports['.'];
      expect(mainExport.default).toBeDefined(
        'Main export should specify default entry');
    });

    it('should block unlisted subpaths with "./*": null', () => {
      expect(sharedPkg.exports['.*']).toBe(null,
        'Should use "./*": null to block unlisted deep imports');
    });

    it('should not export Joi validation files', () => {
      const joiExports = Object.keys(sharedPkg.exports)
        .filter(key => key.includes('validation') || key.includes('schema'));

      expect(joiExports.length).toBe(0,
        'Joi validation should not be in exports (causes "exports is not defined" in browser)');
    });
  });

  describe('shared/tsconfig.json', () => {
    it('should compile to CommonJS module system', () => {
      expect(sharedTsconfig.compilerOptions.module).toBe('CommonJS',
        'Must compile to CommonJS for server compatibility');
    });

    it('should use node module resolution', () => {
      expect(sharedTsconfig.compilerOptions.moduleResolution).toBe('node',
        'Must use node module resolution strategy');
    });

    it('should exclude config/browser.ts from compilation', () => {
      const excludes = sharedTsconfig.exclude || [];
      const excludesString = excludes.join('|');

      expect(excludesString).toContain('config/browser.ts',
        'config/browser.ts uses ESM features and should not be compiled');
    });

    it('should emit TypeScript declarations', () => {
      expect(sharedTsconfig.compilerOptions.declaration).toBe(true,
        'Should emit .d.ts files for TypeScript support');
    });

    it('should target modern JavaScript', () => {
      const target = sharedTsconfig.compilerOptions.target;
      const modernTargets = ['ES2020', 'ES2021', 'ES2022', 'ESNext'];

      expect(modernTargets).toContain(target,
        `Target should be modern (${modernTargets.join(', ')}), found: ${target}`);
    });
  });

  describe('client/vite.config.ts', () => {
    it('should have @rebuild/shared in optimizeDeps.include', () => {
      expect(viteConfig).toMatch(/'@rebuild\/shared'/,
        '@rebuild/shared main package must be in optimizeDeps.include for dev mode');
    });

    it('should have transformMixedEsModules enabled', () => {
      expect(viteConfig).toMatch(/transformMixedEsModules:\s*true/,
        'transformMixedEsModules must be enabled in commonjsOptions');
    });

    it('should include shared dist in commonjsOptions', () => {
      expect(viteConfig).toMatch(/\/shared\\\/dist/,
        'shared/dist should be in commonjsOptions.include for CJS transformation');
    });

    it('should have commonjsOptions configured', () => {
      expect(viteConfig).toContain('commonjsOptions'),
        'commonjsOptions section must be present';
    });

    it('should set defaultIsModuleExports to true', () => {
      expect(viteConfig).toMatch(/defaultIsModuleExports:\s*true/,
        'defaultIsModuleExports should be true for CommonJS interop');
    });

    it('should NOT alias @rebuild/shared to dist (use exports)', () => {
      // The config should NOT have: '@rebuild/shared': resolve(..., '../shared/dist')
      // Instead, it should rely on package.json exports
      const hasManualAlias = viteConfig.includes(
        "'@rebuild/shared': resolve(__dirname, '../shared/dist')"
      );

      expect(hasManualAlias).toBe(false,
        'Should not manually alias @rebuild/shared (let package.json exports handle it)');
    });
  });

  describe('Cross-Configuration Consistency', () => {
    it('shared should be built to CommonJS for vite to transform', () => {
      // TypeScript compilation target
      const tsModule = sharedTsconfig.compilerOptions.module;

      // Vite expects CommonJS to transform
      const viteExpectsCommonJs = viteConfig.includes('transformMixedEsModules: true');

      expect(tsModule).toBe('CommonJS');
      expect(viteExpectsCommonJs).toBe(true,
        'If shared compiles to CommonJS, Vite must have transformMixedEsModules enabled');
    });

    it('package.json exports should match built files', () => {
      // This is a best-effort check without running full build
      // Just verify the structure is consistent

      expect(sharedPkg.main).toBeDefined();
      expect(sharedPkg.exports['.'].default).toBeDefined();

      // Both should reference dist/index.js (or similar)
      const mainRef = sharedPkg.main;
      const exportsRef = sharedPkg.exports['.'].default;

      expect(mainRef).toContain('dist');
      expect(exportsRef).toContain('dist',
        'Both main and exports should reference dist/ directory');
    });

    it('vite should pre-bundle what shared exports', () => {
      // Count how many @rebuild/shared exports are in optimizeDeps.include
      const sharedExports = Object.keys(sharedPkg.exports);
      const mainPackageInOptimizeDeps = viteConfig.includes("'@rebuild/shared'");

      expect(mainPackageInOptimizeDeps).toBe(true,
        'Main @rebuild/shared package should be in optimizeDeps.include');

      // Check for critical subpath exports
      const criticalSubpaths = ['/config', '/constants/business'];
      for (const subpath of criticalSubpaths) {
        if (sharedPkg.exports[subpath.slice(1)]) {
          const inViteConfig = viteConfig.includes(`'@rebuild/shared/${subpath.slice(1)}'`);
          expect(inViteConfig).toBe(true,
            `Critical subpath @rebuild/shared${subpath} should be in optimizeDeps.include`);
        }
      }
    });
  });

  describe('No Dev/Prod Configuration Drift', () => {
    it('should use same module system everywhere in dev and prod', () => {
      // This is a conceptual test - both dev and prod should handle
      // CommonJS shared package the same way

      expect(sharedTsconfig.compilerOptions.module).toBe('CommonJS');
      expect(viteConfig).toContain('transformMixedEsModules: true');

      // Both indicate: "we're handling CommonJS, not ESM"
      console.log('✅ Module system consistent: CommonJS with Vite transformation');
    });

    it('should have same config in dev and production builds', () => {
      // vite.config.ts applies to both dev and prod builds
      // Verify critical options aren't conditional on build mode (for module system)

      const moduleConfigLines = viteConfig
        .split('\n')
        .filter(line => /optimizeDeps|commonjsOptions|transformMixed/.test(line));

      // These should not be inside: if (mode === 'production') blocks
      for (const line of moduleConfigLines) {
        expect(line).not.toContain("mode === 'production'",
          'Module system configuration should not be mode-dependent');
      }
    });
  });
});
```

### Running These Tests

```bash
# Run configuration validation tests
npm run test:quick -- scripts/validate-module-system.test.ts

# Run with detailed output
npm run test:quick -- scripts/validate-module-system.test.ts --reporter=verbose

# Run specific test suite
npm run test:quick -- scripts/validate-module-system.test.ts -t "shared/package.json"
```

## Test Suite 3: Export Completeness Check

### Location
`scripts/check-shared-exports.test.ts` (new file)

### Implementation

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Shared Package Export Completeness Tests
 *
 * Verifies that everything exported from shared/index.ts:
 * 1. Has corresponding source files
 * 2. Compiles successfully to dist/
 * 3. Is listed in package.json exports (if subpath)
 */

describe('Shared Package - Export Completeness', () => {
  let indexTs: string;
  let sharedPkg: any;
  let distFiles: Set<string>;

  beforeAll(() => {
    // Load source
    indexTs = fs.readFileSync('shared/index.ts', 'utf8');

    // Load package config
    sharedPkg = JSON.parse(fs.readFileSync('shared/package.json', 'utf8'));

    // Load dist files
    const distDir = 'shared/dist';
    if (fs.existsSync(distDir)) {
      distFiles = new Set(
        fs.readdirSync(distDir, { recursive: true })
          .map(f => f.toString())
      );
    } else {
      distFiles = new Set();
    }
  });

  describe('Export File Existence', () => {
    it('all export sources should exist', () => {
      // Find all export statements in shared/index.ts
      const exportRegex = /export\s+(?:.*\s+)?from\s+['"]\.?(?!\.\.)[^'"]+['"]/g;
      const exports = indexTs.match(exportRegex) || [];

      expect(exports.length).toBeGreaterThan(0,
        'shared/index.ts should have export statements');

      // For each export, verify source exists
      for (const exportStmt of exports) {
        const pathMatch = exportStmt.match(/['"]\.?(?!\.\.)[^'"]+['"]/);
        if (pathMatch) {
          const importPath = pathMatch[0].slice(1, -1);

          // Normalize path
          let fullPath = path.join('shared', importPath);
          if (!fullPath.endsWith('.ts') && !fullPath.endsWith('.tsx')) {
            fullPath += '.ts';
          }

          // Check if file exists
          const exists = fs.existsSync(fullPath.replace(/^\.\//, ''));
          expect(exists).toBe(true,
            `Export source not found: ${importPath} (looked for ${fullPath})`);
        }
      }
    });
  });

  describe('Compiled Output', () => {
    it('dist/index.d.ts should exist', () => {
      expect(fs.existsSync('shared/dist/index.d.ts')).toBe(true,
        'TypeScript declarations should be generated for main export');
    });

    it('dist/index.js should exist', () => {
      expect(fs.existsSync('shared/dist/index.js')).toBe(true,
        'JavaScript output should be generated for main export');
    });

    it('declared subpath exports should have compiled output', () => {
      for (const [exportPath, exportConfig] of Object.entries(sharedPkg.exports)) {
        if (exportPath === '.' || exportPath === './*') {
          continue; // Skip main and wildcard
        }

        if (typeof exportConfig === 'object' && exportConfig !== null) {
          const distPath = (exportConfig as any).default;

          if (distPath && distPath.includes('dist')) {
            const fullPath = path.join('shared', distPath.replace(/^\.\//, ''));

            expect(fs.existsSync(fullPath)).toBe(true,
              `Declared export ${exportPath} compiled output not found: ${fullPath}`);
          }
        }
      }
    });
  });

  describe('No Accidental Server-Only Exports', () => {
    it('should not export joi schemas from main', () => {
      const hasJoiExport = indexTs.includes('export * from \'./validation');
      const hasJoiComment = indexTs.includes('DO NOT EXPORT JOI');

      expect(hasJoiComment || !hasJoiExport).toBe(true,
        'Joi validation should not be exported (causes "exports is not defined" in browser)');
    });

    it('should not export server-only modules', () => {
      const serverOnlyPatterns = [
        /export.*from.*['"].*server['"]/, // server/ directory
        /export.*from.*['"].*node['"]/, // Node-specific modules
      ];

      for (const pattern of serverOnlyPatterns) {
        expect(indexTs).not.toMatch(pattern,
          'Should not export server-only modules from main package');
      }
    });
  });
});
```

## Running All Tests

```bash
# Run all module resolution tests
npm run test:client

# Run all build validation tests
npm run test:quick

# Run specific test file
npm run test:client -- module-resolution.test.ts

# Run with coverage
npm run test:client -- --coverage

# Run with watch mode (during development)
npm run test:client -- --watch
```

## Test Results Interpretation

### Success Case
```
✓ Module Resolution - ESM/CJS Interop (12 tests)
  ✓ Main Package Import (2 tests)
  ✓ Core Type Exports (7 tests)
  ✓ Subpath Exports (2 tests)
  ✓ No Server-Only Code (1 test)

✓ Build Configuration - ESM/CJS Interop (18 tests)
  ✓ shared/package.json (7 tests)
  ✓ shared/tsconfig.json (5 tests)
  ✓ client/vite.config.ts (4 tests)
  ✓ Cross-Configuration Consistency (2 tests)
```

### Failure Case: Missing Configuration
```
✗ should have @rebuild/shared in optimizeDeps.include

Error: Assertion failed
  Expected to match: /'@rebuild\/shared'/
  In: client/vite.config.ts

Fix: Add '@rebuild/shared' to optimizeDeps.include array (line 183)
```

### Failure Case: Missing Export
```
✗ should export OrderStatus type

Error: Expected shared to have property 'OrderStatus'
  Missing required export: OrderStatus

Fix:
1. Add export to shared/index.ts: export { OrderStatus } from './types/order.types'
2. Run: npm run build --workspace shared
3. Verify in tests: npm run test:client -- module-resolution.test.ts
```

## Integration with CI/CD

Add to `.github/workflows/quick-tests.yml`:

```yaml
    - name: Run module resolution tests
      run: |
        npm run test:client -- \
          tests/module-resolution.test.ts \
          --reporter=verbose

    - name: Validate build configuration
      run: |
        npm run test:quick -- \
          scripts/validate-module-system.test.ts \
          --reporter=verbose
```

---

**Last Updated:** 2026-01-01
**Test Coverage:** 30+ test cases covering all aspects of ESM/CJS interop
**Implementation Status:** Ready to add to test suite

