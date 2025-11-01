# Documentation Organization

**Last Updated:** 2025-11-01
**Version:** 6.0.14

---

## Table of Contents

1. [The Diátaxis Framework Explained](#1-the-diataxis-framework-explained)
2. [Directory Structure](#2-directory-structure)
3. [Documentation Standards](#3-documentation-standards)
4. [Quality Automation](#4-quality-automation)
5. [Tools Reference](#5-tools-reference)
6. [How to Contribute](#6-how-to-contribute)
7. [Common Mistakes](#7-common-mistakes)

---

## 1. The Diátaxis Framework Explained

Restaurant OS documentation follows the **[Diátaxis framework](https://diataxis.fr/)** - a systematic approach that organizes documentation by **what the reader is trying to do**.

### Framework Overview

```
          Learning  ←───────────→  Applying
              ↑                        ↑
              |                        |
        TUTORIALS               HOW-TO GUIDES
     (Learning-oriented)      (Goal-oriented)
              |                        |
              ↓                        ↓
         EXPLANATION              REFERENCE
   (Understanding-oriented)  (Information-oriented)
              |                        |
              ↓                        ↓
         Acquiring  ←───────────→  Information
```

### 1.1 Tutorials (Learning-Oriented)

**Purpose:** Teach newcomers basic skills through hands-on lessons

**Location:** `/docs/tutorials/`

**Characteristics:**
- Step-by-step instructions
- Beginner-friendly language
- Starts from zero knowledge
- Guided learning path
- Expected outcomes clearly stated

**Example:**
```markdown
# Getting Started with Restaurant OS

## What You'll Learn
- How to set up your development environment
- How to run the application locally
- How to make your first code change

## Prerequisites
- Basic JavaScript knowledge
- Node.js installed

## Step 1: Clone the Repository
```bash
git clone https://github.com/...
cd restaurant-os
```

This clones the codebase to your computer.
...
```

**When to Write Tutorials:**
- Onboarding new team members
- Teaching fundamental concepts
- Introducing major new features
- Educational content for CS students

### 1.2 How-To Guides (Goal-Oriented)

**Purpose:** Solve specific problems with practical recipes

**Location:** `/docs/how-to/`

**Characteristics:**
- Assumes reader knows basics
- Focused on achieving a goal
- Flexible, can be adapted
- Problem-solution format
- Multiple approaches acceptable

**Sub-categories:**
- **Operations:** `/docs/how-to/operations/` - Deployment, KDS, runbooks
- **Development:** `/docs/how-to/development/` - Dev process, CI/CD, contributing
- **Troubleshooting:** `/docs/how-to/troubleshooting/` - Common issues, diagnostics

**Example:**
```markdown
# How to Deploy to Production

## Goal
Deploy Restaurant OS to production environment.

## Prerequisites
- Access to Vercel and Render dashboards
- Environment variables configured
- Database migrations tested

## Steps

### 1. Deploy Database Changes
```bash
npx supabase db push
```

### 2. Deploy Backend
...
```

**When to Write How-To Guides:**
- Documenting common workflows
- Solving recurring problems
- Operational procedures
- Troubleshooting steps

### 1.3 Reference (Information-Oriented)

**Purpose:** Provide technical details and specifications

**Location:** `/docs/reference/`

**Characteristics:**
- Dry, factual information
- Comprehensive and accurate
- Organized for lookup
- No explanations or opinions
- Machine-parseable when possible

**Sub-categories:**
- **API:** `/docs/reference/api/` - REST endpoints, WebSocket events
- **Schema:** `/docs/reference/schema/` - Database tables
- **Config:** `/docs/reference/config/` - Environment variables, auth roles

**Example:**
```markdown
# API Reference: Orders

## Create Order

**Endpoint:** `POST /api/orders`

**Authentication:** Required (Bearer token)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| items | array | Yes | Array of order items |
| table_id | uuid | No | Table ID for dine-in orders |

**Response:**
```json
{
  "id": "123",
  "status": "pending",
  "created_at": "2025-01-01T00:00:00Z"
}
```

**Status Codes:**
- 201: Order created
- 400: Invalid request
- 401: Unauthorized
```

**When to Write Reference:**
- API endpoints
- Database schema
- Configuration options
- Command-line interfaces
- Function signatures

### 1.4 Explanation (Understanding-Oriented)

**Purpose:** Deepen knowledge through discussion and context

**Location:** `/docs/explanation/`

**Characteristics:**
- Explains *why* decisions were made
- Provides context and background
- Discusses trade-offs
- Educational, theoretical
- May include opinions

**Sub-categories:**
- **Architecture:** `/docs/explanation/architecture/` - System design, auth architecture
- **Architecture Decisions (ADRs):** `/docs/explanation/architecture-decisions/`
- **Concepts:** `/docs/explanation/concepts/` - Menu system, order flow, integrations

**Example:**
```markdown
# ADR-003: Embedded Orders Pattern

## Context
We needed to decide how to store order items in the database.

## Options Considered

### Option 1: Separate order_items Table
Traditional normalized approach with foreign keys.
- ✅ Pros: Standard pattern, easy to query items
- ❌ Cons: Requires JOIN, slower queries, complex transactions

### Option 2: JSONB Embedded Items
Store items as JSONB array in orders table.
- ✅ Pros: 5x faster queries, atomic updates, immutable history
- ❌ Cons: Non-traditional, less flexible for item queries

## Decision
We chose **Option 2: JSONB Embedded Items** because:
1. Orders are immutable after creation
2. We always fetch complete orders, never individual items
3. Performance is critical for high-volume restaurants

## Consequences
- Single query fetches complete order
- Must duplicate menu item data in order items
- Cannot easily query "all orders with item X" (acceptable trade-off)
```

**When to Write Explanation:**
- Documenting architectural decisions
- Explaining complex systems
- Providing historical context
- Discussing design philosophy
- Teaching concepts

---

## 2. Directory Structure

### 2.1 Complete Docs Map

```
docs/
├── README.md                          # Documentation homepage
├── VERSION.md                         # Single source of truth for versions
├── CHANGELOG.md                       # Version history
├── DOCUMENTATION_STANDARDS.md         # Doc writing guidelines
├── NAVIGATION.md                      # Find docs by role/task/tech
│
├── tutorials/                         # 📖 Learning-Oriented
│   ├── README.md
│   └── GETTING_STARTED.md            # First-time setup guide
│
├── how-to/                            # 🎯 Goal-Oriented
│   ├── README.md
│   ├── operations/                   # Operational procedures
│   │   ├── DEPLOYMENT.md
│   │   ├── DEPLOYMENT_CHECKLIST.md
│   │   ├── KDS-BIBLE.md
│   │   └── runbooks/
│   │       ├── PRODUCTION_DEPLOYMENT_CHECKLIST.md
│   │       ├── PRODUCTION_DEPLOYMENT_PLAN.md
│   │       └── PRODUCTION_DEPLOYMENT_SUCCESS.md
│   ├── development/                  # Development workflows
│   │   ├── CONTRIBUTING.md
│   │   ├── DEVELOPMENT_PROCESS.md
│   │   └── CI_CD_WORKFLOWS.md
│   └── troubleshooting/              # Problem-solving guides
│       ├── TROUBLESHOOTING.md
│       └── AUTH_DIAGNOSTIC_GUIDE.md
│
├── reference/                         # 📋 Information-Oriented
│   ├── README.md
│   ├── api/                          # API specifications
│   │   ├── WEBSOCKET_EVENTS.md
│   │   ├── openapi.yaml
│   │   └── api/
│   │       ├── README.md
│   │       ├── PAYMENT_API_DOCUMENTATION.md
│   │       └── SQUARE_API_SETUP.md
│   ├── schema/                       # Database schema
│   │   └── DATABASE.md
│   └── config/                       # Configuration reference
│       ├── ENVIRONMENT.md
│       └── AUTH_ROLES.md
│
├── explanation/                       # 💡 Understanding-Oriented
│   ├── README.md
│   ├── architecture/                 # System architecture
│   │   ├── ARCHITECTURE.md
│   │   ├── AUTHENTICATION_ARCHITECTURE.md
│   │   └── diagrams/
│   │       ├── c4-context.md
│   │       ├── c4-container.md
│   │       ├── auth-flow.md
│   │       ├── payment-flow.md
│   │       └── voice-ordering.md
│   ├── architecture-decisions/       # ADRs
│   │   ├── ADR-001-snake-case-convention.md
│   │   ├── ADR-002-multi-tenancy-architecture.md
│   │   ├── ADR-003-embedded-orders-pattern.md
│   │   ├── ADR-004-websocket-realtime-architecture.md
│   │   ├── ADR-005-client-side-voice-ordering.md
│   │   ├── ADR-006-dual-authentication-pattern.md
│   │   ├── ADR-007-per-restaurant-configuration.md
│   │   └── ADR-009-error-handling-philosophy.md
│   └── concepts/                     # Key concepts
│       ├── MENU_SYSTEM.md
│       ├── ORDER_FLOW.md
│       ├── SQUARE_INTEGRATION.md
│       └── MIGRATION_V6_AUTH.md
│
├── naming/                            # Terminology standards
│   ├── NAMING_CHARTER.md
│   ├── LEXICON.md
│   ├── ROLE_SCOPE_MATRIX.md
│   └── lexicon.json
│
├── investigations/                    # Incident investigations
│   ├── README.md
│   └── [incident-reports].md
│
├── audit/                            # Audit reports
│   ├── README.md
│   ├── ACTION_CHECKLIST.md
│   ├── P0-FIX-ROADMAP.md
│   └── TRACKING-QUICK-REFERENCE.md
│
├── meta/                             # Documentation about docs
│   ├── README.md
│   └── SOURCE_OF_TRUTH.md
│
├── voice/                            # Voice ordering docs
│   └── VOICE_ORDERING_EXPLAINED.md
│
└── archive/                          # Historical docs
    ├── incidents/
    ├── 2025-10/
    └── [archived-docs].md
```

### 2.2 Special Files

**Root-Level Documentation:**
```
/rebuild-6.0/
├── README.md                          # Project overview
├── index.md                           # Documentation index
├── DRIFT_DETECTION_REPORT.md         # CI automation report
├── OVERNIGHT_AUDIT_REPORT.md         # Latest audit
└── [other reports].md
```

**Component Documentation:**
```
client/README.md                       # Frontend application docs
server/README.md                       # Backend application docs
supabase/README.md                     # Database configuration
scripts/README.md                      # Automation scripts
```

---

## 3. Documentation Standards

### 3.1 File Naming

**Convention:** Use `SCREAMING_SNAKE_CASE.md` for documentation files

**Examples:**
- ✅ `GETTING_STARTED.md`
- ✅ `API_REFERENCE.md`
- ✅ `ADR-001-snake-case-convention.md` (ADRs use lowercase with hyphens)
- ❌ `getting-started.md`
- ❌ `Api_Reference.md`

### 3.2 Timestamps

**Every documentation file MUST include:**

```markdown
**Last Updated:** YYYY-MM-DD
```

**Placement:**
- ADRs: Line 3 (after title and blank line)
- All other docs: Within first 10 lines

**Example:**
```markdown
# Getting Started Guide

**Last Updated:** 2025-11-01

This guide will help you...
```

**Why Timestamps Matter:**
- Indicates freshness of information
- Helps identify stale documentation
- Required by CI automation
- Tracked by `check-timestamps.js`

### 3.3 Table Formatting

**All markdown tables MUST:**
1. Use `|` separators
2. Include header row with `|---|`
3. Have consistent spacing
4. Be properly aligned

**Example:**
```markdown
| Feature | Status | Version |
| --- | --- | --- |
| Voice Ordering | ✅ Complete | 6.0.14 |
| Payment Processing | ✅ Complete | 6.0.7 |
| Multi-tenancy | ✅ Complete | 6.0.0 |
```

**Detected by `check-tables.js`:**
- Missing header separators
- Inconsistent column counts
- Malformed table syntax

### 3.4 Link Conventions

**Internal Links:**
- Use relative paths from current file
- Include `.md` extension
- Use `../` for parent directories

```markdown
✅ GOOD: [API Reference](../reference/api/README.md)
✅ GOOD: [Getting Started](./GETTING_STARTED.md)
❌ BAD: [API Reference](/docs/reference/api/README.md)  # Absolute path
❌ BAD: [API Reference](../reference/api)  # Missing .md
```

**External Links:**
- Use full HTTPS URLs
- Include protocol
- Add link text for context

```markdown
✅ GOOD: [React Documentation](https://react.dev)
✅ GOOD: [Supabase Docs](https://supabase.com/docs)
❌ BAD: [React](react.dev)  # Missing protocol
```

### 3.5 Code Blocks

**Always specify language:**
```markdown
✅ GOOD:
```bash
npm install
```

✅ GOOD:
```typescript
const x: string = 'hello';
```

❌ BAD:
```
npm install
```
```

**Common Languages:**
- `bash` - Shell commands
- `typescript` - TypeScript code
- `javascript` - JavaScript code
- `sql` - Database queries
- `json` - JSON data
- `markdown` - Markdown examples
- `yaml` - YAML configuration

### 3.6 Version References

**DO NOT hardcode versions in documentation.**

**Instead, link to VERSION.md:**
```markdown
✅ GOOD: See [VERSION.md](./VERSION.md) for current version
✅ GOOD: **Version:** [6.0.14](./VERSION.md)
❌ BAD: **Version:** 6.0.14
❌ BAD: Restaurant OS v6.0.14
```

**Why:**
- Single source of truth
- Prevents outdated version info
- Easier to maintain

**See:** `docs/VERSION.md` for version policy

---

## 4. Quality Automation

### 4.1 Pre-Commit Hooks

**Automatic Checks Before Commit:**

```bash
# Configured in .husky/pre-commit
npm run docs:check          # Documentation validation
npm run lint                # Code linting
npm run typecheck:staged    # TypeScript type checking
```

**What Gets Checked:**
1. **Orphaned Documentation:** Files not linked from any other file
2. **Table Formatting:** Malformed markdown tables
3. **Timestamps:** Missing or malformed "Last Updated" timestamps
4. **Link Validation:** Broken internal links

**Bypass (NOT RECOMMENDED):**
```bash
git commit --no-verify -m "message"
```

### 4.2 CI/CD Checks

**GitHub Actions Workflows:**

#### `docs-check.yml`
Runs on every push and pull request

**Checks:**
1. **Diátaxis Structure:** Validates 4-quadrant organization
2. **Link Validation:** Checks all internal links
3. **Table Formatting:** Validates markdown tables
4. **Timestamp Validation:** Ensures "Last Updated" present
5. **Drift Detection:** (see below)

**Triggers:**
```yaml
on:
  push:
    branches: [main]
  pull_request:
    paths:
      - 'docs/**'
      - 'README.md'
      - 'index.md'
```

#### `drift-detection`
Detects when code changes are not reflected in documentation

**Checks:**
1. **Schema Drift:** Undocumented database columns
2. **API Drift:** Undocumented API endpoints
3. **Config Drift:** Undocumented environment variables

**Triggers:**
```yaml
paths:
  - 'supabase/migrations/*.sql'
  - 'server/src/routes/*.ts'
  - 'docs/reference/api/openapi.yaml'
  - 'docs/reference/schema/DATABASE.md'
  - 'docs/reference/config/ENVIRONMENT.md'
```

**See:** `scripts/README.md` for drift detection details

### 4.3 Local Validation

**Before Pushing:**

```bash
# Check all documentation
npm run docs:check

# Check documentation drift
npm run docs:drift

# Individual drift checks
npm run docs:drift:schema    # Database schema drift
npm run docs:drift:api       # API endpoint drift
npm run docs:drift:config    # Environment variable drift
```

**Fix Issues:**
```bash
# Update timestamps automatically
node scripts/update-timestamps.js

# Fix table formatting
# (Manual: Ensure all tables have proper headers)

# Fix drift
# (Manual: Update relevant documentation files)
```

---

## 5. Tools Reference

### 5.1 Documentation Validation Scripts

**Location:** `/scripts/`

#### `docs-check.js`
**Purpose:** Validates documentation structure and content

**What it checks:**
- Diátaxis framework compliance
- Orphaned documentation files
- Markdown table formatting
- Timestamp presence and format
- Environment variable documentation

**Usage:**
```bash
npm run docs:check
```

**Exit Codes:**
- `0` - All checks passed
- `1` - Validation errors found

#### `check-timestamps.js`
**Purpose:** Ensures all docs have "Last Updated" timestamps

**Rules:**
- ADRs: Timestamp on line 3
- Other docs: Timestamp within first 10 lines
- Format: `**Last Updated:** YYYY-MM-DD`

**Usage:**
```bash
node scripts/check-timestamps.js
```

#### `check-tables.js`
**Purpose:** Validates markdown table syntax

**Detects:**
- Missing header separators
- Inconsistent column counts
- Malformed table rows

**Usage:**
```bash
node scripts/check-tables.js
```

### 5.2 Drift Detection Scripts

**See:** `scripts/README.md` for complete details

#### `check-schema-drift.cjs`
**Purpose:** Detect undocumented database columns

**Algorithm:**
1. Parse `DATABASE.md` for documented columns
2. Scan `supabase/migrations/*.sql` for column definitions
3. Compare and report differences

**Usage:**
```bash
npm run docs:drift:schema
```

#### `check-api-drift.cjs`
**Purpose:** Detect undocumented API endpoints

**Algorithm:**
1. Parse `openapi.yaml` for documented endpoints
2. Scan `server/src/routes/*.ts` for route definitions
3. Normalize paths and compare

**Usage:**
```bash
npm run docs:drift:api
```

#### `check-config-drift.cjs`
**Purpose:** Detect undocumented environment variables

**Algorithm:**
1. Parse `ENVIRONMENT.md` for documented variables
2. Parse `.env.example` for declared variables
3. Compare and report missing variables

**Usage:**
```bash
npm run docs:drift:config
```

### 5.3 Documentation Generation

**Future Enhancement:** Automated documentation generation from code

**Potential Tools:**
- TypeDoc for TypeScript API docs
- JSDoc for inline documentation
- Swagger/OpenAPI from route definitions
- ERD from database schema

---

## 6. How to Contribute

### 6.1 Writing New Documentation

**Step 1: Identify Document Type**

Ask yourself:
- **Tutorial?** Am I teaching someone step-by-step?
- **How-To?** Am I solving a specific problem?
- **Reference?** Am I documenting technical specifications?
- **Explanation?** Am I explaining why or providing context?

**Step 2: Choose Location**

Based on type:
- Tutorials → `/docs/tutorials/`
- How-To → `/docs/how-to/operations|development|troubleshooting/`
- Reference → `/docs/reference/api|schema|config/`
- Explanation → `/docs/explanation/architecture|architecture-decisions|concepts/`

**Step 3: Create File**

```bash
cd docs/[category]/
touch MY_NEW_DOC.md
```

**Step 4: Add Header**

```markdown
# Document Title

**Last Updated:** 2025-11-01

Brief introduction...
```

**Step 5: Write Content**

Follow standards:
- Use proper heading levels (# ## ### ####)
- Include code examples with language tags
- Add internal links where relevant
- Use markdown tables for structured data

**Step 6: Link From Other Docs**

Update:
- Category README.md
- `/docs/README.md` if top-level doc
- `/index.md` if major doc

**Step 7: Validate**

```bash
npm run docs:check
```

### 6.2 Updating Existing Documentation

**When to Update:**
- Code changes that affect behavior
- New features added
- Configuration changes
- Bug fixes that change documented behavior
- Outdated information discovered

**Process:**

1. **Make Changes** to documentation file
2. **Update Timestamp** to current date
3. **Check for Drift:**
   ```bash
   npm run docs:drift
   ```
4. **Validate:**
   ```bash
   npm run docs:check
   ```
5. **Commit:**
   ```bash
   git add docs/
   git commit -m "docs: update authentication guide"
   ```

### 6.3 Creating ADRs

**ADR Format:**

```markdown
# ADR-XXX: Title

**Status:** Proposed | Accepted | Deprecated | Superseded
**Last Updated:** YYYY-MM-DD

## Context
What situation led to this decision?

## Decision
What did we decide to do?

## Consequences
What are the results of this decision?
- ✅ Positive outcomes
- ❌ Negative outcomes
- ⚠️ Risks or trade-offs

## Alternatives Considered
What other options did we evaluate?

### Option 1
- ✅ Pros
- ❌ Cons

### Option 2
- ✅ Pros
- ❌ Cons
```

**Numbering:**
- Use next available number
- Pad to 3 digits (ADR-001, ADR-002, etc.)
- Never reuse numbers

**Filename:**
```
ADR-XXX-brief-description.md
```

**Example:**
```
ADR-003-embedded-orders-pattern.md
```

### 6.4 Archiving Documentation

**When to Archive:**
- Feature no longer exists
- Documentation superseded by newer version
- Historical reference only

**Process:**

1. **Move to Archive:**
   ```bash
   git mv docs/path/OLD_DOC.md docs/archive/YYYY-MM/OLD_DOC.md
   ```

2. **Update Links:**
   - Add redirect or note in README
   - Update references to point to new location

3. **Add Archive Notice:**
   ```markdown
   > **ARCHIVED:** This document is historical and may not reflect current implementation.
   > See [NEW_DOC.md](../path/NEW_DOC.md) for current information.
   ```

---

## 7. Common Mistakes

### 7.1 Wrong Document Type

**Problem:** Tutorial written like reference, or reference written like tutorial

**Solution:** Use framework decision tree:
- Is reader learning basics? → Tutorial
- Is reader solving a problem? → How-To
- Is reader looking up facts? → Reference
- Is reader seeking understanding? → Explanation

### 7.2 Missing Timestamps

**Problem:** CI fails with "Missing Last Updated timestamp"

**Solution:** Add timestamp within first 10 lines:
```markdown
**Last Updated:** 2025-11-01
```

### 7.3 Hardcoded Versions

**Problem:** Version numbers become outdated

**Solution:** Link to VERSION.md instead:
```markdown
✅ See [VERSION.md](./VERSION.md)
❌ Version 6.0.14
```

### 7.4 Broken Internal Links

**Problem:** Links break when files are moved

**Solution:**
- Use relative paths with `../`
- Include `.md` extension
- Test links with `npm run docs:check`

### 7.5 Orphaned Documentation

**Problem:** Documentation file not linked from anywhere

**Solution:**
- Link from category README
- Link from main docs/README.md
- Link from related documentation

### 7.6 Undocumented Changes

**Problem:** Code changes but documentation doesn't

**Solution:**
- Run drift detection: `npm run docs:drift`
- Update docs in same PR as code changes
- Use pre-commit hooks

### 7.7 Malformed Tables

**Problem:** Tables missing headers or inconsistent columns

**Solution:** Use proper markdown table format:
```markdown
| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Data | Data | Data |
```

---

## 8. Additional Resources

### External Documentation
- [Diátaxis Framework](https://diataxis.fr/) - Official documentation framework
- [Markdown Guide](https://www.markdownguide.org/) - Markdown syntax reference
- [GitHub Flavored Markdown](https://github.github.com/gfm/) - GFM specification

### Internal Documentation
- [DOCUMENTATION_STANDARDS.md](./DOCUMENTATION_STANDARDS.md) - Writing guidelines
- [SOURCE_OF_TRUTH.md](./meta/SOURCE_OF_TRUTH.md) - Canonical references
- [scripts/README.md](../scripts/README.md) - Automation script documentation

### Tools
- [VS Code](https://code.visualstudio.com/) - Recommended editor
- [Markdown All in One](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one) - VS Code extension
- [markdownlint](https://github.com/DavidAnson/markdownlint) - Markdown linter

---

**Document Version:** 1.0
**Maintained By:** Restaurant OS Documentation Team
**Questions?** Open an issue on GitHub or see [CONTRIBUTING.md](./how-to/development/CONTRIBUTING.md)
