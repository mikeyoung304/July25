# Claude Code Configuration Prevention Strategies

**Document Date:** December 23, 2025
**Status:** Actionable Prevention Framework
**Version:** 1.0

---

## Problem Statement

The following configuration issues have occurred:

| Date | Issue | Impact | Root Cause |
|------|-------|--------|------------|
| Nov 24 | Settings files created with old permission syntax | Deprecation warnings | Manual file creation without validation |
| Dec 23 | Claude Code shows outdated syntax warnings | UX degradation | Config not updated to latest format |
| Dec 23 | MCP server env vars not exported to shell | Tool failures | Environment not properly isolated |

**Key Insight:** Configuration issues stem from:
1. Manual configuration without validation
2. Lack of update mechanism for new releases
3. Missing environment variable propagation
4. No automated health checks

---

## Prevention Strategy 1: Keep Claude Code Configs Up to Date

### 1.1 Automated Update Detection

**What to Monitor:**
- Claude Code release notes (monthly)
- `~/.claude/config.json` format changes
- MCP server configuration standards
- Permission syntax updates

**Implementation:**
```bash
# Add to your shell profile (~/.zprofile or ~/.bashrc)
# Check Claude Code version and config compatibility (weekly)
alias check-claude="
  echo '=== Claude Code Version ===';
  which claude;

  echo '=== Global Config Status ===';
  cat ~/.claude/config.json | jq '.version // \"not specified\"';

  echo '=== Settings Last Updated ===';
  stat -f '%Sm' ~/.claude/settings.json 2>/dev/null || stat --format='%y' ~/.claude/settings.json 2>/dev/null;

  echo '=== Local Project Config ===';
  if [ -f ./.claude/settings.local.json ]; then
    echo 'Found: ./.claude/settings.local.json';
    cat ./.claude/settings.local.json | jq '.version // \"(no version specified)\"' 2>/dev/null;
  else
    echo 'Not found: ./.claude/settings.local.json';
  fi
"
```

### 1.2 Configuration Validation Rules

**Syntax to Validate:**

```bash
# Script: validate-claude-config.sh
#!/bin/bash

set -e

validate_config() {
  local config_file="$1"

  if [ ! -f "$config_file" ]; then
    echo "Error: Config file not found: $config_file"
    return 1
  fi

  # Check JSON syntax
  if ! jq empty "$config_file" 2>/dev/null; then
    echo "Error: Invalid JSON in $config_file"
    return 1
  fi

  # Validate permission syntax (modern: "Bash(command :*)" not "Bash(command)")
  if grep -q '"Bash([^:]*)"' "$config_file"; then
    echo "Warning: Old permission syntax detected in $config_file"
    echo "Found: \"Bash(command)\" - should be: \"Bash(command :*)\""
    return 1
  fi

  # Validate MCP server format
  if grep -q '"mcpServers"' "$config_file"; then
    # Should have proper structure
    if ! jq '.mcpServers | keys' "$config_file" > /dev/null 2>&1; then
      echo "Error: Invalid mcpServers format in $config_file"
      return 1
    fi
  fi

  echo "✓ Valid: $config_file"
  return 0
}

# Validate global config
validate_config ~/.claude/config.json

# Validate global settings
if [ -f ~/.claude/settings.json ]; then
  validate_config ~/.claude/settings.json
fi

# Validate local project config (if in Claude Code project)
if [ -f ./.claude/settings.local.json ]; then
  validate_config ./.claude/settings.local.json
fi

echo "All configurations are valid!"
```

**Add to Git Pre-Commit Hook:**

```bash
# .git/hooks/pre-commit (add this function)

validate_claude_configs() {
  echo "Checking Claude Code configurations..."

  # Skip if no .claude directory
  if [ ! -d ./.claude ]; then
    return 0
  fi

  # Validate local config
  if [ -f ./.claude/settings.local.json ]; then
    if ! jq empty ./.claude/settings.local.json 2>/dev/null; then
      echo "ERROR: Invalid JSON in .claude/settings.local.json"
      exit 1
    fi

    # Check for deprecated permission syntax
    if grep -q '"Bash([^:]*)"' ./.claude/settings.local.json; then
      echo "ERROR: Old permission syntax in .claude/settings.local.json"
      echo "Use: \"Bash(command :*)\" not \"Bash(command)\""
      exit 1
    fi
  fi
}

# Call at end of pre-commit checks
validate_claude_configs
```

