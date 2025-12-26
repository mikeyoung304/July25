# CI/CD Infrastructure Audit Report

**Date:** 2025-12-26
**Project:** rebuild-6.0 (Restaurant OS)
**Version:** 6.0.14

## Executive Summary

The rebuild-6.0 project has a mature CI/CD infrastructure with 17 GitHub workflow files, comprehensive pre-commit hooks, and dual deployment targets (Vercel for client, Render for server). Overall the infrastructure is well-designed, but there are several issues ranging from P1 (critical) to P3 (minor) that should be addressed.

| Category | P1 Issues | P2 Issues | P3 Issues |
|----------|-----------|-----------|-----------|
| Build System | 1 | 2 | 2 |
| CI/CD Workflows | 1 | 2 | 3 |
| Deploy Configuration | 0 | 2 | 1 |
| Repo Hygiene | 0 | 3 | 2 |

**Total: 2 P1 | 9 P2 | 8 P3**

---

## Build System Issues

### [Build System] - Non-existent script reference in deploy-with-validation.yml
- **Severity**: P1
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/.github/workflows/deploy-with-validation.yml:35`
- **Evidence**: Workflow references `npm run type-check` but the script is named `npm run typecheck` in package.json
- **Risk**: CI pipeline fails silently or with confusing error messages on deploy, blocking production deployments
- **Fix**: Change line 35 from `npm run type-check` to `npm run typecheck`

### [Build System] - Bundle budget script checks wrong directory
- **Severity**: P2
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/scripts/check-bundle-budget.mjs`
- **Evidence**: Script looks for `client/dist/js` (line 5) but actual build outputs to `client/dist/assets` (standard Vite output)
- **Risk**: Bundle budget check always fails in CI with "no main JS found" error
- **Fix**: Change `const clientDist = path.resolve('client/dist/js')` to `const clientDist = path.resolve('client/dist/assets')`

### [Build System] - TypeScript in dependencies instead of devDependencies (root)
- **Severity**: P2
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/package.json:179`
- **Evidence**: `typescript` is listed in dependencies: `"typescript": "^5.3.3"`
- **Risk**: Increases production bundle size, TypeScript should only be used at build time
- **Fix**: Move `typescript` from `dependencies` to `devDependencies`

### [Build System] - Vite plugin in root dependencies
- **Severity**: P3
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/package.json:181`
- **Evidence**: `@vitejs/plugin-react` is in root dependencies instead of devDependencies
- **Risk**: Unnecessary production dependency, bloats node_modules
- **Fix**: Move to devDependencies or remove (already in client/devDependencies)

### [Build System] - Duplicate dependencies across workspaces
- **Severity**: P3
- **Location**: Root `package.json` and `client/package.json`
- **Evidence**: `@vitejs/plugin-react`, `vite`, `zod` appear in both root and client
- **Risk**: Version drift, increased install time, potential conflicts
- **Fix**: Consolidate shared dependencies to root, use workspace protocol for internal references

---

## CI/CD Workflow Issues

### [CI/CD] - Security vulnerability in esbuild dependency
- **Severity**: P1
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/package-lock.json`
- **Evidence**: `npm audit` shows 2 moderate vulnerabilities in esbuild <=0.24.2 via vite
- **Risk**: Development server exposes sensitive data to any website that can send requests
- **Fix**: Upgrade vite to 6.2+ or apply `npm audit fix --force` (breaking change requires testing)

### [CI/CD] - Duplicate workflow coverage (gates.yml + quick-tests.yml)
- **Severity**: P2
- **Location**: `.github/workflows/gates.yml` and `.github/workflows/quick-tests.yml`
- **Evidence**: Both workflows run on same triggers (push/PR to main), both run tests with `npm run test:healthy`
- **Risk**: Wasted CI minutes, redundant checks, confusing results
- **Fix**: Consolidate into single workflow or differentiate triggers (e.g., quick-tests for drafts only)

### [CI/CD] - Missing caching in e2e-tests.yml for Playwright browsers
- **Severity**: P2
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/.github/workflows/e2e-tests.yml:60`
- **Evidence**: `npx playwright install --with-deps chromium` runs every time without caching
- **Risk**: E2E workflow takes 5-10 minutes extra for browser download on each run
- **Fix**: Add Playwright browser caching with hash of package-lock.json

