#!/bin/bash

# Core documentation files
FILES=(
  "index.md"
  "README.md"
  "docs/README.md"
  "docs/VERSION.md"
  "docs/PRODUCTION_STATUS.md"
  "docs/NAVIGATION.md"
  "docs/MIGRATION_RECONCILIATION_2025-10-20.md"
  "docs/DOCUMENTATION_STANDARDS.md"
  "docs/AGENTS.md"
  "docs/VERSION_REFERENCE_AUDIT_REPORT.md"
  "docs/reference/schema/DATABASE.md"
  "docs/reference/config/ENVIRONMENT.md"
  "docs/reference/config/AUTH_ROLES.md"
  "docs/reference/api/api/SQUARE_API_SETUP.md"
  "docs/reference/api/api/README.md"
  "docs/meta/SOURCE_OF_TRUTH.md"
  "docs/investigations/workspace-auth-fix-2025-10-29.md"
  "docs/investigations/token-refresh-failure-analysis.md"
  "docs/investigations/online-ordering-checkout-fix-oct27-2025.md"
  "docs/investigations/auth-state-bug-analysis.md"
  "docs/investigations/auth-bypass-root-cause-FINAL.md"
  "docs/incidents/oct23-bug-investigation-results.md"
  "docs/how-to/troubleshooting/TROUBLESHOOTING.md"
  "docs/how-to/operations/runbooks/PRODUCTION_DEPLOYMENT_CHECKLIST.md"
  "docs/how-to/operations/runbooks/POST_DUAL_AUTH_ROLL_OUT.md"
  "docs/how-to/development/CI_CD_WORKFLOWS.md"
  "docs/explanation/architecture/ARCHITECTURE.md"
  "docs/strategy/KDS_STRATEGIC_PLAN_2025.md"
  "docs/research/table-ordering-payment-best-practices.md"
)

# Run the timestamp update script
node scripts/add-timestamps.js "${FILES[@]}"
