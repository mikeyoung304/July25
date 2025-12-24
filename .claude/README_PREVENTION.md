# Claude Code Prevention Strategies

**Purpose:** Prevent recurring Claude Code configuration issues through automated validation and clear processes

**Status:** Ready to Deploy
**Date Created:** December 23, 2025

---

## The Problem

Claude Code configuration issues have occurred repeatedly:

| Date | Issue | Impact |
|------|-------|--------|
| Nov 24 | Old permission syntax in settings files | Deprecation warnings |
| Dec 23 | MCP server env vars not exported | Tool failures |
| Dec 23 | Outdated configuration format | UX warnings |

**Root Cause:** Manual configuration without validation, no update mechanism, missing environment isolation

---

## The Solution: 4 Prevention Strategies

### 1. Keep Claude Code Configs Up to Date
- Automated syntax validation
- Monthly update review checklist
- Pre-commit hook to catch issues before commit
- Quick fix scripts for common problems

### 2. MCP Server Environment Variables
- Explicit `env` configuration in settings
- Setup script to load variables from `.env` files
- Shell profile integration for auto-loading
- Environment audit script to verify exports

### 3. New Machine Setup Checklist
- Standardized initialization steps
- Per-project onboarding checklist
- First-time setup script
- Validation before first use

### 4. Configuration Validation
- Health check script (green/red checks)
- Pre-commit JSON validation
- Permission syntax linting
- Automated team health audits

---

## Quick Start

### For Individual Developers (2 minutes)

```bash
# Before each Claude Code session:
./.claude/scripts/claude-health-check.sh

# If any errors shown, follow the fix guide:
# See: CLAUDE_CODE_QUICK_CHECKLIST.md#Configuration Issues & Fixes
```

### For Team Leads (30 minutes setup)

```bash
# 1. Deploy scripts to repository
git add ./.claude/scripts/
git add ./.claude/CLAUDE_CODE_PREVENTION_STRATEGIES.md
git add ./.claude/CLAUDE_CODE_QUICK_CHECKLIST.md
git add ./.claude/IMPLEMENTATION_GUIDE.md

# 2. Commit
git commit -m "chore: add Claude Code prevention strategies and health check scripts"

# 3. Notify team
# Post quick checklist link in team chat
# Ask team to run health check on their machines
```

---

## Document Guide

### For Daily Use
- **CLAUDE_CODE_QUICK_CHECKLIST.md** ← Start here
  - Pre-session check (2 min)
  - Common fixes (quick reference)
  - Weekly maintenance (30 min)
  - Monthly review (1 hour)

### For Implementation
- **IMPLEMENTATION_GUIDE.md**
  - Phase-by-phase rollout plan
  - Common fixes with solutions
  - Testing procedures
  - Success criteria

### For Deep Dives
- **CLAUDE_CODE_PREVENTION_STRATEGIES.md** (Complete reference)
  - All 4 prevention strategies explained
  - Scripts with full documentation
  - Configuration templates
  - Troubleshooting guide

### For New Machines
- **IMPLEMENTATION_GUIDE.md#Phase 1-3** covers full setup

---

## Available Scripts

### Health Check Script
**File:** `./.claude/scripts/claude-health-check.sh`

**Purpose:** Validate all Claude Code configurations

**Usage:**
```bash
./.claude/scripts/claude-health-check.sh

# Output examples:
# ✓ Config file valid
# ✓ Environment variables set
# ✗ Old permission syntax (needs fix)
# ! Optional server not found (warning)
```

**What it checks:**
- Global and project config files exist
- All JSON is syntactically valid
- Permission syntax uses modern format
- Environment variables are exported
- MCP servers are configured
- File permissions are secure

### Environment Setup Script
**File:** `./.claude/scripts/setup-env.sh`

**Purpose:** Load environment variables for MCP servers