### [CI/CD] - Outdated action versions in docs-validation.yml
- **Severity**: P3
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/.github/workflows/docs-validation.yml:216` and `:29`
- **Evidence**: Uses `actions/upload-artifact@v3` and `actions/setup-python@v4` instead of @v4 and @v5
- **Risk**: Potential deprecation warnings, missing security updates
- **Fix**: Update to `actions/upload-artifact@v4` and `actions/setup-python@v5`

### [CI/CD] - check-links.yml references non-existent path
- **Severity**: P3
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/.github/workflows/check-links.yml:9`
- **Evidence**: Path filter includes `nov18scan/**/*.md` which no longer exists (archived)
- **Risk**: Workflow runs unnecessarily on non-existent paths
- **Fix**: Remove `nov18scan/**/*.md` from paths list

### [CI/CD] - lint-staged configured but not used in pre-commit
- **Severity**: P3
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/package.json:148` and `.husky/pre-commit`
- **Evidence**: `lint-staged` is installed (^16.1.5) but pre-commit hook runs full workspace commands
- **Risk**: Pre-commit runs slower than necessary, lint-staged not utilized
- **Fix**: Configure lint-staged in package.json and use `npx lint-staged` in pre-commit for faster staged-only checks

---

## Deploy Configuration Issues

### [Deploy] - Vercel build command overrides may cause drift
- **Severity**: P2
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/vercel.json` and `.vercel/project.json`
- **Evidence**: vercel.json defines `buildCommand: npm run build:vercel` but project.json has `buildCommand: null`
- **Risk**: Local and CI builds may differ if Vercel dashboard settings override vercel.json
- **Fix**: Verify Vercel dashboard settings match vercel.json, or remove project.json overrides

### [Deploy] - Missing render.yaml configuration file
- **Severity**: P2
- **Location**: Root directory (file does not exist)
- **Evidence**: `.github/workflows/deploy-server-render.yml:8` references `render.yaml` in paths but file doesn't exist
- **Risk**: Render config not version controlled, infrastructure as code incomplete
- **Fix**: Create render.yaml with service configuration, or remove from workflow paths

