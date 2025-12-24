# Claude Code Configuration Quick Checklist

**Use this checklist daily before starting work with Claude Code**

---

## Pre-Session Check (2 minutes)

```
Date: __________   Time: __________   Project: rebuild-6.0

STEP 1: Verify Files Exist
- [ ] ~/.claude/config.json present
- [ ] ~/.claude/settings.json present
- [ ] ./.claude/settings.local.json present

STEP 2: Validate JSON Syntax
Run: jq . ~/.claude/settings.json && jq . ./.claude/settings.local.json
- [ ] Both return valid JSON (no errors)
- [ ] No "Bash(command)" syntax (must be "Bash(command :*)")

STEP 3: Check Environment
Run: echo $SUPABASE_URL $SUPABASE_ANON_KEY
- [ ] SUPABASE_URL is set (shows value)
- [ ] SUPABASE_ANON_KEY is set (shows value)

STEP 4: Health Check
Run: ./.claude/health-check.sh
- [ ] All checks pass (green checkmarks)
- [ ] Zero errors shown

READY TO START CLAUDE CODE ✓
If any failed: Fix before continuing
```

---

## Configuration Issues & Fixes

### Issue: "Outdated permission syntax" warning

**Fix:**
```bash
# Check current syntax
grep "Bash(" ~/.claude/settings.json

# If showing: "Bash(npm)" (OLD - 5 mins fix)
# Replace with: "Bash(npm :*)" (NEW)

# Quick fix (replace all)
sed -i '' 's/"Bash(\([^:]*\))"/"Bash(\1 :*)"/g' ~/.claude/settings.json

# Validate
jq . ~/.claude/settings.json
```

### Issue: MCP servers not accessible

**Fix:**
```bash
# 1. Check variables exported
env | grep SUPABASE
# Should show values (not empty)

# 2. Load environment
source ~/.claude/setup-env.sh /Users/mikeyoung/CODING/rebuild-6.0

# 3. Verify again
env | grep SUPABASE

# 4. Restart Claude Code
claude
```

### Issue: "File not found" for .claude/settings.local.json

**Fix:**
```bash
# Check current directory
pwd  # Should be: /Users/mikeyoung/CODING/rebuild-6.0

# Verify file exists
ls -la ./.claude/settings.local.json

# If not found, copy from template or recreate
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
  },
  "enableAllProjectMcpServers": true
}
EOF
```

### Issue: Health check shows errors

**Fix:**
```bash
# Run health check with full output
./.claude/health-check.sh 2>&1

# For each error shown:
# 1. Read the error message carefully
# 2. Look up below for specific issue
# 3. Apply fix
# 4. Re-run health check

# If "Invalid JSON" error:
jq . <filename>  # Shows exact line with problem
# Fix the JSON syntax and retry

# If "Environment variable not set":
source ~/.claude/setup-env.sh
env | grep <VARIABLE_NAME>
```

---

## Weekly Maintenance (30 minutes)

**Every Friday at 4pm:**

```
WEEKLY CLAUDE CODE MAINTENANCE
Week of: ____________

STEP 1: Run Health Check
./.claude/health-check.sh
- [ ] No errors
- [ ] No warnings
- [ ] All expected MCP servers listed

STEP 2: Check for Updates
claude --version
# Compare with last week's version
Last version: _____  Current: _____
- [ ] Same version (no update) OR
- [ ] New version (run upgrade checklist below)

STEP 3: Validate Recent Commits
git log --oneline -5
# Check: Did any config files change?
- [ ] No config changes, OR
- [ ] Config changes committed properly

STEP 4: Environment Review
source ~/.claude/setup-env.sh
env | grep -E "SUPABASE|STRIPE|OPENAI|KIOSK"
- [ ] All required vars are set
- [ ] No empty values

STEP 5: Document Issues
Any problems this week?
_____________________
_____________________

STEP 6: Plan Fixes
Issues to address next week:
_____________________
_____________________
```

---

## Monthly Review (1 hour)

**First Monday of each month:**

