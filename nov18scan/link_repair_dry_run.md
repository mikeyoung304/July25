# Link Repair Report - Phase 3

**Date:** Wed Nov 19 10:45:49 EST 2025
**Agent:** Link Repair Agent

## Executive Summary

- **Files Scanned:** 393
- **Total Links Found:** 1156
- **Broken Links Found:** 191
- **Links Fixed:** 161
- **Links Unfixable:** 30
- **Files Modified:** 93

**Fix Rate:** 84.3%
**Remaining Broken Links:** 30

## Top Fix Patterns

- **83x** README.md -> README.md
- **5x** VERSION.md -> VERSION.md
- **3x** ORDER_FLOW.md -> ORDER_FLOW.md
- **3x** DATABASE.md -> DATABASE.md
- **3x** POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md -> POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md
- **3x** 01_git_history_narrative.md -> 01_git_history_narrative.md
- **2x** P0.9_PHASE_2B_FINAL_DEPLOYMENT_SIGNOFF.md -> P0.9_PHASE_2B_FINAL_DEPLOYMENT_SIGNOFF.md
- **2x** P0.9_PHASE_2B_DEPLOYMENT_RUNBOOK.md -> P0.9_PHASE_2B_DEPLOYMENT_RUNBOOK.md
- **2x** VOICE_ORDERING_EXPLAINED.md -> VOICE_ORDERING_EXPLAINED.md
- **2x** ADR-001-snake-case-convention.md -> ADR-001-snake-case-convention.md
- **2x** ADR-006-dual-authentication-pattern.md -> ADR-006-dual-authentication-pattern.md
- **2x** 2025-11-12-jwt-scope-bug.md -> 2025-11-12-jwt-scope-bug.md
- **2x** AUTH_DEBUGGING_RUNBOOK.md -> AUTH_DEBUGGING_RUNBOOK.md
- **2x** AI_SERVICES_MEMORY_LEAK_SUMMARY.md -> AI_SERVICES_MEMORY_LEAK_SUMMARY.md
- **2x** DOCUMENTATION_STANDARDS.md -> DOCUMENTATION_STANDARDS.md
- **1x** CI_CD_WORKFLOWS.md -> CI_CD_WORKFLOWS.md
- **1x** CONTRIBUTING.md -> CONTRIBUTING.md
- **1x** SERVER_TOUCH_VOICE_ORDERING.md -> SERVER_TOUCH_VOICE_ORDERING.md
- **1x** TOUCH_VOICE_QUICK_REF.md -> TOUCH_VOICE_QUICK_REF.md
- **1x** PRODUCTION_STATUS.md -> PRODUCTION_STATUS.md

## Files Modified

Total: 93 files

### docs/archive/2025-11/claude.md
**Fixes:** 13

- `docs/explanation/architecture-decisions/ADR-001-snake-case-convention.md` → `../../explanation/architecture-decisions/ADR-001-snake-case-convention.md`
- `docs/explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md` → `../../explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md`
- `docs/explanation/architecture-decisions/ADR-003-embedded-orders-pattern.md` → `../../explanation/architecture-decisions/ADR-003-embedded-orders-pattern.md`
- `docs/explanation/architecture-decisions/ADR-004-websocket-realtime-architecture.md` → `../../explanation/architecture-decisions/ADR-004-websocket-realtime-architecture.md`
- `docs/explanation/architecture-decisions/ADR-005-client-side-voice-ordering.md` → `../../explanation/architecture-decisions/ADR-005-client-side-voice-ordering.md`
- `docs/explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md` → `../../explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md`
- `docs/explanation/architecture-decisions/ADR-007-per-restaurant-configuration.md` → `../../explanation/architecture-decisions/ADR-007-per-restaurant-configuration.md`
- `docs/explanation/architecture-decisions/ADR-008-slug-based-routing.md` → `../../explanation/architecture-decisions/ADR-008-slug-based-routing.md`
- `docs/explanation/architecture-decisions/ADR-009-error-handling-philosophy.md` → `../../explanation/architecture-decisions/ADR-009-error-handling-philosophy.md`
- `docs/explanation/architecture-decisions/ADR-010-remote-database-source-of-truth.md` → `../../explanation/architecture-decisions/ADR-010-remote-database-source-of-truth.md`
- ... and 3 more

