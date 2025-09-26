# Documentation Cleanup Plan

## Current State Analysis

**156 markdown files** found in the project (excluding node_modules and archives).

### Major Issues Identified:

1. **Massive Redundancy**
   - 8 different deployment guides
   - 2 environment variable guides
   - 12 README files scattered across directories
   - 27 files mention deployment

2. **No Clear Structure**
   - Two separate reports directories (/reports/ and /docs/reports/)
   - Teaching/agent documentation mixed with core docs
   - Test artifacts in version control

3. **Outdated Content**
   - Version-specific docs (v6.0.4, v6.0.5, v6.0.6)
   - Date-stamped reports from 2025
   - Old forensics/debug files

4. **Not Following Best Practices**
   - No clear documentation hierarchy
   - No single source of truth
   - Conflicting information across files

## Proposed Documentation Structure

```
docs/
├── README.md                    # Main documentation index
├── GETTING_STARTED.md          # Quick start guide
├── DEPLOYMENT.md               # Single deployment guide
├── ENVIRONMENT.md              # Single env vars reference
├── ARCHITECTURE.md             # System architecture
├── CONTRIBUTING.md             # Developer guide
├── SECURITY.md                 # Security guidelines
├── api/                        # API documentation
│   └── README.md
├── guides/                     # How-to guides
│   ├── voice-ordering.md
│   ├── kitchen-display.md
│   └── troubleshooting.md
└── archive/                    # Old/historical docs
    └── 2025-09-25/            # Today's archive
```

## Files to Consolidate

### Deployment Documentation (8 files → 1 file)
- DEPLOYMENT.md (keep as base)
- DEPLOYMENT_GUIDE.md → merge into DEPLOYMENT.md
- DEPLOYMENT_CHECKLIST.md → merge as checklist section
- DEPLOY_RUNBOOK.md → merge as runbook section
- PRODUCTION_DEPLOYMENT_GUIDE.md → merge production section
- PRODUCTION_DEPLOYMENT_CHECKLIST.md → merge into checklist
- README_DEPLOY.md → merge quick deploy section
- VERCEL.md → keep separate as platform-specific

### Environment Variables (2 files → 1 file)
- ENVIRONMENT_VARIABLES.md (keep as base)
- ENVIRONMENT_VARIABLES_GUIDE.md → merge into above

### Architecture (multiple files → 1 file)
- ARCHITECTURE.md (keep as base)
- SYSTEM_ARCHITECTURE.md → merge into above
- docs/architecture/README.md → merge into above

## Files to Archive

### Old Versions & Reports
- CHANGELOG_v6.0.4.md
- MIGRATION_GUIDE_v6.0.4.md
- v6.0.4_RELEASE_SUMMARY.md
- SECURITY_AUDIT_v6.0.6.md
- SECURITY_FIXES_v6.0.5.md
- All date-stamped reports (*20250902.md, etc.)

### Debug/Forensics
- _forensics/ (entire directory)
- reports/BLACKLIGHT-*.md
- reports/eslint-server.txt
- reports/rls-status-verified.txt

### Teaching/Experimental
- docs/teaching/ (entire directory)
- docs/FOUR_HORSEMEN_*.md
- docs/HORSEMAN_*.md

### Old Reports
- reports/v2/ (entire directory)
- reports/v3/ (entire directory)
- docs/reports/overnight/
- docs/reports/dev/
- docs/reports/prod/
- docs/reports/scan/

## Files to Delete

### Test Artifacts (shouldn't be in git)
- test-results/ (entire directory - add to .gitignore)
- production (directory if exists)
- playwright.production.config.ts (if test-specific)

### Redundant READMEs
Keep only:
- /README.md (main)
- /docs/README.md (documentation index)
- /client/README.md (client-specific)
- /server/README.md (server-specific)
- /shared/README.md (shared-specific)

Delete:
- docs/api/README.md
- docs/api/websockets/README.md
- docs/architecture/README.md
- reports/README.md
- client/src/modules/voice/README.md

## Implementation Steps

### Phase 1: Create Archive Structure
```bash
mkdir -p docs/archive/2025-09-25/{old-reports,old-guides,old-versions,teaching,forensics}
```

### Phase 2: Archive Old Documentation
- Move versioned docs to old-versions/
- Move date-stamped reports to old-reports/
- Move teaching docs to teaching/
- Move forensics to forensics/

### Phase 3: Consolidate Core Docs
- Merge all deployment guides into one
- Merge environment variable guides
- Merge architecture docs
- Create single source of truth for each topic

### Phase 4: Clean Up
- Delete test-results/
- Update .gitignore
- Remove redundant READMEs
- Remove empty directories

### Phase 5: Create New Structure
- Organize remaining docs by category
- Create clear hierarchy
- Add proper cross-references

## Success Metrics

After cleanup:
- **< 30 documentation files** (from 156)
- **1 deployment guide** (from 8)
- **1 environment guide** (from 2)
- **5 README files max** (from 12)
- **Clear documentation hierarchy**
- **No conflicting information**
- **No test artifacts in git**

## Next Steps

1. Review this plan
2. Execute archiving (non-destructive)
3. Consolidate documentation
4. Update references
5. Commit changes