```
MONTHLY CLAUDE CODE REVIEW
Month: ____________  Year: ________

STEP 1: Check for Claude Code Updates
# Visit: https://claude.com/download
Available version: _________
Current version:    _________
- [ ] Up to date, OR
- [ ] New version available (upgrade below)

STEP 2: Validate All Configurations
~/.claude/config.json
~/.claude/settings.json
~/.claude/settings.local.json
./.claude/settings.local.json

For each: jq . <filename>
- [ ] All have valid JSON
- [ ] No syntax errors
- [ ] No deprecated patterns

STEP 3: Review Permission Rules
jq '.permissions.allow' ~/.claude/settings.json
- [ ] Uses "Bash(command :*)" syntax
- [ ] No unnecessary permissions
- [ ] All needed tools are allowed

STEP 4: Verify MCP Servers
jq '.mcpServers' ./.claude/settings.local.json
- [ ] All servers have proper "type" field
- [ ] All required servers enabled
- [ ] No broken server configs

STEP 5: Environment Audit
# Run: ./.claude/audit-claude-env.sh
# Review output for:
- [ ] All critical vars set
- [ ] No empty values
- [ ] Proper file permissions (600)

STEP 6: Performance Review
# Check recent session logs (if available)
Issues encountered this month:
_____________________
_____________________

Time spent troubleshooting:
- [ ] <30 minutes (good)
- [ ] 30-60 minutes (acceptable)
- [ ] >60 minutes (investigate)

STEP 7: Update Documentation
If anything changed, update:
- [ ] CLAUDE.md (if needed)
- [ ] .claude/CONFIGURATION_GUIDE.md
- [ ] Add lessons learned to .claude/lessons/

STEP 8: Create Month Report
File: .claude/monthly/review-$(date +%Y-%m).md
- Status: PASS / NEEDS FIXES
- Key findings: [...]
- Action items: [...]
```

---

## Upgrade Claude Code (When New Version Available)

**Estimated time: 30 minutes**

```
CLAUDE CODE UPGRADE PROCEDURE
Old version: _________
New version: _________
Date: __________

STEP 1: Backup Current Config
cp ~/.claude/config.json ~/.claude/config.json.backup.$(date +%Y%m%d)
cp ~/.claude/settings.json ~/.claude/settings.json.backup.$(date +%Y%m%d)
- [ ] Backups created

STEP 2: Install New Version
# Follow official instructions at: https://claude.com/download
Which installed successfully
claude --version
Confirmed version: _________
- [ ] New version confirmed

STEP 3: Validate Config Files
# Check if format changed
jq . ~/.claude/config.json
- [ ] No "parse error" messages
- [ ] Structure looks correct

jq . ~/.claude/settings.json
- [ ] No "parse error" messages
- [ ] All MCP servers present

STEP 4: Test MCP Servers
# Start Claude Code
claude
# In Claude Code terminal, run:
#   /filesystem help
#   or simple grep command
- [ ] MCP servers respond
- [ ] No connection errors

STEP 5: Check for Deprecation Warnings
# In Claude Code output, look for:
# "deprecated", "outdated", "will be removed"
Found warnings: YES / NO
If yes, list:
_____________________
_____________________

STEP 6: Review Release Notes
Check: https://claude.com/updates or release docs
New features to note:
_____________________
_____________________

Breaking changes:
_____________________
_____________________

STEP 7: Update Team
Notify team in Slack:
"Claude Code updated to [version]. No config changes needed."
OR
"Claude Code updated. Review: [link to changes]"
- [ ] Notification sent

STEP 8: Document in Git
git add .claude/
git commit -m "chore: validate Claude Code upgrade to $(claude --version)"
- [ ] Changes committed

STEP 9: Archive Old Backups
# Keep latest 2 backups, remove older ones
ls -la ~/.claude/*.backup.*
- [ ] Unnecessary backups removed
```

---

## New Project Onboarding (When Joining New Project)

```
CLAUDE CODE PROJECT SETUP
Project: _______________
Date: __________

STEP 1: Verify Project Has Claude Config
ls -la ./.claude/
- [ ] Directory exists
- [ ] settings.local.json present
- [ ] CLAUDE.md file present

STEP 2: Read Project Documentation
cat ./CLAUDE.md
cat ./.claude/CLAUDE.md (if exists)
- [ ] Understand architecture overview
- [ ] Note any special requirements
- [ ] Check for lessons learned

STEP 3: Load Project Environment
# Copy example env file
cp ./.env.example ./.env.local

# Edit with required secrets
nano ./.env.local
# Add: SUPABASE_URL, SUPABASE_ANON_KEY, etc.
- [ ] .env.local created with secrets

STEP 4: Setup Claude Environment
source ~/.claude/setup-env.sh $(pwd)
- [ ] Script runs without errors
- [ ] Required vars exported

STEP 5: Validate Configuration
./.claude/health-check.sh
- [ ] All checks pass
- [ ] No errors shown

STEP 6: Test Integration
# Start Claude Code
claude

# Inside Claude Code, test:
# - Run simple command (/filesystem)
# - Check for warnings
- [ ] No errors in startup
- [ ] MCP servers accessible

STEP 7: Documentation
Create: ./.claude/onboarding-complete.txt
```

