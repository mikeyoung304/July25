# Restaurant OS Documentation


**Last Updated:** 2025-11-01

**Version:** 6.0.14 | **Last Updated:** October 30, 2025

Welcome to the Restaurant OS documentation. This guide helps you navigate our comprehensive documentation system.

## 📚 Documentation by Type (Diátaxis Framework)

Our documentation follows the [Diátaxis framework](https://diataxis.fr/) - a systematic approach that organizes documentation by its purpose and the reader's needs.

### 📖 [Tutorials](./tutorials/) - Learning-Oriented
**Start here if you're new.** Step-by-step lessons to build foundational skills.

- [Getting Started Guide](./tutorials/GETTING_STARTED.md) - Setup, installation, and first steps

### 🎯 [How-To Guides](./how-to/) - Goal-Oriented
**Solve specific problems.** Practical recipes for common tasks.

- [Operations](./how-to/operations/) - Deployment, KDS operations, runbooks
  - [Production Monitoring](./how-to/operations/monitoring/PRODUCTION_MONITORING.md) - Monitoring setup and dashboards
  - [Voice Model Migration](./how-to/operations/VOICE_MODEL_MIGRATION_GUIDE.md) - Migrating voice ordering models
  - [Voice Ordering Troubleshooting](./how-to/operations/VOICE_ORDERING_TROUBLESHOOTING.md) - Voice ordering diagnostics
  - Runbooks: [Incident Response](./how-to/operations/runbooks/INCIDENT_RESPONSE.md) | [Rollback Procedures](./how-to/operations/runbooks/ROLLBACK_PROCEDURES.md) | [Auth Debugging](./how-to/operations/runbooks/AUTH_DEBUGGING_RUNBOOK.md)
- [Development](./how-to/development/) - Development process, CI/CD, contributing
  - [Auth Development Guide](./how-to/development/AUTH_DEVELOPMENT_GUIDE.md) - Authentication implementation patterns
- [Troubleshooting](./how-to/troubleshooting/) - Common issues and diagnostics

### 📋 [Reference](./reference/) - Information-Oriented
**Look up facts.** APIs, schemas, configuration options.

- [API Reference](./reference/api/) - REST endpoints, WebSocket events, Square integration
- [Schema](./reference/schema/) - Database tables and relationships
- [Configuration](./reference/config/) - Environment variables, auth roles

### 💡 [Explanation](./explanation/) - Understanding-Oriented
**Deepen your knowledge.** Architecture, design decisions, concepts.

- [Architecture](./explanation/architecture/) - System design, auth architecture
- [Architecture Decisions](./explanation/architecture-decisions/) - ADRs documenting key choices
- [Concepts](./explanation/concepts/) - Menu system, order flow, integrations

---

## 🚀 Quick Start Paths

**New to Restaurant OS?**
1. [Getting Started Guide](./tutorials/GETTING_STARTED.md) - Setup and first steps
2. [Architecture Overview](./explanation/architecture/ARCHITECTURE.md) - System design
3. [API Reference](./reference/api/api/README.md) - REST API documentation

**Deploying to Production?**
1. [Deployment Guide](./how-to/operations/DEPLOYMENT.md) - Production deployment
2. [Production Status](./PRODUCTION_STATUS.md) - Readiness assessment
3. [Deployment Checklist](./how-to/operations/runbooks/PRODUCTION_DEPLOYMENT_CHECKLIST.md) - Pre-flight checklist

**Troubleshooting?**
1. [Troubleshooting Guide](./how-to/troubleshooting/TROUBLESHOOTING.md) - Common issues
2. [Investigation Reports](./investigations/README.md) - Incident analysis
3. [Post-Mortems](./archive/incidents/) - Historical incidents

**Not sure where to find documentation?**
→ [Documentation Navigation Decision Tree](./explanation/architecture/diagrams/documentation-navigation.md) - Interactive guide to finding the right docs

## For Claude Code Users

If using Claude Code to work on this repo, see [CLAUDE.md](/CLAUDE.md) for quick reference to commands and critical rules.

## 🗺️ Documentation Sitemap

Our documentation is organized using the Diátaxis framework:

```
docs/
├── tutorials/                    # Learning-oriented guides
│   └── GETTING_STARTED.md
├── how-to/                       # Goal-oriented guides
│   ├── operations/              # Deployment, KDS, runbooks
│   ├── development/             # Dev process, CI/CD, contributing
│   └── troubleshooting/         # Common issues, diagnostics
├── reference/                    # Information-oriented docs
│   ├── api/                     # REST API, WebSocket, Square
│   ├── schema/                  # Database schema
│   └── config/                  # Environment, auth roles
├── explanation/                  # Understanding-oriented docs
│   ├── architecture/            # System & auth architecture
│   ├── architecture-decisions/  # ADRs
│   └── concepts/                # Menu system, order flow
├── guides/                       # Practical guides
│   └── testing/                 # Test isolation, standards, patterns
├── prevention/                   # Prevention strategies and automation
│   ├── AUTH_DUAL_PATTERN_PREVENTION_SUMMARY.md
│   ├── KDS_PREVENTION_STRATEGIES.md
│   └── KDS_ESLINT_AUTOMATION.md
├── naming/                       # Terminology standards
├── investigations/               # Incident analysis
├── meta/                         # Documentation about docs
├── voice/                        # Voice ordering implementation
└── archive/                      # Historical documentation

tests/
└── multi-tenant/                # Multi-tenant test documentation
    ├── QUICK-START.md
    ├── 24H-TEST-PLAN.md
    └── TEST-STATUS.md
```

## 🔍 Find Documentation by Keyword

**Authentication & Security**
- [Authentication Architecture](./explanation/architecture/AUTHENTICATION_ARCHITECTURE.md) - Complete auth flows, session management, RLS
- [ADR-006: Dual Authentication](./explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md) - Production + demo auth patterns
- [Auth Development Guide](./how-to/development/AUTH_DEVELOPMENT_GUIDE.md) - Authentication implementation patterns
- [Auth Debugging Runbook](./how-to/operations/runbooks/AUTH_DEBUGGING_RUNBOOK.md) - Troubleshooting auth issues
- [Security Policies](./SECURITY.md) - Security controls and compliance
- [Auth Roles](./reference/config/AUTH_ROLES.md) - Role definitions and permissions

**Voice Ordering**
- [Server Touch + Voice Ordering System](archive/2025-11/SERVER_TOUCH_VOICE_ORDERING.md) - Complete guide to hybrid ordering (NEW)
- [Touch + Voice Quick Reference](archive/2025-11/TOUCH_VOICE_QUICK_REF.md) - Fast lookup for developers (NEW)
- [Voice Ordering Architecture](./explanation/architecture/ARCHITECTURE.md#voice-ordering-architecture) - Service-oriented design
- [ADR-005: Client-Side Voice Ordering](./explanation/architecture-decisions/ADR-005-client-side-voice-ordering.md) - Voice integration approach
- [Voice Ordering Explained](./voice/VOICE_ORDERING_EXPLAINED.md) - Implementation details
- [Voice Ordering Troubleshooting](./how-to/operations/VOICE_ORDERING_TROUBLESHOOTING.md) - Voice ordering diagnostics
- [Voice Model Migration Guide](./how-to/operations/VOICE_MODEL_MIGRATION_GUIDE.md) - Migrating voice ordering models

**Deployment & Operations**
- [Deployment Guide](./how-to/operations/DEPLOYMENT.md) - Production deployment procedures
- [Production Status](./PRODUCTION_STATUS.md) - Readiness assessment
- [Production Monitoring](./how-to/operations/monitoring/PRODUCTION_MONITORING.md) - Monitoring setup and dashboards
- [Runbooks](./how-to/operations/runbooks/) - Operational procedures and checklists
  - [Incident Response](./how-to/operations/runbooks/INCIDENT_RESPONSE.md) - Incident handling procedures
  - [Rollback Procedures](./how-to/operations/runbooks/ROLLBACK_PROCEDURES.md) - Deployment rollback guide
- [CI/CD Workflows](./how-to/development/CI_CD_WORKFLOWS.md) - Automation pipelines

**Testing & Quality**
- [Development Process](./how-to/development/DEVELOPMENT_PROCESS.md) - Workflows and best practices
- [CI/CD Workflows](./how-to/development/CI_CD_WORKFLOWS.md) - Automated testing
- [Testing Checklist](./TESTING_CHECKLIST.md) - QA procedures
- [Test Health Dashboard](../TEST_HEALTH.md) - Current test health status
- [Troubleshooting](./how-to/troubleshooting/TROUBLESHOOTING.md) - Common issues and fixes

**Testing Guides**
- [Testing Standards](./guides/testing/TESTING-STANDARDS.md) - Coding standards for tests
- [Test Isolation Strategy](./guides/testing/TEST-ISOLATION-STRATEGY.md) - Preventing test pollution
- [Test Isolation Prevention](./guides/testing/test-isolation-prevention.md) - Anti-patterns and fixes
- [State Isolation Patterns](./guides/testing/state-isolation-patterns.md) - Clean state management
- [Quick Reference](./guides/testing/QUICK-REFERENCE.md) - Fast lookup for test patterns

**Multi-Tenant Testing**
- [Quick Start](../tests/multi-tenant/QUICK-START.md) - Get started with multi-tenant tests
- [24H Test Plan](../tests/multi-tenant/24H-TEST-PLAN.md) - Comprehensive test plan
- [Test Status](../tests/multi-tenant/TEST-STATUS.md) - Current test coverage status

**Database & Schema**
- [Database Guide](./reference/schema/DATABASE.md) - Schema and data model
- [Supabase Connection](./SUPABASE_CONNECTION_GUIDE.md) - Database workflows
- [ADR-002: Multi-Tenancy Architecture](./explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md) - Multi-tenant security

**API & Integration**
- [API Reference](./reference/api/api/README.md) - REST endpoints
- [Square API Setup](./reference/api/api/SQUARE_API_SETUP.md) - Payment integration
- [WebSocket Events](./reference/api/WEBSOCKET_EVENTS.md) - Real-time updates

## 🎯 Documentation by User Journey

### "I'm a new developer joining the team"
1. [GETTING_STARTED.md](./tutorials/GETTING_STARTED.md) - Setup (30 min)
2. [ARCHITECTURE.md](./explanation/architecture/ARCHITECTURE.md) - System overview (15 min)
3. [AUTHENTICATION_ARCHITECTURE.md](./explanation/architecture/AUTHENTICATION_ARCHITECTURE.md) - Auth patterns (20 min)
4. [DEVELOPMENT_PROCESS.md](./how-to/development/DEVELOPMENT_PROCESS.md) - Workflows (10 min)

**Time to productivity:** ~90 minutes

### "I need to understand authentication"
1. [AUTHENTICATION_ARCHITECTURE.md](./explanation/architecture/AUTHENTICATION_ARCHITECTURE.md) - Primary guide
2. [ADR-006](./explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md) - Dual auth decision
3. [AUTH_ROLES.md](./reference/config/AUTH_ROLES.md) - Role definitions

### "I need API documentation"
1. [api/README.md](./reference/api/api/README.md) - API reference
2. [Square API Setup](./reference/api/api/SQUARE_API_SETUP.md) - Payment integration
3. [WebSocket Events](./reference/api/WEBSOCKET_EVENTS.md) - Real-time events

### "I'm debugging an issue"
1. [TROUBLESHOOTING.md](./how-to/troubleshooting/TROUBLESHOOTING.md) - Common fixes
2. [investigations/](./investigations/) - Past incident analysis
3. [archive/incidents/](./archive/incidents/) - Historical post-mortems

### "I'm deploying to production"
1. [DEPLOYMENT.md](./how-to/operations/DEPLOYMENT.md) - Deployment guide
2. [PRODUCTION_DEPLOYMENT_CHECKLIST.md](./how-to/operations/runbooks/PRODUCTION_DEPLOYMENT_CHECKLIST.md) - Pre-flight checklist
3. [PRODUCTION_STATUS.md](./PRODUCTION_STATUS.md) - Readiness assessment

## 📖 Additional Resources

- [CHANGELOG.md](./CHANGELOG.md) - Version history
- [VERSION.md](./VERSION.md) - Current version info
- [ROADMAP.md](./ROADMAP.md) - Future plans
- [Contributing Guide](./how-to/development/CONTRIBUTING.md) - How to contribute
- [Naming Standards](./naming/) - Terminology and conventions

## 🔍 Audit Reports

Recent documentation and codebase audit reports:

### Latest Architectural Audits
- **[Architectural Audit Report V2 (2025-01-23)](./reports/ARCHITECTURAL_AUDIT_REPORT_V2.md)** - Comprehensive deep scan identifying 169 technical debt items across 6 subsystems
- [Hardcoded Values Migration Reference](./reference/config/HARDCODED_VALUES_TO_MIGRATE.md) - Catalog of 153 hardcoded values to migrate for multi-tenant readiness

### Documentation Audits
- [Overnight Audit Report (2025-10-31)](./audit/OVERNIGHT_AUDIT_REPORT_2025-10-31.md) - Latest overnight documentation audit
- [Comprehensive Documentation Audit](./archive/2025-10/COMPREHENSIVE_DOCUMENTATION_AUDIT_REPORT.md) - Full documentation system audit
- [Audit Executive Summary](./audit/AUDIT_EXECUTIVE_SUMMARY.md) - Executive overview of audit findings
- [Documentation Simplification Report](./audit/DOCS_SIMPLIFICATION_REPORT.md) - Documentation optimization analysis
- [Documentation System Architecture Map](./archive/2025-10/DOCUMENTATION_SYSTEM_ARCHITECTURE_MAP.md) - Documentation structure overview
- [Documentation Fix Execution Plan](./archive/2025-10/DOCUMENTATION_FIX_EXECUTION_PLAN.md) - Remediation roadmap
- [Documentation Architecture Summary](./audit/DOCUMENTATION_ARCHITECTURE_SUMMARY.md) - Architecture documentation summary
- [Plain English What's Happening](./audit/PLAIN_ENGLISH_WHATS_HAPPENING.md) - Simplified audit explanation
- [Agent 4 Deliverables Index](./audit/AGENT_4_DELIVERABLES_INDEX.md) - Agent work product index
- [Version Reference Audit Report](./VERSION_REFERENCE_AUDIT_REPORT.md) - Version consistency audit
- [CI Infrastructure Issues](./CI_INFRASTRUCTURE_ISSUES.md) - CI/CD infrastructure analysis
- [Migration Reconciliation (2025-10-20)](./MIGRATION_RECONCILIATION_2025-10-20.md) - Database migration reconciliation

## 📚 Specialized Documentation

Additional documentation categories:

- [Audit Reports](./audit/README.md) - Codebase audits and improvement tracking
- [Investigations](./investigations/README.md) - Incident investigations and root cause analysis
- [Incidents](./incidents/README.md) - Historical incident reports
- [Research](./research/README.md) - Best practices and technology research
- [Meta](./meta/README.md) - Documentation about documentation

### Prevention Strategies

Documentation for preventing common issues and implementing automated safeguards:

- [Executive Summary](./prevention/EXECUTIVE_SUMMARY.md) - Overview of prevention strategies
- [Issues Mapping](./prevention/ISSUES_MAPPING.md) - Mapping of issues to prevention strategies
- **Authentication Prevention**
  - [Auth Dual Pattern Prevention](./prevention/AUTH_DUAL_PATTERN_PREVENTION_SUMMARY.md) - Preventing dual auth pattern issues
- **KDS Prevention**
  - [KDS Prevention Strategies](./prevention/KDS_PREVENTION_STRATEGIES.md) - Kitchen Display System safeguards
  - [KDS ESLint Automation](./prevention/KDS_ESLINT_AUTOMATION.md) - Automated linting for KDS code
  - [KDS Quick Reference](./prevention/KDS_QUICK_REFERENCE.md) - Quick reference for KDS patterns

## 🗂️ Archive

Historical documentation is preserved in:
- [archive/](./archive/) - Historical documentation and analysis
- [archive/incidents/](./archive/incidents/) - Historical incident reports
- [archive/2025-10/](./archive/2025-10/) - October 2025 snapshots

## ❓ Need Help?

- **General Questions**: See [index.md](../index.md) for complete sitemap
- **Contributing**: See [CONTRIBUTING.md](./how-to/development/CONTRIBUTING.md)
- **Security Issues**: See [SECURITY.md](./SECURITY.md) for reporting process

---

**Maintained by:** Restaurant OS Team
**Documentation Standards:** [DOCUMENTATION_STANDARDS.md](./DOCUMENTATION_STANDARDS.md)
