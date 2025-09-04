# Restaurant OS Documentation Index

**Version**: 6.0.3  
**Last Updated**: September 2, 2025

## 📚 Core Documentation

### Essential Reads
- [README.md](/README.md) - Project overview and quick start
- [ARCHITECTURE.md](/ARCHITECTURE.md) - System architecture quick reference
- [ROADMAP.md](/ROADMAP.md) - Development roadmap and priorities
- [SECURITY.md](/SECURITY.md) - Security policies and guidelines
- [CHANGELOG.md](/CHANGELOG.md) - Version history and changes
- [CLAUDE.md](/CLAUDE.md) - AI assistant instructions

### Getting Started
- [Installation Guide](/docs/01-getting-started/installation.md)
- [Development Setup](/docs/06-development/setup.md)
- [Contributing Guidelines](/CONTRIBUTING.md)

## 🏗️ Architecture

### System Design
- [Architecture Overview](/docs/architecture/README.md) - Complete system architecture
- [System Architecture](/docs/SYSTEM_ARCHITECTURE.md) - Detailed component breakdown

### Architecture Decision Records (ADRs)
- [ADR-001: Authentication Strategy](/docs/ADR/ADR-001-authentication.md)
- [ADR-002: Unified Backend](/docs/ADR/ADR-002-unified-backend.md)
- [ADR-003: Cart Unification](/docs/ADR/ADR-003-cart-unification.md)
- [ADR-004: Voice System Consolidation](/docs/ADR/ADR-004-voice-system-consolidation.md)
- [ADR-007: Order Status Alignment](/docs/ADR/ADR-007-order-status-alignment.md)

## 🔌 API Documentation

- [API Reference](/docs/api/README.md) - Complete REST API documentation
- [WebSocket Events](/docs/api/websockets/README.md) - Real-time events

## ✨ Features

### Voice Ordering
- [Voice Ordering Overview](/docs/03-features/voice-ordering.md)
- [Voice System Explained](/docs/voice/VOICE_ORDERING_EXPLAINED.md)

### Kitchen Display System (KDS)
- [KDS Overview](/docs/03-features/kitchen-display.md)
- [KDS Revolution](/docs/03-features/kds-revolution.md)
- [KDS Bible](/docs/KDS-BIBLE.md) - Critical KDS requirements

### Order Management
- [Order Flow](/docs/ORDER_FLOW.md) - Complete order lifecycle

### Payment Processing
- [Payments Strategy](/docs/PAYMENTS_STRATEGY.md)
- [Payment Token Issue](/docs/PAYMENT_TOKEN_ISSUE.md) - Troubleshooting guide

## 🚀 Operations

### Deployment
- [Deployment Guide](/docs/DEPLOYMENT_GUIDE.md)
- [Operations Guide](/docs/05-operations/deployment.md)

### Testing
- [Testing Guide](/docs/TESTING_GUIDE.md)
- [Test Coverage Requirements](/docs/06-development/setup.md)

### Troubleshooting
- [Troubleshooting Guide](/docs/05-operations/troubleshooting.md)
- [Known Issues](/docs/06-development/known-issues.md)

## 🔧 Development

### Development Guides
- [Setup Guide](/docs/06-development/setup.md)
- [Contributing](/docs/06-development/contributing.md)
- [Known Issues](/docs/06-development/known-issues.md)

### Code Quality
- [Code Analysis](/docs/analysis/reports/code-analysis.md)

## 📖 Teaching & Learning

### Lessons
- [Master Lesson Plan](/docs/teaching/MASTER_LESSON_PLAN.md)
- [Lesson 2: Vibe Coding Mastery](/docs/teaching/LESSON_2_VIBE_CODING_MASTERY.md)
- [Lesson 3: The Vibe Coding Manifesto](/docs/teaching/LESSON_3_THE_VIBE_CODING_MANIFESTO.md)