### 1.3 Update Checklist (When Upgrading Claude Code)

**After installing new Claude Code version:**

```
CLAUDE CODE UPGRADE CHECKLIST
Date: _______________
Version: _____________ → _____________

Syntax Updates:
- [ ] Run: jq . ~/.claude/config.json (verify valid JSON)
- [ ] Check: Permission syntax uses "Bash(command :*)" format
- [ ] Check: MCP servers have proper "type" field (stdio/http)
- [ ] Check: No deprecated keys remaining

Configuration Validation:
- [ ] ~/.claude/config.json - valid and up to date
- [ ] ~/.claude/settings.json - valid and up to date
- [ ] ~/.claude/settings.local.json (global) - if applicable
- [ ] ./.claude/settings.local.json (project) - valid format

Project-Specific:
- [ ] ./.claude/settings.local.json matches latest format
- [ ] All permission rules are current syntax
- [ ] MCP servers configured correctly

Verification:
- [ ] Run: npm run health (if available)
- [ ] Run: claude --version (confirm upgrade)
- [ ] Test: One simple Claude Code query works
- [ ] Check: No deprecation warnings in output

Documented Changes:
- [ ] Note any breaking changes in CHANGELOG
- [ ] Update team on new features/requirements
- [ ] Archive old config as backup: ~/.claude/config.json.backup.$(date +%Y%m%d)
```

### 1.4 Monthly Update Review

**First Monday of each month (30 minutes):**

```bash
#!/bin/bash
# Script: monthly-claude-review.sh

echo "=== Monthly Claude Code Review ==="
echo "Date: $(date)"

echo ""
echo "1. Checking for Claude Code updates..."
# Check if new version available (depends on your setup)
echo "   Current Claude Code version:"
which claude && claude --version

echo ""
echo "2. Validating all configurations..."
echo "   Global config:"
jq . ~/.claude/config.json > /dev/null && echo "   ✓ Valid" || echo "   ✗ Invalid"

echo "   Global settings:"
jq . ~/.claude/settings.json > /dev/null && echo "   ✓ Valid" || echo "   ✗ Invalid"

echo ""
echo "3. Checking for deprecated syntax..."
grep -r '"Bash([^:]*)"' ~/.claude/settings*.json 2>/dev/null && echo "   ✗ Found old syntax" || echo "   ✓ No deprecated syntax"

echo ""
echo "4. Last configuration update:"
ls -l ~/.claude/config.json ~/.claude/settings.json | awk '{print $6, $7, $8, $9}'

echo ""
echo "5. MCP servers configured:"
jq '.mcpServers | keys' ~/.claude/settings.json 2>/dev/null | grep -v '[]'

echo ""
echo "Review complete. Check above for any issues."
```

---

## Prevention Strategy 2: MCP Server Environment Variables

### 2.1 Proper Environment Variable Isolation

**Problem:** MCP servers inherit parent shell environment, but variables set locally in one session aren't available across all sessions.

**Solution: Explicit Environment Configuration**

```json
// ~/.claude/settings.json - MCP Server Configuration

{
  "model": "opus",
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@mcp/server-filesystem@latest"
      ],
      "env": {
        "LOG_LEVEL": "info"
      }
    },
    "supabase": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@mcp/server-supabase@latest"
      ],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_SERVICE_KEY": "${SUPABASE_SERVICE_KEY}",
        "LOG_LEVEL": "debug"
      }
    },
    "render": {
      "type": "http",
      "url": "https://mcp.render.com/mcp",
      "headers": {
        "Authorization": "Bearer ${RENDER_API_TOKEN}"
      }
    }
  }
}
```

