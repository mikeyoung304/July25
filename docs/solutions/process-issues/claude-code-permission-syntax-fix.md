---
title: Claude Code Permission Syntax Configuration Fix
slug: claude-code-permission-syntax-fix
category: process-issues
severity: medium
component: claude-code-cli
tags:
  - claude-code
  - mcp
  - configuration
  - permissions
  - tooling
date_solved: 2025-12-23
time_to_fix: 15 minutes
---

# Claude Code Permission Syntax Configuration Fix

## Problem

Claude Code displays a wall of warnings on startup about permission syntax and MCP server configuration errors.

### Symptoms

1. **Permission syntax warnings** (dozens of lines):
   ```
   "Bash(cat *)": Use ":*" for prefix matching, not just "*".
   Change to "Bash(cat :*)" for prefix matching.
   ```

2. **MCP server warning**:
   ```
   [Warning] [supabase] mcpServers.supabase: Missing environment variables:
   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
   ```

### Files Involved

| File | Scope |
|------|-------|
| `~/.claude/settings.local.json` | Global (all projects) |
| `project/.claude/settings.local.json` | Project-specific |
| `project/.mcp.json` | MCP server configuration |

## Root Cause

### Issue 1: Permission Syntax Change

Claude Code updated its permission syntax. The old format used a space before the asterisk:

```
Bash(command *)     ← OLD (no longer valid)
Bash(command:*)     ← NEW (correct format)
```

### Issue 2: Shell Constructs as Permissions

Shell control structures were incorrectly added as permission rules:
```json
"Bash(for *)", "Bash(while *)", "Bash(if *)", "Bash(then *)"
```
These are not standalone commands and should be removed.

### Issue 3: MCP Environment Variable Mismatch

The Supabase MCP server expected `SUPABASE_SERVICE_ROLE_KEY` but the project uses `SUPABASE_SERVICE_KEY`.

### Issue 4: MCP Servers Need Shell Exports

MCP servers run as child processes and cannot read `.env` files. They need environment variables exported in the shell profile (`~/.zshrc`).

## Solution

### Step 1: Fix Permission Syntax

**Before:**
```json
{
  "permissions": {
    "allow": [
      "Bash(npm *)",
      "Bash(cat *)",
      "Bash(for *)",
      "Bash(while *)"
    ]
  }
}
```

**After:**
```json
{
  "permissions": {
    "allow": [
      "Bash(npm :*)",
      "Bash(cat :*)"
    ]
  }
}
```

Key changes:
- Replace `*)` with `:*)` for all Bash permissions
- Remove shell constructs (for, while, if, then, else, fi, done, do)

### Step 2: Fix MCP Variable Name

In `.mcp.json`, map the correct variable name:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "supabase-mcp"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_KEY}"
      }
    }
  }
}
```

The `env` object remaps `SUPABASE_SERVICE_KEY` (from your project) to `SUPABASE_SERVICE_ROLE_KEY` (what the MCP server expects).

### Step 3: Export Environment Variables

Add to `~/.zshrc` (or `~/.bashrc`):

```bash
# Supabase vars for MCP servers
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_KEY="your-service-role-key"
```

Then reload: `source ~/.zshrc`

## Verification

```bash
# Check env vars are exported
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY

# Restart Claude Code - warnings should be gone
```

## Prevention

### Checklist for Claude Code Setup

- [ ] Use `:*` syntax for permission wildcards (not just `*`)
- [ ] Don't add shell control structures as permissions
- [ ] Export MCP-required env vars in shell profile
- [ ] Match env var names between project and MCP expectations

### Quick Validation Script

```bash
# Check for old permission syntax
grep -r 'Bash([a-z]* \*)' ~/.claude/ .claude/ 2>/dev/null && echo "Found old syntax!"
```

## Timeline

| Date | Event |
|------|-------|
| Nov 24, 2024 | Settings files created with old `*` syntax |
| Dec 23, 2024 | Warnings noticed, diagnosed, and fixed |

## Related Documentation

- [Claude Code Settings Documentation](https://code.claude.com/docs/en/settings)
- [MCP Configuration Guide](https://code.claude.com/docs/en/mcp)
- `.claude/lessons/` - Project-specific lessons learned

## Key Insight

**This was purely cosmetic** - the warnings didn't break functionality. Claude Code still worked, it just complained loudly about the config format. The fix is quick once you understand the syntax change.

## Cross-References

- `docs/reference/config/ENVIRONMENT.md` - Environment variable reference
- `.claude/lessons/README.md` - Lessons learned index
