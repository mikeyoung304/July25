# Vite ESM/CJS Interop Prevention - Document Index

Complete prevention strategy for CommonJS/ESM module incompatibility in shared package.

## Quick Navigation

### 5-Minute Summary
Start here if you have an error → **[VITE_ESM_CJS_QUICK_REF.md](./VITE_ESM_CJS_QUICK_REF.md)**

Quick checklist, error patterns, common fixes

### 15-Minute Overview
Planning implementation → **[VITE_ESM_CJS_SUMMARY.md](./VITE_ESM_CJS_SUMMARY.md)**

Executive summary, 4-layer defense, roadmap, success criteria

### 30-Minute Deep Dive
Full understanding → **[vite-esm-cjs-interop-prevention.md](./vite-esm-cjs-interop-prevention.md)**

Root cause analysis, 5 prevention strategies, test cases, decision tree

### 1-Hour Implementation
Adding CI checks → **[vite-esm-cjs-ci-checklist.md](./vite-esm-cjs-ci-checklist.md)**

Phase 1-3 implementation with scripts, manual checklist, troubleshooting

### 2-Hour Test Implementation
Adding test suite → **[vite-esm-cjs-test-cases.md](./vite-esm-cjs-test-cases.md)**

30+ test cases across 3 test suites, integration with CI/CD

---

## Document Comparison

| Document | Purpose | Audience | Read Time | Use When |
|----------|---------|----------|-----------|----------|
| **QUICK_REF** | Cheat sheet & error patterns | All engineers | 5 min | You see an ESM/CJS error |
| **SUMMARY** | High-level overview & roadmap | Tech leads, architects | 15 min | Planning implementation |
| **PREVENTION** | Root cause & strategies | Senior engineers | 30 min | Deep understanding needed |
| **CI_CHECKLIST** | CI/CD implementation guide | DevOps, CI maintainers | 60 min | Adding CI checks |
| **TEST_CASES** | Test suite implementation | QA engineers | 60 min | Adding automated tests |

---

## The Problem (30 Seconds)

```
shared package = CommonJS (required for server)
client = ESM (Vite expectation)

When config is wrong:
dev mode fails → "exports is not defined"
tests fail → module resolution errors

Solution: 4-layer prevention system
```

---

## The Four Layers

### 1. Configuration (CRITICAL)
Files to check: `client/vite.config.ts`, `shared/package.json`
Prevention: Keep @rebuild/shared in optimizeDeps.include