**Key Rules:**
1. **Never hardcode secrets** in settings.json
2. **Use environment variable references** with `${VAR_NAME}` syntax
3. **Source variables from .env files** before launching Claude Code
4. **Verify variables exist** before starting

### 2.2 Environment Setup Script

**Create: `~/.claude/setup-env.sh`**

```bash
#!/bin/bash
# Setup environment variables for Claude Code and MCP servers

set -e

# Configuration
PROJECT_ROOT="${1:-.}"
ENV_FILE="${PROJECT_ROOT}/.env.local"
GLOBAL_ENV="${HOME}/.claude/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Setting up Claude Code environment..."

# 1. Load project-specific .env if present
if [ -f "$ENV_FILE" ]; then
  echo -e "${GREEN}✓${NC} Loading project env: $ENV_FILE"
  export $(grep -v '^#' "$ENV_FILE" | grep -v '^\s*$' | xargs)
else
  echo -e "${YELLOW}!${NC} No .env.local found at $PROJECT_ROOT"
fi

# 2. Load global Claude env if present
if [ -f "$GLOBAL_ENV" ]; then
  echo -e "${GREEN}✓${NC} Loading global env: $GLOBAL_ENV"
  export $(grep -v '^#' "$GLOBAL_ENV" | grep -v '^\s*$' | xargs)
else
  echo -e "${YELLOW}!${NC} No global env at ~/.claude/.env"
fi

# 3. Verify critical environment variables
REQUIRED_VARS=(
  "SUPABASE_URL"
  "SUPABASE_ANON_KEY"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "$(eval echo \$$var)" ]; then
    MISSING_VARS+=("$var")
  else
    echo -e "${GREEN}✓${NC} $var is set"
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo -e "${RED}✗${NC} Missing required variables:"
  for var in "${MISSING_VARS[@]}"; do
    echo "    - $var"
  done
  return 1
fi

# 4. Verify MCP server access
echo ""
echo "Checking MCP server connectivity..."

# Test filesystem MCP
if npx @mcp/server-filesystem@latest --help > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Filesystem MCP server accessible"
else
  echo -e "${YELLOW}!${NC} Filesystem MCP server not found"
fi

# Test Supabase MCP
if npx @mcp/server-supabase@latest --help > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Supabase MCP server accessible"
else
  echo -e "${YELLOW}!${NC} Supabase MCP server not found"
fi

echo ""
echo -e "${GREEN}Environment setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Start Claude Code (it will inherit these env vars)"
echo "2. In Claude Code, MCP servers will have access to:"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_ANON_KEY"
echo "   - And other exported variables"
```

**Usage:**
```bash
# Set up environment before starting Claude Code
source ~/.claude/setup-env.sh /Users/mikeyoung/CODING/rebuild-6.0

# Then start Claude Code
claude
```

### 2.3 Shell Profile Integration

**Add to: `~/.zprofile` or `~/.bashrc`**

```bash
# Claude Code MCP Server Environment Setup
# Automatically loaded when opening a new shell in a Claude Code project

# Function to set up Claude environment
setup_claude_env() {
  local project_root="${PWD}"

  # Only run if in a Claude Code project
  if [ ! -d "./.claude" ]; then
    return 0
  fi

  # Source project .env.local
  if [ -f "./.env.local" ]; then
    export $(grep -v '^#' ./.env.local | grep -v '^\s*$' | xargs)
  fi

  # Source global Claude env
  if [ -f ~/.claude/.env ]; then
    export $(grep -v '^#' ~/.claude/.env | grep -v '^\s*$' | xargs)
  fi

  # Export for Claude Code
  export CLAUDE_PROJECT_ROOT="$project_root"
}

# Run on cd into project directory
cd() {
  builtin cd "$@"
  setup_claude_env
}

# Run initial setup
setup_claude_env
```

### 2.4 Environment Variable Audit

**Script: `audit-claude-env.sh`**

