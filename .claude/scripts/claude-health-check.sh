#!/bin/bash
# Claude Code Health Check Script
# Run this before each Claude Code session to validate configuration

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Helper functions
check_file() {
  local file="$1"
  local description="$2"
  local required="${3:-true}"

  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $description"
    return 0
  else
    if [ "$required" = "true" ]; then
      echo -e "${RED}✗${NC} $description: $file (not found)"
      ((ERRORS++))
    else
      echo -e "${YELLOW}!${NC} $description: $file (optional, not found)"
      ((WARNINGS++))
    fi
    return 1
  fi
}

validate_json() {
  local file="$1"
  local description="$2"

  if ! jq empty "$file" 2>/dev/null; then
    echo -e "${RED}✗${NC} Invalid JSON in $description: $file"
    jq . "$file" 2>&1 | grep -E "parse error|line [0-9]+" | head -1
    ((ERRORS++))
    return 1
  fi
  return 0
}

check_env_var() {
  local var="$1"
  local required="${2:-true}"

  if [ -n "$(eval echo \$$var)" ]; then
    value=$(eval echo \$$var)
    # Show obfuscated value for security
    if [ ${#value} -gt 20 ]; then
      visible="${value:0:5}...${value: -5}"
    else
      visible="[set]"
    fi
    echo -e "${GREEN}✓${NC} \$$var = $visible"
    return 0
  else
    if [ "$required" = "true" ]; then
      echo -e "${RED}✗${NC} \$$var is not set (required)"
      ((ERRORS++))
    else
      echo -e "${YELLOW}!${NC} \$$var is not set (optional)"
      ((WARNINGS++))
    fi
    return 1
  fi
}

print_header() {
  echo ""
  echo -e "${BLUE}${BOLD}$1${NC}"
  echo -e "${BLUE}$(printf '=%.0s' {1..50})${NC}"
}

# Main checks
print_header "Claude Code Health Check"
echo "Time: $(date)"
echo "Working Directory: $(pwd)"

print_header "1. Global Configuration Files"
check_file ~/.claude/config.json "Global config"
check_file ~/.claude/settings.json "Global settings"
check_file ~/.claude/.env "Global environment" false

print_header "2. Project Configuration Files"
check_file ./.claude/settings.local.json "Project settings"

print_header "3. JSON Syntax Validation"
if [ -f ~/.claude/config.json ]; then
  validate_json ~/.claude/config.json "~/.claude/config.json"
fi

if [ -f ~/.claude/settings.json ]; then
  validate_json ~/.claude/settings.json "~/.claude/settings.json"
fi

if [ -f ./.claude/settings.local.json ]; then
  validate_json ./.claude/settings.local.json "./.claude/settings.local.json"
fi

print_header "4. Permission Syntax Check"
SYNTAX_ERRORS=0

for file in ~/.claude/settings.json ./.claude/settings.local.json; do
  if [ -f "$file" ]; then
    if grep -q '"Bash([^:]*)"' "$file" 2>/dev/null; then
      echo -e "${RED}✗${NC} Old permission syntax found in $file"
      echo "    Found: \"Bash(command)\" - should be: \"Bash(command :*)\""
      ((SYNTAX_ERRORS++))
      ((ERRORS++))
    fi
  fi
done

if [ $SYNTAX_ERRORS -eq 0 ]; then
  echo -e "${GREEN}✓${NC} All permissions use modern syntax"
fi

print_header "5. Environment Variables"
echo "Required variables:"
check_env_var "SUPABASE_URL" true
check_env_var "SUPABASE_ANON_KEY" true

echo ""
echo "Optional variables:"
check_env_var "NODE_ENV" false
check_env_var "STRIPE_SECRET_KEY" false
check_env_var "OPENAI_API_KEY" false

print_header "6. MCP Servers Configuration"
if [ -f ./.claude/settings.local.json ]; then
  MCP_SERVERS=$(jq -r '.enabledMcpjsonServers[]? // .mcpServers[]? // empty' ./.claude/settings.local.json 2>/dev/null)

  if [ -n "$MCP_SERVERS" ]; then
    echo -e "${GREEN}✓${NC} MCP servers configured:"
    echo "$MCP_SERVERS" | sed 's/^/    /'
  else
    echo -e "${YELLOW}!${NC} No explicit MCP server configuration found"
    echo "    This may be intentional if using defaults"
  fi
else
  echo -e "${RED}✗${NC} No MCP configuration to check"
fi

print_header "7. File Permissions"
if [ -f ~/.claude/config.json ]; then
  perms=$(stat -f "%OLp" ~/.claude/config.json 2>/dev/null || stat --format=%a ~/.claude/config.json 2>/dev/null)
  echo "~/.claude/config.json: $perms"
fi

if [ -f ~/.claude/settings.json ]; then
  perms=$(stat -f "%OLp" ~/.claude/settings.json 2>/dev/null || stat --format=%a ~/.claude/settings.json 2>/dev/null)
  echo "~/.claude/settings.json: $perms"
fi

if [ -f ~/.claude/.env ]; then
  perms=$(stat -f "%OLp" ~/.claude/.env 2>/dev/null || stat --format=%a ~/.claude/.env 2>/dev/null)
  echo -e "~/.claude/.env: $perms"
  if [[ ! "$perms" =~ 600 ]]; then
    echo -e "${YELLOW}!${NC} Consider restricting .env to 600: chmod 600 ~/.claude/.env"
  fi
fi

print_header "8. Claude Code Installation"
if command -v claude &> /dev/null; then
  echo -e "${GREEN}✓${NC} Claude Code is installed"
  claude --version 2>/dev/null || echo "    (version check not available)"
else
  echo -e "${RED}✗${NC} Claude Code not found in PATH"
  ((ERRORS++))
fi

print_header "9. Dependencies"
echo "Checking required tools:"

for cmd in jq npm node git; do
  if command -v "$cmd" &> /dev/null; then
    version=$($cmd --version 2>&1 | head -1)
    echo -e "${GREEN}✓${NC} $cmd: $version"
  else
    echo -e "${YELLOW}!${NC} $cmd: not found (optional for basic checks)"
  fi
done

print_header "Summary"
echo -e "Errors:   ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"

if [ $ERRORS -eq 0 ]; then
  echo ""
  if [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✓ All checks passed!${NC}"
    echo ""
    echo "You're ready to use Claude Code."
    exit 0
  else
    echo -e "${YELLOW}${BOLD}⚠ Checks passed with warnings${NC}"
    echo ""
    echo "Review the warnings above."
    echo "Claude Code may work but review recommended."
    exit 0
  fi
else
  echo ""
  echo -e "${RED}${BOLD}✗ Fix the above errors before continuing${NC}"
  echo ""
  echo "Common fixes:"
  echo "1. Old permission syntax:"
  echo "   sed -i '' 's/\"Bash(\\([^:]*\\))/\"Bash(\\1 :*)/g' ~/.claude/settings.json"
  echo ""
  echo "2. Missing environment variables:"
  echo "   source ~/.claude/setup-env.sh"
  echo ""
  echo "3. Invalid JSON:"
  echo "   jq . ~/.claude/settings.json  # Shows exact error"
  echo ""
  exit 1
fi