### [Deploy] - .vercel directory contains local environment file
- **Severity**: P3
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/.vercel/.env.development.local`
- **Evidence**: `.vercel` contains `.env.development.local` with potential secrets
- **Risk**: Accidental commit of secrets, .gitignore only excludes `.vercel/*` but keeps `project.json`
- **Fix**: Ensure `.vercel/.env*` is in .gitignore and remove existing file if committed

---

## Repo Hygiene Issues

### [Hygiene] - .nvmrc specifies patch version (20.18.1) but engines allows any 20.x
- **Severity**: P2
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/.nvmrc` vs `package.json:172`
- **Evidence**: .nvmrc: `20.18.1`, package.json engines: `"node": "20.x"`
- **Risk**: Developers may use different patch versions than CI, leading to subtle inconsistencies
- **Fix**: Align to same specificity (either both `20.x` or both specific version)

### [Hygiene] - Husky version outdated (8.x vs 9.x)
- **Severity**: P2
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/package.json:147`
- **Evidence**: husky is at 8.0.0 but latest is 9.1.7
- **Risk**: Missing features and security updates, v9 has improved performance
- **Fix**: Upgrade to husky 9.x with updated init script

### [Hygiene] - Multiple major version outdated dependencies
- **Severity**: P2
- **Location**: Various package.json files
- **Evidence**:
  - `@prisma/client`: 6.19.1 vs 7.2.0 (major)
  - `express`: 4.22.1 vs 5.2.1 (major)
  - `vite`: 5.4.21 vs 6.x/7.x (major)
  - `date-fns`: 2.30.0 vs 4.1.0 (major)
- **Risk**: Missing features, security patches, eventual forced upgrade pain
- **Fix**: Plan major version upgrades with testing, especially express 4->5 migration

### [Hygiene] - Server TypeScript version misaligned with root
- **Severity**: P3
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/package.json:66`
- **Evidence**: Server has `typescript: 5.3.3` (fixed) while root has `^5.3.3` (range)
- **Risk**: TypeScript version drift between packages
- **Fix**: Use consistent versioning strategy across all package.json files

### [Hygiene] - @types packages in server dependencies instead of devDependencies
- **Severity**: P3
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/package.json:39-48`
- **Evidence**: Multiple @types packages listed under dependencies
- **Risk**: Type definitions shipped to production, increases install time
- **Fix**: Move all @types/* packages to devDependencies

---

## Recommendations Summary

### Immediate Actions (P1)
1. Fix `type-check` -> `typecheck` script reference in deploy-with-validation.yml
2. Address esbuild security vulnerability by upgrading vite or applying fix

### Short-Term (P2 - Within 2 Weeks)
1. Fix bundle budget script directory path
2. Move TypeScript to devDependencies
3. Consolidate duplicate workflows (gates.yml + quick-tests.yml)
4. Add Playwright browser caching
5. Create render.yaml or remove from workflow paths
6. Align .nvmrc and package.json engine versions
7. Upgrade husky to v9
8. Plan major dependency upgrades (especially express 5)

### Maintenance (P3 - As Time Permits)
1. Move Vite plugin to devDependencies
2. Consolidate duplicate workspace dependencies
3. Update outdated GitHub Action versions
4. Remove dead path references in check-links.yml
5. Implement lint-staged for faster pre-commit
6. Remove .env files from .vercel directory
7. Fix TypeScript version alignment
8. Move @types packages to devDependencies

---

## Current CI/CD Workflow Inventory

| Workflow | Trigger | Purpose | Status |
|----------|---------|---------|--------|
| gates.yml | push/PR to main | Quality gates (typecheck, lint, tests, build) | Active |
| quick-tests.yml | push/PR to main | Fast test suite (duplicate of gates) | Review |
| e2e-tests.yml | push/PR to main | Playwright E2E tests | Active |
| security.yml | push/PR, weekly | Security scans, CodeQL | Active |
| pr-validation.yml | PR (migrations) | Database migration validation | Active |
| migration-integration.yml | PR (migrations) | Full migration testing | Active |
| deploy-with-validation.yml | push to main | Full deploy pipeline | Has Issues |
| deploy-server-render.yml | push to main (server/*) | Render server deploy | Active |
| deploy-smoke.yml | push to main | Post-deploy health check | Active |
| vercel-guard.yml | push/PR to main | Vercel project verification | Active |
| drift-check.yml | daily schedule | Schema drift detection | Active |
| env-validation.yml | push/PR, weekly | Environment variable validation | Active |
| docs-validation.yml | push/PR (docs) | Documentation validation | Active |
| check-links.yml | push/PR (docs), weekly | Documentation link checker | Active |
| load-tests.yml | nightly schedule | k6 load testing | Active |
| worktree-maintenance.yml | weekly (Friday) | Cleanup worktrees/TODOs | Active |

---

## Pre-Commit Hook Summary

The pre-commit hook (`.husky/pre-commit`) performs:
1. Quick typecheck (`npm run typecheck:quick --workspaces`)
2. Lint (`npm run lint --workspaces --silent`)
3. Console.log detection (blocks if found in staged files)
4. GitHub Actions workflow validation (if workflow files changed)
5. Migration validation (RPC types, Prisma schema sync)
6. Documentation validation (root file count, orphan check)
7. Environment validation (if .env files changed)
8. Claude Lessons integration (advisory warnings)
9. Critical file protection (requires LESSONS_ACK=1 to commit)

The commit-msg hook runs commitlint for conventional commit enforcement.

---

*Report generated by Agent D2 - Build / CI-CD / Deploy / Repo Hygiene*