```bash
#!/bin/bash
# Audit which environment variables are accessible to Claude Code

echo "=== Claude Code Environment Audit ==="
echo "Time: $(date)"
echo ""

echo "Exported Variables (visible to Claude Code):"
echo "============================================"

# Check critical MCP vars
VARS=(
  "SUPABASE_URL"
  "SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_KEY"
  "RENDER_API_TOKEN"
  "STRIPE_SECRET_KEY"
  "OPENAI_API_KEY"
  "KIOSK_JWT_SECRET"
)

for var in "${VARS[@]}"; do
  value=$(eval echo \$$var)
  if [ -n "$value" ]; then
    # Show only first 10 and last 5 chars for security
    visible="${value:0:10}...${value: -5}"
    echo "  ✓ $var = $visible"
  else
    echo "  ✗ $var = (not set)"
  fi
done

echo ""
echo "Configuration Files:"
echo "===================="

echo "  ~/.claude/config.json exists: $([ -f ~/.claude/config.json ] && echo 'YES' || echo 'NO')"
echo "  ~/.claude/settings.json exists: $([ -f ~/.claude/settings.json ] && echo 'YES' || echo 'NO')"
echo "  ~/.claude/.env exists: $([ -f ~/.claude/.env ] && echo 'YES' || echo 'NO')"
echo "  ./.claude/settings.local.json exists: $([ -f ./.claude/settings.local.json ] && echo 'YES' || echo 'NO')"
echo "  ./.env.local exists: $([ -f ./.env.local ] && echo 'YES' || echo 'NO')"

echo ""
echo "To fix missing variables:"
echo "1. Add to ~/.claude/.env (global) or ./.env.local (project)"
echo "2. Run: source ~/.claude/setup-env.sh"
echo "3. Restart Claude Code"
```

---

## Prevention Strategy 3: Claude Code Setup Checklist for New Machine

### 3.1 Initial Installation Checklist

**Prerequisites:**
```
Machine Requirements:
- [ ] macOS 10.15+ or Linux with Bash/Zsh
- [ ] Node.js 18+
- [ ] npm or pnpm
- [ ] Git configured
- [ ] GitHub CLI (gh) installed
```

**Step 1: Install Claude Code**
```bash
# [ ] Check: Claude Code installed
which claude

# [ ] Verify: Version check
claude --version

# [ ] Confirm: Help works
claude --help | head -5
```

**Step 2: Create Global Configuration Directory**
```bash
# [ ] Create directory
mkdir -p ~/.claude

# [ ] Verify permissions
ls -ld ~/.claude  # Should be drwx------

# [ ] Create subdirectories
mkdir -p ~/.claude/todos
mkdir -p ~/.claude/decisions
mkdir -p ~/.claude/.archive
```

**Step 3: Initialize Global Config Files**

```bash
# Create: ~/.claude/config.json
cat > ~/.claude/config.json << 'EOF'
{
  "version": "5.0",
  "type": "minimal-global",
  "defaults": {
    "memory_mb": 4096
  }
}
EOF
chmod 600 ~/.claude/config.json
```

```bash
# Create: ~/.claude/settings.json
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
chmod 600 ~/.claude/settings.json
```

**Step 4: Set Up Environment**

```bash
# [ ] Create environment file
cat > ~/.claude/.env << 'EOF'
# Claude Code Global Environment
# Add sensitive vars here (not in git)

# Supabase
# SUPABASE_URL=your_url_here
# SUPABASE_ANON_KEY=your_key_here

# Other services
# STRIPE_SECRET_KEY=your_key_here
EOF
chmod 600 ~/.claude/.env

# [ ] Update shell profile
cat >> ~/.zprofile << 'EOF'
# Claude Code environment setup
if [ -f ~/.claude/.env ]; then
  export $(grep -v '^#' ~/.claude/.env | grep -v '^\s*$' | xargs)
fi
EOF
```

**Step 5: Validate Global Configuration**

