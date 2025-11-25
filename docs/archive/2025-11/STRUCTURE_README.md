# Monorepo Structure Maps - Complete Guide

This repository includes comprehensive structure documentation to help you navigate and understand the codebase.

## Three Documentation Files

### 1. MONOREPO_STRUCTURE.md (Exhaustive Directory Map)
**Purpose**: Complete file-by-file breakdown of every directory

**Contains**:
- Root directory structure
- Client workspace (350+ files) with subsystems:
  - Authentication, Orders, KDS, Voice, Menu, Payments, Tables, WebSocket, etc.
  - Components, hooks, services, pages, utilities
  - Test files by category
- Server workspace (130+ files) with subsystems:
  - Routes, services, middleware, AI, config
  - Test files by location
- Shared workspace (types, contracts, utilities)
- E2E test suite (31 Playwright specs)
- Subsystem summary showing client/server split
- Test distribution analysis
- Architectural patterns
- File count statistics

**When to use**: When you need to find a specific file location

**Example**: "Where are the voice ordering services?" → See section "2.6 Voice Ordering Subsystem"

---

### 2. SUBSYSTEM_MAP.txt (Quick Reference)
**Purpose**: Fast lookup by feature area with client/server side-by-side

**Contains**:
- 9 major subsystems with their components:
  1. Authentication & Authorization
  2. Orders & Checkout System
  3. Kitchen Display System (KDS)
  4. Voice Ordering Subsystem
  5. Menu System
  6. Payments Subsystem
  7. Tables & Floor Plan
  8. Real-time Infrastructure (WebSocket)
  9. Core Infrastructure & Utilities
- Shared code (types, contracts, utilities)
- Test coverage overview
- Key architectural patterns
- File organization summary
- Command reference

**When to use**: When you're working on a feature and need to see all related files at once

**Example**: "I'm adding voice features" → Look at section "4. VOICE ORDERING SUBSYSTEM" to see client hooks, services, server AI adapters, and routes

---

### 3. CODEBASE_INDEX.md (Navigation Guide)
**Purpose**: Task-oriented navigation and common patterns

**Contains**:
- Quick start for common changes (auth, orders, voice, etc.)
- Feature-by-feature implementation details
- Test file location guide
- How to run tests (commands)
- Middleware stack explanation
- Key files to know
- Critical rules to follow
- Database workflow
- Common development patterns
- Development commands
- Project statistics
- Getting help resources

**When to use**: When you need to accomplish a specific task

**Example**: "How do I add a new API endpoint?" → See "Adding an API Endpoint" section with step-by-step instructions

---

## Quick Navigation by Task

### "I need to find file X"
→ Use **MONOREPO_STRUCTURE.md**

Examples:
- Where is the order checkout page? → Section 2.3
- Where is the voice AI core? → Section 3.6
- Where are the E2E tests? → Section 5

### "I'm working on feature Y"
→ Use **SUBSYSTEM_MAP.txt**

Examples:
- I'm implementing voice ordering → Section 4 shows all voice files
- I'm fixing payment processing → Section 6 shows payment files
- I'm debugging WebSocket issues → Section 8 shows WebSocket stack

### "I need to do task Z"
→ Use **CODEBASE_INDEX.md**

Examples:
- Add authentication to a new page → See "Adding a Page"
- Implement a new hook → See "Adding a Hook"
- Run tests for voice feature → See "Running Tests"
- Debug an error → See "Getting Help"

---

## Project Overview

**Repository**: `/Users/mikeyoung/CODING/rebuild-6.0`

**Type**: React 18.3.1 + Express TypeScript Monorepo

**Workspaces**: 4
- `client/` - Vite frontend (port 5173)
- `server/` - Express backend (port 3001)
- `shared/` - Shared types and utilities
- `supabase/` - Database migrations

**Files**: 400+ TypeScript/TSX, 50+ type files, 119 test files

**Status**: v6.0.14 at 90% production readiness

---

## Critical Architecture Patterns

### 1. Snake_case Everywhere (ADR-001)
Database, API, and client code ALL use snake_case:
- NO camelCase transformations between layers
- Enforced by ResponseTransform middleware

### 2. Dual Authentication (ADR-006)
Two parallel auth systems:
- Supabase auth (production users)
- localStorage JWT (demo, PIN, station)

### 3. Remote-First Database (ADR-010)
Supabase is single source of truth:
- Never edit Prisma schema manually
- Run `npx prisma db pull` to sync from remote

### 4. Multi-Tenancy Everywhere
Every operation includes `restaurant_id`:
- Enforced at DB (RLS policies)
- Enforced at API (middleware)
- Enforced in client (context)

### 5. Unified HTTP Client
Must use `httpClient` from `services/http/httpClient.ts`:
- NO direct fetch() calls
- NO custom HTTP clients
- Supports request batching

---

## Major Subsystems at a Glance

