# Documentation CI/CD Setup Guide

**Last Updated**: 2025-11-14
**Purpose**: Setup automated documentation validation to prevent root-level file accumulation
**Status**: Ready to implement

---

## 🎯 OVERVIEW

This guide sets up **automated documentation validation** to maintain your clean documentation system. After the initial cleanup (67 → 11 root files), this prevents re-accumulation.

### What Gets Automated

1. **GitHub Actions** - Validates documentation on every PR/push
2. **Pre-commit Hook** - Catches issues before committing
3. **NPM Scripts** - Easy local validation
4. **Weekly Reminders** - Scheduled archive automation (optional)

---

## 🚀 QUICK SETUP (5 minutes)

### Step 1: Enable GitHub Actions (Already Done ✅)

The workflow file is already created at `.github/workflows/documentation-validation.yml`

**What it does**:
- Runs on every PR and push to main
- Checks root-level file count
- Validates ARCHIVED banners
- Checks for "Last Updated" timestamps
- Reports broken internal links
- Comments on PRs if issues found

**Status**: ✅ Ready (will run on next PR/push)

---

### Step 2: Install Pre-commit Hook (Optional but Recommended)

#### Option A: Manual Installation (Recommended)
```bash
# Create symbolic link
ln -s ../../scripts/pre-commit-docs-check.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Test it
./git/hooks/pre-commit
```

#### Option B: Add to Existing Hook
If you already have a pre-commit hook:
```bash
# Add to your existing .git/hooks/pre-commit
echo "" >> .git/hooks/pre-commit
echo "# Documentation validation" >> .git/hooks/pre-commit
echo "./scripts/pre-commit-docs-check.sh" >> .git/hooks/pre-commit
```

**What it does**:
- Runs before each commit
- Warns about root-level .md files
- Checks for "Last Updated" timestamps
- Fast (< 1 second)
- Non-blocking (warnings only, fails only if > 15 root files)

---

### Step 3: Add NPM Scripts (Already Done ✅)

Add these to `package.json` scripts section:
```json
{
  "scripts": {
    "docs:validate": "./scripts/pre-commit-docs-check.sh",
    "docs:cleanup": "./scripts/cleanup-root-documentation.sh",
    "docs:cleanup:dry-run": "./scripts/cleanup-root-documentation.sh --dry-run"
  }
}
```

**Usage**:
```bash
# Validate documentation locally
npm run docs:validate

# Clean up root directory
npm run docs:cleanup

# Preview cleanup (safe)
npm run docs:cleanup:dry-run
```

---

## 📋 VALIDATION RULES

### Root-Level File Policy

**Allowed Files** (5 permanent):
- `README.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `index.md`
- `onward.md`

**Temporary Files** (up to 5, < 7 days):
- Investigation reports
- Session summaries
- Active work documentation

**Threshold**:
- Warning: > 10 files
- Error: > 15 files (blocks PR merge)

### Archive Requirements

All files in `docs/archive/` must have:
```markdown
# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on YYYY-MM-DD.
> For current documentation, see [docs/README.md](/docs/README.md)
> Category: [category-name]

---
```

### Active Documentation Requirements

All files in `docs/` (except archive/) should have:
```markdown
**Last Updated**: YYYY-MM-DD
```

Within the first 30 lines of the file.

---

## 🔍 WHAT GETS CHECKED

### GitHub Actions Workflow

**On Every PR/Push**:
1. ✅ Root-level file count (fails if > 3 old files)
2. ✅ ARCHIVED banners present
3. ✅ "Last Updated" timestamps
4. ✅ Broken internal links
5. ✅ Documentation quality report (in PR summary)

**Output**: Comments on PR with actionable feedback

---

### Pre-commit Hook

**Before Each Commit**:
1. ✅ Warns about new root-level .md files
2. ✅ Checks total root file count
3. ✅ Validates "Last Updated" in modified docs
4. ✅ Fast (< 1 second execution)

**Behavior**:
- Warnings: Allow commit but notify
- Errors: Block commit (only if > 15 root files)

---

## 🎛️ CUSTOMIZATION

### Adjust Thresholds

Edit `.github/workflows/documentation-validation.yml`:
```yaml
# Change from 3 to your preferred limit
if [ $count -gt 3 ]; then
```

Edit `scripts/pre-commit-docs-check.sh`:
```bash
# Change from 15 to your preferred limit
if [ $total_root_files -gt 15 ]; then
```

### Add Custom Checks

Add to the workflow file:
```yaml
- name: Custom validation
  run: |
    # Your custom checks here
```

### Disable for Specific Files

Add to `.gitattributes`:
```
# Skip validation for specific files
CHANGELOG.md -diff
```

---

## 🧪 TESTING

### Test Pre-commit Hook
```bash
# Create a test root-level file
echo "# Test" > TEST_FILE.md
git add TEST_FILE.md
git commit -m "test: documentation validation"

# Should see warning
# Clean up
rm TEST_FILE.md
```

### Test GitHub Actions
```bash
# Make a documentation change
echo "" >> docs/README.md
git add docs/README.md
git commit -m "docs: test CI/CD"
git push

# Check workflow at:
# https://github.com/your-org/your-repo/actions
```

### Test Cleanup Script
```bash
# Dry run (safe)
npm run docs:cleanup:dry-run