---

## Emergency Recovery (If Everything Breaks)

**Do this if Claude Code stops working entirely:**

```
CLAUDE CODE EMERGENCY RECOVERY
Date: __________   Time: __________

STEP 1: Stop Claude Code
# Kill any running Claude Code processes
killall claude 2>/dev/null

STEP 2: Backup Current Broken Config (for debugging)
cp ~/.claude/settings.json ~/.claude/settings.json.broken.$(date +%s)
cp ./.claude/settings.local.json ./.claude/settings.local.json.broken.$(date +%s)
- [ ] Backups created

STEP 3: Restore from Last Known Good
# If you have recent backups
cp ~/.claude/settings.json.backup.YYYYMMDD ~/.claude/settings.json
# OR recreate from scratch (see section above)
- [ ] Configuration restored

STEP 4: Full Validation
jq . ~/.claude/config.json
jq . ~/.claude/settings.json
jq . ./.claude/settings.local.json
- [ ] All valid JSON
- [ ] No syntax errors

STEP 5: Remove Old/Temp Files
# Clean up any test files
rm -f ~/.claude/*.temp
rm -f ./.claude/*.broken
- [ ] Cleanup done

STEP 6: Restart Fresh
# Restart shell to clear env
exec $SHELL

# Reload environment
source ~/.claude/setup-env.sh

# Verify
./.claude/health-check.sh
- [ ] Health check passes

STEP 7: Start Claude Code
claude
# Test with simple command
- [ ] Claude Code starts
- [ ] Commands work

STEP 8: Debug If Still Broken
If still not working, collect:
1. Claude Code version: claude --version
2. Health check output: ./.claude/health-check.sh
3. Error messages (screenshot)
4. Recent config changes: git log --oneline .claude/

Share with team/support
- [ ] Debug info collected
```

---

## Permission Syntax Reference

### OLD (Deprecated) Format - DON'T USE
```json
{
  "Bash(npm)",
  "Bash(git)",
  "Bash(node)"
}
```

### NEW (Current) Format - USE THIS
```json
{
  "Bash(npm :*)",
  "Bash(git :*)",
  "Bash(node :*)",
  "Bash(find :*)",
  "WebSearch",
  "mcp__*"
}
```

### Quick Fix Command
```bash
# Replace all old syntax with new
sed -i '' 's/"Bash(\([^:]*\))"/"Bash(\1 :*)"/g' ~/.claude/settings.json

# Verify
jq .permissions.allow ~/.claude/settings.json
```

---

## Key Files Reference

| File | Purpose | Who Edits | How Often |
|------|---------|-----------|-----------|
| `~/.claude/config.json` | Global Claude config | Rarely | When upgrading |
| `~/.claude/settings.json` | Global permissions/servers | Rarely | When new servers needed |
| `~/.claude/.env` | Global secrets | You | As secrets change |
| `./.claude/settings.local.json` | Project permissions | Project team | When features added |
| `./.claude/CLAUDE.md` | Project guide | Team | Regularly |
| `./.claude/health-check.sh` | Validation script | Never | Run weekly |

---

## Support & Resources

**If something breaks:**
1. Run: `./.claude/health-check.sh` (shows exact problem)
2. Look up your issue in "Configuration Issues & Fixes" above
3. Follow the fix steps
4. Re-run health check to confirm

**If health check doesn't help:**
1. Check: https://claude.com/code/help
2. Review: `./.claude/lessons/` for similar issues
3. Ask team: Share health check output

**Escalation:**
- Issue persists after fixes: Contact Claude support
- Multiple team members affected: Likely config format change
- MCP server errors: Check MCP documentation

---

## Maintenance Calendar

```
DAILY:
  ☐ Before starting: Run pre-session check (2 min)

WEEKLY (Fridays 4pm):
  ☐ Health check script
  ☐ Version check
  ☐ Environment validation
  ☐ Document any issues

MONTHLY (First Monday):
  ☐ Full configuration review
  ☐ Check for Claude Code updates
  ☐ Permission audit
  ☐ Team communication

QUARTERLY (End of quarter):
  ☐ Update prevention strategies
  ☐ Review lessons learned
  ☐ Plan tool improvements
```

---

**Last Updated:** December 23, 2025
**Version:** 1.0
**Status:** Ready for Use
