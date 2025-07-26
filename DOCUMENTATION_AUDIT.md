# Documentation Audit Report - 2025-07-26

## Critical Issues (Fix Immediately)
- [ ] Issue 1: Test count mismatch - Documentation claims 238 tests, actual is 46 (42 client + 4 server)
- [ ] Issue 2: Coverage mismatch - Documentation claims ~85% coverage, actual is ~24.8%
- [ ] Issue 3: ESLint warnings - Documentation claims 30 warnings, actual is 71 warnings

## Outdated Metrics (Update Values)
| Metric | Documented | Actual | Location |
|--------|------------|--------|----------|
| Tests  | 238        | 46     | README.md |
| ESLint | 30 warn    | 71 warn | README.md |
| TypeScript | 0 errors | 0 errors | README.md (✓) |
| Coverage | ~85% | ~24.8% | TEST_ARCHITECTURE.md |
| Docs count | 61→20 | 48 total | SYSTEM_STATE.md |

## Dead References (Delete or Update)
- `scripts/seed-menu-mapped.ts` referenced in README.md but doesn't exist
- `test.ts` referenced in README.md but doesn't exist
- Non-literal references to `Express.js` and `package.js` in README.md

## Architecture Findings
- ✓ No AI Gateway references in code
- ✓ No port 3002 references in code
- ✓ Root .env only (no subdirectory .env files)
- ✓ Voice ordering feature exists (12 files)
- ✓ Square payment integration exists (24 references)
- ✓ Menu ID mapper service exists
- ⚠️ Shared types pattern (@rebuild/shared) not being used despite documentation

## Stale Documentation (Archive)
- [ ] Any docs mentioning port 3002 in non-warning context
- [ ] Docs referencing old microservices architecture
- [ ] Docs mentioning Docker setup (if no longer used)

## Missing Documentation (Create)
- [ ] Actual shared types usage pattern
- [ ] Current test coverage improvement plan
- [ ] ESLint warning resolution guide

## Quick Fixes Script
```bash
# Update test count in README
sed -i '' 's/238 tests/46 tests/g' README.md

# Update ESLint warnings count
sed -i '' 's/30 warnings/71 warnings/g' README.md

# Update coverage in TEST_ARCHITECTURE.md
sed -i '' 's/~85%/~24.8%/g' TEST_ARCHITECTURE.md

# Remove dead file references
sed -i '' 's|scripts/seed-menu-mapped.ts|scripts/seed-menu.ts|g' README.md

# Create archive directory
mkdir -p docs/archive/2025-audit

# Find and list files to potentially archive
echo "Files to review for archival:"
grep -l "port.*3002" *.md | grep -v ARCHITECTURE.md | grep -v CONTRIBUTING_AI.md
```

## Summary
The codebase is following the unified backend architecture correctly (no port 3002 in code), but documentation contains significant metric discrepancies. The main issues are:
1. Test and coverage metrics are severely outdated
2. ESLint warning count has increased
3. Some file references are dead
4. Shared types pattern documented but not implemented as described