# TODO-175: Pre-commit hook uses GNU-only grep -P flag

## Status: complete
## Priority: P1 (Critical - silently bypassed on macOS)
## Category: build-errors
## Tags: hooks, pre-commit, macos, bsd, grep

## Problem Statement

The pre-commit hook uses `grep -P` (Perl regex) for TIMESTAMP validation in migration files. This flag is GNU grep only and fails silently on macOS (BSD grep).

**Location:** `.husky/pre-commit` lines 62-64

```bash
if grep -q "RETURNS TABLE" "$file" && grep -P "\\bTIMESTAMP\\b(?!TZ)" "$file"; then
  RPC_ERRORS+=("$file: Uses TIMESTAMP - should be TIMESTAMPTZ")
fi
```

**Impact:**
- TIMESTAMP validation check is completely bypassed on macOS
- Invalid RPC function signatures can be committed without detection
- Only Linux/CI systems catch these errors

## Proposed Solution

Replace Perl regex with POSIX Extended Regex:

```bash
# Before (GNU only):
grep -P "\\bTIMESTAMP\\b(?!TZ)" "$file"

# After (cross-platform):
grep -E "TIMESTAMP[^Z]|TIMESTAMP$" "$file"
```

Or detect platform:
```bash
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS - use alternative pattern
  grep -E "TIMESTAMP[^TZ]" "$file"
else
  # Linux - use Perl regex
  grep -P "\\bTIMESTAMP\\b(?!TZ)" "$file"
fi
```

## Acceptance Criteria

- [ ] Pre-commit hook TIMESTAMP check works on macOS
- [ ] Pre-commit hook TIMESTAMP check works on Linux
- [ ] Test with migration file containing `TIMESTAMP` (should fail)
- [ ] Test with migration file containing `TIMESTAMPTZ` (should pass)

## Related

- CL-BUILD-003: BSD xargs empty input issue (same root cause: BSD/GNU differences)
- `.husky/pre-commit`
