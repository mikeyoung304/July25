# Documentation Navigation Guide

**Last Updated:** October 30, 2025

This guide helps you find documentation quickly based on what you need to accomplish.

## Navigation by Role

### I'm a New Developer
1. [Getting Started](./tutorials/GETTING_STARTED.md) - Setup (30 min)
2. [Architecture Overview](./explanation/architecture/ARCHITECTURE.md) - System design (15 min)
3. [Development Process](./how-to/development/DEVELOPMENT_PROCESS.md) - Workflows (10 min)
4. [Authentication Guide](./explanation/architecture/AUTHENTICATION_ARCHITECTURE.md) - Auth patterns (20 min)

**Time to productivity:** ~90 minutes

### I'm a DevOps Engineer
1. [Production Status](./PRODUCTION_STATUS.md) - Current state
2. [Deployment Guide](./how-to/operations/DEPLOYMENT.md) - Deploy process
3. [Runbooks](./how-to/operations/runbooks/) - Operational procedures
4. [CI/CD Workflows](./how-to/development/CI_CD_WORKFLOWS.md) - Automation

### I'm a Frontend Developer
1. [Getting Started](./tutorials/GETTING_STARTED.md) - Setup environment
2. [Architecture Overview](./explanation/architecture/ARCHITECTURE.md) - System design
3. [API Reference](./reference/api/api/README.md) - API endpoints
4. [Voice Ordering](./voice/VOICE_ORDERING_EXPLAINED.md) - Voice UI
5. [Authentication](./explanation/architecture/AUTHENTICATION_ARCHITECTURE.md) - Auth flows

### I'm a Backend Developer
1. [Getting Started](./tutorials/GETTING_STARTED.md) - Setup environment
2. [Architecture Overview](./explanation/architecture/ARCHITECTURE.md) - System design
3. [Database Guide](./reference/schema/DATABASE.md) - Schema
4. [API Reference](./reference/api/api/README.md) - Endpoints
5. [ADR-002: Supabase RLS](./explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md) - Security

## Navigation by Task

### Setting Up Dev Environment
→ [Getting Started](./tutorials/GETTING_STARTED.md)
→ [Environment Variables](./reference/config/ENVIRONMENT.md)

### Deploying to Production
→ [Deployment Guide](./how-to/operations/DEPLOYMENT.md)
→ [Production Checklist](./how-to/operations/runbooks/PRODUCTION_DEPLOYMENT_CHECKLIST.md)
→ [Deployment Success Report](./how-to/operations/runbooks/PRODUCTION_DEPLOYMENT_SUCCESS.md)

### Debugging an Issue
→ [Troubleshooting Guide](./how-to/troubleshooting/TROUBLESHOOTING.md)
→ [Investigation Reports](./investigations/)
→ [Post-Mortems](./archive/incidents/)

### Understanding Architecture
→ [Architecture Overview](./explanation/architecture/ARCHITECTURE.md)
→ [Architecture Decision Records](./explanation/architecture-decisions/)
→ [Authentication Architecture](./explanation/architecture/AUTHENTICATION_ARCHITECTURE.md)

### Integrating APIs
→ [API Reference](./reference/api/api/README.md)
→ [Square API Setup](./reference/api/api/SQUARE_API_SETUP.md)
→ [WebSocket Guide](./reference/api/WEBSOCKET_EVENTS.md)

### Writing Tests
→ [Development Process](./how-to/development/DEVELOPMENT_PROCESS.md)
→ [CI/CD Workflows](./how-to/development/CI_CD_WORKFLOWS.md)
→ [Testing Checklist](./TESTING_CHECKLIST.md)

### Working with Database
→ [Database Guide](./reference/schema/DATABASE.md)
→ [Supabase Connection Guide](./SUPABASE_CONNECTION_GUIDE.md)
→ [Development Process](./how-to/development/DEVELOPMENT_PROCESS.md) - Migration best practices

## Navigation by Technology