**Usage:**
```bash
# Option 1: Run in current shell
source ./.claude/scripts/setup-env.sh

# Option 2: From another directory
source ~/.claude/scripts/setup-env.sh /path/to/project

# Option 3: Add to shell profile (~/.zprofile)
if [ -f ~/.claude/scripts/setup-env.sh ]; then
  source ~/.claude/scripts/setup-env.sh
fi
```

**What it does:**
- Loads `.env.local` variables from project
- Loads `~/.claude/.env` variables globally
- Exports to shell environment
- Verifies required variables exist
- Shows obfuscated values for security

---

## Configuration Files

### Global Configuration
```
~/.claude/config.json          Global Claude config (system-wide)
~/.claude/settings.json        Global permissions/MCP servers
~/.claude/.env                 Global secrets (git-ignored)
~/.claude/setup-env.sh         Environment setup script
~/.claude/scripts/             Helper scripts directory
```

### Project Configuration
```
./.claude/settings.local.json  Project-specific permissions
./.env.local                   Project secrets (git-ignored)
./.claude/scripts/             Scripts (from global)
```

---

## File Format Reference

### Modern Permission Syntax (Use This)
```json
{
  "permissions": {
    "allow": [
      "Bash(npm :*)",
      "Bash(git :*)",
      "Bash(curl :*)",
      "WebSearch",
      "mcp__*"
    ]
  }
}
```

### Old Permission Syntax (Don't Use)
```json
{
  "permissions": {
    "allow": [
      "Bash(npm)",
      "Bash(git)",
      "Bash(curl)"
    ]
  }
}
```

### MCP Server Configuration
```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@mcp/server-filesystem@latest"],
      "env": {
        "LOG_LEVEL": "info"
      }
    },
    "supabase": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@mcp/server-supabase@latest"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_SERVICE_KEY": "${SUPABASE_SERVICE_KEY}"
      }
    }
  }
}
```

---

## Usage by Role

### Individual Developer
```
Daily:
  1. Before starting Claude Code: Run health check
  2. If errors: Follow quick fix guide

Weekly:
  1. Friday 4pm: Run health check
  2. Check for Claude Code updates

When joining new project:
  1. Read .claude/CLAUDE.md
  2. Run health check
  3. Use setup-env.sh script
```

### Tech Lead / Team Owner
```
Initial Setup:
  1. Read: IMPLEMENTATION_GUIDE.md
  2. Deploy: Scripts to repository
  3. Notify: Team about new process
  4. Verify: Team runs health check

Weekly:
  1. Scan for issues in team chat
  2. Help debug if problems

Monthly:
  1. Run team-wide health audit
  2. Document findings
  3. Update team on status

Quarterly:
  1. Review and update strategies
  2. Plan improvements
```

### DevOps / CI/CD
```
Optional enhancements:
  1. Add health check to GitHub Actions workflow
  2. Auto-validate configs on PR
  3. Notify on deprecation warnings
  4. Generate monthly reports
```

---

## Common Scenarios

### Scenario 1: New Team Member
```
1. Clone repository
2. Run: ./.claude/scripts/claude-health-check.sh
3. If errors, see CLAUDE_CODE_QUICK_CHECKLIST.md#Common Issues
4. When ready: Run setup-env.sh, start Claude Code
```

### Scenario 2: Claude Code Updates Available
```
1. Check: CLAUDE_CODE_QUICK_CHECKLIST.md#Upgrade Claude Code
2. Follow upgrade checklist steps
3. Run health check to validate upgrade
4. Commit any config changes
```

### Scenario 3: MCP Server Not Working
```
1. Run: ./.claude/scripts/claude-health-check.sh
2. Check: Environment variables exported
3. If missing: Run setup-env.sh
4. Restart Claude Code
5. Re-run health check
```

### Scenario 4: Multiple Team Issues
```
1. Run: CLAUDE_CODE_QUICK_CHECKLIST.md#Emergency Recovery
2. Restore from backup configs
3. Validate: Health check for all team members
4. Document: What went wrong, how to prevent
```

---

## Success Metrics

