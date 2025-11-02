# Grow App Documentation Index


**Last Updated:** 2025-11-01

[![Docs CI](https://github.com/mikeyoung304/July25/actions/workflows/docs-ci.yml/badge.svg)](https://github.com/mikeyoung304/July25/actions/workflows/docs-ci.yml)

**Version:** See [docs/VERSION.md](./docs/VERSION.md)

## 🧭 Quick Navigation

**Complete Documentation:** See [docs/README.md](./docs/README.md) for the full documentation organized by the Diátaxis framework (tutorials, how-to guides, reference, explanation).

**Need help finding documentation?** See [docs/NAVIGATION.md](./docs/NAVIGATION.md) for navigation by role, task, and technology.

**Browse by topic:**
- [Getting Started](./docs/tutorials/GETTING_STARTED.md) - New to Restaurant OS? Start here
- [Architecture](./docs/explanation/architecture/ARCHITECTURE.md) - System design and voice ordering
- [Deployment](./docs/how-to/operations/DEPLOYMENT.md) - Production deployment
- [Troubleshooting](./docs/how-to/troubleshooting/TROUBLESHOOTING.md) - Common issues and fixes

---

## Learning Path

**Structured onboarding guides for new developers:**
- [01: App Overview](./docs/learning-path/01_APP_OVERVIEW.md) — Understanding the Restaurant OS architecture
- [02: Documentation Organization](./docs/learning-path/02_DOCUMENTATION_ORGANIZATION.md) — Navigating the documentation system
- [03: GitHub Workflows & CI/CD](./docs/learning-path/03_GITHUB_WORKFLOWS_CICD.md) — Understanding automation and deployment
- [04: Environment Setup](./docs/learning-path/04_ENVIRONMENT_SETUP.md) — Setting up your development environment
- [05: Git History & Milestones](./docs/learning-path/05_GIT_HISTORY_MILESTONES.md) — Key commits and project evolution
- [06: Git Patterns & Improvements](./docs/learning-path/06_GIT_PATTERNS_IMPROVEMENTS.md) — Git workflow best practices
- [Learning Path Guide](./docs/learning-path/README.md) — Complete learning path overview

---

## 1. Core Documentation

**Documentation Framework:**
- [Tutorials](./docs/tutorials/README.md) — Learning-oriented guides (start here if new)
- [How-To Guides](./docs/how-to/README.md) — Goal-oriented task guides
- [Reference](./docs/reference/README.md) — Information-oriented technical details
  - [API Reference](./docs/reference/api/api/README.md) — REST API endpoints
  - [Database Schema](./docs/reference/schema/DATABASE.md) — Complete schema with RLS policies
- [Explanation](./docs/explanation/README.md) — Understanding-oriented concepts
- [Research](./docs/research/README.md) — Best practices and technology research
  - [Table Ordering Payment Best Practices](./docs/research/table-ordering-payment-best-practices.md)
- [Meta Documentation](./docs/meta/README.md) — Documentation about documentation
  - [Source of Truth](./docs/meta/SOURCE_OF_TRUTH.md) — Canonical documentation references

**Quick Links:**
- [Getting Started](./docs/tutorials/GETTING_STARTED.md) — First run locally
- [Deployment Guide](./docs/DEPLOYMENT.md) — Production deploy (navigation stub)
- [Architecture Overview](./docs/explanation/architecture/ARCHITECTURE.md) — System design & components
- [Database Schema](./docs/DATABASE.md) — Data model & row-level security (navigation stub)

### Architecture Decision Records (ADRs)
- [ADR-001: Snake Case Convention](./docs/explanation/architecture-decisions/ADR-001-snake-case-convention.md) — Unified data layer format
- [ADR-002: Multi-Tenancy Architecture](./docs/explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md) — Restaurant isolation strategy
- [ADR-003: Embedded Orders Pattern](./docs/explanation/architecture-decisions/ADR-003-embedded-orders-pattern.md) — Order data structure
- [ADR-004: WebSocket Realtime Architecture](./docs/explanation/architecture-decisions/ADR-004-websocket-realtime-architecture.md) — Real-time event system
- [ADR-005: Client-Side Voice Ordering](./docs/explanation/architecture-decisions/ADR-005-client-side-voice-ordering.md) — Voice integration approach
- [ADR-006: Dual Authentication Pattern](./docs/explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md) — Supabase + localStorage auth (v6.0.8)
- [ADR-007: Per-Restaurant Configuration](./docs/explanation/architecture-decisions/ADR-007-per-restaurant-configuration.md) — Restaurant-specific settings
- [ADR-009: Error Handling Philosophy](./docs/explanation/architecture-decisions/ADR-009-error-handling-philosophy.md) — Error handling approach

### Architecture Diagrams
- [C4 Context Diagram](./docs/explanation/architecture/diagrams/c4-context.md) — System context and external interactions
- [C4 Container Diagram](./docs/explanation/architecture/diagrams/c4-container.md) — High-level technical building blocks
- [Authentication Flow](./docs/explanation/architecture/diagrams/auth-flow.md) — Authentication sequence diagrams
- [Payment Flow](./docs/explanation/architecture/diagrams/payment-flow.md) — Payment processing flows
- [Voice Ordering](./docs/explanation/architecture/diagrams/voice-ordering.md) — Voice ordering architecture

### Naming Guardrails
- [Naming Charter](./docs/naming/NAMING_CHARTER.md) — Conventions & deprecation policy
- [Naming Lexicon](./docs/naming/LEXICON.md) — Canonical term registry
- [Role-Scope Matrix](./docs/naming/ROLE_SCOPE_MATRIX.md) — Permission mappings
- [Machine Registry](./docs/naming/lexicon.json) — Programmatic access

## 2. Security & Authentication
- [Security Guide](./docs/SECURITY.md) — Security controls & best practices
- [Authentication Architecture](./docs/explanation/architecture/AUTHENTICATION_ARCHITECTURE.md) — Auth flows & JWT
- [Auth Migration (v6.0)](./docs/explanation/concepts/MIGRATION_V6_AUTH.md) — Frontend direct Supabase auth
- [Auth Roles](./docs/reference/config/AUTH_ROLES.md) — Role definitions and permissions

## 3. Features & Integration
- [Square Payments Integration](./docs/explanation/concepts/SQUARE_INTEGRATION.md) — Payment processing setup
- [WebSocket Events](./docs/reference/api/WEBSOCKET_EVENTS.md) — Real-time event system
- [Payment API Documentation](./docs/reference/api/api/PAYMENT_API_DOCUMENTATION.md) — Payment processing API
- [Square API Setup](./docs/reference/api/api/SQUARE_API_SETUP.md) — Square integration setup
- [KDS Bible](./docs/how-to/operations/KDS-BIBLE.md) — Kitchen Display System guide
- [Voice Integration](./server/src/voice/INTEGRATION.md) — Voice ordering system

## 4. Development Health
- [Test Health Dashboard](./docs/reference/testing/TEST_HEALTH.md) — Test quarantine status and remediation plan
- [Test Health Registry](./test-quarantine/test-health.json) — Detailed test failure tracking

## 5. Operational Guides
- [Production Status](./docs/PRODUCTION_STATUS.md) — Current readiness metrics
- [Production Diagnostics](./docs/PRODUCTION_DIAGNOSTICS.md) — Troubleshooting production
- [Runbooks](./docs/how-to/operations/runbooks/README.md) — Operational procedures and playbooks
  - [Production Deployment Checklist](./docs/how-to/operations/runbooks/PRODUCTION_DEPLOYMENT_CHECKLIST.md)
  - [Production Deployment Plan](./docs/how-to/operations/runbooks/PRODUCTION_DEPLOYMENT_PLAN.md)
  - [Production Deployment Success](./docs/how-to/operations/runbooks/PRODUCTION_DEPLOYMENT_SUCCESS.md)
  - [Post Dual Auth Roll Out](./docs/how-to/operations/runbooks/POST_DUAL_AUTH_ROLL_OUT.md)
- [Legacy Runbooks](./docs/RUNBOOKS.md) — Legacy incident response procedures
- [Troubleshooting](./docs/how-to/troubleshooting/TROUBLESHOOTING.md) — Common issues & fixes
- [Auth Diagnostic Guide](./docs/how-to/troubleshooting/AUTH_DIAGNOSTIC_GUIDE.md) — Auth debugging workflows
- [Environment Variables](./docs/reference/config/ENVIRONMENT.md) — Configuration reference

## 5. Development
- [Contributing Guide](./docs/how-to/development/CONTRIBUTING.md) — Development workflow & standards
- [Development Process](./docs/how-to/development/DEVELOPMENT_PROCESS.md) — Development workflows and best practices
- [CI/CD Workflows](./docs/how-to/development/CI_CD_WORKFLOWS.md) — Continuous integration and deployment
- [Documentation Standards](./docs/DOCUMENTATION_STANDARDS.md) — Doc writing guidelines
- [Supabase Connection Guide](./docs/SUPABASE_CONNECTION_GUIDE.md) — Database migrations & workflows
- [Deployment Checklist](./docs/how-to/operations/DEPLOYMENT_CHECKLIST.md) — Production deployment procedures
- [Testing Checklist](./docs/TESTING_CHECKLIST.md) — QA & testing procedures

## 6. Incidents & Diagnostics
- [Investigations](./docs/investigations/README.md) — Incident investigations and root cause analysis
  - [Workspace Auth Fix (2025-10-29)](./docs/investigations/workspace-auth-fix-2025-10-29.md)
  - [Menu Loading Error Fix (Oct 27)](./docs/investigations/menu-loading-error-fix-oct27-2025.md)
  - [Online Ordering Checkout Fix (Oct 27)](./docs/investigations/online-ordering-checkout-fix-oct27-2025.md)
  - [Comprehensive Root Cause Analysis (Oct 27)](./docs/investigations/comprehensive-root-cause-analysis-oct27-2025.md)
  - [Token Refresh Failure Analysis](./docs/investigations/token-refresh-failure-analysis.md)
  - [Auth State Bug Analysis](./docs/investigations/auth-state-bug-analysis.md)
  - [Auth Bypass Root Cause (FINAL)](./docs/investigations/auth-bypass-root-cause-FINAL.md)
  - [AI Diagnostic Report](./docs/investigations/AI_DIAGNOSTIC_REPORT.md)
- [Incidents](./docs/incidents/README.md) — Historical incident reports
  - [Oct 23 Bug Investigation Results](./docs/incidents/oct23-bug-investigation-results.md)
- [Post-Mortem: Schema Drift (2025-10-21)](./docs/POST_MORTEM_SCHEMA_DRIFT_2025-10-21.md) — v6.0.13 order submission failures
- [Post-Mortem: Payment Credentials (2025-10-14)](./docs/POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md)
- [Documentation Update Summary (2025-10-17)](./docs/DOCUMENTATION_UPDATE_SUMMARY_2025-10-17.md) — KDS auth fix & doc cleanup

## 7. Roadmap & Planning
- [Product Roadmap](./docs/ROADMAP.md) — Feature pipeline & vision
- [KDS Strategic Plan 2025](./docs/strategy/KDS_STRATEGIC_PLAN_2025.md) — Kitchen system evolution
- [Changelog](./docs/CHANGELOG.md) — Version history & release notes

## 8. Audit Reports & Analysis
- [Audit Reports Index](./docs/audit/README.md) — Codebase audit reports and action plans
  - [Action Checklist](./docs/audit/ACTION_CHECKLIST.md) — Prioritized action items
  - [P0 Fix Roadmap](./docs/audit/P0-FIX-ROADMAP.md) — Critical fixes roadmap
  - [Tracking Quick Reference](./docs/audit/TRACKING-QUICK-REFERENCE.md) — Progress tracking
- [Overnight Audit Report (2025-10-31)](./docs/audit/OVERNIGHT_AUDIT_REPORT_2025-10-31.md) — Latest overnight audit
- [Comprehensive Documentation Audit](./docs/archive/2025-10/COMPREHENSIVE_DOCUMENTATION_AUDIT_REPORT.md) — Full documentation system audit
- [Audit Executive Summary](./docs/audit/AUDIT_EXECUTIVE_SUMMARY.md) — Executive overview
- [Documentation Simplification Report](./docs/audit/DOCS_SIMPLIFICATION_REPORT.md) — Optimization analysis
- [Documentation System Architecture Map](./docs/archive/2025-10/DOCUMENTATION_SYSTEM_ARCHITECTURE_MAP.md) — Structure overview
- [Documentation Fix Execution Plan](./docs/archive/2025-10/DOCUMENTATION_FIX_EXECUTION_PLAN.md) — Remediation roadmap
- [Documentation Architecture Summary](./docs/audit/DOCUMENTATION_ARCHITECTURE_SUMMARY.md) — Architecture summary
- [Plain English What's Happening](./docs/audit/PLAIN_ENGLISH_WHATS_HAPPENING.md) — Simplified audit explanation
- [Agent 4 Deliverables Index](./docs/audit/AGENT_4_DELIVERABLES_INDEX.md) — Agent work products
- [Timestamp Update Report](./docs/audit/TIMESTAMP_UPDATE_REPORT.md) — Documentation timestamp update analysis
- [Table Fix Report](./docs/audit/TABLE_FIX_REPORT.md) — Table-related bug fixes analysis
- [Table Fix Examples](./docs/audit/TABLE_FIX_EXAMPLES.md) — Table fix implementation examples
- [Drift Detection Report](./docs/audit/DRIFT_DETECTION_REPORT.md) — Automated documentation drift detection
- [Version Reference Audit](./docs/VERSION_REFERENCE_AUDIT_REPORT.md) — Version consistency audit
- [CI Infrastructure Issues](./docs/CI_INFRASTRUCTURE_ISSUES.md) — CI/CD infrastructure analysis
- [Migration Reconciliation](./docs/MIGRATION_RECONCILIATION_2025-10-20.md) — Database migration reconciliation

## 9. Component Documentation
- [Client Application](./client/README.md) — Frontend application documentation
  - [Phase 2 Quick Wins](./client/PHASE_2_QUICK_WINS_SUMMARY.md) — Phase 2 optimization improvements
- [Supabase Configuration](./supabase/README.md) — Database and backend configuration
  - [Migrations](./supabase/migrations/README.md) — Database migration management
  - [Migration Baseline](./supabase/MIGRATION_BASELINE.md) — Migration baseline and reconciliation
- [Scripts & Developer Tools](./scripts/README.md) — Automation scripts and drift detection tools

## Archive
- Incidents: [docs/incidents/README.md](./docs/incidents/README.md)
- Investigations: [docs/investigations/README.md](./docs/investigations/README.md)
- Audit Reports: [docs/audit/README.md](./docs/audit/README.md)
- Strategy: [docs/strategy/](./docs/strategy/)
- Historical: [docs/archive/](./docs/archive/)
  - [Payment 500 Error Diagnosis](./docs/archive/PAYMENT_500_ERROR_DIAGNOSIS.md)
  - [Payment Fix Status](./docs/archive/PAYMENT_FIX_STATUS.md)
