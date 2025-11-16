#!/bin/bash
# Master Verification Script
# Runs all environment and API verification scripts
# Usage: ./scripts/verify-all.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${BLUE}========================================${NC}"
echo -e "${BOLD}${BLUE} Complete Environment Verification Suite${NC}"
echo -e "${BOLD}${BLUE}========================================${NC}"
echo ""
echo -e "${BLUE}This script will run:${NC}"
echo -e "  1. Local .env health check"
echo -e "  2. Vercel environment verification"
echo -e "  3. Render API testing"
echo ""
echo -e "${YELLOW}Press Enter to continue or Ctrl+C to cancel...${NC}"
read

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Counters for overall results
TOTAL_SCRIPTS=3
PASSED_SCRIPTS=0
FAILED_SCRIPTS=0

# Test 1: Local .env health check
echo -e "\n${BOLD}${BLUE}[1/3] Running Local .env Health Check${NC}"
echo -e "${BLUE}=======================================${NC}\n"

if [ -f "$SCRIPT_DIR/verify-env-health.sh" ]; then
    if bash "$SCRIPT_DIR/verify-env-health.sh"; then
        echo -e "\n${GREEN}✓ Local .env health check PASSED${NC}"
        PASSED_SCRIPTS=$((PASSED_SCRIPTS + 1))
    else
        echo -e "\n${RED}✗ Local .env health check FAILED${NC}"
        FAILED_SCRIPTS=$((FAILED_SCRIPTS + 1))
    fi
else
    echo -e "${RED}✗ Script not found: verify-env-health.sh${NC}"
    FAILED_SCRIPTS=$((FAILED_SCRIPTS + 1))
fi

echo -e "\n${BLUE}Press Enter to continue to Vercel check...${NC}"
read

# Test 2: Vercel environment verification
echo -e "\n${BOLD}${BLUE}[2/3] Running Vercel Environment Verification${NC}"
echo -e "${BLUE}===============================================${NC}\n"

if [ -f "$SCRIPT_DIR/verify-vercel-env.sh" ]; then
    if bash "$SCRIPT_DIR/verify-vercel-env.sh"; then
        echo -e "\n${GREEN}✓ Vercel environment verification PASSED${NC}"
        PASSED_SCRIPTS=$((PASSED_SCRIPTS + 1))
    else
        echo -e "\n${RED}✗ Vercel environment verification FAILED${NC}"
        FAILED_SCRIPTS=$((FAILED_SCRIPTS + 1))
    fi
else
    echo -e "${RED}✗ Script not found: verify-vercel-env.sh${NC}"
    FAILED_SCRIPTS=$((FAILED_SCRIPTS + 1))
fi

echo -e "\n${BLUE}Press Enter to continue to Render API tests...${NC}"
read

# Test 3: Render API testing
echo -e "\n${BOLD}${BLUE}[3/3] Running Render API Testing${NC}"
echo -e "${BLUE}===================================${NC}\n"

if [ -f "$SCRIPT_DIR/verify-render-api.sh" ]; then
    # Check if custom backend URL provided
    BACKEND_URL="${1:-https://july25.onrender.com}"

    if bash "$SCRIPT_DIR/verify-render-api.sh" "$BACKEND_URL"; then
        echo -e "\n${GREEN}✓ Render API testing PASSED${NC}"
        PASSED_SCRIPTS=$((PASSED_SCRIPTS + 1))
    else
        echo -e "\n${RED}✗ Render API testing FAILED${NC}"
        FAILED_SCRIPTS=$((FAILED_SCRIPTS + 1))
    fi
else
    echo -e "${RED}✗ Script not found: verify-render-api.sh${NC}"
    FAILED_SCRIPTS=$((FAILED_SCRIPTS + 1))
fi

# Overall Summary
echo -e "\n${BOLD}${BLUE}========================================${NC}"
echo -e "${BOLD}${BLUE} Overall Verification Summary${NC}"
echo -e "${BOLD}${BLUE}========================================${NC}\n"

echo -e "Total Verification Scripts: $TOTAL_SCRIPTS"
echo -e "${GREEN}Passed: $PASSED_SCRIPTS${NC}"
echo -e "${RED}Failed: $FAILED_SCRIPTS${NC}"
echo ""

# Detailed breakdown
echo -e "${BLUE}Detailed Results:${NC}"

if [ -f "$SCRIPT_DIR/verify-env-health.sh" ]; then
    if bash "$SCRIPT_DIR/verify-env-health.sh" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Local .env health check"
    else
        echo -e "  ${RED}✗${NC} Local .env health check"
    fi
fi

if [ -f "$SCRIPT_DIR/verify-vercel-env.sh" ]; then
    if bash "$SCRIPT_DIR/verify-vercel-env.sh" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Vercel environment"
    else
        echo -e "  ${RED}✗${NC} Vercel environment"
    fi
fi

if [ -f "$SCRIPT_DIR/verify-render-api.sh" ]; then
    if bash "$SCRIPT_DIR/verify-render-api.sh" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Render API"
    else
        echo -e "  ${RED}✗${NC} Render API"
    fi
fi

echo ""

# Final recommendation
if [ $FAILED_SCRIPTS -eq 0 ]; then
    echo -e "${BOLD}${GREEN}✓ ALL VERIFICATIONS PASSED!${NC}"
    echo -e "${GREEN}Your environment is properly configured and ready for deployment.${NC}"
    exit 0
elif [ $PASSED_SCRIPTS -eq 0 ]; then
    echo -e "${BOLD}${RED}✗ ALL VERIFICATIONS FAILED${NC}"
    echo -e "${RED}Critical configuration issues detected. Please review all errors above.${NC}"
    exit 1
else
    echo -e "${BOLD}${YELLOW}⚠ PARTIAL SUCCESS${NC}"
    echo -e "${YELLOW}Some verifications passed, but $FAILED_SCRIPTS failed.${NC}"
    echo -e "${YELLOW}Review the failures above before deploying to production.${NC}"
    exit 1
fi