### Before Prevention
- Configuration issues: 3-5 per week
- Time to diagnose: 30-60 minutes
- Team impact: Blocks progress
- Deprecation warnings: Frequent

### After Prevention (Target)
- Configuration issues: 0 per week
- Time to diagnose: 5 minutes (health check)
- Team impact: Caught before commit
- Deprecation warnings: None

### Measurement Methods
- Run health check before/after
- Track team feedback weekly
- Log issues in team chat
- Monthly audit reports

---

## Next Steps

### This Session
- [ ] Read: CLAUDE_CODE_QUICK_CHECKLIST.md
- [ ] Run: `./.claude/scripts/claude-health-check.sh`
- [ ] Fix: Any errors found

### This Week
- [ ] Share: Quick checklist link with team
- [ ] Deploy: Scripts to main branch
- [ ] Train: Team on new process

### This Month
- [ ] Establish: Weekly health check routine
- [ ] Document: Any team-specific issues
- [ ] Refine: Based on team feedback

### Ongoing
- [ ] Weekly: Run health check
- [ ] Monthly: Team audit
- [ ] Quarterly: Strategy review

---

## Support & Troubleshooting

### Getting Help
1. **For daily issues:** See CLAUDE_CODE_QUICK_CHECKLIST.md#Configuration Issues
2. **For setup:** See IMPLEMENTATION_GUIDE.md#Common Fixes
3. **For deep dive:** See CLAUDE_CODE_PREVENTION_STRATEGIES.md

### Common Issues
- Old syntax: Run sed command in quick checklist
- Missing variables: Run setup-env.sh script
- Invalid JSON: Check syntax with jq command
- File not found: Copy from template in quick checklist

### Reporting Issues
1. Run health check, capture output
2. Document steps to reproduce
3. Share with team lead
4. Reference relevant section in docs

---

## Document Map

```
.claude/
├── README_PREVENTION.md (Start here - this file)
├── CLAUDE_CODE_QUICK_CHECKLIST.md (Daily use)
├── CLAUDE_CODE_PREVENTION_STRATEGIES.md (Complete reference)
├── IMPLEMENTATION_GUIDE.md (Setup & deployment)
└── scripts/
    ├── claude-health-check.sh (Main validation tool)
    └── setup-env.sh (Environment setup)
```

---

## Related Documents

- **Project guide:** .claude/CLAUDE.md
- **Lessons learned:** .claude/lessons/
- **Architectural decisions:** .claude/decisions/
- **Solutions:** .claude/solutions/

---

## Contact & Feedback

**Questions about the prevention strategies?**
- Read the relevant document (see Document Map above)
- Check CLAUDE_CODE_QUICK_CHECKLIST.md#Support
- Post in #engineering channel with context

**Found an issue with scripts?**
- Run health check to get diagnostics
- Post output + Claude Code version
- Reference the document section you're in

**Suggestions for improvement?**
- Document in .claude/lessons/ as lessons learned
- Propose changes to CLAUDE_CODE_PREVENTION_STRATEGIES.md
- Discuss with tech lead

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 23, 2025 | Initial prevention strategies document |

---

## Appendix: File Checklist

### Required Files (For Validation to Work)
```
✓ ./.claude/scripts/claude-health-check.sh (executable)
✓ ./.claude/settings.local.json
✓ ~/.claude/settings.json
✓ ~/.claude/config.json
```

### Optional Files (Enhance Functionality)
```
○ ./.env.local (project secrets)
○ ~/.claude/.env (global secrets)
○ ~/.claude/scripts/setup-env.sh (env setup)
○ .git/hooks/pre-commit (validation on commit)
```

### Documentation Files
```
✓ README_PREVENTION.md (this file)
✓ CLAUDE_CODE_QUICK_CHECKLIST.md (daily use)
✓ CLAUDE_CODE_PREVENTION_STRATEGIES.md (reference)
✓ IMPLEMENTATION_GUIDE.md (setup guide)
```

---

**Status:** Ready for Production
**Maintenance Owner:** Engineering Team
**Last Updated:** December 23, 2025