### docs/archive/2025-10/DOCUMENTATION_FIX_EXECUTION_PLAN.md
**Fixes:** 12

- `reference/schema/DATABASE.md` → `../../reference/schema/DATABASE.md`
- `reference/config/ENVIRONMENT.md` → `../../reference/config/ENVIRONMENT.md`
- `reference/api/README.md` → `../../reference/api/api/README.md`
- `explanation/architecture/diagrams/c4-context.md` → `../../explanation/architecture/diagrams/c4-context.md`
- `explanation/architecture/diagrams/c4-container.md` → `../../explanation/architecture/diagrams/c4-container.md`
- `explanation/architecture/diagrams/auth-flow.md` → `../../explanation/architecture/diagrams/auth-flow.md`
- `explanation/architecture/diagrams/payment-flow.md` → `../../explanation/architecture/diagrams/payment-flow.md`
- `explanation/architecture/diagrams/voice-ordering.md` → `../../explanation/architecture/diagrams/voice-ordering.md`
- `investigations/comprehensive-root-cause-analysis-oct27-2025.md` → `../../investigations/comprehensive-root-cause-analysis-oct27-2025.md`
- `investigations/menu-loading-error-fix-oct27-2025.md` → `../../investigations/menu-loading-error-fix-oct27-2025.md`
- ... and 2 more

### docs/archive/2025-10/2025-10-15_SQUARE_INTEGRATION.md
**Fixes:** 7

- `./POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md` → `../../POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md`
- `./POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md` → `../../POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md`
- `./POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md` → `../../POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md`
- `./PRODUCTION_STATUS.md` → `../../PRODUCTION_STATUS.md`
- `./ORDER_FLOW.md` → `../../explanation/concepts/ORDER_FLOW.md`
- `./DATABASE.md` → `../../DATABASE.md`
- `./ADR-001-snake-case-convention.md` → `../../explanation/architecture-decisions/ADR-001-snake-case-convention.md`

### docs/archive/2025-11/incidents/jwt-scope-bug/JWT_SCOPE_BUG_LESSON_IMPLEMENTATION_SUMMARY.md
**Fixes:** 7

- `/docs/README.md` → `../../../../README.md`
- `docs/postmortems/2025-11-12-jwt-scope-bug.md` → `../../../../postmortems/2025-11-12-jwt-scope-bug.md`
- `docs/explanation/architecture-decisions/ADR-010-jwt-payload-standards.md` → `../../../../explanation/architecture-decisions/ADR-010-jwt-payload-standards.md`
- `docs/how-to/development/AUTH_DEVELOPMENT_GUIDE.md` → `../../../../how-to/development/AUTH_DEVELOPMENT_GUIDE.md`
- `docs/how-to/operations/runbooks/AUTH_DEBUGGING_RUNBOOK.md` → `../../../../how-to/operations/runbooks/AUTH_DEBUGGING_RUNBOOK.md`
- `claudelessons-v2/knowledge/incidents/jwt-scope-mismatch.md` → `../../../../../claudelessons-v2/knowledge/incidents/jwt-scope-mismatch.md`
- `claudelessons-v2/guidelines/ai-auth-checks.md` → `../../../../../claudelessons-v2/guidelines/ai-auth-checks.md`

### index.md
**Fixes:** 7

