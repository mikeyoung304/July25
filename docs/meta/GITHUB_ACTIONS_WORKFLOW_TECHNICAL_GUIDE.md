# GitHub Actions Documentation Validation - Technical Guide

**Last Updated**: 2025-11-14
**Status**: Active
**Audience**: Technical team members, DevOps, maintainers

---

## Table of Contents

1. [Overview](#overview)
2. [Workflow Triggers](#workflow-triggers)
3. [Step-by-Step Breakdown](#step-by-step-breakdown)
4. [Output Interpretation](#output-interpretation)
5. [Customization Guide](#customization-guide)
6. [Troubleshooting](#troubleshooting)
7. [Example Runs](#example-runs)
8. [Performance & Cost](#performance--cost)

---

## Overview

### What This Workflow Does

The **Documentation Validation** workflow (`documentation-validation.yml`) is a GitHub Actions CI/CD pipeline that automatically validates documentation standards on every pull request and push to main. It enforces:

1. **Root-level file limits** (prevents documentation accumulation)
2. **ARCHIVED banners** (ensures archived docs are marked)
3. **Timestamp presence** (verifies "Last Updated" in active docs)
4. **Link integrity** (detects broken internal markdown links)

### When It Runs

- **Pull Requests**: When any `.md` file or `docs/` directory content changes
- **Push to Main**: After merge, validates main branch state
- **Workflow Changes**: When the workflow file itself is modified

### What Makes It Fail

The workflow **only fails** on one condition:
- ❌ **More than 3 old root-level .md files** (> 7 days old, excluding legitimate files)

All other issues generate **warnings** but allow the workflow to pass.

---

## Workflow Triggers

### File Location
```
.github/workflows/documentation-validation.yml
```

### Trigger Configuration

```yaml
on:
  pull_request:
    paths:
      - '**.md'           # Any markdown file anywhere
      - 'docs/**'         # Any file in docs directory
      - '.github/workflows/documentation-validation.yml'
  push:
    branches:
      - main
    paths:
      - '**.md'
      - 'docs/**'
```

**Key Points**:
- **Efficient**: Only runs when documentation actually changes
- **Self-monitoring**: Runs when you modify the workflow itself
- **Branch-specific**: Only validates `main` on push (not feature branches)

### Why These Paths?

- `**.md` - Catches root-level and nested markdown files
- `docs/**` - Catches non-markdown changes (images, etc.) in docs
- Workflow file - Validates workflow changes don't break validation

---

## Step-by-Step Breakdown

### Step 1: Checkout Code
```yaml
- name: Checkout code
  uses: actions/checkout@v4
```

**What it does**: Clones the repository to the GitHub Actions runner

**Why v4**: Latest version with improved performance and security

**No configuration needed**: Uses default checkout behavior (full history, default branch)

---

### Step 2: Setup Node.js
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
```

**What it does**: Installs Node.js 20.x on the runner

**Why Node 20**: Matches our `package.json` engine requirement

**Future-proofing**: When we add Node.js-based validation scripts (link checker, markdown linter), this is ready

---

### Step 3: Check Root-Level File Count

**Purpose**: Prevent root directory from accumulating documentation files

#### Algorithm

```bash
# 1. Define legitimate files (always allowed at root)
LEGITIMATE_FILES=(
  "README.md"
  "CONTRIBUTING.md"
  "SECURITY.md"
  "index.md"
  "onward.md"
)

# 2. Find all root-level .md files
all_files=$(find . -maxdepth 1 -name "*.md" -type f)

# 3. For each file:
#    - Check if it's in LEGITIMATE_FILES (skip if yes)
#    - Check file modification time (skip if < 7 days old)
#    - Count as "old file" if > 7 days and not legitimate

# 4. Fail if count > 3
```

#### Key Logic

**7-Day Grace Period**:
```bash
file_age=$(find "$file" -mtime +7 2>/dev/null | wc -l | tr -d ' ')
if [ "$file_age" -gt 0 ]; then
  # File is older than 7 days
  problem_files+=("$basename (> 7 days old)")
  count=$((count + 1))
fi
```

**Why 7 days?**: Allows temporary investigation docs at root without constant CI failures

**Threshold: 3 old files**:
```bash
if [ $count -gt 3 ]; then
  echo "::error::Too many old root-level files ($count). Maximum allowed: 3"
  exit 1
fi
```

**Why 3?**: Balance between strictness and flexibility for concurrent investigations

#### Output

**GITHUB_OUTPUT variable**:
```bash
echo "old_file_count=$count" >> $GITHUB_OUTPUT
```

This is captured as `steps.root-check.outputs.old_file_count` for later steps.

#### Warnings vs Errors

**Warnings** (1-3 old files):
```
::warning::Found 2 old root-level .md files that should be archived:
::warning::  - INVESTIGATION_XYZ.md (> 7 days old)
::warning::  - OLD_ANALYSIS.md (> 7 days old)
```

**Errors** (4+ old files):
```
::error::Too many old root-level files (5). Maximum allowed: 3
::error::Run './scripts/cleanup-root-documentation.sh' to fix
```

---

### Step 4: Check for ARCHIVED Banners

**Purpose**: Ensure all archived documentation has clear ARCHIVED banner at top

#### Algorithm

```bash
# 1. Find all markdown files in docs/archive/
for file in docs/archive/**/*.md; do
  # Skip README.md files (they're manifests, not archived docs)
  if [ "$(basename "$file")" != "README.md" ]; then

    # Check first 5 lines for "ARCHIVED" text
    if ! head -n 5 "$file" | grep -q "ARCHIVED"; then
      missing_banners+=("$file")
    fi
  fi
done

# 2. Report missing banners as warnings (doesn't fail)
```

#### What's an ARCHIVED Banner?

Our cleanup script adds this to the top of every archived file:

```markdown
# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> **Archive Date**: 2025-11-14
> **Original Location**: `./ORIGINAL_FILENAME.md`
> **Reason**: Investigation complete / Phase complete / etc.
>
> This documentation is preserved for historical reference.
> For current documentation, see:
> - [Main Documentation](../../README.md)
> - [Active Guides](../../how-to/)
```

#### Why Only a Warning?

**Rationale**: Missing banners don't break functionality, just reduce clarity. We warn rather than block to avoid friction when manually archiving.

#### Output Example

```
::warning::Found 2 archived files missing ARCHIVED banner
::warning::  - docs/archive/2025-11/investigations/OLD_FILE.md
::warning::  - docs/archive/2025-10/incidents/ANOTHER_FILE.md
```

---

### Step 5: Check Last Updated Timestamps

**Purpose**: Ensure active documentation has "Last Updated" or equivalent timestamp

#### Algorithm

```bash
# 1. Find all markdown files in docs/ (excluding archive and meta)
for file in docs/**/*.md; do
  # Skip archive and meta directories
  if [[ "$file" == *"/archive/"* ]] || [[ "$file" == *"/meta/"* ]]; then
    continue
  fi

  # Check first 30 lines for timestamp keywords
  if ! head -n 30 "$file" | grep -qi "Last Updated\|Last Modified\|Updated:"; then
    missing_timestamp+=("$file")
  fi
done

# 2. Report missing timestamps as warnings
```

#### Accepted Timestamp Formats

**Case-insensitive** (`-i` flag):
- `Last Updated: 2025-11-14`
- `**Last Updated**: 2025-11-14`
- `Last Modified: November 14, 2025`
- `Updated: 2025-11-14`

#### Why First 30 Lines?

**Rationale**: Timestamps are typically in the frontmatter or first section. Checking full file would be slow and unnecessary.

#### Why Only a Warning?

**Rationale**: Timestamp absence doesn't break docs, just makes it harder to know if they're current. Non-blocking to avoid friction during rapid doc creation.

#### Output Limiting

To avoid overwhelming output on large timestamp gaps:

```bash
# Only show first 10 files
if [ ${#missing_timestamp[@]} -gt 10 ]; then
  echo "::warning::  ... and $((${#missing_timestamp[@]} - 10)) more"
fi
```

**Why 10?**: Enough to understand scope without cluttering logs.

---

### Step 6: Check for Broken Internal Links

**Purpose**: Detect broken relative links in markdown files (e.g., `[link](../other-doc.md)`)

#### Algorithm

```bash
for file in docs/**/*.md; do
  # Extract markdown links using grep with Perl regex
  while IFS= read -r link; do
    # Skip external links (http/https)
    if [[ ! "$link" =~ ^https?:// ]]; then

      # Remove anchor (#section-name)
      link_path="${link%%#*}"

      # Get file's directory for relative resolution
      dir=$(dirname "$file")

      # Check if target exists (relative or absolute)
      if [ -n "$link_path" ] && [ ! -f "$dir/$link_path" ] && [ ! -f "$link_path" ]; then
        broken_links+=("$file -> $link_path")
      fi
    fi
  done < <(grep -oP '\]\(\K[^)]+' "$file" 2>/dev/null || true)
done
```

#### Link Extraction Regex

**Pattern**: `\]\(\K[^)]+`

**Breakdown**:
- `\]` - Matches closing bracket `]`
- `\(` - Matches opening parenthesis `(`
- `\K` - **Lookbehind**: Keeps only what follows (excludes `](` from output)
- `[^)]+` - Matches one or more non-`)` characters

**Example**:
```markdown
[Documentation](../README.md)
```
**Extracts**: `../README.md`

#### Why Skip External Links?

**Rationale**: Checking external HTTP links requires network requests:
- Slow (network latency)
- Unreliable (rate limits, temporary outages)
- Expensive (API quotas)

For external link checking, use a separate scheduled job or dedicated tool.

#### Why Only Show First 5?

```bash
if [ $count -lt 5 ]; then
  echo "::warning::  - $link"
fi
```

**Rationale**: If there are many broken links (e.g., after a reorganization), showing all would overwhelm logs. First 5 gives representative sample.

#### False Positives

**Known limitations**:
1. **Dynamic links**: `[link](${var}/path.md)` - Can't resolve variables
2. **Links to other repos**: `[link](../../other-repo/doc.md)` - May not exist in checkout
3. **Fragment-only links**: `[link](#section)` - Same-page anchors appear broken

**Mitigation**: These are warnings only, not failures. Review and ignore known false positives.

---

### Step 7: Documentation Quality Report

**Purpose**: Generate a summary for PR review or commit history

#### Always Runs

```yaml
if: always()
```

**Why**: Even if previous steps fail, we want to see the summary statistics.

#### Output Location

```bash
echo "## Documentation Quality Report" >> $GITHUB_STEP_SUMMARY
```

**GITHUB_STEP_SUMMARY**: Special GitHub Actions variable that displays markdown in the workflow run summary.

#### Metrics Collected

1. **Total documentation files**:
   ```bash
   total_docs=$(find docs -name "*.md" -type f | wc -l | tr -d ' ')
   ```

2. **Root-level markdown files**:
   ```bash
   root_files=$(find . -maxdepth 1 -name "*.md" -type f | wc -l | tr -d ' ')
   ```

3. **Archived files**:
   ```bash
   archive_files=$(find docs/archive -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
   ```

4. **Status check**:
   ```bash
   if [ "${{ steps.root-check.outputs.old_file_count }}" -gt 3 ]; then
     echo "- ❌ Too many old root-level files" >> $GITHUB_STEP_SUMMARY
   else
     echo "- ✅ Root-level file count acceptable" >> $GITHUB_STEP_SUMMARY
   fi
   ```

#### Example Output

```markdown
## Documentation Quality Report

- Total documentation files: 356
- Root-level markdown files: 11
- Archived files: 81

### Status
- ✅ Root-level file count acceptable
```

---

### Step 8: Comment on PR

**Purpose**: Provide actionable feedback directly on pull requests when validation fails

#### Trigger Conditions

```yaml
if: github.event_name == 'pull_request' && steps.root-check.outputs.old_file_count > 3
```

**Only runs when**:
1. Triggered by a pull request (not a push)
2. AND old file count > 3 (failure condition)

**Why not on push?**: No PR to comment on; commit history is sufficient

#### Comment Creation

Uses **GitHub Script Action** (v7):
```yaml
uses: actions/github-script@v7
```

**Why GitHub Script?**: Provides authenticated GitHub API access without manual token handling.

#### Comment Content

```markdown
## 📋 Documentation Validation Warning

Found **${count} old root-level .md files** that should be archived.

**Action Required**: Run the cleanup script to organize documentation:
```bash
./scripts/cleanup-root-documentation.sh
```

This will move old documentation to appropriate archive directories.

See [Documentation Standards](docs/meta/DOCUMENTATION_STANDARDS.md) for more information.
```

#### API Call

```javascript
github.rest.issues.createComment({
  issue_number: context.issue.number,
  owner: context.repo.owner,
  repo: context.repo.repo,
  body: `...`
})
```

**Why `issues.createComment`?**: In GitHub API, PRs are a type of issue.

---

## Output Interpretation

### GitHub Actions UI

#### Workflow Run Summary

**Location**: `Actions` tab → `Documentation Validation` workflow → Specific run

**What you'll see**:
```
✅ Validate Documentation Standards (passed in 23s)
   ✅ Checkout code
   ✅ Setup Node.js
   ✅ Check root-level file count
   ⚠️  Check for ARCHIVED banners (warnings)
   ⚠️  Check Last Updated timestamps (warnings)
   ⚠️  Check for broken internal links (warnings)
   ✅ Documentation quality report
   ⬜ Comment on PR (skipped)
```

#### Understanding Icons

- **✅ Green checkmark**: Step passed with no issues
- **⚠️ Yellow warning**: Step passed but generated warnings
- **❌ Red X**: Step failed (workflow fails)
- **⬜ Gray box**: Step skipped (conditions not met)

---

### Log Output

#### Warning Format

**GitHub Actions annotations**:
```
::warning file={file},line={line}::{message}
```

**Example**:
```
::warning::Found 2 old root-level .md files that should be archived:
::warning::  - INVESTIGATION_XYZ.md (> 7 days old)
```

**Where these appear**:
1. In the step logs (expandable section)
2. In the "Annotations" tab of the workflow run
3. In the PR "Files changed" view (if file-specific)

#### Error Format

```
::error::{message}
```

**Example**:
```
::error::Too many old root-level files (5). Maximum allowed: 3
::error::Run './scripts/cleanup-root-documentation.sh' to fix
```

**Result**: Step fails, workflow fails, PR check fails.

---

### PR Checks

#### Status Check Name

**Shows as**: `Validate Documentation Standards`

**States**:
- ✅ **Success**: All checks passed (warnings OK)
- ❌ **Failure**: Root file count > 3
- ⏳ **Pending**: Workflow running
- ⚪ **Skipped**: No documentation changes

#### Merge Blocking

**Default behavior**: Does NOT block merge (informational only)

**To require**: Go to Repository Settings → Branches → Branch protection rules → Add `Validate Documentation Standards` to required checks

---

## Customization Guide

### Adjusting Thresholds

#### Change Old File Threshold (Currently 3)

**File**: `.github/workflows/documentation-validation.yml`

**Line 80**:
```yaml
if [ $count -gt 3 ]; then
```

**To allow 5 old files**:
```yaml
if [ $count -gt 5 ]; then
```

**Also update line 199** (quality report):
```yaml
if [ "${{ steps.root-check.outputs.old_file_count }}" -gt 5 ]; then
```

**And line 206** (PR comment trigger):
```yaml
if: github.event_name == 'pull_request' && steps.root-check.outputs.old_file_count > 5
```

---

#### Change Grace Period (Currently 7 Days)

**Line 61**:
```bash
file_age=$(find "$file" -mtime +7 2>/dev/null | wc -l | tr -d ' ')
```

**To make it 14 days**:
```bash
file_age=$(find "$file" -mtime +14 2>/dev/null | wc -l | tr -d ' ')
```

**Explanation**: `-mtime +N` means "modified more than N days ago"

---

### Adding Legitimate Files

If you have a new file that should always be allowed at root:

**Line 34-40**:
```yaml
LEGITIMATE_FILES=(
  "README.md"
  "CONTRIBUTING.md"
  "SECURITY.md"
  "index.md"
  "onward.md"
  "YOUR_NEW_FILE.md"  # Add here
)
```

**Common additions**:
- `LICENSE.md` - License information
- `CHANGELOG.md` - Version history
- `CODE_OF_CONDUCT.md` - Community guidelines

---

### Making Warnings into Errors

To **fail** on missing timestamps (currently warnings):

**Line 106-138**: Add `exit 1` after reporting:

```bash
if [ ${#missing_timestamp[@]} -gt 0 ]; then
  echo "::error::Found ${#missing_timestamp[@]} documentation files missing 'Last Updated' timestamp"
  # ... output files ...
  exit 1  # Add this line
fi
```

**Trade-off**: Strictness vs friction. Warnings encourage compliance without blocking work.

---

### Excluding Directories

To **skip** a directory entirely:

**Example - Skip experimental docs**:

**Line 112**:
```bash
# Skip archive and specific directories
if [[ "$file" == *"/archive/"* ]] || [[ "$file" == *"/meta/"* ]] || [[ "$file" == *"/experimental/"* ]]; then
  continue
fi
```

---

### Adding New Checks

**Example - Check for code block language tags**:

```yaml
- name: Check code block language tags
  run: |
    missing_lang=()

    for file in docs/**/*.md; do
      # Find code blocks without language
      if grep -qP '```\n' "$file"; then
        missing_lang+=("$file")
      fi
    done

    if [ ${#missing_lang[@]} -gt 0 ]; then
      echo "::warning::Found ${#missing_lang[@]} files with untagged code blocks"
      for file in "${missing_lang[@]}"; do
        echo "::warning::  - $file"
      done
    fi
```

**Where to add**: Between Step 6 and Step 7, before the quality report.

---

## Troubleshooting

### Common Issues

#### Issue 1: Workflow Doesn't Run on PR

**Symptoms**:
- Created PR with .md changes
- Workflow doesn't appear in checks

**Possible causes**:

1. **Path filters don't match**:
   - Check if your changes are in `**.md` or `docs/**`
   - If in `.github/workflows/`, it will run

2. **Workflow file has syntax error**:
   - Go to `Actions` tab → Check for parsing errors
   - Validate YAML: `yamllint .github/workflows/documentation-validation.yml`

3. **Workflow disabled**:
   - Go to `Actions` tab → Check if workflow is listed
   - If not listed, check if `.github/workflows/` is gitignored

**Fix**:
```bash
# Test locally
cat .github/workflows/documentation-validation.yml | python -m yaml

# Check Actions tab for errors
# Re-enable workflow if disabled
```

---

#### Issue 2: False Positive on Broken Links

**Symptom**:
```
::warning::  - docs/guide.md -> ../other-repo/doc.md
```

**Cause**: Link targets file outside the repository or in submodule

**Fix options**:

1. **Exclude from check** (modify line 145):
   ```bash
   # Skip links starting with ../other-repo
   if [[ "$link" =~ ^\.\./other-repo/ ]]; then
     continue
   fi
   ```

2. **Convert to external link**:
   ```markdown
   [Link](https://github.com/org/other-repo/blob/main/doc.md)
   ```

3. **Ignore warning**: It's informational only, doesn't fail workflow

---

#### Issue 3: "File Older Than 7 Days" But It's Legitimate

**Scenario**: You have `ROADMAP.md` at root, legitimately belongs there, but it's > 7 days old.

**Fix**: Add to LEGITIMATE_FILES:

```yaml
LEGITIMATE_FILES=(
  "README.md"
  "CONTRIBUTING.md"
  "SECURITY.md"
  "index.md"
  "onward.md"
  "ROADMAP.md"  # Add this
)
```

**Commit and push** - workflow will pass on next run.

---

#### Issue 4: Workflow Takes Too Long

**Current runtime**: ~20-30 seconds

**If it exceeds 60 seconds**:

**Possible causes**:
1. **Large number of files**: Checking 1000+ markdown files
2. **Slow `find` commands**: Deep directory structure

**Optimizations**:

1. **Limit depth of search**:
   ```bash
   find docs -maxdepth 5 -name "*.md" -type f
   ```

2. **Parallelize checks** (advanced):
   ```bash
   find docs -name "*.md" -type f | xargs -P 4 -I {} bash -c 'check_file "$1"' _ {}
   ```

3. **Cache results** (if checking unchanged files):
   ```yaml
   - uses: actions/cache@v4
     with:
       path: .doc-check-cache
       key: docs-${{ hashFiles('docs/**') }}
   ```

---

#### Issue 5: PR Comment Posted Multiple Times

**Symptom**: Same comment appears 3-4 times on PR

**Cause**: Workflow re-runs (manual or automatic)

**Fix**: Add uniqueness check:

```yaml
- name: Comment on PR
  if: github.event_name == 'pull_request' && steps.root-check.outputs.old_file_count > 3
  uses: actions/github-script@v7
  with:
    script: |
      // Check if comment already exists
      const comments = await github.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number
      });

      const exists = comments.data.some(c =>
        c.body.includes('Documentation Validation Warning')
      );

      if (!exists) {
        await github.rest.issues.createComment({
          // ... create comment ...
        });
      }
```

---

## Example Runs

### Example 1: Clean Pass

**Scenario**: PR adds new documentation in proper directory

**Changes**:
- `docs/how-to/deployment/new-guide.md` (added)
- Includes "Last Updated: 2025-11-14"
- No root-level files added

**Workflow output**:
```
✅ Check root-level file count
   Found 0 old root-level .md files

✅ Check for ARCHIVED banners
   No missing banners

✅ Check Last Updated timestamps
   No missing timestamps

✅ Check for broken internal links
   No broken links found

✅ Documentation quality report
   - Total documentation files: 357
   - Root-level markdown files: 11
   - Archived files: 81
   - ✅ Root-level file count acceptable
```

**Result**: ✅ Workflow passes, PR check passes

---

### Example 2: Warnings But Pass

**Scenario**: PR updates existing doc, missing timestamp

**Changes**:
- `docs/reference/api/endpoints.md` (modified)
- No "Last Updated" added

**Workflow output**:
```
✅ Check root-level file count
   Found 0 old root-level .md files

✅ Check for ARCHIVED banners
   No missing banners

⚠️ Check Last Updated timestamps
   ::warning::Found 1 documentation files missing 'Last Updated' timestamp
   ::warning::  - docs/reference/api/endpoints.md

✅ Check for broken internal links
   No broken links found
```

**Result**: ✅ Workflow passes (warnings don't fail), reviewer sees warning

**Reviewer action**: Request contributor add timestamp before merge

---

### Example 3: Failure - Too Many Old Files

**Scenario**: Investigation complete, forgot to archive

**Root files**:
- `BUG_ANALYSIS_2025-10-15.md` (30 days old)
- `DATABASE_AUDIT_2025-10-20.md` (25 days old)
- `DEPLOYMENT_ISSUES_2025-10-25.md` (20 days old)
- `ROOT_CAUSE_ANALYSIS_2025-11-01.md` (13 days old)
- `INVESTIGATION_SUMMARY_2025-11-05.md` (9 days old)

**Workflow output**:
```
❌ Check root-level file count
   ::warning::Found 5 old root-level .md files that should be archived:
   ::warning::  - BUG_ANALYSIS_2025-10-15.md (> 7 days old)
   ::warning::  - DATABASE_AUDIT_2025-10-20.md (> 7 days old)
   ::warning::  - DEPLOYMENT_ISSUES_2025-10-25.md (> 7 days old)
   ::warning::  - ROOT_CAUSE_ANALYSIS_2025-11-01.md (> 7 days old)
   ::warning::  - INVESTIGATION_SUMMARY_2025-11-05.md (> 7 days old)
   ::error::Too many old root-level files (5). Maximum allowed: 3
   ::error::Run './scripts/cleanup-root-documentation.sh' to fix
```

**PR comment**:
```markdown
## 📋 Documentation Validation Warning

Found **5 old root-level .md files** that should be archived.

**Action Required**: Run the cleanup script to organize documentation:
```bash
./scripts/cleanup-root-documentation.sh
```
```

**Result**: ❌ Workflow fails, PR check fails, merge blocked (if required)

**Fix**:
```bash
# Run cleanup script
./scripts/cleanup-root-documentation.sh

# Review moved files
git status

# Commit cleanup
git add docs/archive/ .
git commit -m "docs: archive old investigation files"
git push
```

**New workflow run**: ✅ Passes

---

## Performance & Cost

### Runtime Analysis

**Typical run**: 20-30 seconds

**Breakdown**:
- Checkout: 3-5 seconds
- Node setup: 5-8 seconds
- Root check: 1-2 seconds
- ARCHIVED check: 2-3 seconds
- Timestamp check: 3-5 seconds
- Link check: 5-10 seconds (most expensive)
- Report generation: 1 second
- PR comment: 1-2 seconds (if triggered)

**Total**: ~25 seconds average

---

### Resource Usage

**Runner**: `ubuntu-latest` (free tier)

**Compute**:
- CPU: Minimal (bash commands, no compilation)
- Memory: < 100 MB
- Disk: ~200 MB (repository checkout)

**Network**:
- Download: ~50-100 MB (repository + actions)
- Upload: < 1 MB (logs)

---

### GitHub Actions Minutes

**Free tier**: 2,000 minutes/month (public repos: unlimited)

**Per run cost**: 0.5 minutes (30 seconds)

**Monthly usage estimate**:
- Average 10 PRs/week = 40 PRs/month
- 2 runs per PR (initial + fixes) = 80 runs
- 80 runs × 0.5 min = **40 minutes/month**

**Percentage of free tier**: 2% (negligible)

---

### Optimization Opportunities

If you need to reduce runtime:

1. **Skip Node setup** (if not using Node-based tools):
   ```yaml
   # Remove step 2 entirely
   # Saves 5-8 seconds
   ```

2. **Reduce link check depth**:
   ```bash
   # Only check docs/ root level
   find docs -maxdepth 2 -name "*.md"
   # Saves 3-5 seconds
   ```

3. **Parallel checks** (advanced):
   ```yaml
   strategy:
     matrix:
       check: [root, archived, timestamps, links]
   ```
   Run checks concurrently in separate jobs.
   Saves ~10 seconds but uses 4× minutes.

---

## Advanced Topics

### Integration with Other Tools

#### 1. Markdownlint

**Add linting step**:
```yaml
- name: Lint markdown
  run: |
    npm install -g markdownlint-cli
    markdownlint 'docs/**/*.md' --config .markdownlint.json
```

**Benefits**: Catch formatting issues, broken formatting

---

#### 2. External Link Checker

**Add scheduled check** (weekly, not on every PR):

```yaml
name: Weekly Link Check
on:
  schedule:
    - cron: '0 0 * * 0'  # Sunday midnight

jobs:
  check-links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: lycheeverse/lychee-action@v1
        with:
          args: 'docs/**/*.md'
```

**Why separate**: External checks are slow and rate-limited

---

#### 3. Documentation Preview

**Deploy on PR**:
```yaml
- name: Build docs site
  run: npm run docs:build

- name: Deploy preview
  uses: netlify/actions/cli@master
  with:
    args: deploy --dir=docs-dist --alias=pr-${{ github.event.number }}
```

**Benefits**: Visual review of changes

---

## Summary

### Key Takeaways

1. **One failure condition**: Only > 3 old root files fails workflow
2. **Everything else warns**: Encourages compliance without blocking
3. **Fast**: ~25 seconds, negligible cost
4. **Customizable**: Thresholds, checks, and behaviors easily adjusted
5. **Actionable**: PR comments guide contributors to fix issues

### Documentation Validation Philosophy

**Balance**:
- ✅ **Enforce** critical standards (file accumulation)
- ⚠️ **Encourage** best practices (timestamps, banners)
- 🔍 **Inform** about potential issues (broken links)

**Goal**: Maintain documentation quality without creating friction.

---

## Related Documentation

- [Team Workflow Announcement](./TEAM_DOCUMENTATION_WORKFLOW_ANNOUNCEMENT.md) - High-level overview for team
- [CI/CD Setup Guide](./DOCUMENTATION_CI_CD_SETUP.md) - Installation and configuration
- [Documentation Standards](./DOCUMENTATION_STANDARDS.md) - Style guide and conventions
- [Documentation Audit](./DOCUMENTATION_AUDIT_2025-11-14.md) - Comprehensive system analysis

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-11-14 | Initial creation | AI Documentation System |

---

**Maintained by**: Documentation working group
**Review cycle**: Quarterly
**Last review**: 2025-11-14
**Next review**: 2026-02-14
Test update Fri Nov 14 10:29:16 EST 2025
