# TODO-177: Unsafe .env file loading allows code injection

## Status: pending
## Priority: P1 (Critical - security vulnerability)
## Category: security-issues
## Tags: shell, env, injection, security

## Problem Statement

Multiple scripts use unsafe pattern to load .env files:

```bash
export $(grep -v '^#' .env | xargs)
```

**Affected Files:**
- `scripts/post-migration-sync.sh` line 14
- `scripts/deploy-migration.sh` line 128
- `scripts/rollback-migration.sh` line 181
- `scripts/verify-migration-history.sh` line 14

**Vulnerabilities:**

1. **Spaces in values break parsing:**
   ```bash
   # .env content:
   VAR=value with spaces
   # Results in: export VAR=value with spaces
   # Shell interprets "with" and "spaces" as separate commands
   ```

2. **Command substitution executes:**
   ```bash
   # .env content:
   VAR=$(malicious_command)
   # The command WILL be executed when sourced
   ```

3. **Variable expansion in values:**
   ```bash
   # .env content:
   VAR=$HOME/path
   # Expands $HOME instead of literal string
   ```

## Proposed Solution

Use proper .env loading:

```bash
# Option 1: set -a with source (bash 4+)
if [ -f .env ]; then
  set -a  # Export all variables
  source .env
  set +a
fi

# Option 2: Explicit parsing with quotes
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  # Export with proper quoting
  export "$key=$value"
done < .env
```

## Acceptance Criteria

- [ ] All 4 scripts use safe .env loading
- [ ] Test with .env containing spaces in values
- [ ] Test with .env containing special characters ($, `, etc.)
- [ ] Verify no command execution from .env content

## Related

- OWASP Command Injection