# See what would be moved
```

---

## 📊 MONITORING

### GitHub Actions Dashboard

View validation results:
```
https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/documentation-validation.yml
```

### Documentation Metrics

Generated in PR summaries:
- Total documentation files
- Root-level file count
- Archive file count
- Validation status

### Local Validation

Run anytime:
```bash
npm run docs:validate
```

---

## 🔄 WEEKLY MAINTENANCE (Optional)

### Setup Weekly Archive Automation

Create `.github/workflows/weekly-docs-cleanup.yml`:
```yaml
name: Weekly Documentation Cleanup

on:
  schedule:
    - cron: '0 2 * * 1'  # Every Monday at 2 AM
  workflow_dispatch:  # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run cleanup (dry run)
        run: |
          ./scripts/cleanup-root-documentation.sh --dry-run

      - name: Create issue if needed
        if: # Add condition based on file count
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Weekly Documentation Cleanup Needed',
              body: 'Root-level documentation files need archiving.',
              labels: ['documentation', 'maintenance']
            })
```

---

## ⚙️ NPM SCRIPTS REFERENCE

Add to `package.json`:
```json
{
  "scripts": {
    "docs:validate": "./scripts/pre-commit-docs-check.sh",
    "docs:cleanup": "./scripts/cleanup-root-documentation.sh",
    "docs:cleanup:dry-run": "./scripts/cleanup-root-documentation.sh --dry-run",
    "docs:check": "npm run docs:validate",
    "docs:lint": "npm run docs:validate"
  }
}
```

**Usage**:
```bash
# Before committing
npm run docs:check

# Periodic cleanup
npm run docs:cleanup:dry-run  # Preview
npm run docs:cleanup          # Execute

# Manual validation
npm run docs:validate
```

---

## 🐛 TROUBLESHOOTING

### Pre-commit Hook Not Running

```bash
# Check if executable
ls -l .git/hooks/pre-commit

# Make executable
chmod +x .git/hooks/pre-commit

# Verify symlink
ls -l .git/hooks/pre-commit
# Should show: .git/hooks/pre-commit -> ../../scripts/pre-commit-docs-check.sh
```

### GitHub Actions Not Running

1. Check workflow file syntax:
   ```bash
   # Install actionlint
   brew install actionlint  # macOS

   # Validate workflow
   actionlint .github/workflows/documentation-validation.yml
   ```

2. Check repository settings:
   - Settings → Actions → General
   - Ensure "Allow all actions" is enabled

3. Check workflow permissions:
   - Settings → Actions → General → Workflow permissions
   - Enable "Read and write permissions"

### False Positives

Edit validation scripts to exclude specific files:
```bash
# In pre-commit-docs-check.sh
LEGITIMATE_FILES+=(
    "YOUR_SPECIAL_FILE.md"
)
```

---

## 📈 SUCCESS METRICS

### After 1 Week
- ✅ No new root-level files committed (except temporary)
- ✅ All PRs pass documentation validation
- ✅ Team aware of documentation standards

### After 1 Month
- ✅ Root files remain < 15
- ✅ Archive organization maintained
- ✅ "Last Updated" compliance > 90%

### After 3 Months
- ✅ Documentation system self-maintaining
- ✅ No manual cleanup needed
- ✅ Team follows standards automatically

---

## 🎓 BEST PRACTICES

### For Developers

1. **Check before committing**:
   ```bash
   npm run docs:validate
   ```

2. **Place new docs in appropriate directory**:
   - Tutorials → `docs/tutorials/`
   - How-to guides → `docs/how-to/`
   - Reference → `docs/reference/`
   - Explanations → `docs/explanation/`

3. **Update timestamps**:
   ```markdown
   **Last Updated**: 2025-11-14
   ```

4. **For investigations**: Root is OK temporarily (< 7 days)

### For Maintainers

1. **Review documentation PRs** for:
   - Proper directory placement
   - "Last Updated" timestamps
   - Archive organization

2. **Run weekly checks**:
   ```bash
   npm run docs:cleanup:dry-run
   ```

3. **Monitor GitHub Actions** for validation failures

4. **Update standards** as needed in `docs/meta/DOCUMENTATION_STANDARDS.md`

---

## 🔗 RELATED DOCUMENTATION

- [Documentation Standards](DOCUMENTATION_STANDARDS.md)
- [Documentation Audit Report](DOCUMENTATION_AUDIT_2025-11-14.md)
- [Cleanup Script README](../../scripts/cleanup-root-documentation.sh)

---

## 📞 SUPPORT

### Issues with CI/CD?

1. Check workflow logs in GitHub Actions
2. Test locally with `npm run docs:validate`
3. Review this guide's troubleshooting section
4. Check `.github/workflows/documentation-validation.yml` syntax

### Need to Disable Temporarily?

```bash
# Skip pre-commit hook once
git commit --no-verify -m "your message"

# Disable GitHub Actions workflow
# Edit .github/workflows/documentation-validation.yml
# Comment out the workflow or add: if: false
```

---

**Setup Time**: 5 minutes
**Maintenance Time**: < 5 minutes/week
**Long-term Benefit**: Self-maintaining documentation system

---

*Documentation CI/CD System - November 2025*
*Part of Documentation System Audit Implementation*
