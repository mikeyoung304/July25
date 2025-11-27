# Parallel Agent Todo Audit After Crash

## Problem Summary

**Date**: 2025-11-27
**Severity**: P2
**Category**: Process/Data Integrity
**Resolution Time**: ~1 hour

After a system crash during parallel todo resolution (`/resolve_todo_parallel`), 14 new todo files (079-092) were created but not committed. Investigation revealed many contained invalid information: wrong file paths, non-existent functions, duplicates, and contradicting recommendations.

## Symptoms

- 14 untracked todo files in `todos/` directory after crash
- Todo 079 claimed `validateTranscript()` was missing - but it exists at line 19
- Todos 027 and 086 made opposite recommendations about LRU cache dispose callbacks
- Todo 088 was exact duplicate of completed todo 050
- Many todos referenced `client/src/components/voice/` but files are at `client/src/modules/voice/services/`
- Several P1 todos (001, 002, 004, 018, 023) marked pending but already fixed in recent commits

## Root Cause

1. **No validation gate**: Parallel agents created todos without verifying claims against actual codebase
2. **Stale analysis**: Agents may have cached outdated file locations or code patterns
3. **No deduplication**: No check for existing todos covering the same issue
4. **Crash left inconsistent state**: Partial work committed, rest orphaned

## Solution Applied

### Step 1: Identify Invalid Todos
```bash
# Check what was left uncommitted
git status --porcelain | grep "^??" | grep todos/

# Verify file paths exist
grep -r "validateTranscript" client/src/modules/voice/
# Found at VoiceEventHandler.ts:19 - Todo 079 was INVALID
```

### Step 2: Launch Parallel Verification Agents
Used 7 exploration agents in parallel to audit:
- New todos 080-092 against actual codebase
- Existing P1 todos 001-023, 055-056 for accuracy
- Each agent verified: file paths, line numbers, issue still exists, duplicates

### Step 3: Delete Invalid/Fixed Todos
```bash
rm todos/079-pending-p1-missing-validate-transcript-function.md  # INVALID
rm todos/082-pending-p1-nan-infinity-price-validation.md          # FIXED
rm todos/083-pending-p1-kds-tests-incomplete.md                   # FIXED
rm todos/084-pending-p1-checkout-hardcoded-timeout.md             # FIXED
rm todos/086-pending-p1-lru-cache-memory-leak.md                  # INVALID
rm todos/088-pending-p2-cart-race-condition.md                    # DUPLICATE
rm todos/089-pending-p2-modifier-rate-limiting.md                 # INVALID
# ... plus 8 more fixed P1 todos
```

### Step 4: Add Verified Valid Todos
```bash
git add todos/080-pending-p1-server-floating-point-arithmetic.md
git add todos/081-pending-p1-prompt-injection-menu-data.md
# ... 5 more verified valid todos
```

### Step 5: Commit with Audit Notes
```bash
git commit -m "chore(todos): audit and cleanup todo backlog

DELETED (15 invalid/fixed/duplicate todos):
- 001: turnState competing state - FIXED
- 079: missing validateTranscript - INVALID (exists at line 19)
...

ADDED (7 verified valid todos):
- 080: server floating-point arithmetic
- 081: prompt injection in menu data
..."
```

## Audit Results

| Category | Count |
|----------|-------|
| Deleted (invalid/fixed/duplicate) | 15 |
| Added (verified valid) | 7 |
| Net change | -8 |
| Final total | 81 todos |

### Deleted Todos by Reason

| Reason | IDs |
|--------|-----|
| Already FIXED | 001, 002, 004, 018, 023, 055, 056, 082, 083, 084 |
| INVALID (wrong claims) | 027, 079, 086, 089 |
| DUPLICATE | 088 |

## Prevention Strategies

### 1. File Path Validation (Priority 1)
Before creating any todo, verify referenced files exist:
```bash
# Validation check
if [ ! -f "$FILE_PATH" ]; then
  echo "ERROR: File does not exist: $FILE_PATH"
  exit 1
fi
```

### 2. Deduplication Check (Priority 2)
Search for similar todos before creation:
```bash
grep -r "cart.*race\|race.*cart" todos/
# If matches found, flag as potential duplicate
```

### 3. Code Reality Validation (Priority 3)
Verify claimed problems actually exist:
```bash
# If claiming "missing function X":
grep -n "function X\|const X = " [file]
# Must return NO results, otherwise todo is invalid
```

### 4. Parallel Agent Limits (Priority 4)
- Max 3-5 concurrent agents for todo creation
- Serial validation step before parallel execution
- Queue-based execution with validation gate

### 5. Regular Audits (Priority 5)
Monthly audit checklist:
- Run validation scripts against all todos
- Verify claimed problems still exist
- Check for completed work not marked done
- Identify contradicting todos

## Verification Commands

```bash
# Count todos by status
ls todos/*-pending-*.md | wc -l
ls todos/*-complete*.md | wc -l

# Find potential duplicates
for pattern in "race condition" "memory leak" "validation"; do
  echo "=== $pattern ==="
  grep -l "$pattern" todos/*.md
done

# Verify file paths in a todo
grep -E "^\*\*.*File" todos/080-*.md | while read line; do
  path=$(echo "$line" | sed 's/.*`\(.*\)`.*/\1/')
  [ -f "$path" ] && echo "OK: $path" || echo "MISSING: $path"
done
```

## Related Documentation

- [CL-DB-002: Constraint Drift Prevention](/.claude/lessons/CL-DB-002-constraint-drift-prevention.md) - Similar drift pattern
- [Documentation Standards](/docs/DOCUMENTATION_STANDARDS.md) - Accuracy requirements
- [Todo 042: Documentation Drift](/todos/042-complete-p1-documentation-drift-critical.md) - Prior drift issues

## Key Lessons

1. **Validate before commit**: Any auto-generated content needs verification against reality
2. **Parallel agents need coordination**: Without validation gates, parallel execution creates inconsistent state
3. **Regular audits catch drift**: Periodic cleanup prevents accumulation of stale/invalid items
4. **Trust but verify**: Agent-generated analysis can be wrong; always spot-check file paths and code claims

## Metrics

- **Issues prevented**: 15 invalid todos removed before they caused confusion
- **Time saved**: Future developers won't investigate non-existent issues
- **Accuracy improved**: Todo backlog now reflects actual codebase state