- `./VOICE_ORDER_ANALYSIS_SUMMARY.md` → `docs/archive/2025-11/voice-websocket/VOICE_ORDER_ANALYSIS_SUMMARY.md`
- `./P0.9_PHASE_2B_FINAL_DEPLOYMENT_SIGNOFF.md` → `docs/archive/2025-11/phases/p0.9-phase-2b/P0.9_PHASE_2B_FINAL_DEPLOYMENT_SIGNOFF.md`
- `./P0.9_PHASE_2B_DEPLOYMENT_RUNBOOK.md` → `docs/archive/2025-11/phases/p0.9-phase-2b/P0.9_PHASE_2B_DEPLOYMENT_RUNBOOK.md`
- `./P0.9_DATABASE_SCHEMA_FORENSIC_AUDIT.md` → `docs/archive/2025-11/phases/p0.9-phase-2b/P0.9_DATABASE_SCHEMA_FORENSIC_AUDIT.md`
- `./P0.9_DEPLOYMENT_COMPLETE_SUMMARY.md` → `docs/archive/2025-11/phases/p0.9-phase-2b/P0.9_DEPLOYMENT_COMPLETE_SUMMARY.md`
- `./P0.9_PHASE_2_PUNCHLIST.md` → `docs/archive/2025-11/phases/p0.9-phase-2b/P0.9_PHASE_2_PUNCHLIST.md`
- `./DOCUMENTATION_CLEANUP_REPORT.md` → `docs/archive/2025-11/investigations/DOCUMENTATION_CLEANUP_REPORT.md`

### docs/archive/2025-10/2025-10-15_MENU_SYSTEM.md
**Fixes:** 4

- `./ORDER_FLOW.md` → `../../explanation/concepts/ORDER_FLOW.md`
- `./DATABASE.md` → `../../DATABASE.md`
- `./voice/VOICE_ORDERING_EXPLAINED.md` → `../../voice/VOICE_ORDERING_EXPLAINED.md`
- `./api/README.md` → `../../reference/api/api/README.md`

### docs/archive/2025-10/2025-10-15_WEBSOCKET_EVENTS.md
**Fixes:** 4

- `VERSION.md` → `../../VERSION.md`
- `api/README.md` → `../../reference/api/api/README.md`
- `ORDER_FLOW.md` → `../../explanation/concepts/ORDER_FLOW.md`
- `voice/VOICE_ORDERING_EXPLAINED.md` → `../../voice/VOICE_ORDERING_EXPLAINED.md`

### docs/archive/2025-11/investigations/README_MEMORY_LEAK_INVESTIGATION.md
**Fixes:** 4

- `/docs/README.md` → `../../../README.md`
- `./AI_SERVICES_MEMORY_LEAK_SUMMARY.md` → `ai-services/AI_SERVICES_MEMORY_LEAK_SUMMARY.md`
- `./AI_SERVICES_MEMORY_LEAK_REPORT.md` → `ai-services/AI_SERVICES_MEMORY_LEAK_REPORT.md`
- `./AI_SERVICES_MEMORY_LEAK_SUMMARY.md` → `ai-services/AI_SERVICES_MEMORY_LEAK_SUMMARY.md`

### docs/archive/2025-11/testing/TESTING_COVERAGE_VALIDATION_STRATEGY.md
**Fixes:** 3

- `/docs/postmortems/2025-11-12-jwt-scope-bug.md` → `../../../postmortems/2025-11-12-jwt-scope-bug.md`
- `/docs/how-to/operations/runbooks/AUTH_DEBUGGING_RUNBOOK.md` → `../../../how-to/operations/runbooks/AUTH_DEBUGGING_RUNBOOK.md`
- `/docs/archive/2025-11/TESTING_GAP_ANALYSIS.md` → `../TESTING_GAP_ANALYSIS.md`

### docs/postmortems/2025-11-12-jwt-scope-bug.md
**Fixes:** 3

- `../JWT_SCOPE_BUG_ROOT_CAUSE_ANALYSIS.md` → `../archive/2025-11/incidents/jwt-scope-bug/JWT_SCOPE_BUG_ROOT_CAUSE_ANALYSIS.md`
- `../JWT_SCOPE_BUG_TECHNICAL_SUMMARY.md` → `../archive/2025-11/incidents/jwt-scope-bug/JWT_SCOPE_BUG_TECHNICAL_SUMMARY.md`
- `../JWT_SCOPE_BUG_PATTERNS_AND_SOLUTIONS.md` → `../archive/2025-11/incidents/jwt-scope-bug/JWT_SCOPE_BUG_PATTERNS_AND_SOLUTIONS.md`

### CONTRIBUTING.md
**Fixes:** 2

- `./docs/CI_CD_WORKFLOWS.md` → `docs/how-to/development/CI_CD_WORKFLOWS.md`
- `./docs/CONTRIBUTING.md` → `docs/how-to/development/CONTRIBUTING.md`

