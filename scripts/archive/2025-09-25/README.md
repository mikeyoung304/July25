# Archived Scripts - 2025-09-25

## Summary
This archive contains outdated scripts that were cleaned up from the codebase on September 25, 2025.

## Archived from Root Directory
- `final-eslint-fixes.sh` - One-time ESLint fix script
- `fix-remaining-eslint.sh` - One-time ESLint cleanup
- `fix-typescript-errors.sh` - One-time TypeScript fix
- `fix-unused-vars.sh` - One-time variable cleanup
- `fire.sh` - Unclear purpose, likely outdated
- `simulate-frontend.js` - Old testing/debug script

## Archived from scripts/ Directory

### Build & Analysis Scripts
- `analyze-bundle.ts` - Replaced by vite analyze
- `analyze-codebase.cjs` - Old analysis tool
- `check-bundle-size.js` - Old bundle checking
- `check-rls-status.cjs` - RLS checking (obsolete)
- `gen-code-analysis.ts` - Old analysis generator
- `generate-docs.ts` - Old documentation generator
- `integration-check.ts` - Old integration checker
- `optimize-images.cjs` - One-time image optimization

### Cleanup & Migration Scripts
- `cleanup-console-logs.js/ts` - One-time console cleanup
- `cleanup-kds-bloat.sh` - One-time KDS cleanup
- `fix-type-imports.js` - One-time import fixes
- `run-chip-monkey-migration.js` - Old migration
- `add-chip-monkey-shape.sql` - Old SQL migration
- `database-optimization.sql` - Old optimization script

### Data & Testing Scripts
- `create-practice-orders.js` - Test data generation
- `seed-database.ts` - Old seeding script
- `seed-demo-users.js` - Old demo user seeding
- `test-performance.js` - Old performance tests
- `add-placeholder-images.ts` - One-time placeholder addition
- `generate-blur-placeholders.js` - Old placeholder generator

### CI/Development Scripts
- `ci-echo-env.sh` - Unused CI script
- `ci-serve-local.sh` - Unused CI script
- `dev-setup.sh` - Old setup script
- `dump-supabase-schema.sh` - Old schema dumper
- `guard-shared-module.sh` - Old module guard
- `pre-commit-checks.sh` - Old pre-commit hooks
- `smoke.mjs` - Old smoke test
- `verify-tenancy-and-cache.cjs` - Old verification
- `debug-loading.mjs` - Old debug utility
- `check-app-render.mjs` - Unused app checking
- `diagram-ci.js` - CI documentation generator

### Archived Subdirectories
- `debug/` - Old debugging utilities
- `testing/` - Old testing scripts
- `deployment/` - Old deployment utilities
- `load-test/` - Old load testing scripts

## Scripts Kept (Still Active)
The following scripts remain in the main scripts/ directory as they are actively used:
- `vercel-deploy.sh` - Main deployment script
- `ci-guards.sh` - Used in CI workflows
- `puppeteer-test.mjs` - Used in CI testing
- `check-bundle-budget.mjs` - Used in gates workflow
- `eslint-freeze.cjs` - Used in ESLint freeze workflow
- `ts-freeze.cjs` - Used in TypeScript freeze workflow
- `dev-with-supabase.sh` - Used for local development
- `check-vercel-dirs.sh` - Recent Vercel checking utility
- `wait-for-health.sh` - Health check utility
- `forbidden-patterns.mjs` - Code quality checks

## Total Files Archived: 53