```bash
# [ ] Validate config JSON
jq . ~/.claude/config.json > /dev/null && echo "✓ config.json valid" || echo "✗ config.json invalid"

# [ ] Validate settings JSON
jq . ~/.claude/settings.json > /dev/null && echo "✓ settings.json valid" || echo "✗ settings.json invalid"

# [ ] Check no old syntax
grep -q '"Bash([^:]*)"' ~/.claude/settings.json && echo "✗ Old syntax found" || echo "✓ Modern syntax"

# [ ] Verify MCP servers
jq '.mcpServers | keys' ~/.claude/settings.json
```

### 3.2 Per-Project Setup Checklist

**When starting work on a Claude Code project:**

```
PROJECT SETUP CHECKLIST
Project: _______________
Date: __________________

Step 1: Clone and Initialize
- [ ] Clone repository
- [ ] cd into project root
- [ ] Verify .claude directory exists: ls -la .claude/

Step 2: Project-Specific Config
- [ ] Check .claude/settings.local.json exists
- [ ] Validate format: jq . .claude/settings.local.json
- [ ] Review permissions section
- [ ] Review MCP servers enabled

Step 3: Environment Setup
- [ ] Copy .env.example to .env.local (if exists)
- [ ] Add required secrets to .env.local
- [ ] Run: source ~/.claude/setup-env.sh .
- [ ] Verify vars exported: env | grep -i SUPABASE

Step 4: Verify Integration
- [ ] Start Claude Code: claude
- [ ] Run simple command to test connection
- [ ] Check for any deprecation warnings
- [ ] Test MCP servers: Try /filesystem or /supabase commands

Step 5: Documentation
- [ ] Read project .claude/CLAUDE.md (if exists)
- [ ] Check for lessons in .claude/lessons/
- [ ] Review ADRs in .claude/decisions/
- [ ] Note any project-specific rules

Step 6: Pre-Commit Hooks
- [ ] Verify .git/hooks/pre-commit exists
- [ ] Check for Claude config validation
- [ ] Test: Make a dummy commit to verify hooks work

Step 7: Health Check
- [ ] Run: npm run health (if available)
- [ ] Run: npm test (verify test suite works)
- [ ] Run: npm run typecheck (verify types are clean)
```

### 3.3 First-Time Setup Script

**Create: `~/.claude/init-new-machine.sh`**

