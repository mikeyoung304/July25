#!/bin/bash
# Environment Variable Validation Script
# Purpose: Automated drift detection, secret validation, and production hardening checks
# Usage: ./scripts/validate-env.sh [environment]
# Environments: local | staging | production

set -euo pipefail

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env"
ENV_EXAMPLE="${PROJECT_ROOT}/.env.example"

# Counters
ERRORS=0
WARNINGS=0
PASSES=0

# Helper functions
error() {
    echo -e "${RED}✗ ERROR:${NC} $1"
    ((ERRORS++))
}

warn() {
    echo -e "${YELLOW}⚠ WARNING:${NC} $1"
    ((WARNINGS++))
}

success() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSES++))
}

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
}

# Check if variable exists in .env
check_var_exists() {
    local var_name="$1"
    if grep -q "^${var_name}=" "$ENV_FILE" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Get variable value from .env
get_var_value() {
    local var_name="$1"
    grep "^${var_name}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'"
}

# Check if variable has default/placeholder value
is_placeholder() {
    local value="$1"
    case "$value" in
        *"your-"*|*"YOUR_"*|*"placeholder"*|*"PLACEHOLDER"*|*"change-in-production"*|*"generate-"*|*"test-"*|*"demo"*|*"sandbox-test-token"*)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Check for trailing newlines in value
has_trailing_newline() {
    local var_name="$1"
    local raw_value=$(grep "^${var_name}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    if [[ "$raw_value" =~ $'\n'$ ]] || [[ "$raw_value" =~ \\n\" ]]; then
        return 0
    else
        return 1
    fi
}

# Validate minimum secret length
validate_secret_length() {
    local var_name="$1"
    local min_length="${2:-32}"
    local value=$(get_var_value "$var_name")

    if [[ ${#value} -lt $min_length ]]; then
        return 1
    else
        return 0
    fi
}

# Main validation sections

validate_gitignore() {
    header "1. Git Security Check"

    # Check if .gitignore exists
    if [[ ! -f "${PROJECT_ROOT}/.gitignore" ]]; then
        error ".gitignore file not found"
        return
    fi

    # Check if .env patterns are in .gitignore
    local required_patterns=(".env" ".env.local" ".env.*.local" ".env.bak")

    for pattern in "${required_patterns[@]}"; do
        if grep -q "^${pattern}$" "${PROJECT_ROOT}/.gitignore" 2>/dev/null; then
            success ".gitignore contains: $pattern"
        else
            error ".gitignore missing pattern: $pattern"
        fi
    done

    # Check if .env is actually committed to git
    if git -C "$PROJECT_ROOT" ls-files | grep -q "^\.env$"; then
        error ".env file is tracked by git (SECURITY RISK)"
        warn "Run: git rm --cached .env && git commit -m 'security: remove .env from git'"
    else
        success ".env is not tracked by git"
    fi

    # Check if .env.bak exists and is tracked
    if git -C "$PROJECT_ROOT" ls-files | grep -q "^\.env\.bak$"; then
        error ".env.bak is tracked by git (SECURITY RISK)"
    elif [[ -f "${PROJECT_ROOT}/.env.bak" ]]; then
        warn ".env.bak exists but is gitignored (delete after secret rotation)"
    fi
}

validate_required_variables() {
    header "2. Required Variables Check"

    # Tier 1: Always required (all environments)
    local tier1_vars=(
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_KEY"
        "DEFAULT_RESTAURANT_ID"
    )

    # Tier 2: Production critical (errors in prod, warnings in dev)
    local tier2_vars=(
        "SUPABASE_JWT_SECRET"
        "PIN_PEPPER"
        "DEVICE_FINGERPRINT_SALT"
        "FRONTEND_URL"
    )

    # Tier 3: Optional but recommended
    local tier3_vars=(
        "OPENAI_API_KEY"
        "NODE_ENV"
        "PORT"
    )

    info "Checking Tier 1 (Always Required)..."
    for var in "${tier1_vars[@]}"; do
        if check_var_exists "$var"; then
            local value=$(get_var_value "$var")
            if [[ -z "$value" ]]; then
                error "$var is set but empty"
            elif is_placeholder "$value"; then
                error "$var has placeholder value: $value"
            else
                success "$var is set"
            fi
        else
            error "$var is missing (TIER 1 REQUIRED)"
        fi
    done

    info "Checking Tier 2 (Production Critical)..."
    for var in "${tier2_vars[@]}"; do
        if check_var_exists "$var"; then
            local value=$(get_var_value "$var")
            if [[ -z "$value" ]]; then
                error "$var is set but empty"
            elif is_placeholder "$value"; then
                error "$var has placeholder value: $value"
            else
                success "$var is set"
            fi
        else
            warn "$var is missing (should be set for production)"
        fi
    done

    info "Checking Tier 3 (Optional)..."
    for var in "${tier3_vars[@]}"; do
        if check_var_exists "$var"; then
            success "$var is set"
        else
            info "$var is not set (optional)"
        fi
    done
}

validate_secret_strength() {
    header "3. Secret Strength Validation"

    # Secrets that should be >= 64 characters
    local critical_secrets=(
        "SUPABASE_JWT_SECRET:88"
        "PIN_PEPPER:64"
        "DEVICE_FINGERPRINT_SALT:64"
        "STATION_TOKEN_SECRET:64"
        "KIOSK_JWT_SECRET:64"
    )

    for secret_spec in "${critical_secrets[@]}"; do
        local var_name="${secret_spec%%:*}"
        local min_length="${secret_spec##*:}"

        if check_var_exists "$var_name"; then
            if validate_secret_length "$var_name" "$min_length"; then
                success "$var_name meets minimum length ($min_length chars)"
            else
                local actual_length=${#$(get_var_value "$var_name")}
                error "$var_name is too short ($actual_length < $min_length chars)"
            fi
        fi
    done

    # Check for hardcoded defaults from code
    local default_checks=(
        "PIN_PEPPER:default-pepper-change-in-production"
        "DEVICE_FINGERPRINT_SALT:device-salt-change-in-production"
        "STATION_TOKEN_SECRET:station-secret-change-in-production"
    )

    for check in "${default_checks[@]}"; do
        local var_name="${check%%:*}"
        local bad_value="${check##*:}"

        if check_var_exists "$var_name"; then
            local value=$(get_var_value "$var_name")
            if [[ "$value" == "$bad_value" ]]; then
                error "$var_name has HARDCODED DEFAULT (security vulnerability!)"
            fi
        fi
    done
}

validate_frontend_boundaries() {
    header "4. Frontend/Backend Security Boundary"

    # VITE_ prefixed variables that should NEVER exist
    local forbidden_vite_vars=(
        "VITE_OPENAI_API_KEY"
        "VITE_SUPABASE_SERVICE_KEY"
        "VITE_SUPABASE_JWT_SECRET"
        "VITE_DATABASE_URL"
        "VITE_PIN_PEPPER"
        "VITE_KIOSK_JWT_SECRET"
        "VITE_STATION_TOKEN_SECRET"
        "VITE_DEVICE_FINGERPRINT_SALT"
        "VITE_SQUARE_ACCESS_TOKEN"
    )

    info "Checking for forbidden VITE_ prefixed secrets..."
    for var in "${forbidden_vite_vars[@]}"; do
        if check_var_exists "$var"; then
            error "$var is set (CRITICAL: Secret exposed to browser!)"
        else
            success "$var is not set (good)"
        fi
    done

    # Check .env.example for VITE_OPENAI_API_KEY documentation
    if grep -q "VITE_OPENAI_API_KEY" "$ENV_EXAMPLE" 2>/dev/null; then
        error "VITE_OPENAI_API_KEY still documented in .env.example (remove it)"
    else
        success ".env.example does not reference VITE_OPENAI_API_KEY"
    fi
}

validate_demo_panel() {
    header "5. Demo Panel Security Check"

    if check_var_exists "VITE_DEMO_PANEL"; then
        local value=$(get_var_value "VITE_DEMO_PANEL")
        local node_env=$(get_var_value "NODE_ENV")

        if [[ "$value" == "1" ]] || [[ "$value" == "true" ]]; then
            if [[ "$node_env" == "production" ]]; then
                error "VITE_DEMO_PANEL=1 in production (exposes demo credentials!)"
            elif [[ "$node_env" == "development" ]]; then
                success "VITE_DEMO_PANEL=1 in development (acceptable)"
            else
                warn "VITE_DEMO_PANEL=1 in $node_env environment"
            fi
        else
            success "VITE_DEMO_PANEL is disabled"
        fi
    else
        info "VITE_DEMO_PANEL not set (defaults to disabled)"
    fi
}

validate_trailing_newlines() {
    header "6. Trailing Newline Bug Check"

    # Variables known to have trailing newline issues
    local check_vars=(
        "STRICT_AUTH"
        "VITE_DEFAULT_RESTAURANT_ID"
        "VITE_FEATURE_NEW_CUSTOMER_ID_FLOW"
        "VITE_DEMO_PANEL"
    )

    for var in "${check_vars[@]}"; do
        if check_var_exists "$var"; then
            if has_trailing_newline "$var"; then
                error "$var has trailing newline (will cause comparison bugs)"
            else
                success "$var has no trailing newline"
            fi
        fi
    done
}

validate_environment_consistency() {
    header "7. Environment Consistency Check"

    # NODE_ENV validation
    if check_var_exists "NODE_ENV"; then
        local node_env=$(get_var_value "NODE_ENV")
        case "$node_env" in
            development|production|test)
                success "NODE_ENV=$node_env (valid)"
                ;;
            *)
                error "NODE_ENV=$node_env (invalid, must be development|production|test)"
                ;;
        esac
    fi

    # SQUARE_ENVIRONMENT validation
    if check_var_exists "SQUARE_ENVIRONMENT"; then
        local square_env=$(get_var_value "SQUARE_ENVIRONMENT")
        local node_env=$(get_var_value "NODE_ENV")

        case "$square_env" in
            sandbox|production)
                success "SQUARE_ENVIRONMENT=$square_env (valid)"

                # Check for mismatch
                if [[ "$node_env" == "production" ]] && [[ "$square_env" == "sandbox" ]]; then
                    warn "SQUARE_ENVIRONMENT=sandbox in production NODE_ENV"
                fi
                ;;
            *)
                error "SQUARE_ENVIRONMENT=$square_env (invalid, must be sandbox|production)"
                ;;
        esac
    fi

    # VITE_ENVIRONMENT vs NODE_ENV consistency
    if check_var_exists "VITE_ENVIRONMENT" && check_var_exists "NODE_ENV"; then
        local vite_env=$(get_var_value "VITE_ENVIRONMENT")
        local node_env=$(get_var_value "NODE_ENV")

        if [[ "$vite_env" == "$node_env" ]]; then
            success "VITE_ENVIRONMENT matches NODE_ENV"
        else
            warn "VITE_ENVIRONMENT=$vite_env but NODE_ENV=$node_env (mismatch)"
        fi
    fi
}

validate_payment_config() {
    header "8. Payment Configuration Validation"

    # Check if Square is configured
    if check_var_exists "SQUARE_ACCESS_TOKEN"; then
        local token=$(get_var_value "SQUARE_ACCESS_TOKEN")
        local env=$(get_var_value "SQUARE_ENVIRONMENT")
        local node_env=$(get_var_value "NODE_ENV")

        # Check for placeholder
        if is_placeholder "$token"; then
            if [[ "$node_env" == "production" ]]; then
                error "SQUARE_ACCESS_TOKEN is placeholder in production"
            else
                warn "SQUARE_ACCESS_TOKEN is placeholder (payments won't work)"
            fi
        elif [[ "$env" == "production" ]]; then
            # Production tokens should start with 'EAAA'
            if [[ "$token" =~ ^EAAA ]]; then
                success "SQUARE_ACCESS_TOKEN appears to be production token"
            else
                warn "SQUARE_ACCESS_TOKEN doesn't start with EAAA (expected for production)"
            fi
        else
            success "SQUARE_ACCESS_TOKEN is set"
        fi
    else
        info "SQUARE_ACCESS_TOKEN not set (payments disabled)"
    fi
}

validate_strict_auth() {
    header "9. STRICT_AUTH Multi-Tenant Security"

    if check_var_exists "STRICT_AUTH"; then
        local value=$(get_var_value "STRICT_AUTH")
        local node_env=$(get_var_value "NODE_ENV")

        # Remove trailing newline if present
        value=$(echo "$value" | tr -d '\n')

        if [[ "$value" == "true" ]]; then
            success "STRICT_AUTH=true (multi-tenant security enabled)"
        else
            if [[ "$node_env" == "production" ]]; then
                error "STRICT_AUTH=$value in production (should be 'true')"
            else
                warn "STRICT_AUTH=$value (recommended 'true' for multi-tenant security)"
            fi
        fi
    else
        local node_env=$(get_var_value "NODE_ENV")
        if [[ "$node_env" == "production" ]]; then
            error "STRICT_AUTH not set in production (required for multi-tenant security)"
        else
            warn "STRICT_AUTH not set (defaults to false)"
        fi
    fi
}

check_drift_with_example() {
    header "10. Drift Detection (.env vs .env.example)"

    if [[ ! -f "$ENV_EXAMPLE" ]]; then
        warn ".env.example not found (cannot check drift)"
        return
    fi

    # Extract variable names from .env.example (excluding comments and blank lines)
    local example_vars=$(grep -E "^[A-Z_]+=|^VITE_[A-Z_]+=" "$ENV_EXAMPLE" | cut -d'=' -f1 | sort -u)

    # Extract variable names from .env
    local env_vars=$(grep -E "^[A-Z_]+=|^VITE_[A-Z_]+=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f1 | sort -u || true)

    # Check for variables in .env.example but not in .env
    info "Checking for undocumented variables in .env..."
    local undocumented_count=0
    for var in $env_vars; do
        if ! echo "$example_vars" | grep -q "^${var}$"; then
            warn "Variable in .env but not documented in .env.example: $var"
            ((undocumented_count++))
        fi
    done

    if [[ $undocumented_count -eq 0 ]]; then
        success "All .env variables are documented in .env.example"
    else
        warn "Found $undocumented_count undocumented variables"
    fi
}

generate_summary() {
    header "VALIDATION SUMMARY"

    local total=$((ERRORS + WARNINGS + PASSES))

    echo ""
    echo -e "${GREEN}Passed:${NC}   $PASSES"
    echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
    echo -e "${RED}Errors:${NC}   $ERRORS"
    echo -e "Total:    $total"
    echo ""

    if [[ $ERRORS -gt 0 ]]; then
        echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║  VALIDATION FAILED - $ERRORS critical error(s) found${NC}"
        echo -e "${RED}║  DO NOT DEPLOY TO PRODUCTION until all errors are resolved${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
        return 1
    elif [[ $WARNINGS -gt 0 ]]; then
        echo -e "${YELLOW}╔════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║  VALIDATION PASSED WITH WARNINGS - $WARNINGS warning(s) found${NC}"
        echo -e "${YELLOW}║  Review warnings before deploying to production${NC}"
        echo -e "${YELLOW}╚════════════════════════════════════════════════════════════════╝${NC}"
        return 0
    else
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║  VALIDATION PASSED - All checks successful${NC}"
        echo -e "${GREEN}║  Environment is ready for deployment${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
        return 0
    fi
}

# Main execution
main() {
    header "Environment Variable Validation"

    echo "Project: Grow Restaurant OS"
    echo "Environment File: $ENV_FILE"
    echo "Timestamp: $(date)"
    echo ""

    if [[ ! -f "$ENV_FILE" ]]; then
        error ".env file not found at $ENV_FILE"
        error "Create .env from .env.example before running this script"
        exit 1
    fi

    # Run all validation checks
    validate_gitignore
    validate_required_variables
    validate_secret_strength
    validate_frontend_boundaries
    validate_demo_panel
    validate_trailing_newlines
    validate_environment_consistency
    validate_payment_config
    validate_strict_auth
    check_drift_with_example

    # Generate summary and exit with appropriate code
    generate_summary
    exit $?
}

# Run main function
main "$@"
