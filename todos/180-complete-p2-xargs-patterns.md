# TODO-180: Multiple xargs vulnerability patterns in scripts

## Status: complete
## Priority: P2 (Important - silent failures)
## Category: build-errors
## Tags: shell, xargs, macos, bsd

## Problem Statement

Multiple scripts have the same xargs bug that was fixed in the pre-commit hook (CL-BUILD-003).

**Vulnerable Locations:**

1. **scripts/setup-hooks.sh:78**
   ```bash
   COMPLETED_STAGED=$(git diff --cached --name-only .claude/todos | xargs -I {} grep -l "status: completed" {} 2>/dev/null | wc -l || true)
   ```

2. **scripts/setup-hooks.sh:81**
   ```bash
   git diff --cached --name-only .claude/todos | xargs -I {} grep -l "status: completed" {} 2>/dev/null || true
   ```

3. **scripts/todo-audit.sh:38**
   ```bash
   STATUS=$(grep "^status:" "$todo_file" 2>/dev/null | awk -F: '{print $2}' | xargs || echo "unknown")
   ```

4. **scripts/todo-audit.sh:144**
   ```bash
   find "$TODO_DIR" -maxdepth 1 -name "*.md" -type f | xargs -I {} basename {}
   ```

5. **scripts/archive/2025-09-25/fire.sh:7,10**
   ```bash
   lsof -ti:3001 | xargs kill -9 2>/dev/null && echo "Killed" || echo "Free"
   ```

**Problem:** When input is empty, xargs behavior varies:
- BSD: Runs command with no args (grep reads stdin)
- GNU: With `-r`, skips command entirely

## Proposed Solution

Apply the same fix pattern from CL-BUILD-003:

```bash
# Before (vulnerable):
command | xargs other_command

# After (safe):
RESULT=$(command || true)
if [ -n "$RESULT" ]; then
  echo "$RESULT" | xargs other_command
fi
```

## Files to Fix

1. `scripts/setup-hooks.sh` - 2 instances
2. `scripts/todo-audit.sh` - 2 instances
3. `scripts/archive/2025-09-25/fire.sh` - 2 instances (low priority, archived)

## Acceptance Criteria

- [ ] All xargs patterns have empty input guards
- [ ] Scripts work correctly when no files match
- [ ] Test on both macOS and Linux

## Related

- CL-BUILD-003: BSD xargs empty input fix
- TODO-175: grep -P macOS issue
