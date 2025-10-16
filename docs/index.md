# Restaurant OS Documentation Index

**Last Updated**: 2025-09-26
**Version**: See [VERSION.md](VERSION.md)

## 📚 Documentation Organization

This index provides a complete map of all documentation in the Restaurant OS project.

---

## 🚀 Getting Started

Essential documentation for new developers and users.

- [README](README.md) - Project overview and quick links
- [Getting Started](GETTING_STARTED.md) - Initial setup guide
- [Environment Variables](ENVIRONMENT.md) - Configuration reference
- [Version Information](VERSION.md) - Current versions ⭐

## 🔧 Guides

Step-by-step guides for common tasks.

### Deployment
- [Deployment Guide](DEPLOYMENT.md) - General deployment instructions
- [Vercel Deployment](VERCEL.md) - Frontend hosting setup

### Development
- [Contributing](CONTRIBUTING.md) - Contribution guidelines
- [Documentation Standards](DOCUMENTATION_STANDARDS.md) - Doc writing guide
- [Architecture Overview](ARCHITECTURE.md) - System design

### Features
- [Voice Ordering](voice/VOICE_ORDERING_EXPLAINED.md) - AI voice system
- [Kitchen Display System](DEPLOYMENT.md#kds-deploy) - KDS implementation
- [Order Flow](ORDER_FLOW.md) - Order lifecycle

## 📖 Reference

Technical reference documentation.

### API & Integration
- [API Documentation](api/README.md) - REST endpoints ⭐
- [Database Schema](DATABASE.md) - Table structure ⭐
- [WebSocket Events](DEPLOYMENT.md#websockets) - Real-time events ⭐

### Configuration
- [Environment Variables](ENVIRONMENT.md) - All env vars
- [Security Configuration](SECURITY.md) - Security settings

## 🔍 Operations

Operational and monitoring documentation.

### Monitoring
- [Production Diagnostics](PRODUCTION_DIAGNOSTICS.md) - Historical incident

### Development Tools
- [Agents](AGENTS.md) - AI agent documentation
- [Roadmap](ROADMAP.md) - Development roadmap
- [Changelog](CHANGELOG.md) - Version history

## 📁 Directory Structure

```
docs/
├── index.md                  # This file
├── README.md                 # Quick links hub
├── VERSION.md               # Version source of truth
├── DOCUMENTATION_STANDARDS.md # Documentation guidelines
│
├── api/                     # API documentation
│   └── README.md           # Endpoint reference
│
├── archive/                 # Historical documents
│   └── [date]/             # Archived by date
│
└── voice/                   # Voice feature docs
    └── VOICE_ORDERING_EXPLAINED.md
```

## 🗂️ Related Directories

### `/reports/`
Generated reports and analysis (see [reports/README.md](../reports/README.md))
- Coverage reports
- Build analysis
- Performance metrics

### `/scripts/`
Utility scripts and tools
- `check-env.mjs` - Validate .env.example
- `validate-env.mjs` - Check environment setup
- Database seeders and migrations

### `/supabase/`
Database configuration
- `/migrations/` - Database migrations
- `/functions/` - Edge functions

## 🏷️ Document Categories

### By Update Frequency

**Living Documents** (updated regularly)
- [README.md](README.md)
- [ENVIRONMENT.md](ENVIRONMENT.md)
- [CHANGELOG.md](CHANGELOG.md)
- [VERSION.md](VERSION.md)

**Stable Documents** (updated occasionally)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [DATABASE.md](DATABASE.md)
- [api/README.md](api/README.md)

**Historical Documents** (archived)
- [PRODUCTION_DIAGNOSTICS.md](PRODUCTION_DIAGNOSTICS.md)
- Files in `/archive/`

### By Audience

**For Developers**
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [DATABASE.md](DATABASE.md)
- [api/README.md](api/README.md)

**For DevOps**
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [ENVIRONMENT.md](ENVIRONMENT.md)
- [VERCEL.md](VERCEL.md)

**For Product/Business**
- [README.md](README.md)
- [ROADMAP.md](ROADMAP.md)
- [CHANGELOG.md](CHANGELOG.md)

## 🔄 Maintenance

### Adding New Documentation

1. Create file in appropriate directory
2. Add required headers (see [DOCUMENTATION_STANDARDS.md](DOCUMENTATION_STANDARDS.md))
3. Update this index
4. Link from related documents

### Updating Documentation

1. Update "Last Updated" date
2. Link versions to [VERSION.md](VERSION.md)
3. Verify code references
4. Test examples

### Archiving Documentation

1. Add historical banner
2. Move to `/archive/YYYY-MM-DD/`
3. Update references to point to new location
4. Update this index

## 🛠️ Documentation Tools

### Validation Scripts
```bash
# Check .env.example completeness
npm run env:check

# Validate environment setup
npm run env:validate

# Run documentation CI checks (if configured)
npm run docs:check
```

### Quick Commands
```bash
# Find all TODO comments in docs
grep -r "TODO" docs/

# Find broken markdown links
npx markdown-link-check docs/**/*.md

# Check for hardcoded versions
grep -r "React [0-9]" docs/
grep -r "Express [0-9]" docs/
```

## 📝 Documentation Checklist

For PRs that modify documentation:

- [ ] Updated "Last Updated" dates
- [ ] No hardcoded version numbers
- [ ] Links to VERSION.md for versions
- [ ] All internal links work
- [ ] Code examples tested
- [ ] Added to this index if new file
- [ ] Follows [DOCUMENTATION_STANDARDS.md](DOCUMENTATION_STANDARDS.md)

## 🚦 Documentation Health

Current status:
- ✅ Version truth established (VERSION.md)
- ✅ API documentation complete
- ✅ Database schema documented
- ✅ WebSocket events documented
- ✅ Environment setup documented
- ✅ Standards defined
- 🔄 Coverage baseline: ~23.47%

## 📮 Getting Help

- Check this index first
- Review [DOCUMENTATION_STANDARDS.md](DOCUMENTATION_STANDARDS.md)
- Search existing docs
- Ask in GitHub Issues

---

**Maintained by**: Restaurant OS Team
**Documentation Owner**: Development Team
**Review Cycle**: Quarterly