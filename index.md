# Grow App Documentation Index

[![Docs CI](https://github.com/mikeyoung304/July25/actions/workflows/docs-ci.yml/badge.svg)](https://github.com/mikeyoung304/July25/actions/workflows/docs-ci.yml)

**Version:** See [docs/VERSION.md](./docs/VERSION.md)

## 1. Core Documentation
- [Getting Started](./docs/GETTING_STARTED.md) — First run locally
- [Deployment Guide](./docs/DEPLOYMENT.md) — Production deploy (Vercel/Render)
- [Architecture Overview](./docs/ARCHITECTURE.md) — System design & components
- [Database Schema & RLS](./docs/DATABASE.md) — Data model & row-level security

### Architecture Decision Records (ADRs)
- [ADR-001: Snake Case Convention](./docs/ADR-001-snake-case-convention.md) — Unified data layer format
- [ADR-002: Multi-Tenancy Architecture](./docs/ADR-002-multi-tenancy-architecture.md) — Restaurant isolation strategy
- [ADR-003: Embedded Orders Pattern](./docs/ADR-003-embedded-orders-pattern.md) — Order data structure
- [ADR-004: WebSocket Realtime Architecture](./docs/ADR-004-websocket-realtime-architecture.md) — Real-time event system
- [ADR-005: Client-Side Voice Ordering](./docs/ADR-005-client-side-voice-ordering.md) — Voice integration approach
- [ADR-006: Dual Authentication Pattern](./docs/ADR-006-dual-authentication-pattern.md) — Supabase + localStorage auth (v6.0.8)

### Naming Guardrails
- [Naming Charter](./docs/naming/NAMING_CHARTER.md) — Conventions & deprecation policy
- [Naming Lexicon](./docs/naming/LEXICON.md) — Canonical term registry
- [Role-Scope Matrix](./docs/naming/ROLE_SCOPE_MATRIX.md) — Permission mappings
- [Machine Registry](./docs/naming/lexicon.json) — Programmatic access

## 2. Security & Authentication
- [Security Guide](./docs/SECURITY.md) — Security controls & best practices
- [Authentication Architecture](./docs/AUTHENTICATION_ARCHITECTURE.md) — Auth flows & JWT
- [Auth Migration (v6.0)](./docs/MIGRATION_V6_AUTH.md) — Frontend direct Supabase auth

## 3. Features & Integration
- [Square Payments Integration](./docs/SQUARE_INTEGRATION.md) — Payment processing setup
- [WebSocket Events](./docs/WEBSOCKET_EVENTS.md) — Real-time event system
- [KDS Bible](./docs/KDS-BIBLE.md) — Kitchen Display System guide
- [Voice Integration](./server/src/voice/INTEGRATION.md) — Voice ordering system

## 4. Operational Guides
- [Production Status](./docs/PRODUCTION_STATUS.md) — Current readiness metrics
- [Production Diagnostics](./docs/PRODUCTION_DIAGNOSTICS.md) — Troubleshooting production
- [Runbooks](./docs/RUNBOOKS.md) — Incident response procedures
- [Troubleshooting](./docs/TROUBLESHOOTING.md) — Common issues & fixes
- [Environment Variables](./docs/ENVIRONMENT.md) — Configuration reference

## 5. Development
- [Contributing Guide](./docs/CONTRIBUTING.md) — Development workflow & standards
- [Documentation Standards](./docs/DOCUMENTATION_STANDARDS.md) — Doc writing guidelines
- [Supabase Connection Guide](./docs/SUPABASE_CONNECTION_GUIDE.md) — Database migrations & workflows
- [Deployment Checklist](./docs/DEPLOYMENT_CHECKLIST.md) — Production deployment procedures
- [Testing Checklist](./docs/TESTING_CHECKLIST.md) — QA & testing procedures

## 6. Incidents & Diagnostics
- [Post-Mortem: Schema Drift (2025-10-21)](./docs/POST_MORTEM_SCHEMA_DRIFT_2025-10-21.md) — v6.0.13 order submission failures
- [Post-Mortem: Payment Credentials (2025-10-14)](./docs/POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md)
- [Documentation Update Summary (2025-10-17)](./docs/DOCUMENTATION_UPDATE_SUMMARY_2025-10-17.md) — KDS auth fix & doc cleanup
- [Auth Diagnostic Guide](./docs/AUTH_DIAGNOSTIC_GUIDE.md) — Auth debugging workflows

## 7. Roadmap & Planning
- [Product Roadmap](./docs/ROADMAP.md) — Feature pipeline & vision
- [KDS Strategic Plan 2025](./docs/strategy/KDS_STRATEGIC_PLAN_2025.md) — Kitchen system evolution
- [Changelog](./docs/CHANGELOG.md) — Version history & release notes

## Archive
- Incidents: [docs/incidents/](./docs/incidents/)
- Strategy: [docs/strategy/](./docs/strategy/)
- Historical: [docs/archive/](./docs/archive/)
  - [Payment 500 Error Diagnosis](./docs/archive/PAYMENT_500_ERROR_DIAGNOSIS.md)
  - [Payment Fix Status](./docs/archive/PAYMENT_FIX_STATUS.md)