- **React/Frontend:** [Getting Started](./tutorials/GETTING_STARTED.md)
- **Node/Backend:** [Getting Started](./tutorials/GETTING_STARTED.md)
- **Supabase/Database:** [DATABASE.md](./reference/schema/DATABASE.md), [ADR-002](./explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md)
- **WebRTC/Voice:** [ARCHITECTURE.md](./explanation/architecture/ARCHITECTURE.md#voice-ordering-architecture), [ADR-005](./explanation/architecture-decisions/ADR-005-client-side-voice-ordering.md)
- **Square/Payments:** [SQUARE_API_SETUP.md](./reference/api/api/SQUARE_API_SETUP.md)

## Documentation Structure (Diátaxis Framework)

Our documentation follows the [Diátaxis framework](https://diataxis.fr/), organized by purpose:

### 📖 Tutorials (Learning-Oriented)
Located in `/docs/tutorials/`:
- **GETTING_STARTED.md** - Setup and first steps

### 🎯 How-To Guides (Goal-Oriented)
Located in `/docs/how-to/`:
- **operations/** - Deployment, KDS operations, runbooks
- **development/** - Development process, CI/CD, contributing
- **troubleshooting/** - Common issues and diagnostics

### 📋 Reference (Information-Oriented)
Located in `/docs/reference/`:
- **api/** - REST API, WebSocket events, Square integration
- **schema/** - Database schema and data model
- **config/** - Environment variables, auth roles

### 💡 Explanation (Understanding-Oriented)
Located in `/docs/explanation/`:
- **architecture/** - System architecture, authentication architecture
- **architecture-decisions/** - ADRs (ADR-001 through ADR-009)
- **concepts/** - Menu system, order flow, integrations

### Other Important Directories
- **naming/** - Terminology standards
- **investigations/** - Incident analysis
- **meta/** - Documentation about documentation
- **voice/** - Voice ordering implementation details
- **archive/** - Historical documentation

## Finding What You Need

**Use Search:**
```bash
# Search all docs for a keyword
grep -r "authentication" docs/ --include="*.md"

# Search archives
grep -r "order flow" docs/archive --include="*.md"
```

**Browse by Category:**
- See [docs/README.md](./README.md) for full overview
- See [index.md](../index.md) for complete documentation index

**Ask for Help:**
- Check [Troubleshooting](./how-to/troubleshooting/TROUBLESHOOTING.md) first
- Review [Investigation Reports](./investigations/) for similar issues
- See [CONTRIBUTING.md](./how-to/development/CONTRIBUTING.md) for how to ask questions

## Common Questions

### Where do I find...

**API Documentation?**
→ `/docs/reference/api/api/README.md`

**Authentication Setup?**
→ `/docs/explanation/architecture/AUTHENTICATION_ARCHITECTURE.md` and `/docs/explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md`

**Deployment Instructions?**
→ `/docs/how-to/operations/DEPLOYMENT.md`

**Database Schema?**
→ `/docs/reference/schema/DATABASE.md`

**Voice Ordering Implementation?**
→ `/docs/explanation/architecture/ARCHITECTURE.md#voice-ordering-architecture` and `/docs/voice/VOICE_ORDERING_EXPLAINED.md`

**Recent Incidents?**
→ `/docs/investigations/` for detailed analysis

**Operational Runbooks?**
→ `/docs/how-to/operations/runbooks/`

**Security Policies?**
→ `/docs/SECURITY.md`

**Environment Variables?**
→ `/docs/reference/config/ENVIRONMENT.md`

**Testing Guidelines?**
→ `/docs/TESTING_CHECKLIST.md` and `/docs/how-to/development/DEVELOPMENT_PROCESS.md`

## Documentation Conventions

### File Naming
- UPPERCASE_WITH_UNDERSCORES.md for major guides
- kebab-case-with-hyphens.md for sub-documents
- ADR-###-topic.md for architecture decisions

### Cross-References
- Use relative paths: `[Link](./OTHER_DOC.md)`
- Include section anchors: `[Link](./DOC.md#section-name)`

### Maintenance
- All major docs have "Last Updated" date
- Version numbers match VERSION.md
- Deprecated content moved to archive/

---

**Maintained by:** Restaurant OS Team
**Documentation Standards:** [DOCUMENTATION_STANDARDS.md](./DOCUMENTATION_STANDARDS.md)
