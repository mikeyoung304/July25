# Documentation Archive

This directory contains historical documentation preserved for reference and troubleshooting. All active documentation is in the parent `/docs` directory.

**Last Reviewed:** October 30, 2025

## Archive Organization

### `/archive/2025-10/` (Oct 15, 2025 consolidation)
Documentation consolidated during the Oct 15, 2025 documentation reorganization. These files contain rich operational content referenced via redirect stubs in active docs.

**Important Redirects:**
- `ORDER_FLOW.md` → Auth touchpoints merged into AUTHENTICATION_ARCHITECTURE.md, full guide preserved here (851 lines)
- `KDS-BIBLE.md` → Deployment essentials merged into DEPLOYMENT.md, operational guide preserved here (414 lines)
- `AGENTS.md` → Consolidated into canonical docs, archived version referenced for historical context
- `POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md` → Historical post-mortem referenced by active stub
- `PRODUCTION_DIAGNOSTICS.md` → Incident report referenced in DEPLOYMENT.md
- `MENU_SYSTEM.md` → Historical menu system documentation
- `WEBSOCKET_EVENTS.md` → WebSocket event catalog archived
- `SQUARE_INTEGRATION.md` → Square integration guide archived
- `MIGRATION_V6_AUTH.md` → V6 auth migration guide archived
- `VOICE_ORDERING_EXPLAINED.md` → Voice ordering explanation archived

**Retention Policy:** Keep indefinitely (referenced by redirect stubs in active documentation).

### `/archive/incidents/` (Historical post-mortems)
Post-mortem reports from production incidents. Valuable for pattern recognition and troubleshooting.

**Retention Policy:** Keep indefinitely (institutional knowledge).

### `/archive/` (Root level temporary files)
Various investigation reports, plans, and diagnostic files from specific dates. These are typically temporary documentation created during incident response or planning sessions.

**Examples:**
- `nextplan.md`, `oct18plan.md`, `oct23plan.md` - Dated planning documents
- `ORDER_FAILURE_INCIDENT_REPORT.md` - Incident reports
- `TEST_SUITE_*.md` - Test suite investigation reports
- `PAYMENT_*_DIAGNOSIS.md` - Payment system diagnostics

**Retention Policy:** Review quarterly, delete if incident resolved and lessons captured in permanent docs.

## What Belongs in Archive?

**✅ Keep:**
- Historical incident reports
- Post-mortems and retrospectives
- Previous version documentation (if significantly different)
- Deprecated feature documentation (with deprecation date)
- Investigation reports with valuable lessons
- Referenced operational guides (ORDER_FLOW, KDS-BIBLE)

**❌ Delete:**
- Exact duplicates of current documentation
- Outdated temporary files (plans, summaries from specific dates)
- Empty or stub files
- Files marked "COMPLETE" that have been fully merged
- Superseded documentation with no unique content

## How to Archive New Documentation

1. Add "ARCHIVED" banner to top of file:
   ```markdown
   > **⚠️ ARCHIVED DOCUMENTATION**
   > **Date Archived:** [Date]
   > **Reason:** [Why archived]
   > **See Instead:** [Link to replacement doc]
   > **This archive preserved for:** [What unique value it has]
   ```

2. Move to appropriate subdirectory:
   - `/archive/incidents/` for post-mortems
   - `/archive/YYYY-MM/` for dated consolidations
   - `/archive/` for temporary investigation docs

3. Update this README if creating new subdirectory

4. Create redirect stub in active docs if needed

## Searching Archives

Use grep to search across all archives:
```bash
grep -r "keyword" /docs/archive --include="*.md"
```

Search specific subdirectories:
```bash
# Search only incidents
grep -r "authentication" /docs/archive/incidents --include="*.md"

# Search moved docs
grep -r "order status" /docs/archive/moved --include="*.md"
```

## Archive Maintenance Schedule

- **Quarterly:** Review root-level temporary files, delete if resolved
- **Annually:** Review legacy-root and moved directories for obsolescence
- **Never Delete:** incidents/ directory (permanent institutional knowledge)

## Questions?

See [DOCUMENTATION_STANDARDS.md](../DOCUMENTATION_STANDARDS.md) for archiving policies.

## Archive Statistics

**Last Cleanup:** October 30, 2025

**Cleanup Summary:**
- Files deleted: 18 files (14 from legacy-root/, 4 from moved/)
- Lines removed: 1,621 lines
- Files retained: 44 files across 3 directories
- Current archive size: ~21,690 lines

**Retained Files Breakdown:**
- `2025-10/`: 10 files (4,808 lines) - Referenced operational guides
- `incidents/`: 7 files (2,265 lines) - Historical incident reports
- Root level: 27 files (14,617 lines) - Investigation reports and plans

**Organization Improvements:**
- Created date-based subdirectory structure (2025-10/)
- Added ARCHIVED banners to all preserved files with active redirects
- Updated 13+ redirect stubs to point to new locations
- Established clear retention policies for each subdirectory
