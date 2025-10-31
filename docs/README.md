# Restaurant OS Documentation

**Version:** 6.0.14 | **Last Updated:** October 30, 2025

Welcome to the Restaurant OS documentation. This guide helps you navigate our comprehensive documentation system.

## 🚀 Quick Start

**New to Restaurant OS?**
- [Getting Started Guide](./GETTING_STARTED.md) - Setup and first steps
- [Architecture Overview](./ARCHITECTURE.md) - System design
- [API Reference](./api/README.md) - REST API documentation

**Deploying to Production?**
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [Production Status](./PRODUCTION_STATUS.md) - Readiness assessment
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Pre-flight checklist

**Troubleshooting?**
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Common issues
- [Investigation Reports](./investigations/) - Incident analysis
- [Post-Mortems](./archive/incidents/) - Historical incidents

## 📚 Documentation Structure

### Core Documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and voice ordering
- [AUTHENTICATION_ARCHITECTURE.md](./AUTHENTICATION_ARCHITECTURE.md) - Auth flows and security
- [SECURITY.md](./SECURITY.md) - Security policies and practices
- [ROADMAP.md](./ROADMAP.md) - Future plans and vision

### Architecture Decision Records (ADRs)
- [ADR-001](./ADR-001-project-restructure-typescript-setup.md) - TypeScript setup
- [ADR-002](./ADR-002-supabase-rls-architecture.md) - Supabase RLS
- [ADR-005](./ADR-005-client-side-voice-ordering.md) - Voice ordering (★ exemplary)
- [See all ADRs](./index.md#architecture-decision-records)

### API & Integration
- [API Documentation](./api/README.md) - REST endpoints
- [Square API Setup](./api/SQUARE_API_SETUP.md) - Payment integration
- [WebSocket Guide](./WEBSOCKET_GUIDE.md) - Real-time updates

### Operations
- [Deployment](./DEPLOYMENT.md) - Production deployment
- [CI/CD Workflows](./CI_CD_WORKFLOWS.md) - Automation
- [Database Migrations](./DEVELOPMENT_PROCESS.md) - Migration best practices
- [Environment Setup](./ENVIRONMENT.md) - Configuration

## 🎯 Documentation by User Journey

### "I'm a new developer joining the team"
1. [GETTING_STARTED.md](./GETTING_STARTED.md) - Setup
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
3. [AUTHENTICATION_ARCHITECTURE.md](./AUTHENTICATION_ARCHITECTURE.md) - Auth patterns
4. [DEVELOPMENT_PROCESS.md](./DEVELOPMENT_PROCESS.md) - Workflows

### "I need to understand authentication"
1. [AUTHENTICATION_ARCHITECTURE.md](./AUTHENTICATION_ARCHITECTURE.md) - Primary guide
2. [ADR-006](./ADR-006-dual-authentication-pattern.md) - Dual auth decision
3. [AUTH_ROLES_V6.0.8.md](./AUTH_ROLES_V6.0.8.md) - Role definitions

### "I need API documentation"
1. [api/README.md](./api/README.md) - API reference
2. [API endpoints](./API_DOCUMENTATION.md) - Endpoint details
3. [Square API Setup](./api/SQUARE_API_SETUP.md) - Payment integration

### "I'm debugging an issue"
1. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common fixes
2. [investigations/](./investigations/) - Past incident analysis
3. [archive/incidents/](./archive/incidents/) - Historical post-mortems

## 📖 Additional Resources

- [CHANGELOG.md](./CHANGELOG.md) - Version history
- [VERSION.md](./VERSION.md) - Current version info
- [ROADMAP.md](./ROADMAP.md) - Future plans
- [CONTRIBUTING.md](../CONTRIBUTING.md) - How to contribute
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