```bash
#!/bin/bash
# Initialize Claude Code on a new machine

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Claude Code Machine Setup${NC}"
echo "============================"

# Step 1: Check prerequisites
echo -e "\n${BLUE}Step 1: Checking prerequisites...${NC}"

if ! command -v claude &> /dev/null; then
  echo -e "${RED}✗ Claude Code not found. Install from https://claude.com/download${NC}"
  exit 1
fi
echo -e "${GREEN}✓${NC} Claude Code installed: $(claude --version)"

if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js not found. Install from https://nodejs.org${NC}"
  exit 1
fi
echo -e "${GREEN}✓${NC} Node.js: $(node --version)"

if ! command -v git &> /dev/null; then
  echo -e "${RED}✗ Git not found. Install from https://git-scm.com${NC}"
  exit 1
fi
echo -e "${GREEN}✓${NC} Git: $(git --version | head -1)"

# Step 2: Create global directory
echo -e "\n${BLUE}Step 2: Creating global configuration...${NC}"

mkdir -p ~/.claude
mkdir -p ~/.claude/todos
mkdir -p ~/.claude/.archive
mkdir -p ~/.claude/decisions
mkdir -p ~/.claude/lessons

chmod 700 ~/.claude
echo -e "${GREEN}✓${NC} Created ~/.claude/"

# Step 3: Initialize config files
echo -e "\n${BLUE}Step 3: Initializing configuration files...${NC}"

cat > ~/.claude/config.json << 'EOF'
{
  "version": "5.0",
  "type": "minimal-global",
  "defaults": {
    "memory_mb": 4096
  }
}
EOF
chmod 600 ~/.claude/config.json
echo -e "${GREEN}✓${NC} Created ~/.claude/config.json"

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
chmod 600 ~/.claude/settings.json
echo -e "${GREEN}✓${NC} Created ~/.claude/settings.json"

# Step 4: Environment setup
echo -e "\n${BLUE}Step 4: Setting up environment...${NC}"

if [ ! -f ~/.claude/.env ]; then
  cat > ~/.claude/.env << 'EOF'
# Claude Code Global Environment
# Add project secrets here (not in git)
EOF
  chmod 600 ~/.claude/.env
  echo -e "${GREEN}✓${NC} Created ~/.claude/.env (add secrets manually)"
else
  echo -e "${YELLOW}!${NC} ~/.claude/.env already exists"
fi

# Step 5: Shell profile integration
echo -e "\n${BLUE}Step 5: Setting up shell integration...${NC}"

SHELL_FILE=""
if [ -f ~/.zprofile ]; then
  SHELL_FILE=~/.zprofile
elif [ -f ~/.bash_profile ]; then
  SHELL_FILE=~/.bash_profile
fi

if [ -n "$SHELL_FILE" ]; then
  if grep -q "Claude Code environment" "$SHELL_FILE"; then
    echo -e "${YELLOW}!${NC} Shell profile already configured"
  else
    cat >> "$SHELL_FILE" << 'EOF'

# Claude Code environment setup
if [ -f ~/.claude/.env ]; then
  export $(grep -v '^#' ~/.claude/.env | grep -v '^\s*$' | xargs)
fi
EOF
    echo -e "${GREEN}✓${NC} Updated $SHELL_FILE"
  fi
else
  echo -e "${YELLOW}!${NC} No shell profile found. Add to ~/.zprofile or ~/.bash_profile:"
  echo 'export $(grep -v "^#" ~/.claude/.env | grep -v "^\s*$" | xargs)'
fi

# Step 6: Validate configuration
echo -e "\n${BLUE}Step 6: Validating configuration...${NC}"

if jq empty ~/.claude/config.json 2>/dev/null; then
  echo -e "${GREEN}✓${NC} config.json is valid JSON"
else
  echo -e "${RED}✗${NC} config.json has invalid JSON"
  exit 1
fi

if jq empty ~/.claude/settings.json 2>/dev/null; then
  echo -e "${GREEN}✓${NC} settings.json is valid JSON"
else
  echo -e "${RED}✗${NC} settings.json has invalid JSON"
  exit 1
fi

# Step 7: Final instructions
echo -e "\n${GREEN}Setup complete!${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo "1. Add any required environment variables to ~/.claude/.env"
echo "2. Restart your shell or run: source ~/.zprofile"
echo "3. For each project, copy CLAUDE.md from repo root"
echo "4. Start Claude Code: ${YELLOW}claude${NC}"
echo ""
echo "For help, see:"
echo "  - Global config: ~/.claude/"
echo "  - Project config: ./.claude/settings.local.json"
echo "  - Claude docs: https://claude.com/code"
```

**Usage:**
```bash
chmod +x ~/.claude/init-new-machine.sh
~/.claude/init-new-machine.sh
```

---

## Prevention Strategy 4: Claude Code Configuration Validation

### 4.1 Automated Health Check

**Create: `.claude/health-check.sh`**