### docs/NAVIGATION.md
**Fixes:** 2

- `../P0.9_PHASE_2B_FINAL_DEPLOYMENT_SIGNOFF.md` → `archive/2025-11/phases/p0.9-phase-2b/P0.9_PHASE_2B_FINAL_DEPLOYMENT_SIGNOFF.md`
- `../P0.9_PHASE_2B_DEPLOYMENT_RUNBOOK.md` → `archive/2025-11/phases/p0.9-phase-2b/P0.9_PHASE_2B_DEPLOYMENT_RUNBOOK.md`

### docs/README.md
**Fixes:** 2

- `./SERVER_TOUCH_VOICE_ORDERING.md` → `archive/2025-11/SERVER_TOUCH_VOICE_ORDERING.md`
- `./TOUCH_VOICE_QUICK_REF.md` → `archive/2025-11/TOUCH_VOICE_QUICK_REF.md`

### docs/archive/2025-10/DOCUMENTATION_SYSTEM_ARCHITECTURE_MAP.md
**Fixes:** 2

- `VERSION.md` → `../../VERSION.md`
- `VERSION.md` → `../../VERSION.md`

### docs/archive/2025-11/deployment/README.md
**Fixes:** 2

- `/docs/README.md` → `../../../README.md`
- `/docs/archive/README.md` → `../../../README.md`

### docs/archive/2025-11/environment/README.md
**Fixes:** 2

- `/docs/README.md` → `../../../README.md`
- `/docs/archive/README.md` → `../../../README.md`

### docs/archive/2025-11/incidents/jwt-scope-bug/README.md
**Fixes:** 2

- `/docs/README.md` → `../../../../README.md`
- `/docs/archive/README.md` → `../../../../README.md`

### docs/archive/2025-11/investigations/README.md
**Fixes:** 2

- `/docs/README.md` → `../../../README.md`
- `/docs/archive/README.md` → `../../../README.md`

### docs/archive/2025-11/phases/p0.9-phase-2b/README.md
**Fixes:** 2

- `/docs/README.md` → `../../../../README.md`
- `/docs/archive/README.md` → `../../../../README.md`

### docs/archive/2025-11/voice-websocket/README.md
**Fixes:** 2

- `/docs/README.md` → `../../../README.md`
- `/docs/archive/README.md` → `../../../README.md`

### docs/archive/MIGRATION_GUIDE_DEPRECATED_2025-10-21.md
**Fixes:** 2

- `../docs/SUPABASE_CONNECTION_GUIDE.md` → `../SUPABASE_CONNECTION_GUIDE.md`
- `../docs/POST_MORTEM_SCHEMA_DRIFT_2025-10-21.md` → `../POST_MORTEM_SCHEMA_DRIFT_2025-10-21.md`

### docs/explanation/architecture/VOICE_ORDERING_WEBRTC.md
**Fixes:** 2

- `../../reference/api/openai-realtime/README.md` → `../../reference/api/api/README.md`
- `../VOICE_ORDERING_WEBRTC.md` → `VOICE_ORDERING_WEBRTC.md`

### docs/how-to/operations/monitoring/PRODUCTION_MONITORING.md
**Fixes:** 2

- `../README.md` → `../../../README.md`
- `./README.md` → `../../../README.md`

### docs/meta/GITHUB_ACTIONS_WORKFLOW_TECHNICAL_GUIDE.md
**Fixes:** 2

- `docs/meta/DOCUMENTATION_STANDARDS.md` → `../DOCUMENTATION_STANDARDS.md`
- `./DOCUMENTATION_STANDARDS.md` → `../DOCUMENTATION_STANDARDS.md`

### docs/archive/2025-10/2025-10-15_PRODUCTION_DIAGNOSTICS.md
**Fixes:** 1

- `README.md` → `../../README.md`

### docs/archive/2025-11/GITHUB_ISSUES_ANALYSIS_REPORT.md
**Fixes:** 1

- `./docs/meta/SOURCE_OF_TRUTH.md` → `../../meta/SOURCE_OF_TRUTH.md`

### docs/archive/2025-11/deployment/DATABASE_AUDIT_QUICK_ACTIONS.md
**Fixes:** 1

