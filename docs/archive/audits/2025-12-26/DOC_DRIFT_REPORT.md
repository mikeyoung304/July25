# Documentation Drift & System Audit Report

**Generated:** 2025-12-26
**Agent:** B3 - Documentation Drift & Doc System Audit
**Codebase:** rebuild-6.0 (Restaurant OS)

---

## Executive Summary

This audit analyzed **671+ markdown files** across the rebuild-6.0 documentation system. The documentation has grown organically and shows signs of significant drift, redundancy, and structural problems. While the core CLAUDE.md is well-maintained, the broader documentation ecosystem has accumulated technical debt.

### Key Findings

| Category | Count | Severity |
|----------|-------|----------|
| **Stale Documentation** | 12 | P1-P3 |
| **Conflicting Information** | 8 | P1-P2 |
| **Missing Documentation** | 5 | P2-P3 |
| **Broken Links** | Numerous | P2 |
| **Architectural Issues** | 6 | P2 |

### Documentation Health Score: 72% (Fair)

---

## P1 Critical Issues

### 1. Square vs Stripe Payment Documentation Conflict

**Files Affected:**
- `/Users/mikeyoung/CODING/rebuild-6.0/docs/reference/api/api/README.md` (line 267)
- `/Users/mikeyoung/CODING/rebuild-6.0/index.md` (lines 95-99)
- `/Users/mikeyoung/CODING/rebuild-6.0/docs/README.md` (line 164)
- 138+ files still reference "Square"

**Issue Type:** Conflicting | Stale
**Severity:** P1

**Evidence:**
- CLAUDE.md and .env.example correctly document Stripe as the payment provider
- API README.md references "SQUARE_API_SETUP.md" which does not exist
- index.md links to `docs/explanation/concepts/SQUARE_INTEGRATION.md` (does not exist)
- docs/README.md links to `docs/reference/api/api/SQUARE_API_SETUP.md` (does not exist)
- 138 files still contain Square references despite git commit `7df34c66` claiming "migrate Square references to Stripe"

**Code Truth:**
```
# From .env.example (correct):
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# From package.json (no Square SDK):
No @square/web-sdk or square dependency
```

**Fix Recommendation:**
1. Delete all Square documentation files from archive
2. Update docs/reference/api/api/README.md line 267 to reference STRIPE_API_SETUP.md
3. Update index.md lines 95-99 to reference Stripe documentation
4. Run `grep -r "Square" docs/ | wc -l` and systematically update remaining references
5. Verify all payment-related links resolve to Stripe docs

---

### 2. Version Number Inconsistencies

**Files Affected:**
- `/Users/mikeyoung/CODING/rebuild-6.0/package.json` - Version 6.0.14
- `/Users/mikeyoung/CODING/rebuild-6.0/docs/VERSION.md` - Claims 6.0.16
- `/Users/mikeyoung/CODING/rebuild-6.0/README.md` - Claims v6.0.17
- `/Users/mikeyoung/CODING/rebuild-6.0/docs/meta/SOURCE_OF_TRUTH.md` - Claims v6.0.14
- `/Users/mikeyoung/CODING/rebuild-6.0/docs/README.md` - Claims 6.0.14

**Issue Type:** Conflicting
**Severity:** P1

**Evidence:**
```json
// package.json (line 4):
"version": "6.0.14"

// README.md (line 1):
"# Grow App (Restaurant OS) - v6.0.17"

// docs/VERSION.md (line 12):
"| **Application** | 6.0.16 |"
```

**Code Truth:**
The package.json is the authoritative source. Version is 6.0.14.

**Fix Recommendation:**
1. Update README.md to v6.0.14
2. Update docs/VERSION.md to v6.0.14
3. Add CI check to validate version consistency across files
4. Consider using a single VERSION file that other docs reference

---

### 3. Test Count Inconsistencies

**Files Affected:**
- `/Users/mikeyoung/CODING/rebuild-6.0/CLAUDE.md` - Claims 1,672 tests (1,241 client + 431 server)
- `/Users/mikeyoung/CODING/rebuild-6.0/README.md` - Claims 430/431 tests passing
- `/Users/mikeyoung/CODING/rebuild-6.0/docs/meta/SOURCE_OF_TRUTH.md` - Claims 365+ tests, 164/165 server

**Issue Type:** Conflicting
**Severity:** P1

**Evidence:**
```
# CLAUDE.md:
Unit Tests: 1,672 passing (1,241 client + 431 server)

# README.md:
99.8% test pass rate (430/431 tests passing)

# SOURCE_OF_TRUTH.md:
Server: 99.4% pass rate (164/165 tests)
Client: 85%+ pass rate (365+ tests)
```

**Code Truth:**
Run `npm test` to get actual count. The numbers conflict significantly between documents.

**Fix Recommendation:**
1. Run `npm test` and document actual numbers
2. Update all three files with consistent, accurate numbers
3. Add test count to CI output and reference dynamically if possible

---

## P2 Significant Issues

### 4. Missing ADR-010 Documentation