### 2. Package Structure
Files to check: `shared/package.json` exports field
Prevention: Explicit allowlist with ./*: null rule

### 3. TypeScript Build
Files to check: `shared/tsconfig.json`
Prevention: module: "CommonJS", exclude browser files

### 4. Test Configuration
Files to check: `client/vitest.config.ts`
Prevention: Explicit aliases for browser config

---

## Implementation Roadmap

### Phase 0: Understand (Now)
- [ ] Read VITE_ESM_CJS_QUICK_REF.md (5 min)
- [ ] Read VITE_ESM_CJS_SUMMARY.md (15 min)
- [ ] Verify current config is correct

### Phase 1: CI Checks (Week 1)
- [ ] Follow vite-esm-cjs-ci-checklist.md Phase 1-2
- [ ] Add bash validation scripts
- [ ] Add to pr-validation.yml and quick-tests.yml
- [ ] Test on local branch

### Phase 2: Test Suite (Week 2)
- [ ] Follow vite-esm-cjs-test-cases.md
- [ ] Add 30+ test cases to client/tests/
- [ ] Integrate with CI/CD workflows
- [ ] Verify tests catch issues

### Phase 3: Documentation (Week 3)
- [ ] Add prevention pattern to CLAUDE.md
- [ ] Update team onboarding docs
- [ ] Set up pre-commit hooks
- [ ] Share QUICK_REF.md with team

### Phase 4: Maintenance (Ongoing)
- [ ] Monitor for ESM/CJS issues in PRs
- [ ] Monthly review of effectiveness
- [ ] Update docs if patterns change

---

## Key Files to Monitor

| File | What to Check | When |
|------|---------------|------|
| `client/vite.config.ts` | Lines 163-188 (optimizeDeps, commonjsOptions) | Every change to vite config |
| `shared/package.json` | Lines 7-33 (exports field) | Every new export added |
| `shared/index.ts` | All lines (barrel exports) | Every new type/utility added |
| `shared/tsconfig.json` | Lines 8-9, 18 (module, exclude) | TypeScript config changes |
| `client/vitest.config.ts` | Lines 10-15 (resolve aliases) | Test config changes |

---

## Prevention Checklist

### For Developers
- [ ] Adding new exports to shared?
  1. Add to shared/index.ts
  2. If subpath, add to shared/package.json
  3. If subpath, add to vite.config.ts optimizeDeps
  4. Run: npm run build --workspace shared
  5. Test: npm run test:client

### For Code Reviewers
- [ ] Check shared/package.json doesn't have "type": "module"
- [ ] Check shared/index.ts exports (no Joi)
- [ ] Check vite.config.ts has @rebuild/shared in optimizeDeps
- [ ] Check transformMixedEsModules is enabled
- [ ] If test failures, run: npm run build --workspace shared

### For CI/CD
- [ ] Validate module system config exists
- [ ] Verify all package exports have files
- [ ] Run module resolution tests
- [ ] Run build validation tests
- [ ] Check for export completeness

---

## Common Errors & Solutions

| Error | Root Cause | Solution |
|-------|-----------|----------|
| `exports is not defined` | Main package not in optimizeDeps | Add @rebuild/shared to vite.config.ts line 183 |
| `Cannot find module @rebuild/shared` | Import typo or missing alias | Check vitest.config.ts resolve aliases |
| `Property X of undefined` | Export missing from shared/index.ts | Add export statement to shared/index.ts |
| `Cannot import Joi in browser` | Server code exported from main | Remove from shared/index.ts (comment out) |
| `MODULE_NOT_FOUND` in tests | dist/ out of sync | Run npm run build --workspace shared |

---

## Emergency Response

### If you see "exports is not defined":

```bash
# Step 1: Check config
grep -n "@rebuild/shared" client/vite.config.ts

# Step 2: Rebuild shared
npm run build --workspace shared

# Step 3: Clear Vite cache
rm -rf client/.vite

# Step 4: Try again
npm run dev:client
```

### If tests fail at runtime:

```bash
# Step 1: Rebuild everything
npm run build --workspace shared
npm run build

# Step 2: Clear caches
rm -rf client/.vite node_modules/.vite

# Step 3: Run tests again
npm run test:client
```

### If CI checks fail:

```bash
# Step 1: Run validation locally
bash .github/scripts/validate-module-system.sh

# Step 2: Fix any issues reported

# Step 3: Rebuild and push
npm run build --workspace shared
git add .
git commit -m "fix: resolve ESM/CJS configuration drift"
```

---

## Related Architecture Decision

**ADR-016: CommonJS Module System for Node.js Compatibility**
- Why shared package uses CommonJS (not ESM)
- Why Vite must transform it
- Historical context and alternatives considered

---

## Documentation Status

| Document | Status | Last Updated | Completeness |
|----------|--------|--------------|--------------|
| QUICK_REF | ✅ Complete | 2026-01-01 | 100% |
| SUMMARY | ✅ Complete | 2026-01-01 | 100% |
| PREVENTION | ✅ Complete | 2026-01-01 | 100% |
| CI_CHECKLIST | ✅ Complete | 2026-01-01 | 100% |
| TEST_CASES | ✅ Complete | 2026-01-01 | 100% |

All documents are production-ready and can be shared with the team.

---

## File Locations

All documents are in: `/Users/mikeyoung/CODING/rebuild-6.0/docs/solutions/build-errors/`

| File | Full Path |
|------|-----------|
| Quick Reference | `docs/solutions/build-errors/VITE_ESM_CJS_QUICK_REF.md` |
| Summary | `docs/solutions/build-errors/VITE_ESM_CJS_SUMMARY.md` |
| Main Guide | `docs/solutions/build-errors/vite-esm-cjs-interop-prevention.md` |
| CI Implementation | `docs/solutions/build-errors/vite-esm-cjs-ci-checklist.md` |
| Test Cases | `docs/solutions/build-errors/vite-esm-cjs-test-cases.md` |
| This Index | `docs/solutions/build-errors/VITE_ESM_CJS_INDEX.md` |

---

## Next Steps

1. **Today**: Read VITE_ESM_CJS_QUICK_REF.md (5 min)
2. **This Week**: Review VITE_ESM_CJS_SUMMARY.md with team (15 min)
3. **Next Week**: Start Phase 1 implementation (add CI checks)
4. **Within 2 Weeks**: Complete Phase 1-2 (CI checks + tests)
5. **Within 4 Weeks**: Complete Phase 3-4 (docs + maintenance)

---

**Bookmark this index for quick navigation!**

For an even quicker reference, save: `/docs/solutions/build-errors/VITE_ESM_CJS_QUICK_REF.md`

