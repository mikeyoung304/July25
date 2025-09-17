#!/usr/bin/env bash

# Check for snake_case in application code
# This script enforces camelCase convention in the application layer
# Snake_case is only allowed in database-related files

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Checking for snake_case in application code..."

# Directories where snake_case is forbidden
APP_DIRS=(
  "client/src"
  "shared/types"
  "server/src/dto"
  "server/src/routes"
  "server/src/services"
  "server/src/controllers"
  "server/src/middleware"
)

# Exclude the casing transformation file and canonical types
EXCLUDE_FILES=(
  "server/src/lib/casing.ts"
  "server/src/middleware/normalize-casing.ts"
  "shared/types/order.types.canonical.ts"
)

# Common snake_case patterns to check
SNAKE_PATTERNS=(
  "customer_name"
  "table_number"
  "order_type"
  "restaurant_id"
  "menu_item"
  "payment_status"
  "payment_method"
  "created_at"
  "updated_at"
  "completed_at"
  "special_instructions"
  "prep_time"
  "total_amount"
)

# Track violations
VIOLATIONS=0
VIOLATION_FILES=()

# Function to check a file for snake_case
check_file() {
  local file=$1
  local has_violation=false

  # Skip excluded files
  for exclude in "${EXCLUDE_FILES[@]}"; do
    if [[ "$file" == *"$exclude"* ]]; then
      return 0
    fi
  done

  # Skip test files and type definition files
  if [[ "$file" == *.test.ts* ]] || [[ "$file" == *.spec.ts* ]] || [[ "$file" == *.d.ts ]]; then
    return 0
  fi

  # Check for snake_case patterns
  for pattern in "${SNAKE_PATTERNS[@]}"; do
    if grep -q "\b$pattern\b" "$file" 2>/dev/null; then
      if [ "$has_violation" = false ]; then
        VIOLATION_FILES+=("$file")
        has_violation=true
      fi

      # Show the violation in context
      echo -e "${RED}❌ Found snake_case in $file:${NC}"
      grep -n "\b$pattern\b" "$file" | head -3
      echo ""

      ((VIOLATIONS++))
    fi
  done
}

# Check each application directory
for dir in "${APP_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    # Find all TypeScript/JavaScript files
    while IFS= read -r -d '' file; do
      check_file "$file"
    done < <(find "$dir" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -print0)
  fi
done

# Report results
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $VIOLATIONS -gt 0 ]; then
  echo -e "${RED}⛔ Found $VIOLATIONS snake_case violations in ${#VIOLATION_FILES[@]} files${NC}"
  echo ""
  echo "Files with violations:"
  for file in "${VIOLATION_FILES[@]}"; do
    echo "  - $file"
  done
  echo ""
  echo -e "${YELLOW}💡 Fix: Use camelCase for all properties in application code.${NC}"
  echo -e "${YELLOW}   Snake_case is only allowed in database layer files.${NC}"
  echo ""
  echo "Examples of correct naming:"
  echo "  ❌ customer_name  →  ✅ customerName"
  echo "  ❌ table_number   →  ✅ tableNumber"
  echo "  ❌ created_at     →  ✅ createdAt"
  echo ""
  exit 1
else
  echo -e "${GREEN}✅ No snake_case found in application code${NC}"
  echo "All properties use camelCase convention correctly."
fi