**Files Affected:**
- `/Users/mikeyoung/CODING/rebuild-6.0/CLAUDE.md` (line 89) - References ADR-010
- `/Users/mikeyoung/CODING/rebuild-6.0/docs/explanation/architecture-decisions/` - No ADR-010 file

**Issue Type:** Missing
**Severity:** P2

**Evidence:**
```markdown
# CLAUDE.md line 89:
"#### 3. Remote-First Database (ADR-010)"
```

But no file exists at `docs/explanation/architecture-decisions/ADR-010-*.md`

**Code Truth:**
The ADR is referenced but was never created, or was deleted without updating references.

**Fix Recommendation:**
1. Create ADR-010-remote-first-database.md documenting the remote-first approach
2. Or update CLAUDE.md to remove the ADR-010 reference if not needed

---

### 5. Lessons Learned Index Drift

**Files Affected:**
- `/Users/mikeyoung/CODING/rebuild-6.0/.claude/lessons/README.md`
- Actual lesson files in `.claude/lessons/`

**Issue Type:** Stale
**Severity:** P2

**Evidence:**
The README.md claims 6 lessons but lists 14 entries in the table. Some referenced lessons exist, but:
- New lessons like `CL-TIMER-001` and `CL-TOOL-EXIT-001` appear in git status as uncommitted
- Prevention strategies are documented but not linked

**Code Truth:**
```bash
# Git status shows uncommitted lesson files:
?? .claude/lessons/CL-TIMER-001-stored-timeout-pattern.md
?? .claude/lessons/CL-TOOL-EXIT-001-command-exit-codes.md
?? .claude/lessons/PREVENTION_STRATEGIES_SUMMARY.md
```

**Fix Recommendation:**
1. Commit the new lesson files
2. Update README.md to accurately reflect all lessons (14 not 6)
3. Cross-reference with prevention strategies

---

### 6. Broken Documentation Links

**Files Affected:**
- Multiple files across docs/

**Issue Type:** Broken Link
**Severity:** P2

