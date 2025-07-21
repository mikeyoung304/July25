# Documentation Overview

**Last Updated**: January 2025

## 📚 Documentation Structure

### Essential Documentation (Post-Cleanup)

#### Core Documents
- **[README.md](../README.md)** - Project overview and quick start
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** - ⭐ **SOURCE OF TRUTH** - Unified backend architecture
- **[DEVELOPMENT.md](../DEVELOPMENT.md)** - Development setup and workflow
- **[DEPLOYMENT.md](../DEPLOYMENT.md)** - Production deployment guide

#### Backend Documentation
- **[API_ENDPOINTS.md](../API_ENDPOINTS.md)** - Complete API reference
- **[server/README.md](../server/README.md)** - Backend implementation details

#### Feature Guides
- **[VOICE_ORDERING_GUIDE.md](./VOICE_ORDERING_GUIDE.md)** - Voice ordering system
- **[FLOOR_PLAN_SETUP.md](../FLOOR_PLAN_SETUP.md)** - Floor plan management
- **[TEST_ARCHITECTURE.md](../TEST_ARCHITECTURE.md)** - Testing strategy

#### Operations
- **[MONITORING.md](../MONITORING.md)** - Monitoring and observability
- **[CONTRIBUTING_AI.md](../CONTRIBUTING_AI.md)** - AI development guidelines

## 🧹 Documentation Cleanup Status

### Completed Actions
1. ✅ Deleted `/docs/archive/pre-backend/` (27 outdated files)
2. ✅ Consolidated architecture docs into single `ARCHITECTURE.md`
3. ✅ Merged documentation audits into this file
4. ✅ Reduced documentation from 61 to ~20 essential files

### Previous Issues (Now Resolved)
- ❌ Multiple architecture documents → ✅ Single source of truth
- ❌ Duplicate quick start guides → ✅ Consolidated
- ❌ Outdated voice docs with port 3002 → ✅ Deleted
- ❌ Multiple documentation audits → ✅ This single file

## 📊 Documentation Health Metrics

### Before Cleanup
- Total markdown files: 61
- Duplication clusters: 7
- Outdated references: 27+ files

### After Cleanup
- Total markdown files: ~20
- Duplication clusters: 0
- Outdated references: 0

## 🔍 Documentation Standards

### File Organization
```
rebuild-6.0/
├── Root Level              # Architecture decisions, project overview
│   ├── README.md          # First point of contact
│   ├── ARCHITECTURE.md    # Technical decisions
│   └── DEVELOPMENT.md     # Setup guide
├── docs/                  # Feature guides and detailed docs
│   ├── DOCUMENTATION.md   # This file
│   └── *_GUIDE.md        # Feature-specific guides
└── module/README.md       # Module-specific documentation
```

### Documentation Rules
1. **One source of truth** - No duplicate documentation
2. **Location matters** - Root for decisions, /docs for guides
3. **Keep it current** - Delete rather than archive outdated docs
4. **Be concise** - If it's not helping, it's hurting

## 🚨 Common Documentation Pitfalls

### What NOT to Document
- ❌ Outdated architectures (microservices, port 3002)
- ❌ Historical decisions without current relevance
- ❌ Duplicate information across multiple files
- ❌ Auto-generated documentation that adds no value

### What TO Document
- ✅ Architecture decisions and rationale
- ✅ Setup and deployment procedures
- ✅ API contracts and interfaces
- ✅ Complex features (voice, real-time updates)
- ✅ Operational procedures (monitoring, debugging)

## 📝 Documentation Maintenance

### Regular Reviews
- **Quarterly**: Review all documentation for accuracy
- **On Major Changes**: Update affected documentation immediately
- **Before Release**: Ensure docs match implementation

### Cleanup Triggers
- Finding references to deprecated features
- Discovering duplicate information
- Documentation not accessed in 6 months
- Conflicting information between docs

## 🎯 Documentation Goals

1. **Developer Onboarding**: New developer productive in < 1 day
2. **Feature Understanding**: Any feature explainable in 1 doc
3. **Troubleshooting**: Common issues documented with solutions
4. **Architecture Clarity**: Decisions documented with rationale

---

*This document consolidates all previous documentation audits and serves as the single source of truth for documentation standards and organization.*