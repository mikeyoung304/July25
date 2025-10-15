# Documentation

**Version**: 6.0.7 | **Last Updated**: 2025-10-13

## 🆕 What's New

- ✅ **ADR-001**: Adopted full snake_case convention across all layers ([Read ADR](ADR-001-snake-case-convention.md))
- ✅ **Kitchen Display v2**: Optimized display with table grouping and batch operations
- ✅ **Phase 2**: Disabled response transformation middleware for zero-overhead architecture
- 📄 See [Production Status](PRODUCTION_STATUS.md) for current readiness metrics

---

## Quick Links

- 🚀 [Getting Started](GETTING_STARTED.md)
- 📦 [Deployment Guide](DEPLOYMENT.md)
- 🔧 [Environment Variables](ENVIRONMENT.md)
- 🏗️ [Architecture Overview](ARCHITECTURE.md)
- 📊 [Production Status](PRODUCTION_STATUS.md)
- 🔒 [Security](../SECURITY.md)
- 🤝 [Contributing](../CONTRIBUTING.md)

## 📋 Architecture Decisions (ADRs)

Enterprise-grade architectural decisions documented for AI agents and developers:

- **[ADR-001: Full snake_case Convention](ADR-001-snake-case-convention.md)** ✅ IMPLEMENTED
  - Status: ACCEPTED (2025-10-12)
  - Impact: Database, API, and Client layers
  - Rationale: PostgreSQL standard, zero transformation overhead

- **[ADR-002: Multi-Tenancy Architecture](ADR-002-multi-tenancy.md)** ⏳ PLANNED
  - restaurant_id enforcement across all queries
  - Row Level Security (RLS) policies

- **[ADR-003: Embedded Orders Pattern](ADR-003-embedded-orders.md)** ⏳ PLANNED
  - JSONB items array vs separate order_items table
  - Performance vs normalization tradeoffs

- **[ADR-004: WebSocket Real-Time Architecture](ADR-004-websocket-architecture.md)** ⏳ PLANNED
  - Connection pooling and heartbeat strategy
  - Event-driven kitchen display updates

- **[ADR-005: Client-Side Voice Ordering](ADR-005-client-voice.md)** ⏳ PLANNED
  - OpenAI Realtime API (WebRTC)
  - Frontend vs backend voice processing

## Platform-Specific

- [Vercel Deployment](VERCEL.md) - Frontend hosting
- [Supabase Setup](../supabase/MIGRATION_GUIDE.md) - Database

## Features

- [Voice Ordering](voice/VOICE_ORDERING_EXPLAINED.md)
- [Kitchen Display System](KDS-BIBLE.md)
- [Menu System](MENU_SYSTEM.md)
- [Order Flow](ORDER_FLOW.md)
- [Square Integration](DEPLOYMENT.md#square-integration)

## API Documentation

- [API Reference](api/API-REFERENCE.md)
- [WebSocket Events](api/websockets/README.md)
- [Authentication](JWT_AUTHENTICATION_FLOW.md)

## Operations

- 🔧 [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues and solutions
- 🧪 [Testing Guide](TESTING_GUIDE.md)
- 📖 [Operational Runbook](OPERATIONAL_RUNBOOK.md)
- 📊 [Production Status](PRODUCTION_STATUS.md) - Current readiness metrics
- 🚨 [Deployment Checklist](DEPLOYMENT.md#pre-deployment-checklist)

## Development

- [Setup Guide](06-development/setup.md)
- [Known Issues](06-development/known-issues.md)
- [Architecture Decisions (ADRs)](#-architecture-decisions-adrs)
- [Database Schema](DATABASE.md)
- [Roadmap](ROADMAP.md)

## Current Status

- **Version**: 6.0.7
- **Frontend**: https://july25-client.vercel.app
- **Backend**: https://july25.onrender.com
- **Last Updated**: 2025-10-13
- **Enterprise Readiness**: 60% (Target: 95%) - See [Production Status](PRODUCTION_STATUS.md)

## Documentation Standards

### File Organization
- Core docs in `/docs`
- API docs in `/docs/api`
- Feature guides in respective sections
- Archives in `/docs/archive/YYYY-MM-DD/`

### Naming Conventions
- UPPERCASE.md for major guides
- lowercase.md for subsections
- No version numbers in filenames
- No dates in active documentation

### Best Practices
- Single source of truth per topic
- Cross-reference instead of duplicate
- Archive old versions
- Keep documentation current

## Need Help?

1. Check relevant guide above
2. Search in documentation
3. Check [Known Issues](06-development/known-issues.md)
4. Ask in team chat
5. Create GitHub issue