**Evidence:**
Link validation script found numerous broken internal links. Examples:
- `docs/reference/api/api/README.md` line 267 links to `SQUARE_API_SETUP.md` (doesn't exist)
- `index.md` line 95 links to `docs/explanation/concepts/SQUARE_INTEGRATION.md` (doesn't exist)
- `docs/README.md` line 52 links to `../api/README.md` with incorrect path

**Code Truth:**
The `python3 scripts/validate_links.py` script confirms link health at ~90.4%.

**Fix Recommendation:**
1. Run `python3 scripts/validate_links.py` and fix all broken links
2. Add link validation to CI pipeline
3. Remove or update references to deleted files

---

### 7. LICENSE Field Mismatch

**Files Affected:**
- `/Users/mikeyoung/CODING/rebuild-6.0/package.json` - Claims "PROPRIETARY"
- `/Users/mikeyoung/CODING/rebuild-6.0/README.md` - Claims "MIT"

**Issue Type:** Conflicting
**Severity:** P2

**Evidence:**
```json
// package.json line 173:
"license": "PROPRIETARY"

// README.md line 106:
"## License\nMIT"
```

**Code Truth:**
These are mutually exclusive licenses. Package.json typically holds authoritative info.

**Fix Recommendation:**
1. Determine actual license
2. Update conflicting file
3. Add LICENSE file to root if missing

---

### 8. Stale Last Updated Timestamps

**Files Affected:**
- `/Users/mikeyoung/CODING/rebuild-6.0/docs/README.md` - "Last Updated: 2025-11-01"
- `/Users/mikeyoung/CODING/rebuild-6.0/docs/meta/SOURCE_OF_TRUTH.md` - "Last Updated: 2025-10-30"
- `/Users/mikeyoung/CODING/rebuild-6.0/docs/VERSION.md` - "Last Updated: 2025-11-05"

**Issue Type:** Stale
**Severity:** P2

**Evidence:**
Current date is 2025-12-26. Documents haven't been updated in 1-2 months despite ongoing development (e.g., Stripe migration in recent commit).

**Code Truth:**
Git log shows commits as recent as December 2025.

**Fix Recommendation:**
1. Update Last Updated timestamps when making changes
2. Consider automating timestamp updates via pre-commit hook
3. Or remove manual timestamps entirely and rely on git history

---

## P3 Minor Issues

### 9. Archive Structure Inconsistency

**Files Affected:**
- `/Users/mikeyoung/CODING/rebuild-6.0/docs/archive/`

**Issue Type:** Bad Information Architecture
**Severity:** P3

**Evidence:**
Archive structure is inconsistent:
- `2025-10/` - Date-based
- `2025-11/` - Date-based
- `2025-12/` - Date-based
- `incidents/` - Topic-based
- `2025-01/` - Date-based but different pattern

Some subdirectories have README.md, others don't.

**Fix Recommendation:**
1. Standardize archive structure (prefer date-based with topic subdirs)
2. Add README.md to each archive folder explaining contents
3. Document archive retention policy

---

### 10. Duplicate Documentation Across Locations

**Files Affected:**
- Square integration docs appear in 3+ locations (archived)
- KDS documentation exists in archive and active docs
- Multiple post-mortem files with overlapping content

**Issue Type:** Redundancy
**Severity:** P3

**Evidence:**
```
docs/archive/2025-10/2025-10-15_SQUARE_INTEGRATION.md
docs/archive/2025-11/SQUARE_INTEGRATION.md
docs/archive/2025-11/SQUARE_API_SETUP.md
```

**Fix Recommendation:**
1. Consolidate to single authoritative location
2. Update archive to only contain truly historical versions
3. Remove redundant copies

---

### 11. No Root README.md Link to Documentation

**Files Affected:**
- `/Users/mikeyoung/CODING/rebuild-6.0/README.md`

**Issue Type:** Missing
**Severity:** P3

**Evidence:**
README.md links to `./index.md` for documentation but `index.md` is for GitHub Pages. Direct link to docs/README.md would be clearer.

**Fix Recommendation:**
1. Add direct link: "See [Documentation](./docs/README.md)"
2. Keep index.md for web but clarify purpose

---

### 12. Prevention Directory Fragmentation

**Files Affected:**
- `/Users/mikeyoung/CODING/rebuild-6.0/.claude/prevention/`
- `/Users/mikeyoung/CODING/rebuild-6.0/docs/prevention/`

**Issue Type:** Bad Information Architecture
**Severity:** P3

**Evidence:**
Prevention strategies are split between two locations:
- `.claude/prevention/` - 427 lines in README alone
- `docs/prevention/` - Referenced but separate

**Fix Recommendation:**
1. Consolidate prevention documentation to single location
2. Add cross-references if separation is intentional
3. Document the purpose of each location

---

## Proposed Documentation Information Architecture

### Recommended Structure (Diataxis Framework)

```
rebuild-6.0/
├── README.md                    # Project overview, quick start
├── CLAUDE.md                    # AI assistant instructions (keep as-is)
├── docs/
│   ├── README.md               # Documentation home, navigation
│   ├── tutorials/              # Learning-oriented
│   │   ├── GETTING_STARTED.md
│   │   └── first-order-flow.md
│   ├── how-to/                 # Task-oriented
│   │   ├── development/
│   │   ├── operations/
│   │   └── troubleshooting/
│   ├── reference/              # Information-oriented
│   │   ├── api/
│   │   ├── config/
│   │   └── schema/
│   ├── explanation/            # Understanding-oriented
│   │   ├── architecture/
│   │   ├── architecture-decisions/  # ADRs
│   │   └── concepts/
│   ├── meta/                   # Docs about docs
│   │   ├── SOURCE_OF_TRUTH.md
│   │   └── DOCUMENTATION_STANDARDS.md
│   └── archive/                # Historical only
│       └── YYYY-MM/            # Date-based archival
├── .claude/
│   ├── lessons/                # Codified incident lessons
│   ├── prevention/             # Prevention strategies
│   ├── solutions/              # Problem solutions
│   └── commands/               # Custom commands
└── plans/                      # Feature/work plans (temporary)
```

### Key IA Recommendations

1. **Single Source of Truth**: Each topic should have ONE authoritative document
2. **Clear Hierarchy**: tutorials > how-to > reference > explanation
3. **Archive Policy**: Documents > 6 months old go to archive unless still referenced
4. **Version Management**: Single VERSION.md, other docs link to it
5. **Link Validation**: Run validation in CI, block merges with broken links
6. **Timestamp Automation**: Use git-based timestamps or remove manual ones

---

## Action Items Summary

### Immediate (This Week)

| Priority | Item | Effort |
|----------|------|--------|
| P1 | Fix Square -> Stripe documentation links | 2 hours |
| P1 | Align version numbers to 6.0.14 | 30 min |
| P1 | Update test count documentation | 1 hour |
| P2 | Create ADR-010 or remove references | 1 hour |
| P2 | Commit uncommitted lesson files | 15 min |

### Short-term (This Month)

| Priority | Item | Effort |
|----------|------|--------|
| P2 | Fix all broken links from validation script | 4 hours |
| P2 | Resolve license conflict | 30 min |
| P2 | Update stale timestamps | 1 hour |
| P3 | Standardize archive structure | 2 hours |
| P3 | Remove duplicate documentation | 3 hours |

### Long-term (This Quarter)

| Priority | Item | Effort |
|----------|------|--------|
| P3 | Consolidate prevention directories | 4 hours |
| P3 | Implement automated timestamp updates | 2 hours |
| P3 | Add link validation to CI | 2 hours |
| P3 | Create missing tutorials | 8 hours |

---

## Metrics for Ongoing Monitoring

1. **Link Health**: Target 99%+ (currently ~90.4%)
2. **Version Consistency**: All docs should reference VERSION.md
3. **Timestamp Freshness**: No doc > 3 months without update
4. **Archive Ratio**: Active docs should outnumber archived 3:1
5. **Broken Reference Count**: Zero tolerance for 404s

---

**Report Generated By:** Agent B3 - Documentation Drift Audit
**Next Review Recommended:** 2025-01-26 (1 month)
