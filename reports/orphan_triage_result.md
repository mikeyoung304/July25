# Orphan Triage Result — Phase 3

**Date**: 2025-10-15
**Branch**: docs/stragglers-sweep-v6.0.8
**Status**: ✅ MAJOR PROGRESS — 32 orphans → 18 (14 successfully indexed)

## Summary

Reorganized documentation index to point to canonical `docs/*` versions. Root-level files are legacy duplicates that should be archived in future cleanup.

**Before**: 32 orphaned files
**After**: 18 orphaned files (14 indexed, 18 require archival/cleanup)

## Actions Taken

### INDEXED (14 files added to index.md)

Restructured `index.md` into 7 clear sections:

#### 1. Core Documentation (4 files)
- docs/GETTING_STARTED.md
- docs/DEPLOYMENT.md (625 lines, canonical version)
- docs/ARCHITECTURE.md
- docs/DATABASE.md

#### 2. Security & Authentication (3 files)
- docs/SECURITY.md
- docs/AUTHENTICATION_ARCHITECTURE.md
- docs/MIGRATION_V6_AUTH.md

#### 3. Features & Integration (4 files)
- docs/SQUARE_INTEGRATION.md
- docs/WEBSOCKET_EVENTS.md
- docs/KDS-BIBLE.md
- server/src/voice/INTEGRATION.md

#### 4. Operational Guides (4 files)
- docs/PRODUCTION_STATUS.md
- docs/PRODUCTION_DIAGNOSTICS.md
- docs/TROUBLESHOOTING.md
- docs/ENVIRONMENT.md

#### 5. Development (4 files)
- docs/CONTRIBUTING.md
- docs/DOCUMENTATION_STANDARDS.md
- supabase/MIGRATION_GUIDE.md
- TESTING_CHECKLIST.md

#### 6. Incidents & Diagnostics (2 files)
- docs/POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md
- AUTH_DIAGNOSTIC_GUIDE.md

#### 7. Roadmap & Planning (3 files)
- docs/ROADMAP.md
- docs/strategy/KDS_STRATEGIC_PLAN_2025.md
- docs/CHANGELOG.md

Also updated version link: docs/VERSION.md

**Total indexed**: 24 files

## Remaining Orphans (18 files)

### Root-Level Duplicates (12 files) — ARCHIVE RECOMMENDED

These are older versions superseded by canonical `docs/*` files:

| Root File | Lines | Canonical Version | Lines | Action |
|-----------|-------|-------------------|-------|--------|
| ARCHITECTURE.md | ? | docs/ARCHITECTURE.md | ? | Archive root |
| AUTHENTICATION_ARCHITECTURE.md | ? | docs/AUTHENTICATION_ARCHITECTURE.md | ? | Archive root |
| CHANGELOG.md | ? | docs/CHANGELOG.md | ? | Archive root |
| DEPLOYMENT.md | 280 | docs/DEPLOYMENT.md | 625 | Archive root ✓ |
| ENVIRONMENT.md | ? | docs/ENVIRONMENT.md | ? | Archive root |
| GETTING_STARTED.md | ? | docs/GETTING_STARTED.md | ? | Archive root |
| KDS_ORDER_FLOW.md | ? | Merged into docs/KDS-BIBLE.md | ? | Archive |
| PRODUCTION_STATUS.md | ? | docs/PRODUCTION_STATUS.md | ? | Archive root |
| ROADMAP.md | ? | docs/ROADMAP.md | ? | Archive root |
| SECURITY.md | ? | docs/SECURITY.md | ? | Archive root |
| TROUBLESHOOTING.md | ? | docs/TROUBLESHOOTING.md | ? | Archive root |
| VERSION.md | ? | docs/VERSION.md | ? | Archive root |

**Confirmed**: `DEPLOYMENT.md` (root) is 280 lines vs `docs/DEPLOYMENT.md` (625 lines canonical)

### Kitchen-Specific Fix Docs (3 files) — ARCHIVE RECOMMENDED

Date-specific fix documentation, historical value only:

- KITCHEN_FIX_SUMMARY.md — Historical kitchen system fix notes
- KITCHEN_DISPLAY_UPGRADE.md — Dated KDS upgrade documentation
- client/src/modules/kitchen/PERFORMANCE-FIX.md — Code-adjacent fix documentation

### Meta/Internal Docs (2 files) — REVIEW NEEDED

- docs/index.md — Internal docs navigation (redundant with root index.md?)
- docs/README.md — Docs directory readme (may be useful for docs/ contributors)

### Misplaced Reports (1 file) — RELOCATE OR ARCHIVE

- server/src/routes/docs/reports/overnight/env_presence.md — Generated report in code tree

## Archival Policy (For Future Cleanup)

**Root-level duplicates**:
```bash
# Recommended archival (requires manual verification):
for file in ARCHITECTURE.md AUTHENTICATION_ARCHITECTURE.md CHANGELOG.md \
            DEPLOYMENT.md ENVIRONMENT.md GETTING_STARTED.md KDS_ORDER_FLOW.md \
            PRODUCTION_STATUS.md ROADMAP.md SECURITY.md TROUBLESHOOTING.md VERSION.md; do
  if [ -f "$file" ] && [ -f "docs/$file" ]; then
    echo "Archive: $file (canonical version in docs/)"
    # mv "$file" "docs/archive/legacy-root/$(date +%Y-%m-%d)_$file"
  fi
done
```

**Kitchen fix docs**:
```bash
# Archive dated fix documentation:
mv KITCHEN_FIX_SUMMARY.md docs/archive/incidents/
mv KITCHEN_DISPLAY_UPGRADE.md docs/archive/incidents/
mv client/src/modules/kitchen/PERFORMANCE-FIX.md docs/archive/incidents/
```

## Files Modified

- `index.md` — Complete restructure with 7 sections, 24 canonical docs linked

## Verification

```bash
pnpm docs:check | grep "ORPHAN:"
```

**Before**: 32 orphans
**After**: 18 orphans

**Breakdown**:
- ✅ 14 files successfully indexed
- ⚠️  12 root duplicates (need archival)
- ⚠️  3 kitchen fix docs (need archival)
- ⚠️  2 meta docs (review needed)
- ⚠️  1 misplaced report (relocate/archive)

## Next Steps

1. ✅ Phase 3 committed
2. → **Phase 4**: Reality Greps Calibration Check (evidence table)
3. → **Phase 5**: Re-validate (final docs:check)
4. Future cleanup: Archive remaining 18 orphans per archival policy above

---

**Generated**: 2025-10-15 (Docs Launch Orchestrator v6.0.8 — Phase 3)
