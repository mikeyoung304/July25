# Pre-commit Hook console.log Check False Positive (BSD xargs)

---
title: Pre-commit hook console.log check failing on markdown-only commits
category: build-errors
tags: [hooks, pre-commit, xargs, macos, bsd, false-positive, grep]
severity: medium
component: .husky/pre-commit
date: 2024-12-04
resolution_commit: 9f6ec256
---

## Problem Statement

The pre-commit hook was failing with false positives when no JavaScript/TypeScript files were staged, blocking commits even when no `console.log` statements were present in the actual staged files.

**Symptom:** Hook fails with "console.log or console.debug found in staged files!" even when staging only `.md` files.

**Impact:**
- Developer workflow friction
- Forced use of `--no-verify` workaround
- Reduced confidence in pre-commit checks
- macOS-specific (BSD xargs behavior)

## Root Cause

**Location:** `.husky/pre-commit` line 16

**Original Code:**
```bash
if git diff --cached --name-only | grep -E '\.(js|jsx|ts|tsx)$' | xargs grep -l 'console\.\(log\|debug\)' 2>/dev/null; then
```

**Technical Breakdown:**

1. When no JS/TS files are staged, `grep -E '\.(js|jsx|ts|tsx)$'` outputs nothing
2. BSD xargs (macOS) runs the command even with empty input (unlike GNU xargs `-r`)
3. `grep -l` with no file arguments reads from **stdin**
4. If stdin contains "console.log" (from environment/npm metadata), grep matches
5. The `if` condition passes incorrectly → false positive error

**Key Insight:** BSD vs GNU xargs handle empty input differently:
- **GNU xargs:** Has `-r` flag to skip execution with empty input
- **BSD xargs:** `-r` is a no-op; always runs the command

## Solution

**Fixed Code:**
```bash
# Check for console.log statements (Per Technical Roadmap Phase 0)
echo "[husky] Checking for console.log statements..."
JS_FILES=$(git diff --cached --name-only | grep -E '\.(js|jsx|ts|tsx)$' || true)
if [ -n "$JS_FILES" ]; then
  if echo "$JS_FILES" | xargs grep -l 'console\.\(log\|debug\)' 2>/dev/null; then
    echo ""
    echo "ERROR: console.log or console.debug found in staged files!"
    echo "   Use 'logger' from 'utils/logger' instead"
    exit 1
  fi
fi
```

**Why This Works:**

1. **Variable Capture:** `JS_FILES=$(...)` stores the filtered file list
2. **Graceful Failure:** `|| true` prevents grep from failing when no files match
3. **Explicit Empty Check:** `[ -n "$JS_FILES" ]` only proceeds if files exist
4. **Safe Piping:** `echo "$JS_FILES" | xargs grep` ensures grep always receives file arguments

## Verification

**Test Cases:**

| Scenario | Expected | Result |
|----------|----------|--------|
| Only markdown files staged | Hook passes | PASS |
| Only clean JS files staged | Hook passes | PASS |
| JS files with console.log | Hook fails (correct) | PASS |
| Mixed files (MD + bad JS) | Hook fails (correct) | PASS |
| No files staged | Hook passes | PASS |

## Prevention Strategies

### Best Practices for Shell Scripts

1. **Always check for empty input before xargs:**
   ```bash
   FILES=$(git ... | grep pattern || true)
   if [ -n "$FILES" ]; then
     echo "$FILES" | xargs command
   fi
   ```

2. **Use `|| true` after grep in pipelines:**
   ```bash
   RESULT=$(some_command | grep pattern || true)
   ```

3. **Consider `while read` for complex per-file logic:**
   ```bash
   git diff --cached --name-only | grep pattern | while read -r file; do
     # per-file processing
   done
   ```

4. **Test on both macOS (BSD) and Linux (GNU) before committing**

### Anti-Patterns to Avoid

```bash
# BROKEN - Runs xargs even with empty input
git diff | grep pattern | xargs command

# BROKEN - grep exits 1 when no match
FILES=$(git ls-files | grep pattern)  # Fails if no match

# BROKEN - BSD ignores -r flag
echo "$FILES" | xargs -r command
```

## Related Files

- `.husky/pre-commit` - Main pre-commit hook (fixed)
- `scripts/setup-hooks.sh` - May have similar patterns
- `.claude/prevention/CHECKLIST-SCHEMA-TYPE-SAFETY.md` - Uses similar xargs pattern

## References

- Commit: `9f6ec256` - fix(hooks): prevent false positive in console.log check
- BSD xargs man page: `-r` flag is a no-op
- GNU coreutils xargs: `-r` prevents empty execution