### Agent Reports
- [Voice Agent Report](/docs/teaching/agents/01-voice-agent-report.md)
- [KDS Agent Report](/docs/teaching/agents/02-kds-agent-report.md)
- [Architecture Agent Report](/docs/teaching/agents/03-architecture-agent-report.md)
- [History Agent Report](/docs/teaching/agents/04-history-agent-report.md)
- [Frontend Agent Report](/docs/teaching/agents/05-frontend-agent-report.md)
- [Backend Agent Report](/docs/teaching/agents/06-backend-agent-report.md)
- [Security Agent Report](/docs/teaching/agents/07-security-agent-report.md)
- [Roadmap Agent Report](/docs/teaching/agents/08-roadmap-agent-report.md)

## 📊 Reports & Analysis

### Current Reports
- [Demo Greenlight Summary](/docs/DEMO_GREENLIGHT_SUMMARY.md)
- [Documentation Revolution Summary](/docs/DOCUMENTATION_REVOLUTION_SUMMARY.md)

### Four Horsemen Analysis
- [Executive Summary](/docs/FOUR_HORSEMEN_EXECUTIVE_SUMMARY.md)
- [Horseman: Bloat](/docs/HORSEMAN_BLOAT.md)
- [Horseman: Chaos](/docs/HORSEMAN_CHAOS.md)
- [Horseman: Debt](/docs/HORSEMAN_DEBT.md)
- [Horseman: Drift](/docs/HORSEMAN_DRIFT.md)

## 🛠️ Admin & Special Topics

### Admin Tools
- [Chip Monkey Database Workaround](/docs/admin/chip-monkey-database-workaround.md)
- [Floor Plan Chip Monkey](/docs/admin/floor-plan-chip-monkey.md)

### Completed Features
- [Auth Roadmap Completed](/docs/archive/completed-features/AUTH_ROADMAP_COMPLETED.md)
- [Authentication Strategy Completed](/docs/archive/completed-features/AUTHENTICATION_STRATEGY_COMPLETED.md)

## 📦 Archived Documentation

Older documentation has been archived to maintain history while keeping current docs clean.

### Archive Structure
- `/docs/archive/2025-09-02/` - Tonight's audit archive
- `/docs/archive/2025-09-01-pre-cleanup/` - Previous cleanup
- `/docs/archive/2025-01-26/` - January reorganization
- `/docs/archive/completed-features/` - Implemented features

## 🔍 Quick Links

### Most Important
1. [README.md](/README.md) - Start here
2. [Architecture Overview](/docs/architecture/README.md) - System design
3. [API Reference](/docs/api/README.md) - API documentation
4. [Deployment Guide](/docs/DEPLOYMENT_GUIDE.md) - Production deployment

### For Developers
1. [CLAUDE.md](/CLAUDE.md) - AI coding assistant guide
2. [Development Setup](/docs/06-development/setup.md) - Local environment
3. [Testing Guide](/docs/TESTING_GUIDE.md) - Testing requirements
4. [Contributing](/CONTRIBUTING.md) - Contribution guidelines

### For Operations
1. [Security Policy](/SECURITY.md) - Security guidelines
2. [Deployment Guide](/docs/DEPLOYMENT_GUIDE.md) - Deployment process
3. [Troubleshooting](/docs/05-operations/troubleshooting.md) - Common issues

### For Product
1. [Roadmap](/ROADMAP.md) - Product roadmap
2. [Changelog](/CHANGELOG.md) - Release history
3. [Features](/docs/03-features/) - Feature documentation

## 📝 Documentation Standards

### File Naming
- Use kebab-case for files: `order-flow.md`
- Use UPPERCASE for important docs: `README.md`, `CHANGELOG.md`
- Prefix with numbers for ordering: `01-getting-started/`

### Content Standards
- Include "Last Updated" date
- Include version number where relevant
- Use clear headings and structure
- Include code examples
- Cross-reference related docs

### Maintenance
- Review quarterly
- Archive outdated content
- Update version numbers
- Maintain this index

---

**Need Help?**
- Check [README.md](/README.md) first
- Review [Known Issues](/docs/06-development/known-issues.md)
- Contact: security@restaurant-os.com (for security issues)