# Claude Code Prevention Strategies - Implementation Guide

**Status:** Ready to Deploy
**Date Created:** December 23, 2025
**Estimated Implementation Time:** 2 hours initial setup, 5 min/week maintenance

---

## Overview

This guide provides actionable steps to implement the 4 prevention strategies for Claude Code configuration issues:

1. **Keep Configs Up to Date** - Monitor and validate configuration files
2. **MCP Environment Variables** - Properly isolate and manage secrets
3. **New Machine Setup** - Standardized onboarding checklist
4. **Configuration Validation** - Automated health checks

---

## Quick Start (15 minutes)

**Do this first:**

```bash
# 1. Go to project root
cd /Users/mikeyoung/CODING/rebuild-6.0

# 2. Make health check script executable
chmod +x ./.claude/scripts/claude-health-check.sh

# 3. Run health check to identify any current issues
./.claude/scripts/claude-health-check.sh

# 4. If you see errors, follow the "Common Fixes" section below
```

---

## Implementation Phases

### Phase 1: Immediate (This Session - 30 minutes)

**Goal:** Get validation in place

```bash
# 1. Make scripts executable
chmod +x /Users/mikeyoung/CODING/rebuild-6.0/.claude/scripts/*.sh

# 2. Run initial health check
/Users/mikeyoung/CODING/rebuild-6.0/.claude/scripts/claude-health-check.sh

# 3. Fix any identified issues
# (See "Common Fixes" section below)

# 4. Commit scripts to git
cd /Users/mikeyoung/CODING/rebuild-6.0
git add ./.claude/scripts/
git add ./.claude/CLAUDE_CODE_PREVENTION_STRATEGIES.md
git add ./.claude/CLAUDE_CODE_QUICK_CHECKLIST.md
git commit -m "chore: add Claude Code prevention strategies and health check scripts"

# 5. Share with team
# Post in Slack: "New Claude Code prevention framework deployed. Run .claude/scripts/claude-health-check.sh to validate your setup."
```

**Expected Outcome:** All team members have working health check scripts, zero configuration errors

### Phase 2: First Week

**Goal:** Automate validation in git workflow

**Task 1: Add Pre-Commit Hook**

```bash
# Create: .git/hooks/pre-commit
#!/bin/bash
set -e

# Validate Claude Code configs if they exist
if [ -d "./.claude" ] && [ -f "./.claude/scripts/claude-health-check.sh" ]; then
  echo "Validating Claude Code configuration..."
  ./.claude/scripts/claude-health-check.sh > /dev/null 2>&1 || {
    echo "ERROR: Claude Code configuration validation failed"
    echo "Run: ./.claude/scripts/claude-health-check.sh"
    exit 1
  }
fi

# Continue with other pre-commit checks...
```

**Task 2: Document in Team Channels**

