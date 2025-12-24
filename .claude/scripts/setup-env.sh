#!/bin/bash
# Setup environment variables for Claude Code and MCP servers
# Usage: source ~/.claude/setup-env.sh [project_root]

set -e

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
  # Use a subshell to avoid polluting current environment with comments/invalid lines
  while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    # Remove leading/trailing whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    # Export variable
    export "$key=$value"
  done < "$ENV_FILE"
else
  echo -e "${YELLOW}!${NC} No .env.local found at $PROJECT_ROOT"
fi

# 2. Load global Claude env if present
if [ -f "$GLOBAL_ENV" ]; then
  echo -e "${GREEN}✓${NC} Loading global env: $GLOBAL_ENV"
  while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    # Remove leading/trailing whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    # Export variable (global env takes precedence if already set)
    if [ -z "$(eval echo \$$key)" ]; then
      export "$key=$value"
    fi
  done < "$GLOBAL_ENV"
else
  echo -e "${YELLOW}!${NC} No global env at ~/.claude/.env"
fi

# 3. Verify critical environment variables
echo ""
echo "Verifying critical variables..."

REQUIRED_VARS=(
  "SUPABASE_URL"
  "SUPABASE_ANON_KEY"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "$(eval echo \$$var)" ]; then
    MISSING_VARS+=("$var")
  else
    # Show obfuscated value for security
    value=$(eval echo \$$var)
    if [ ${#value} -gt 15 ]; then
      visible="${value:0:5}...${value: -5}"
    else
      visible="[set]"
    fi
    echo -e "${GREEN}✓${NC} $var = $visible"
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo ""
  echo -e "${RED}✗${NC} Missing required variables:"
  for var in "${MISSING_VARS[@]}"; do
    echo "    - $var"
  done
  echo ""
  echo "Add to $ENV_FILE or ~/.claude/.env and try again."
  return 1 2>/dev/null || exit 1
fi

# 4. Optional: Verify MCP server accessibility
echo ""
echo "Checking MCP server availability..."

if command -v npx &> /dev/null; then
  # Test filesystem MCP (lightweight check)
  if npm list --depth=0 @mcp/server-filesystem > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Filesystem MCP available locally"
  elif npx -y @mcp/server-filesystem@latest --help > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Filesystem MCP accessible via npx"
  else
    echo -e "${YELLOW}!${NC} Filesystem MCP not readily available"
  fi
else
  echo -e "${YELLOW}!${NC} npm not found, skipping MCP checks"
fi

echo ""
echo -e "${GREEN}Environment setup complete!${NC}"
echo ""
echo "You can now start Claude Code with environment variables already exported:"
echo "  $ claude"
echo ""
echo "The following environment variables are now available to Claude Code:"
echo "  - SUPABASE_URL"
echo "  - SUPABASE_ANON_KEY"
echo "  - And other variables from $ENV_FILE and $GLOBAL_ENV"