| Subsystem | Client | Server | Tests | Status |
|-----------|--------|--------|-------|--------|
| **Authentication** | 8 files | 3 files | 2 files | Production |
| **Orders** | 45+ files | 8 files | 12+ files | Production |
| **Kitchen (KDS)** | 15 files | 2 files | 4+ files | Production |
| **Voice** | 35+ files | 18 files | 10+ files | Production |
| **Menu** | 8 files | 4 files | 3+ files | Production |
| **Payments** | 5 files | 3 files | 3+ files | Production |
| **Tables/Floor** | 18 files | 3 files | 2+ files | Production |
| **WebSocket** | 6 files | 2 files | 1+ file | Production |

---

## Useful Commands

```bash
# Development
npm run dev                  # Start everything
npm run dev:client           # Client only
npm run dev:server           # Server only

# Testing
npm test                     # All tests
npm run test:e2e             # Playwright E2E
npm run test:watch           # Watch mode

# Database
npx prisma db pull           # Sync from Supabase (IMPORTANT)
npm run db:seed              # Seed test data

# Build & Deploy
npm run build                # Production build
npm run build:vercel         # Vercel deployment

# Documentation
npm run health               # System health check
python3 scripts/validate_links.py  # Check doc links
```

---

## Where to Find Things

### Feature Implementation
- **Authentication UI**: `/client/src/components/auth/`
- **Order display**: `/client/src/modules/orders/`
- **Kitchen display**: `/client/src/pages/KitchenDisplayOptimized.tsx`
- **Voice ordering**: `/client/src/modules/voice/`
- **API endpoints**: `/server/src/routes/`
- **Business logic**: `/server/src/services/`
- **Database ops**: Prisma types from `npx prisma generate`

### Testing
- **Unit tests**: Colocated with code (`__tests__/` subdirectories)
- **E2E tests**: `/tests/e2e/`
- **Security tests**: `/server/tests/security/`

### Configuration
- **Client env**: `/client/src/config/env.schema.ts`
- **Server env**: `/server/src/config/env.schema.ts`
- **Types**: `/shared/types/`

### Documentation
- **Architecture decisions**: `/docs/`
- **Debugging knowledge**: `/claude-lessons3/`
- **This guide**: `CODEBASE_INDEX.md`
- **Structure**: `MONOREPO_STRUCTURE.md`
- **Subsystems**: `SUBSYSTEM_MAP.txt`

---

## Getting Started

1. **Read this README** - You are here
2. **Read CLAUDE.md** - Project-specific guidance
3. **Choose your resource**:
   - Need file path? → MONOREPO_STRUCTURE.md
   - Working on feature? → SUBSYSTEM_MAP.txt
   - How to do something? → CODEBASE_INDEX.md
4. **Run health check**:
   ```bash
   npm run health
   npm run typecheck
   ```
5. **Start development**:
   ```bash
   npx prisma db pull
   npm run dev
   ```

---

## Key Insights

### Test Distribution
- 119 total test files
- 40+ client tests (collocated)
- 60+ server tests (mixed locations)
- 31 E2E tests (Playwright)
- 85%+ pass rate

### Component Architecture
- 100+ UI components
- 40+ custom hooks
- 9 major feature modules
- 15+ middleware layers
- 25+ business logic services

### Code Organization
- All types in `/shared/types/`
- All services with business logic
- All components organized by feature
- Collocated tests next to implementation
- Shared utilities for cross-layer concerns

---

## Pro Tips

1. **Always run `npx prisma db pull` first** - Schema is generated from remote
2. **Use fuzzyMenuMatcher.ts for search** - Already optimized fuzzy matching
3. **Check SYMPTOM_INDEX.md** - 600+ hours of debugging knowledge
4. **Use logger not console.log** - Enforced by pre-commit
5. **Think restaurant_id first** - Required in every DB operation
6. **Understand state machines** - Orders and voice use them extensively
7. **Test colocation** - Tests live next to code in `__tests__/` directories

---

## Support Resources

| Need | Resource | Location |
|------|----------|----------|
| Fix error | SYMPTOM_INDEX.md | claude-lessons3/ |
| API docs | API documentation | docs/ |
| DB schema | Prisma studio | `npx prisma studio` |
| Type defs | Type files | shared/types/ |
| Examples | Tests | **/*.test.ts |
| Patterns | Existing code | Search codebase |

---

## Questions?

1. Is it a **file location question?** → MONOREPO_STRUCTURE.md
2. Is it a **feature implementation question?** → SUBSYSTEM_MAP.txt
3. Is it a **how-to question?** → CODEBASE_INDEX.md
4. Is it a **specific error?** → claude-lessons3/SYMPTOM_INDEX.md
5. Is it a **documentation question?** → docs/

All three maps are designed to work together. Start with the one that matches your need, then reference the others for additional context.

---

**Generated**: November 23, 2025
**Project**: Rebuild 6.0 v6.0.14
**Status**: 90% Production Ready
