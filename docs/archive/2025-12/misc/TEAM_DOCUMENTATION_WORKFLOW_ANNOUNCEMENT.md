# 📚 New Documentation Workflow - Team Announcement

**Date**: November 14, 2025
**Status**: Active
**Priority**: Medium (Read within 48 hours)

---

## 🎯 TL;DR (30 seconds)

We've **reorganized our documentation** and added **automated validation** to keep it clean going forward.

**What changed**:
- ✅ Root directory cleaned up (67 → 11 files)
- ✅ 60 old docs moved to organized archives
- ✅ Automated checks now run on every commit/PR
- ✅ New NPM scripts for validation

**What you need to do**:
- ✅ Read the "Quick Guidelines" section below (2 minutes)
- ✅ Optional: Run `npm run docs:validate` before committing docs

**Impact on you**: Minimal - just place new docs in the right directory!

---

## 📖 WHAT HAPPENED

### The Problem
Over time, our root directory accumulated 67 markdown files from various investigations, phases, and audits. This made it hard to:
- Find specific documentation
- Know what's current vs historical
- Maintain organization

### The Solution
We ran a cleanup script that:
- Moved 60 old files to organized archives
- Created 6 archive categories with navigation
- Set up automated validation to prevent re-accumulation
- Added helpful NPM scripts

### The Result
```
Before:
./
├── README.md
├── CONTRIBUTING.md
├── 65 other scattered .md files  ❌
└── docs/

After:
./
├── README.md
├── CONTRIBUTING.md
├── 9 other legitimate/recent files  ✅
└── docs/
    ├── [well-organized]
    └── archive/
        └── 2025-11/  [60 files organized by category]
```

---

## 🎓 QUICK GUIDELINES (Must Read)

### Rule 1: Place New Docs in Proper Directory

When creating documentation:

```bash
# ✅ GOOD - In docs/ subdirectory
docs/how-to/deployment/new-deployment-guide.md
docs/reference/api/new-endpoint-docs.md
docs/tutorials/getting-started-with-feature-x.md

# ❌ BAD - At root level
./new-deployment-guide.md
./new-feature-docs.md
```

**Where to put things**:
- **Tutorials** (learning-oriented) → `docs/tutorials/`
- **How-to guides** (goal-oriented) → `docs/how-to/`
- **Reference** (information-oriented) → `docs/reference/`
- **Explanations** (understanding-oriented) → `docs/explanation/`

---

### Rule 2: Add "Last Updated" Timestamp

All documentation should have a timestamp near the top:

```markdown
**Last Updated**: 2025-11-14

# Your Document Title
...
```

**Why**: Helps everyone know if docs are current
**When**: On creation and major updates
**Enforced**: Pre-commit hook checks for this

---

### Rule 3: Root Files Are OK... Temporarily

**Temporary root files are fine** for:
- Active investigation reports (< 7 days)
- Work-in-progress session summaries
- Current incident documentation

**Action required**: Archive when complete
```bash
# When investigation/phase is complete
npm run docs:cleanup
```

**Automated help**: GitHub Actions will remind you on PRs

---

### Rule 4: Use NPM Scripts

New helpful commands:

```bash
# Check if your docs follow standards
npm run docs:validate

# See if root cleanup is needed (safe preview)
npm run docs:cleanup:dry-run

# Run cleanup (moves old root files to archives)
npm run docs:cleanup
```

---

## 🤖 WHAT'S AUTOMATED NOW

### Pre-commit Hook ✅
**When**: Before every commit
**Checks**:
- Warns if adding root-level .md files
- Fails if > 15 root files (emergency brake)
- Checks "Last Updated" on modified docs
- Fast (< 1 second)

**How to skip** (emergencies only):
```bash
git commit --no-verify -m "emergency fix"
```

---

### GitHub Actions ✅
**When**: Every PR and push to main
**Checks**:
- Root-level file count (fails if > 3 old files)
- ARCHIVED banners in archive files
- "Last Updated" timestamps
- Broken internal links

**What you see**: Comments on PRs with actionable feedback

---

## 📁 NEW ARCHIVE STRUCTURE

Old documentation is now organized in `docs/archive/2025-11/`:

```
docs/archive/2025-11/
├── incidents/
│   └── jwt-scope-bug/           # JWT investigation (17 files)
├── phases/
│   └── p0.9-phase-2b/          # Phase 2B docs (11 files)
├── environment/                 # Environment audits (9 files)
├── deployment/                  # Deployment guides (8 files)
├── investigations/              # Various investigations (26 files)
└── voice-websocket/            # Voice/WS investigations (5 files)
```

Each directory has a `README.md` that lists all files with descriptions.

**To find archived docs**:
```bash
# Browse archives
ls docs/archive/2025-11/*/

# Search for specific file
find docs/archive -name "*jwt*"

# Read archive manifest
cat docs/archive/2025-11/incidents/jwt-scope-bug/README.md
```

---

## 🚀 COMMON WORKFLOWS

### Creating New Documentation

```bash
# 1. Create in appropriate directory
vim docs/how-to/deployment/my-new-guide.md

# 2. Add "Last Updated" timestamp
# **Last Updated**: 2025-11-14

# 3. Write documentation
# ...

# 4. Validate (optional but recommended)
npm run docs:validate

# 5. Commit
git add docs/how-to/deployment/my-new-guide.md
git commit -m "docs: add deployment guide for X"

# Pre-commit hook runs automatically ✅
```

---

### Working on Investigation/Bug Analysis

```bash
# 1. Create at root (OK for active work)
vim BUG_ANALYSIS_FEATURE_X.md

# 2. Work on investigation
# ... (keep at root while active, < 7 days)

# 3. When complete, archive it
npm run docs:cleanup

# Or manually move:
mkdir -p docs/archive/2025-11/investigations
mv BUG_ANALYSIS_FEATURE_X.md docs/archive/2025-11/investigations/

# 4. Add ARCHIVED banner (script does this automatically)
```

