# CL-BUILD-003: BSD xargs Empty Input False Positive

**Severity:** P2 | **Cost:** ~30 min | **Duration:** Ongoing until fixed | **Workaround:** --no-verify

## Problem

Pre-commit hook console.log check fails with false positive when no JS/TS files are staged. BSD xargs (macOS) runs grep with no file arguments, causing grep to read from stdin and match environment noise.

## Bug Pattern

```bash
# .husky/pre-commit - BROKEN
if git diff --cached --name-only | grep -E '\.(js|jsx|ts|tsx)$' | xargs grep -l 'console\.\(log\|debug\)' 2>/dev/null; then
  exit 1  # FALSE POSITIVE when no JS files staged
fi
```

**Why it fails:**
1. No JS/TS files staged → grep outputs nothing
2. BSD xargs runs command even with empty input (GNU has `-r` flag)
3. grep with no files reads stdin
4. Environment/npm metadata contains "console.log" → false match

## Fix Pattern

```bash
# .husky/pre-commit - CORRECT
JS_FILES=$(git diff --cached --name-only | grep -E '\.(js|jsx|ts|tsx)$' || true)
if [ -n "$JS_FILES" ]; then
  if echo "$JS_FILES" | xargs grep -l 'console\.\(log\|debug\)' 2>/dev/null; then
    exit 1
  fi
fi
```

**Why it works:**
- `|| true` prevents grep failure when no matches
- `[ -n "$JS_FILES" ]` skips xargs when empty
- grep always receives file arguments, never reads stdin

## Prevention Checklist

- [ ] Never pipe directly to `xargs` without checking for empty input
- [ ] Always use `|| true` after grep in pipelines
- [ ] Test shell scripts on both macOS (BSD) and Linux (GNU)
- [ ] Use `[ -n "$VAR" ]` before processing filtered file lists
- [ ] Consider `while read` loop for complex per-file logic

## Detection

- "console.log found" when staging only markdown files
- Hook passes after using `--no-verify`
- Works on Linux CI, fails on macOS dev machines
- Error is intermittent (depends on stdin content)

## Related Anti-Patterns

```bash
# BROKEN: No empty check
git diff | grep pattern | xargs command

# BROKEN: BSD ignores -r
echo "$FILES" | xargs -r command

# SAFE: Variable check first
FILES=$(... | grep pattern || true)
[ -n "$FILES" ] && echo "$FILES" | xargs command
```

## Files Affected

- `.husky/pre-commit:16-29` - Fixed in commit 9f6ec256
- `scripts/setup-hooks.sh` - May need similar fix
- Any script using `| grep | xargs` pattern

## Key Insight

BSD vs GNU xargs handle empty input differently. Always validate input before xargs on cross-platform scripts.