Create Slack message (pin in #engineering):
```
Claude Code Prevention Framework Deployed

What changed:
- New health check script: ./.claude/scripts/claude-health-check.sh
- Prevention strategies guide: ./.claude/CLAUDE_CODE_PREVENTION_STRATEGIES.md
- Quick checklist: ./.claude/CLAUDE_CODE_QUICK_CHECKLIST.md

What to do:
1. Run health check: ./.claude/scripts/claude-health-check.sh
2. Fix any errors shown
3. Use quick checklist before each Claude Code session

Questions? See .claude/CLAUDE_CODE_QUICK_CHECKLIST.md#Support
```

**Task 3: Share Documentation**

- [ ] Post CLAUDE_CODE_QUICK_CHECKLIST.md in team wiki
- [ ] Add link to CLAUDE_CODE_PREVENTION_STRATEGIES.md in README
- [ ] Update onboarding docs to mention health check

### Phase 3: First Month

**Goal:** Establish regular maintenance cadence

**Weekly (Every Friday 4pm):**
```bash
# 1. Run health check
./.claude/scripts/claude-health-check.sh

# 2. Check for Claude Code updates
claude --version
# Compare with last week's version

# 3. Verify no config drift
git diff ./.claude/
```

**Monthly (First Monday 10am):**
```bash
# 1. Full health audit
./.claude/scripts/claude-health-check.sh

# 2. Check Claude Code release notes
# Visit: https://claude.com/updates

# 3. Validate all team members' configs work
# Ask team: "Any Claude Code issues this month?"

# 4. Document findings
# Create: ./.claude/audits/audit-2025-12.md
```

### Phase 4: Ongoing

**Maintenance Schedule:**

| Task | Frequency | Owner | Time |
|------|-----------|-------|------|
| Pre-session check | Every session | Individual | 2 min |
| Health check | Weekly | Individual | 5 min |
| Team audit | Monthly | Tech Lead | 30 min |
| Strategy review | Quarterly | Tech Lead | 1 hour |

---

## Common Fixes

### Fix 1: Old Permission Syntax (5 minutes)

**Problem:** You see warning about outdated permission syntax

**Solution:**
```bash
# Check current syntax
grep "Bash(" ~/.claude/settings.json

# If showing "Bash(npm)" instead of "Bash(npm :*)", fix:
sed -i '' 's/"Bash(\([^:]*\))"/"Bash(\1 :*)"/g' ~/.claude/settings.json

# Verify fix
jq .permissions.allow ~/.claude/settings.json
```

### Fix 2: Missing MCP Environment Variables (10 minutes)

**Problem:** MCP servers report connection errors

**Solution:**
```bash
# 1. Verify environment variables exist
env | grep SUPABASE
# Should show: SUPABASE_URL=... SUPABASE_ANON_KEY=...

# 2. If empty, add to .env.local
echo "SUPABASE_URL=your_url" >> ./.env.local
echo "SUPABASE_ANON_KEY=your_key" >> ./.env.local

# 3. Source the setup script
source ~/.claude/scripts/setup-env.sh

# 4. Verify again
env | grep SUPABASE

# 5. Restart Claude Code
claude
```

### Fix 3: Invalid JSON in Config (5 minutes)

**Problem:** Health check shows "Invalid JSON"

**Solution:**
```bash
# 1. Check which file is broken
jq . ~/.claude/settings.json
# or
jq . ./.claude/settings.local.json

# 2. jq will show exact line with error

# 3. Fix the syntax issue (usually missing comma or bracket)

# 4. Verify fix
jq . <filename>
# Should return without errors
```

### Fix 4: Config File Not Found (2 minutes)

**Problem:** Health check shows "not found"

**Solution:**
```bash
# For ./.claude/settings.local.json:
cat > ./.claude/settings.local.json << 'EOF'
{
  "permissions": {
    "allow": [
      "Bash(npm :*)",
      "Bash(npx :*)",
      "Bash(git :*)",
      "mcp__*"
    ],
    "deny": [],
    "ask": []
  }
}
EOF

# For ~/.claude/settings.json:
cat > ~/.claude/settings.json << 'EOF'
{
  "model": "opus",
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@mcp/server-filesystem@latest"],
      "env": {}
    }
  }
}
EOF
```

---

## Files Created

### Documentation Files
```
.claude/CLAUDE_CODE_PREVENTION_STRATEGIES.md (Comprehensive guide)
.claude/CLAUDE_CODE_QUICK_CHECKLIST.md (Daily/weekly/monthly checklists)
.claude/IMPLEMENTATION_GUIDE.md (This file)
```

### Script Files
```
.claude/scripts/claude-health-check.sh (Validation script)
.claude/scripts/setup-env.sh (Environment setup)
```

### Usage
```
# Run health check anytime
./.claude/scripts/claude-health-check.sh

# Setup environment before starting Claude Code
source ./.claude/scripts/setup-env.sh

# Or from global directory:
source ~/.claude/scripts/setup-env.sh /Users/mikeyoung/CODING/rebuild-6.0
```

---

## Testing the Prevention Strategies

### Test 1: Health Check Works

```bash
cd /Users/mikeyoung/CODING/rebuild-6.0
./.claude/scripts/claude-health-check.sh
# Expected: Green checkmarks, zero errors
```

### Test 2: Environment Setup Works

```bash
source ./.claude/scripts/setup-env.sh
env | grep SUPABASE_URL
# Expected: Shows your SUPABASE_URL value
```

### Test 3: Config Validation Catches Errors

```bash
# Intentionally break settings.json
cp ./.claude/settings.local.json ./.claude/settings.local.json.backup
echo '{"bad json}' > ./.claude/settings.local.json

# Run health check
./.claude/scripts/claude-health-check.sh
# Expected: Shows error about invalid JSON

# Restore good config
mv ./.claude/settings.local.json.backup ./.claude/settings.local.json

# Verify fixed
./.claude/scripts/claude-health-check.sh
# Expected: Green checkmarks again
```

---

## Integration with GitHub Actions

**For team CI/CD verification (optional):**

```yaml
# .github/workflows/claude-config.yml
name: Validate Claude Code Config

on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate Claude Code configuration
        run: |
          if [ -f ./.claude/scripts/claude-health-check.sh ]; then
            ./.claude/scripts/claude-health-check.sh
          fi
```

This ensures all PRs have valid Claude Code configs.

---

## Troubleshooting

### Issue: "Command not found: jq"

**Solution:**
```bash
# Install jq
brew install jq

# Or on Linux:
sudo apt-get install jq
```

### Issue: "Permission denied" on script

**Solution:**
```bash
chmod +x ./.claude/scripts/claude-health-check.sh
chmod +x ./.claude/scripts/setup-env.sh
```

### Issue: Environment variables still not set after setup-env.sh

**Solution:**
```bash
# Make sure you SOURCE the script, don't execute it
source ./.claude/scripts/setup-env.sh

# NOT just:
./.claude/scripts/setup-env.sh

# Check if variables are exported:
env | grep SUPABASE
```

### Issue: Pre-commit hook not running

**Solution:**
```bash
# Make pre-commit hook executable
chmod +x .git/hooks/pre-commit

# Test it:
git add some_file.txt
git commit -m "test"
# Should run validations

# If still not running, check hook is in right place:
ls -la .git/hooks/pre-commit
```

---

## Success Criteria

After implementing these strategies, you should see:

```
Before Implementation:
- Configuration issues: 3-5 per session
- Time to diagnose: 30-60 minutes
- Team impact: Blocks progress
- Deprecation warnings: Frequent

After Implementation (Target):
- Configuration issues: 0 per session
- Time to diagnose: 5 minutes via health check
- Team impact: Caught before commit
- Deprecation warnings: None/rare

Measurement:
- Run health check before each session
- Log results in team chat weekly
- Track trends month-over-month
```

---

## Next Steps

1. **Today:**
   - [ ] Review this file
   - [ ] Run health check: `./.claude/scripts/claude-health-check.sh`
   - [ ] Fix any errors found
   - [ ] Commit changes to git

2. **This Week:**
   - [ ] Run weekly health check (Friday 4pm)
   - [ ] Share quick checklist with team
   - [ ] Update onboarding docs

3. **This Month:**
   - [ ] First monthly audit (Dec 1)
   - [ ] Establish weekly/monthly calendar
   - [ ] Document any team-specific issues

4. **Ongoing:**
   - [ ] Use quick checklist before sessions
   - [ ] Run health check weekly
   - [ ] Monthly team audit
   - [ ] Quarterly strategy review

---

## Questions?

See:
- **Daily usage:** CLAUDE_CODE_QUICK_CHECKLIST.md
- **Full details:** CLAUDE_CODE_PREVENTION_STRATEGIES.md
- **Script help:** `./.claude/scripts/claude-health-check.sh --help` (when implemented)

---

**Version:** 1.0
**Created:** December 23, 2025
**Status:** Ready to Implement
