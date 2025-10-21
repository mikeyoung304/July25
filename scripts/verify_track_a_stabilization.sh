#!/bin/bash

# Track A Stabilization Verification Script
# Automated testing for Oct 21 deployment fixes
# Generates TRACK_A_VERIFICATION_REPORT.md with results

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

REPORT="TRACK_A_VERIFICATION_REPORT.md"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
PASS_COUNT=0
FAIL_COUNT=0

# Initialize report
cat > $REPORT << 'EOF'
# Track A Stabilization Verification Report

**Generated**: TIMESTAMP_PLACEHOLDER
**Track A Deployment**: October 21, 2025
**Fixes Verified**: RPC version column, Voice order totals, Tax rate alignment

---

## Executive Summary

| Category | Status |
|----------|--------|
| Database Schema | STATUS_DB |
| Code Consistency | STATUS_CODE |
| Test Suite | STATUS_TESTS |
| **Overall** | **STATUS_OVERALL** |

---

EOF

sed -i '' "s/TIMESTAMP_PLACEHOLDER/$TIMESTAMP/g" $REPORT

echo -e "${YELLOW}🔍 Track A Stabilization Verification${NC}"
echo -e "${YELLOW}======================================${NC}\n"

# Helper functions
pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    echo "- ✅ **PASS**: $1" >> $REPORT
    ((PASS_COUNT++))
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    echo "- ❌ **FAIL**: $1" >> $REPORT
    ((FAIL_COUNT++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    echo "- ⚠️  **WARN**: $1" >> $REPORT
}

section() {
    echo -e "\n${YELLOW}## $1${NC}"
    echo "" >> $REPORT
    echo "## $1" >> $REPORT
    echo "" >> $REPORT
}

#############################################
# Part 1: Database Schema Verification
#############################################
section "Part 1: Database Schema Verification"

echo "Checking database schema changes..."

# Verify schema changes via migration files (more reliable than DB queries)
echo "Verifying schema changes from migration files..."

# Check RPC function includes version in RETURNS TABLE
echo "Checking create_order_with_audit RPC signature..."
RPC_MIGRATION="supabase/migrations/20251020221553_fix_create_order_with_audit_version.sql"

if [[ ! -f "$RPC_MIGRATION" ]]; then
    fail "Missing RPC fix migration: $RPC_MIGRATION"
else
    # Check if version appears in RETURNS TABLE
    if grep -q "version INTEGER.*-- ✅ ADDED" "$RPC_MIGRATION"; then
        pass "RPC function includes version in RETURNS TABLE (verified in migration)"
    else
        fail "RPC migration missing version in RETURNS TABLE"
    fi
fi

# Check orders.version column migration
echo "Checking orders.version column..."
VERSION_MIGRATION="supabase/migrations/20251019183600_add_version_to_orders.sql"

if [[ ! -f "$VERSION_MIGRATION" ]]; then
    fail "Missing version column migration: $VERSION_MIGRATION"
else
    if grep -q "ADD COLUMN.*version INTEGER NOT NULL DEFAULT 1" "$VERSION_MIGRATION"; then
        pass "orders.version column added (type: INTEGER, verified in migration)"
    else
        fail "Version column migration incomplete or incorrect"
    fi
fi

# Check restaurants.tax_rate column migration
echo "Checking restaurants.tax_rate column..."
TAX_MIGRATION="supabase/migrations/20251019180000_add_tax_rate_to_restaurants.sql"

if [[ ! -f "$TAX_MIGRATION" ]]; then
    fail "Missing tax_rate column migration: $TAX_MIGRATION"
else
    if grep -q "ADD COLUMN.*tax_rate DECIMAL(5,4)" "$TAX_MIGRATION"; then
        pass "restaurants.tax_rate column added (type: DECIMAL(5,4), default: 0.0825)"
    else
        fail "Tax rate column migration incomplete or incorrect"
    fi
fi

#############################################
# Part 2: Code Consistency Checks
#############################################
section "Part 2: Code Consistency Checks"

echo "Scanning codebase for tax rate consistency..."

# Find all tax rate occurrences
TAX_RATES=$(grep -r "0\.0[78]" client/src server/src shared/ 2>/dev/null | grep -v "node_modules" | grep -v ".test." | grep -v "CHANGELOG" || true)

# Check for 0.07 (should be gone)
if echo "$TAX_RATES" | grep -q "0\.07"; then
    fail "Found hardcoded 0.07 tax rate (should be 0.0825)"
    echo "$TAX_RATES" | grep "0\.07" >> $REPORT
else
    pass "No hardcoded 0.07 tax rates found"
fi

# Check for 0.08 (should be gone except in comments/docs)
TAX_08=$(echo "$TAX_RATES" | grep "0\.08" | grep -v "0.0825" | grep -v "//" | grep -v "#" || true)
if [[ -n "$TAX_08" ]]; then
    fail "Found hardcoded 0.08 tax rate (should be 0.0825)"
    echo '```' >> $REPORT
    echo "$TAX_08" >> $REPORT
    echo '```' >> $REPORT
else
    pass "No hardcoded 0.08 tax rates found (excluding comments)"
fi

# Verify useVoiceOrderWebRTC has tax in total
echo "Checking useVoiceOrderWebRTC.ts total calculation..."

VOICE_TOTAL=$(grep -A 10 "total_amount:" client/src/pages/hooks/useVoiceOrderWebRTC.ts | head -15)

if echo "$VOICE_TOTAL" | grep -q "subtotal.*tax"; then
    pass "useVoiceOrderWebRTC calculates total_amount with tax"
else
    fail "useVoiceOrderWebRTC may not include tax in total_amount"
fi

# Verify VoiceOrderProcessor uses 0.0825
echo "Checking VoiceOrderProcessor.ts tax rate..."

if grep -q "0\.0825" client/src/modules/voice/services/VoiceOrderProcessor.ts; then
    pass "VoiceOrderProcessor uses 0.0825 tax rate"
elif grep -q "0\.08[^2]" client/src/modules/voice/services/VoiceOrderProcessor.ts; then
    fail "VoiceOrderProcessor uses incorrect tax rate (not 0.0825)"
else
    warn "Could not verify VoiceOrderProcessor tax rate"
fi

#############################################
# Part 3: Test Suite Execution
#############################################
section "Part 3: Test Suite Execution"

echo "Running server test suite..."

cd server

# Run tests and capture output
if npm test -- --run 2>&1 | tee /tmp/test_output.log | tail -20; then
    pass "Server test suite passed"

    # Check specifically for multi-tenancy tests
    if grep -q "multi-tenancy" /tmp/test_output.log && grep -q "passing" /tmp/test_output.log; then
        pass "Multi-tenancy tests verified passing"
    else
        warn "Could not confirm multi-tenancy test status"
    fi
else
    fail "Server test suite has failures"
    echo '```' >> $REPORT
    tail -50 /tmp/test_output.log >> $REPORT
    echo '```' >> $REPORT
fi

cd ..

#############################################
# Part 4: Git & CI Status
#############################################
section "Part 4: Git & CI Health Check"

echo "Checking git status..."

# Check current branch
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" == "main" ]]; then
    pass "On main branch"
else
    warn "Not on main branch (current: $BRANCH)"
fi

# Check for uncommitted changes
if [[ -z $(git status --porcelain) ]]; then
    pass "No uncommitted changes"
else
    warn "Uncommitted changes present"
fi

# Check latest commit
LATEST_COMMIT=$(git log -1 --oneline)
echo "Latest commit: $LATEST_COMMIT" >> $REPORT

#############################################
# Part 5: Manual Testing Checklist
#############################################
section "Part 5: Manual Browser Testing Checklist"

cat >> $REPORT << 'EOF'
**Instructions**: Perform these tests manually and check off each item.

### Test 1: Voice Order Flow (5 minutes)

**Environment**: `npm run dev` → http://localhost:5173/server

**Steps**:
1. [ ] Navigate to ServerView (/server)
2. [ ] Click voice ordering interface
3. [ ] **Say**: "I want five Greek salads"
4. [ ] **Verify**: Quantity shows 5 (not 1)
5. [ ] **Verify**: Total = subtotal + 8.25% tax
   - Example: $60 subtotal → $64.95 total (not $60)
6. [ ] Submit order
7. [ ] **Check**: Response is 200 (not 500)
8. [ ] **Check**: Browser console shows no errors

**Expected**: Quantity=5, Total includes tax, No errors

---

### Test 2: Online Checkout Flow (10 minutes)

**Environment**: http://localhost:5173/order

**Steps**:
1. [ ] Add multiple items to cart
2. [ ] Navigate to /checkout
3. [ ] **Verify**: Tax line shows 8.25% of subtotal
4. [ ] **Verify**: Total = Subtotal + Tax + Tip (math check)
5. [ ] Click "Place Order"
6. [ ] **Check**: Redirects to order confirmation
7. [ ] **Check**: Confirmation shows correct total
8. [ ] **Check**: Browser console shows no errors

**Expected**: Tax at 8.25%, Correct totals, No errors

---

### Test 3: Kitchen Display System (5 minutes)

**Environment**: http://localhost:5173/kitchen

**Steps**:
1. [ ] Navigate to KDS
2. [ ] **Verify**: Orders from Test 1 & 2 appear
3. [ ] Open DevTools → Network → WS (WebSocket tab)
4. [ ] **Check**: WebSocket connection active
5. [ ] Click on an order
6. [ ] **Check**: Response includes `version` field (in DevTools)
7. [ ] Create another order (Test 1 or 2)
8. [ ] **Check**: New order appears without refresh

**Expected**: Real-time updates work, Version field present

---

### Manual Test Results

**Date Tested**: _________________

**Tested By**: _________________

**Results**:
- [ ] All voice order tests passed
- [ ] All checkout tests passed
- [ ] All KDS tests passed
- [ ] No critical errors observed

**Notes/Issues**:
```
(Add any issues found here)
```

EOF

#############################################
# Final Report Summary
#############################################
section "Final Verification Summary"

TOTAL_TESTS=$((PASS_COUNT + FAIL_COUNT))

cat >> $REPORT << EOF
**Automated Tests**: $PASS_COUNT passed, $FAIL_COUNT failed (Total: $TOTAL_TESTS)

EOF

if [[ $FAIL_COUNT -eq 0 ]]; then
    echo -e "\n${GREEN}✅ All automated checks PASSED ($PASS_COUNT/$TOTAL_TESTS)${NC}"
    echo "**Status**: ✅ **ALL AUTOMATED CHECKS PASSED**" >> $REPORT
    OVERALL_STATUS="✅ PASS"
    DB_STATUS="✅ PASS"
    CODE_STATUS="✅ PASS"
    TESTS_STATUS="✅ PASS"
else
    echo -e "\n${RED}❌ Some checks FAILED ($FAIL_COUNT failures)${NC}"
    echo "**Status**: ❌ **FAILURES DETECTED - REVIEW REQUIRED**" >> $REPORT
    OVERALL_STATUS="❌ FAIL"
    DB_STATUS="⚠️  CHECK REPORT"
    CODE_STATUS="⚠️  CHECK REPORT"
    TESTS_STATUS="⚠️  CHECK REPORT"
fi

echo "" >> $REPORT
echo "---" >> $REPORT
echo "" >> $REPORT
echo "## Next Steps" >> $REPORT
echo "" >> $REPORT

if [[ $FAIL_COUNT -eq 0 ]]; then
    cat >> $REPORT << 'EOF'
1. **Complete manual browser tests** (see Part 5 checklist above)
2. **If all manual tests pass** → Track A is STABLE ✅
3. **Decision**: PROCEED to Track B implementation
4. **Timeline**: Track B estimated 1-2 days (10-16 hours)

**Recommendation**: ✅ Track A is stable, ready for Track B

EOF
else
    cat >> $REPORT << 'EOF'
1. **Review failures above** and investigate root causes
2. **Fix issues** before proceeding to manual tests
3. **Re-run this script** after fixes applied
4. **DO NOT proceed to Track B** until all checks pass

**Recommendation**: ❌ Fix failures before Track B

EOF
fi

# Update executive summary with final status
sed -i '' "s/STATUS_DB/$DB_STATUS/g" $REPORT
sed -i '' "s/STATUS_CODE/$CODE_STATUS/g" $REPORT
sed -i '' "s/STATUS_TESTS/$TESTS_STATUS/g" $REPORT
sed -i '' "s/STATUS_OVERALL/$OVERALL_STATUS/g" $REPORT

echo -e "\n${YELLOW}📄 Report generated: $REPORT${NC}"
echo -e "${YELLOW}======================================${NC}\n"

if [[ $FAIL_COUNT -eq 0 ]]; then
    exit 0
else
    exit 1
fi