---

### Updating Existing Documentation

```bash
# 1. Make changes
vim docs/reference/api/authentication.md

# 2. Update timestamp
# **Last Updated**: 2025-11-14

# 3. Commit
git add docs/reference/api/authentication.md
git commit -m "docs: update auth endpoint docs"
```

---

### Finding Archived Documentation

```bash
# Search by name
find docs/archive -name "*auth*"

# Browse by category
ls docs/archive/2025-11/

# Read archive README
cat docs/archive/2025-11/incidents/jwt-scope-bug/README.md

# View file
cat docs/archive/2025-11/incidents/jwt-scope-bug/JWT_SCOPE_BUG_ROOT_CAUSE_ANALYSIS.md
```

---

## ❓ FAQ

### Q: Why did we do this?
**A**: 67 root-level files made finding docs difficult and indicated no archival process.

### Q: Will this affect my workflow?
**A**: Minimal impact. Just place new docs in `docs/` subdirectories instead of root.

### Q: What if I forget?
**A**: Pre-commit hook will warn you. GitHub Actions will comment on PRs.

### Q: Can I still put files at root?
**A**: Yes, for active work (< 7 days). Archive when done.

### Q: What if I need an archived file?
**A**: Check `docs/archive/2025-11/` - organized by category with README manifests.

### Q: What if validation fails my commit?
**A**: Follow the error message guidance. For emergencies: `git commit --no-verify`

### Q: Who maintains the archives?
**A**: Mostly automated. Weekly check: `npm run docs:cleanup:dry-run`

### Q: Can I disable the checks?
**A**: Yes, with `--no-verify`, but only for emergencies.

---

## 🎯 BENEFITS FOR YOU

### Before
- 😕 Hard to find relevant documentation
- 😕 Unclear what's current vs historical
- 😕 Root directory cluttered
- 😕 No way to know if docs are organized

### After
- ✅ Clear organization (Diátaxis framework)
- ✅ Easy to find docs (categorized archives)
- ✅ Automated validation (catches issues early)
- ✅ Clean workspace (root stays tidy)
- ✅ Historical context preserved (organized archives)

---

## 📚 RESOURCES

### Documentation
- **Setup Guide**: `docs/meta/DOCUMENTATION_CI_CD_SETUP.md`
  - Complete technical details
  - Troubleshooting
  - Customization options

- **Audit Report**: `docs/meta/DOCUMENTATION_AUDIT_2025-11-14.md`
  - Comprehensive system analysis
  - What was moved where
  - Long-term roadmap

- **Documentation Standards**: `docs/meta/DOCUMENTATION_STANDARDS.md`
  - Complete style guide
  - Naming conventions
  - Best practices

### Quick Commands
```bash
# Validate documentation
npm run docs:validate

# Preview cleanup (safe)
npm run docs:cleanup:dry-run

# Execute cleanup
npm run docs:cleanup

# Count root files
ls -1 *.md | wc -l
```

### Navigation
- **Main docs index**: `docs/README.md`
- **Archive index**: `docs/archive/README.md`
- **Archive 2025-11**: `docs/archive/2025-11/`

---

## 🤝 TEAM EXPECTATIONS

### Immediate (Next 2 days)
- ✅ Read this announcement
- ✅ Understand the 4 quick guidelines
- ✅ Try `npm run docs:validate` once

### Ongoing
- ✅ Place new docs in appropriate `docs/` subdirectory
- ✅ Add "Last Updated" to documentation
- ✅ Archive completed investigations (< 7 days at root)
- ✅ Run validation before committing docs (optional but helpful)

### Optional
- ✅ Install Husky hooks if not already: `npm install`
- ✅ Read full setup guide: `docs/meta/DOCUMENTATION_CI_CD_SETUP.md`

---

## 💬 FEEDBACK & QUESTIONS

### Having Issues?
1. Check `docs/meta/DOCUMENTATION_CI_CD_SETUP.md` troubleshooting section
2. Try `npm run docs:validate` to see specific errors
3. Ask in team chat (link to your Slack/Teams channel)

### Suggestions?
We want this workflow to help, not hinder! If you have ideas:
- Open a GitHub issue with label `documentation`
- Suggest in team meeting
- Update `docs/meta/DOCUMENTATION_STANDARDS.md` with a PR

### Found a Bug?
- GitHub Actions not working correctly? Check `.github/workflows/documentation-validation.yml`
- Pre-commit hook issues? Check `.husky/pre-commit`
- NPM scripts not working? Check `package.json` scripts section

---

## 📊 METRICS (Updated Monthly)

We'll track:
- Root-level file count (target: < 12)
- Archive organization (6 categories maintained)
- "Last Updated" compliance (target: > 90%)
- Team adoption (% using validation)

**Current Status**:
- ✅ Root files: 11 (target met)
- ✅ Archives: 6 categories organized
- ⏳ "Last Updated": Being measured
- ⏳ Team adoption: Starting now

---

## 🎉 THANK YOU

Thanks for adapting to this new workflow! This cleanup and automation will help us:
- Find documentation faster
- Maintain organization automatically
- Preserve historical context
- Scale as the team grows

**Questions?** Ask in #engineering (or your team channel)

**Issues?** Check troubleshooting docs or create a GitHub issue

**Improvements?** Pull requests welcome!

---

**Effective Date**: November 14, 2025
**Review Date**: December 14, 2025 (1 month)
**Document Status**: Active

---

*Documentation System Improvement Initiative*
*Part of Technical Roadmap Phase 0*
