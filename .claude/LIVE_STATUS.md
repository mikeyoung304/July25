# 🎯 MCP System Status - Live Documentation
*Generated: 2025-08-05T14:09:52.902Z*
*Source of Truth: Auto-generated from actual configurations*

---

## 📊 System Overview

**Status**: All servers connected  
**Configuration Score**: Running live validation...  
**Architecture**: Three-tier (User/Project/Local scopes)  
**Security**: Environment-based credential management

---

## 🏗️ Active MCP Servers

### Project Scope (CLI)
- **filesystem**: `npx @modelcontextprotocol/server-filesystem /Users/mikeyoung/CODING`
- **sequential-thinking**: `npx @modelcontextprotocol/server-sequential-thinking`
- **memory**: `npx @modelcontextprotocol/server-memory`
- **git**: `npx @cyanheads/git-mcp-server` (with env vars)

### User Scope (Desktop)
- **zen**: `npx zen-mcp-server-199bio` - Zen productivity server for cross-project workflows
- **supabase**: `npx supabase-mcp` - Database operations for rebuild-6.0 project
- **github**: `npx @missionsquad/mcp-github` - GitHub API operations for repository management
- **memory-global**: `npx @modelcontextprotocol/server-memory` - Cross-project knowledge persistence

---

## 🔐 Security Configuration

### Credential Management
- Environment variables: ✅ Configured
- Desktop config security: ✅ Using env vars

### Permissions
- Allowed tools: 11 tools specified
- Bash commands: 16 allowed, 7 restricted
- File access: 1 allowed paths, 6 restricted patterns

---

## 📁 Configuration Files

| File | Status | Purpose |
|------|--------|---------|
| `.claude/settings.json` | ✅ | Project-specific settings |
| `.mcp.json` | ✅ | MCP server definitions |
| Desktop config | ✅ | User-scope MCP servers |
| `.claude/.env` | ✅ | Environment variables |

---

## 🔧 Management Commands

```bash
# Health check
./.claude/mcp-health-check.sh

# Configuration validation  
node ./.claude/config-validator.js

# Workflow automation
./.claude/workflow-runner.sh dev-cycle

# Live documentation (this document)
node ./.claude/doc-generator.js
```

---

## 📈 Workflow Patterns

### Current Workflow Configuration
- Architecture: unified-backend
- Test required: ✅
- Lint required: ✅

### Standard Patterns
1. **Architecture Analysis**: sequential-thinking → memory → filesystem
2. **Code Development**: filesystem → sequential-thinking → git → memory
3. **Knowledge Management**: memory → sequential-thinking → filesystem

---

*🤖 This documentation is automatically generated from live system state*
*For manual updates, modify the source configurations and regenerate*