```bash
#!/bin/bash
# Health check for Claude Code configuration and environment

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

check_file() {
  local file="$1"
  local description="$2"

  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $description: $file"
    return 0
  else
    echo -e "${RED}✗${NC} $description: $file (not found)"
    ((ERRORS++))
    return 1
  fi
}

validate_json() {
  local file="$1"

  if ! jq empty "$file" 2>/dev/null; then
    echo -e "${RED}✗${NC} Invalid JSON: $file"
    ((ERRORS++))
    return 1
  fi
}

echo -e "${BLUE}Claude Code Configuration Health Check${NC}"
echo "======================================"

echo -e "\n${BLUE}Global Configuration:${NC}"
check_file ~/.claude/config.json "Global config" && validate_json ~/.claude/config.json
check_file ~/.claude/settings.json "Global settings" && validate_json ~/.claude/settings.json
check_file ~/.claude/.env "Global environment (optional)" || true

echo -e "\n${BLUE}Project Configuration:${NC}"
check_file ./.claude/settings.local.json "Project settings" && validate_json ./.claude/settings.local.json

echo -e "\n${BLUE}Environment Variables:${NC}"
for var in SUPABASE_URL SUPABASE_ANON_KEY NODE_ENV; do
  if [ -n "$(eval echo \$$var)" ]; then
    echo -e "${GREEN}✓${NC} $var is set"
  else
    echo -e "${YELLOW}!${NC} $var is not set"
    ((WARNINGS++))
  fi
done

echo -e "\n${BLUE}Permission Syntax Validation:${NC}"
if grep -q '"Bash([^:]*)"' ~/.claude/settings*.json 2>/dev/null; then
  echo -e "${RED}✗${NC} Old permission syntax detected"
  echo "    Use: \"Bash(command :*)\" not \"Bash(command)\""
  ((ERRORS++))
else
  echo -e "${GREEN}✓${NC} Permission syntax is modern"
fi

echo -e "\n${BLUE}MCP Servers:${NC}"
if jq '.mcpServers' ./.claude/settings.local.json > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} MCP servers configured"
  jq '.mcpServers | keys' ./.claude/settings.local.json | sed 's/^/    /'
else
  echo -e "${YELLOW}!${NC} No MCP servers configured"
fi

echo -e "\n${BLUE}Summary:${NC}"
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"

if [ $ERRORS -eq 0 ]; then
  echo -e "\n${GREEN}All checks passed!${NC}"
  exit 0
else
  echo -e "\n${RED}Fix the above errors before continuing.${NC}"
  exit 1
fi
```

**Usage:**
```bash
chmod +x ./.claude/health-check.sh
npm run health  # or
./.claude/health-check.sh
```

### 4.2 Configuration Linting

**Create: Pre-commit hook to validate configs**

```bash
# .git/hooks/pre-commit

#!/bin/bash
set -e

# Validate Claude Code configs
if [ -d "./.claude" ]; then
  # Check settings.local.json exists
  if [ ! -f "./.claude/settings.local.json" ]; then
    echo "Error: .claude/settings.local.json not found"
    exit 1
  fi

  # Validate JSON
  if ! jq empty "./.claude/settings.local.json" 2>/dev/null; then
    echo "Error: .claude/settings.local.json has invalid JSON"
    exit 1
  fi

  # Check for old syntax
  if grep -q '"Bash([^:]*)"' "./.claude/settings.local.json"; then
    echo "Error: Old permission syntax in .claude/settings.local.json"
    echo "Use: \"Bash(command :*)\" not \"Bash(command)\""
    exit 1
  fi
fi

# Continue with other pre-commit checks...
```

### 4.3 Configuration Documentation

**Create: `.claude/CONFIGURATION_GUIDE.md`**

```markdown
# Claude Code Configuration Guide

## Overview

This project uses Claude Code with the following configuration:

### Files
- `./.claude/settings.local.json` - Project-specific settings
- `~/.claude/settings.json` - Global settings
- `~/.claude/config.json` - Global configuration

### Permission Model
See `settings.local.json` for current permissions. Uses modern syntax:
- ✓ Correct: `"Bash(npm :*)"`
- ✗ Old: `"Bash(npm)"`

### MCP Servers
Enabled servers:
- filesystem: Local file operations
- sequential-thinking: For complex reasoning
- [others as configured]

## Adding New Permissions

To add a new permission:
1. Edit `.claude/settings.local.json`
2. Add to "permissions.allow" array
3. Use format: `"Tool(pattern :*)"`
4. Run: `./.claude/health-check.sh`
5. Commit changes

## Troubleshooting

### Claude Code shows deprecation warnings
- [ ] Run: `jq . ~/.claude/settings.json`
- [ ] Check permissions use `:*` syntax
- [ ] Update from Claude docs if available

### MCP servers not working
- [ ] Run: `./.claude/health-check.sh`
- [ ] Verify environment variables exported
- [ ] Check: `env | grep -i SUPABASE`
- [ ] Restart Claude Code

### File permissions issues
- [ ] Verify: `ls -la ./.claude/settings.local.json`
- [ ] Should be readable by current user
- [ ] Run: `chmod 644 ./.claude/settings.local.json`

## Regular Maintenance

- **Weekly:** Run `./.claude/health-check.sh`
- **Monthly:** Check for Claude Code updates
- **Quarterly:** Review and update permissions
```

