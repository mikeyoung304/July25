# Restaurant OS Documentation

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
- [Development](./how-to/development/) - Development process, CI/CD, contributing
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
3. [API Reference](./reference/api/README.md) - REST API documentation

**Deploying to Production?**
1. [Deployment Guide](./how-to/operations/DEPLOYMENT.md) - Production deployment
2. [Production Status](./PRODUCTION_STATUS.md) - Readiness assessment
3. [Deployment Checklist](./how-to/operations/DEPLOYMENT_CHECKLIST.md) - Pre-flight checklist

**Troubleshooting?**
1. [Troubleshooting Guide](./how-to/troubleshooting/TROUBLESHOOTING.md) - Common issues
2. [Investigation Reports](./investigations/) - Incident analysis
3. [Post-Mortems](./archive/incidents/) - Historical incidents

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
├── naming/                       # Terminology standards
├── investigations/               # Incident analysis
├── meta/                         # Documentation about docs
├── voice/                        # Voice ordering implementation
└── archive/                      # Historical documentation
```

## 🔍 Find Documentation by Keyword

**Authentication & Security**
- [Authentication Architecture](./explanation/architecture/AUTHENTICATION_ARCHITECTURE.md) - Complete auth flows, session management, RLS
- [ADR-006: Dual Authentication](./explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md) - Production + demo auth patterns
- [Security Policies](./SECURITY.md) - Security controls and compliance
- [Auth Roles](./reference/config/AUTH_ROLES.md) - Role definitions and permissions

**Voice Ordering**
- [Voice Ordering Architecture](./explanation/architecture/ARCHITECTURE.md#voice-ordering-architecture) - Service-oriented design
- [ADR-005: Client-Side Voice Ordering](./explanation/architecture-decisions/ADR-005-client-side-voice-ordering.md) - Voice integration approach
- [Voice Ordering Explained](./voice/VOICE_ORDERING_EXPLAINED.md) - Implementation details

**Deployment & Operations**
- [Deployment Guide](./how-to/operations/DEPLOYMENT.md) - Production deployment procedures
- [Production Status](./PRODUCTION_STATUS.md) - Readiness assessment
- [Runbooks](./how-to/operations/runbooks/) - Operational procedures and checklists
- [CI/CD Workflows](./how-to/development/CI_CD_WORKFLOWS.md) - Automation pipelines

**Testing & Quality**
- [Development Process](./how-to/development/DEVELOPMENT_PROCESS.md) - Workflows and best practices
- [CI/CD Workflows](./how-to/development/CI_CD_WORKFLOWS.md) - Automated testing
- [Testing Checklist](./TESTING_CHECKLIST.md) - QA procedures
- [Troubleshooting](./how-to/troubleshooting/TROUBLESHOOTING.md) - Common issues and fixes

**Database & Schema**
- [Database Guide](./reference/schema/DATABASE.md) - Schema and data model
- [Supabase Connection](./SUPABASE_CONNECTION_GUIDE.md) - Database workflows
- [ADR-002: Multi-Tenancy Architecture](./explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md) - Multi-tenant security

**API & Integration**
- [API Reference](./reference/api/README.md) - REST endpoints
- [Square API Setup](./reference/api/SQUARE_API_SETUP.md) - Payment integration
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
1. [api/README.md](./reference/api/README.md) - API reference
2. [Square API Setup](./reference/api/SQUARE_API_SETUP.md) - Payment integration
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

## 🗂️ Archive

Historical documentation is preserved in:
- [archive/moved/](./archive/moved/) - Consolidated docs from Oct 15, 2025
- [archive/legacy-root/](./archive/legacy-root/) - Previous root directory docs
- [archive/incidents/](./archive/incidents/) - Historical incident reports

## ❓ Need Help?

- **General Questions**: See [index.md](../index.md) for complete sitemap
- **Contributing**: See [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Security Issues**: See [SECURITY.md](./SECURITY.md) for reporting process

---

**Maintained by:** Restaurant OS Team
**Documentation Standards:** [DOCUMENTATION_STANDARDS.md](./DOCUMENTATION_STANDARDS.md)