- `/docs/README.md` → `../../../README.md`

### docs/archive/2025-11/deployment/DEMO_USERS_SETUP_COMPLETE.md
**Fixes:** 1

- `/docs/README.md` → `../../../README.md`

### docs/archive/2025-11/deployment/PRODUCTION_HARDENING_EXECUTIVE_REPORT_2025-11-11.md
**Fixes:** 1

- `/docs/README.md` → `../../../README.md`

### docs/archive/2025-11/deployment/PRODUCTION_SERVERVIEW_TEST_REPORT.md
**Fixes:** 1

- `/docs/README.md` → `../../../README.md`

### docs/archive/2025-11/deployment/RENDER_BACKEND_ROOT_CAUSE_ANALYSIS.md
**Fixes:** 1

- `/docs/README.md` → `../../../README.md`

### docs/archive/2025-11/deployment/RENDER_ENV_FIX_GUIDE.md
**Fixes:** 1

- `/docs/README.md` → `../../../README.md`

### docs/archive/2025-11/deployment/RENDER_MANUAL_DEPLOY_GUIDE.md
**Fixes:** 1

- `/docs/README.md` → `../../../README.md`

### docs/archive/2025-11/environment/DATABASE_AUDIT_EXECUTIVE_SUMMARY.md
**Fixes:** 1

- `/docs/README.md` → `../../../README.md`

### docs/archive/2025-11/environment/ENVIRONMENT_AUDIT_SUMMARY_AND_PLAN_2025-11-11.md
**Fixes:** 1

- `/docs/README.md` → `../../../README.md`

### docs/archive/2025-11/environment/ENVIRONMENT_FILES_DEEP_AUDIT_2025-11-11.md
**Fixes:** 1

- `/docs/README.md` → `../../../README.md`

### docs/archive/2025-11/environment/ENVIRONMENT_VARIABLE_AUDIT_2025-11-11.md
**Fixes:** 1

- `/docs/README.md` → `../../../README.md`

### docs/archive/2025-11/environment/ENV_FILES_AUDIT.md
**Fixes:** 1

- `/docs/README.md` → `../../../README.md`

### docs/archive/2025-11/environment/RENDER_BACKEND_AUDIT_2025-11-11.md
**Fixes:** 1

- `/docs/README.md` → `../../../README.md`

### docs/archive/2025-11/environment/STAGING_TESTING_DATABASE_INFRASTRUCTURE_AUDIT.md
**Fixes:** 1

- `/docs/README.md` → `../../../README.md`

### docs/archive/2025-11/environment/STAGING_TESTING_DATABASE_QUICK_REFERENCE.md
**Fixes:** 1

- `/docs/README.md` → `../../../README.md`

### docs/archive/2025-11/incidents/jwt-scope-bug/AUTH_BUG_ROOT_CAUSE_ANALYSIS.md
**Fixes:** 1

- `/docs/README.md` → `../../../../README.md`

### docs/archive/2025-11/incidents/jwt-scope-bug/AUTH_FIX_DEPLOYMENT_SUMMARY.md
**Fixes:** 1

- `/docs/README.md` → `../../../../README.md`

### docs/archive/2025-11/incidents/jwt-scope-bug/AUTH_FIX_DEPLOYMENT_VERIFICATION.md
**Fixes:** 1

- `/docs/README.md` → `../../../../README.md`

### docs/archive/2025-11/incidents/jwt-scope-bug/AUTH_FIX_TESTED_SUCCESSFULLY.md
**Fixes:** 1

- `/docs/README.md` → `../../../../README.md`

### docs/archive/2025-11/incidents/jwt-scope-bug/AUTH_FIX_VERIFICATION_COMPLETE.md
**Fixes:** 1

- `/docs/README.md` → `../../../../README.md`

### docs/archive/2025-11/incidents/jwt-scope-bug/AUTH_SCOPE_DETAILED_FLOW.md
**Fixes:** 1

- `/docs/README.md` → `../../../../README.md`

### docs/archive/2025-11/incidents/jwt-scope-bug/AUTH_SCOPE_DOCUMENTATION_INDEX.md
**Fixes:** 1

- `/docs/README.md` → `../../../../README.md`