---

## Quick Reference Checklist

### Configuration Validation Checklist (Use Before Each Session)

```bash
CLAUDE CODE CONFIGURATION VALIDATION
Date: _______________

Global Setup:
- [ ] ~/.claude/config.json exists and valid JSON
- [ ] ~/.claude/settings.json exists and valid JSON
- [ ] ~/.claude/.env exists with required secrets
- [ ] No old permission syntax (Bash(command) vs Bash(command :*))

Project Setup:
- [ ] ./.claude/settings.local.json exists
- [ ] settings.local.json has valid JSON syntax
- [ ] ./.claude/health-check.sh passes
- [ ] MCP servers configured correctly

Environment:
- [ ] SUPABASE_URL is exported: echo $SUPABASE_URL
- [ ] SUPABASE_ANON_KEY is exported: echo $SUPABASE_ANON_KEY
- [ ] NODE_ENV is set correctly
- [ ] Other project-specific vars are set

Claude Code Readiness:
- [ ] claude --version shows expected version
- [ ] No deprecation warnings in output
- [ ] Test command works: /filesystem or simple grep
- [ ] MCP server connection successful

All checks passed: YES / NO

Issues found:
_____________________
_____________________
_____________________
```

---

## Summary: The 4 Prevention Strategies

### 1. **Keep Configs Up to Date**
   - Monthly review: `check-claude` alias
   - Validation script for syntax
   - Pre-commit hooks to prevent bad configs
   - Upgrade checklist for new Claude Code versions

### 2. **MCP Environment Variables**
   - Explicit `env` section in MCP config
   - Use `${VAR_NAME}` references, never hardcode
   - Setup script: `~/.claude/setup-env.sh`
   - Shell profile integration for auto-loading

### 3. **New Machine Setup Checklist**
   - Prerequisites validation
   - Directory structure creation
   - Config file templates
   - Environment initialization
   - Validation before first use
   - Automated init script

### 4. **Configuration Validation**
   - Health check script
   - Pre-commit JSON validation
   - Permission syntax linting
   - MCP server verification
   - Environment variable audit

---

## Implementation Timeline

**Week 1:**
- [ ] Copy all scripts to `~/.claude/` and `./.claude/`
- [ ] Run initial health check
- [ ] Update shell profile with setup script
- [ ] Test with one project

**Week 2-4:**
- [ ] Run monthly review script
- [ ] Fix any identified issues
- [ ] Document any project-specific quirks
- [ ] Update team on new procedures

**Ongoing:**
- [ ] Weekly: `check-claude` alias (5 min)
- [ ] Monthly: Full audit (30 min)
- [ ] Per-session: `health-check.sh` before starting (2 min)

---

## Success Metrics

Track these to verify prevention strategies are working:

```
Before Prevention:
- Config issues found: Multiple
- Time to diagnose: 30-60 minutes
- Deprecation warnings: Frequent
- MCP failures: 5-10% of sessions

After Prevention (Target):
- Config issues found: Zero
- Time to diagnose: 5 minutes (via health check)
- Deprecation warnings: None
- MCP failures: <1% (documented)
- New machine setup: <30 minutes
```

---

## References

- Claude Code Documentation: https://claude.com/code
- MCP Server Standards: https://modelcontextprotocol.io
- Configuration Schema: `~/.claude/settings.json`
- Project ADRs: `./.claude/decisions/`

---

**Version:** 1.0
**Last Updated:** December 23, 2025
**Status:** Ready for Implementation
**Maintenance Owner:** Engineering Team