### docs/archive/2025-11/incidents/jwt-scope-bug/AUTH_SCOPE_FLOW_TRACE.md
**Fixes:** 1

- `/docs/README.md` → `../../../../README.md`

### docs/archive/2025-11/incidents/jwt-scope-bug/AUTH_SCOPE_QUICK_REFERENCE.md
**Fixes:** 1

- `/docs/README.md` → `../../../../README.md`


... and 43 more files

## Unfixable Links

Total: 30

### AUTHENTICATION_EVOLUTION_SUMMARY.md
- `docs/claudelessons/CL-AUTH-001-voice-ordering-auth.md`
  - Reason: No candidates found in file cache

### docs/DOCUMENTATION_STANDARDS.md
- `new-feature.md`
  - Reason: No candidates found in file cache
- `../current-doc.md`
  - Reason: No candidates found in file cache

### docs/archive/2025-01/VOICE_CODE_SALVAGE.md
- `../explanation/architecture/VOICE_ORDERING.md`
  - Reason: No candidates found in file cache
- `../reference/api/OPENAI_REALTIME.md`
  - Reason: No candidates found in file cache
- `../how-to/voice/WEBRTC_SETUP.md`
  - Reason: No candidates found in file cache

### docs/archive/2025-10/2025-10-15_ORDER_FLOW.md
- `./DEPLOYMENT.md#square-integration`
  - Reason: No candidates found in file cache
- `./DEPLOYMENT.md#square-integration`
  - Reason: No candidates found in file cache
- `./DEPLOYMENT.md#square-integration`
  - Reason: No candidates found in file cache
- `./DEPLOYMENT.md#square-integration`
  - Reason: No candidates found in file cache

### docs/archive/2025-10/DOCUMENTATION_FIX_EXECUTION_PLAN.md
- `docs/AUTHENTICATION.md#flow`
  - Reason: No candidates found in file cache
- `docs/explanation/architecture/AUTHENTICATION_ARCHITECTURE.md#authentication-methods`
  - Reason: No candidates found in file cache

### docs/archive/2025-10/DOCUMENTATION_SYSTEM_ARCHITECTURE_MAP.md
- `path.md#anchor`
  - Reason: No candidates found in file cache
- `./RELATED_DOC.md`
  - Reason: No candidates found in file cache
- `./EXAMPLE_DOC.md#section-name`
  - Reason: No candidates found in file cache
- `new-feature.md`
  - Reason: No candidates found in file cache
- `../current-doc.md`
  - Reason: No candidates found in file cache

### docs/archive/2025-11/claude.md
- `docs/templates/post-mortem.md`
  - Reason: No candidates found in file cache
- `docs/templates/migration-checklist.md`
  - Reason: No candidates found in file cache
- `docs/templates/feature-checklist.md`
  - Reason: No candidates found in file cache

### docs/explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md
- `./JWT_AUTHENTICATION_FLOW.md`
  - Reason: No candidates found in file cache
- `./TESTING_GUIDE.md`
  - Reason: No candidates found in file cache

### docs/explanation/architecture-decisions/ADR-011-authentication-evolution.md
- `../claudelessons/CL-AUTH-001-voice-ordering-auth.md`
  - Reason: No candidates found in file cache
- `../../security/SECURITY_AUDIT_2025-10.md`
  - Reason: No candidates found in file cache

### docs/learning-path/02_DOCUMENTATION_ORGANIZATION.md
- `../path/NEW_DOC.md`
  - Reason: No candidates found in file cache

### docs/learning-path/03_GITHUB_WORKFLOWS_CICD.md
- `./nonexistent-file.md`
  - Reason: No candidates found in file cache

### docs/meta/GITHUB_ACTIONS_WORKFLOW_TECHNICAL_GUIDE.md
- `../other-doc.md`
  - Reason: No candidates found in file cache
- `${var}/path.md`
  - Reason: No candidates found in file cache
- `../../other-repo/doc.md`
  - Reason: No candidates found in file cache

### docs/postmortems/2025-11-12-jwt-scope-bug.md
- `../HISTORICAL_PATTERN_ANALYSIS.md`
  - Reason: No candidates found in file cache
