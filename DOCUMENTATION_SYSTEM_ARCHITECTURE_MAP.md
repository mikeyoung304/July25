# Documentation System Architecture Map
## Restaurant OS 6.0 - Complete System Analysis

**Generated:** November 1, 2025  
**Last Updated:** October 31, 2025  
**Scope:** Comprehensive documentation system mapping  
**Total Documentation Files:** 126 markdown files  
**Documentation Size:** 2.0 MB  

---

## EXECUTIVE SUMMARY

The Restaurant OS documentation system is built on the **Diátaxis Framework** (tutorials, how-to guides, reference, explanation) with comprehensive automation, validation, and integration systems. The architecture emphasizes:

- **Clarity & Organization**: Well-structured hierarchical organization following industry standards
- **Automation**: Multiple CI/CD workflows for validation and quality assurance
- **Single Source of Truth**: Centralized version and status management
- **Standards Enforcement**: Documented requirements for all documentation
- **Content Lifecycle Management**: Clear processes for archiving, updating, and maintaining docs

### Key Metrics
- **Documentation Files**: 126 total markdown files
- **Coverage**: 85+ files with "Last Updated" metadata (67%)
- **Directory Structure**: 25 main directories + subdirectories
- **Automation Systems**: 2 CI/CD workflows + 1 local command + 1 npm script
- **Version Management**: Single authoritative source (VERSION.md)
- **Root Level Files**: 19 core documentation files + 3 special GitHub files (README.md, SECURITY.md, CONTRIBUTING.md)

---

## 1. COMPLETE DIRECTORY STRUCTURE & PURPOSE

### 1.1 Root-Level Documentation (4 Files - Per Policy)

These are the ONLY files allowed at repository root per DOCUMENTATION_STANDARDS.md:

```
/
├── README.md                    # Project overview, quick start, installation (brief)
├── index.md                     # Documentation navigation hub (canonical entry point)
├── SECURITY.md                  # Brief security policy for GitHub Security tab
└── CONTRIBUTING.md              # Brief contributor guide for GitHub PR interface
```

**Purpose**: Clean root directory following industry best practices (React, Next.js, Vue, Vite, Supabase pattern)

---

### 1.2 Core Documentation Directory (`/docs/`)

#### Main Level Files (19 Files)

Root-level docs directory contains core operational and status documents:

| File | Purpose | Last Updated | Type |
|------|---------|--------------|------|
| README.md | Comprehensive doc navigation hub | 10/30/25 | Navigation |
| NAVIGATION.md | Role/task-based navigation guide | 10/30/25 | Navigation |
| VERSION.md | Single source of truth for all versions | 10/30/25 | Reference |
| CHANGELOG.md | Complete version history and release notes | 10/31/25 | Reference |
| AGENTS.md | Multi-agent orchestration documentation | - | Reference |
| DOCUMENTATION_STANDARDS.md | Standards, conventions, metadata requirements | 10/31/25 | Standards |
| SECURITY.md | Comprehensive security controls documentation | - | Reference |
| PRODUCTION_STATUS.md | Current production readiness metrics | - | Operational |
| PRODUCTION_DIAGNOSTICS.md | Production troubleshooting procedures | - | Operational |
| TESTING_CHECKLIST.md | QA and testing procedures | - | Reference |
| ROADMAP.md | Feature pipeline and vision | - | Strategic |
| RUNBOOKS.md | Operational playbooks and procedures | - | Operational |
| SUPABASE_CONNECTION_GUIDE.md | Database workflow guide | - | How-To |
| CI_INFRASTRUCTURE_ISSUES.md | CI/CD documentation drift issues | - | Reference |
| POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md | Incident analysis | - | Archive |
| POST_MORTEM_SCHEMA_DRIFT_2025-10-21.md | Incident analysis | - | Archive |
| DOCUMENTATION_UPDATE_SUMMARY_2025-10-17.md | Historical documentation update log | - | Archive |
| MIGRATION_RECONCILIATION_2025-10-20.md | Migration tracking document | - | Archive |
| VERSION_REFERENCE_AUDIT_REPORT.md | Documentation audit report | - | Audit |

---

#### 1.3 Diátaxis Framework Structure

The documentation follows the **Diátaxis Framework** organizing by purpose:

##### A. Tutorials (`/docs/tutorials/`) - Learning-Oriented
**Purpose**: Step-by-step lessons for beginners building foundational skills

```
docs/tutorials/
├── README.md                    # Tutorials overview
└── GETTING_STARTED.md          # Installation, setup, first steps (hands-on learning)
```

**Content Style**: Task-driven, numbered steps, example-based, safe to follow

---

##### B. How-To Guides (`/docs/how-to/`) - Goal-Oriented
**Purpose**: Recipes for solving specific problems, assuming basic knowledge

```
docs/how-to/
├── README.md                    # How-to guides overview
├── operations/
│   ├── DEPLOYMENT.md           # Production deployment procedures
│   ├── DEPLOYMENT_CHECKLIST.md # Pre-flight verification
│   ├── KDS-BIBLE.md           # Kitchen Display System operations
│   └── runbooks/
│       ├── PRODUCTION_DEPLOYMENT_CHECKLIST.md
│       ├── PRODUCTION_DEPLOYMENT_PLAN.md
│       └── PRODUCTION_DEPLOYMENT_SUCCESS.md
├── development/
│   ├── DEVELOPMENT_PROCESS.md  # Development workflow, CI/CD, contributing
│   ├── CI_CD_WORKFLOWS.md      # Continuous integration pipelines
│   ├── CONTRIBUTING.md         # How to contribute guidelines
│   └── README.md
└── troubleshooting/
    ├── TROUBLESHOOTING.md      # Common issues and solutions
    ├── AUTH_DIAGNOSTIC_GUIDE.md # Authentication debugging
    └── README.md
```

**Content Style**: Problem → Solution, step sequences, practical focus

---

##### C. Reference (`/docs/reference/`) - Information-Oriented
**Purpose**: Facts, APIs, schemas, configurations for lookup

```
docs/reference/
├── README.md                    # Reference documentation overview
├── api/
│   ├── README.md               # API reference intro
│   ├── api/
│   │   ├── SQUARE_API_SETUP.md # Payment integration setup
│   │   ├── PAYMENT_API_DOCUMENTATION.md
│   │   └── README.md
│   ├── WEBSOCKET_EVENTS.md     # Real-time event reference
│   └── openapi.yaml            # OpenAPI 3.0 specification
├── schema/
│   ├── README.md
│   └── DATABASE.md             # Complete database schema reference
└── config/
    ├── README.md
    ├── ENVIRONMENT.md          # Environment variables reference
    └── AUTH_ROLES.md           # Role definitions and permissions
```

**Content Style**: Structured data, tables, no narrative, complete, accurate

---

##### D. Explanation (`/docs/explanation/`) - Understanding-Oriented
**Purpose**: Deep knowledge, design decisions, rationale, concepts

```
docs/explanation/
├── README.md                    # Explanation documentation overview
├── architecture/
│   ├── ARCHITECTURE.md         # System design and voice ordering
│   ├── AUTHENTICATION_ARCHITECTURE.md # Auth flows, session management
│   └── diagrams/
│       ├── c4-context.md       # C4 context diagram
│       ├── c4-container.md     # C4 container diagram
│       ├── auth-flow.md        # Authentication flow diagram
│       ├── payment-flow.md     # Payment flow diagram
│       └── voice-ordering.md   # Voice ordering architecture diagram
├── architecture-decisions/
│   ├── ADR-001-snake-case-convention.md       # Unified data layer format
│   ├── ADR-002-multi-tenancy-architecture.md  # Restaurant isolation
│   ├── ADR-003-embedded-orders-pattern.md     # Order data structure
│   ├── ADR-004-websocket-realtime-architecture.md # Real-time events
│   ├── ADR-005-client-side-voice-ordering.md  # Voice integration approach
│   ├── ADR-006-dual-authentication-pattern.md # Supabase + localStorage auth
│   ├── ADR-007-per-restaurant-configuration.md # Config management
│   └── ADR-009-error-handling-philosophy.md   # Error handling approach
└── concepts/
    ├── MENU_SYSTEM.md          # Menu system explanation
    ├── ORDER_FLOW.md           # Order lifecycle and state management
    ├── SQUARE_INTEGRATION.md   # Payment processing concepts
    └── MIGRATION_V6_AUTH.md    # Authentication migration explained
```

**Content Style**: Narrative, "why" focus, context, alternatives, trade-offs

---

#### 1.4 Special Purpose Directories

##### Naming Conventions (`/docs/naming/`)
**Purpose**: Terminology standards and naming guardrails

```
docs/naming/
├── NAMING_CHARTER.md           # Naming conventions and deprecation policy
├── LEXICON.md                  # Canonical terminology registry
└── ROLE_SCOPE_MATRIX.md        # Permission and role mappings
```

**Standards Enforced**: camelCase (API), snake_case (DB), consistent terminology

---

##### Voice Ordering (`/docs/voice/`)
**Purpose**: Voice ordering implementation details

```
docs/voice/
└── VOICE_ORDERING_EXPLAINED.md # Voice ordering system implementation
```

---

##### Investigations & Incidents (`/docs/investigations/` & `/docs/incidents/`)
**Purpose**: Incident analysis and root cause documentation

```
docs/investigations/
├── AI_DIAGNOSTIC_REPORT.md
├── auth-bypass-root-cause-FINAL.md
├── auth-state-bug-analysis.md
├── comprehensive-root-cause-analysis-oct27-2025.md
├── menu-loading-error-fix-oct27-2025.md
├── online-ordering-checkout-fix-oct27-2025.md
├── token-refresh-failure-analysis.md
└── workspace-auth-fix-2025-10-29.md

docs/incidents/
└── oct23-bug-investigation-results.md
```

**Content Style**: Technical analysis, root cause, timeline, resolution

---

##### Meta Documentation (`/docs/meta/`)
**Purpose**: Documentation about documentation

```
docs/meta/
└── SOURCE_OF_TRUTH.md          # Single authoritative status document
```

**Canonical Use**: The single source of truth for project status, version, and completion metrics

---

##### Archive (`/docs/archive/`)
**Purpose**: Historical documentation preserved for reference

```
docs/archive/
├── README.md
├── 2025-10/                    # Date-based snapshots
│   ├── 2025-10-15_AGENTS.md
│   ├── 2025-10-15_KDS-BIBLE.md
│   └── ... (other snapshots)
├── incidents/                  # Historical incident reports
├── IMPROVEMENT-ROADMAP.md
├── IMPROVEMENT-ROADMAP-OPTIMIZED.md
├── ROOT_CAUSE_SYNTHESIS.md
└── ... (historical docs)
```

**Policy**: Items moved here when superseded, but preserved for historical reference

---

##### Audit (`/docs/audit/`)
**Purpose**: Quality audit and tracking documentation

```
docs/audit/
├── README.md
├── ACTION_CHECKLIST.md         # Quality improvement tracking
└── P0-FIX-ROADMAP.md          # P0 issue resolution tracking
```

---

##### Research (`/docs/research/`)
**Purpose**: Research and investigation documents

```
docs/research/
└── table-ordering-payment-best-practices.md
```

---

##### Strategy (`/docs/strategy/`)
**Purpose**: Strategic planning documents

```
docs/strategy/
└── KDS_STRATEGIC_PLAN_2025.md  # Kitchen Display System evolution
```

---

## 2. AUTOMATION SYSTEMS & CI/CD WORKFLOWS

### 2.1 Documentation CI/CD Pipeline

#### Workflow 1: Documentation Quality Check (`.github/workflows/docs-check.yml`)

**Trigger**: On push to main/develop + PR changes to docs/

**Runs**: ubuntu-latest

**Checks Performed**:

1. **Internal Link Validation**
   - Scans all markdown files for broken internal links
   - Validates markdown link patterns: `[text](path.md#anchor)`
   - Resolves relative paths correctly
   - Skips external URLs, mailto links, and anchor-only links

2. **Documentation Standards Verification**
   - Confirms Diátaxis structure exists (tutorials/, how-to/, reference/, explanation/)
   - Verifies required core files present
   - Counts files missing "Last Updated" dates
   - Warns if >10 files missing dates

3. **Environment Variable Drift Detection**
   - Compares .env.example against docs/reference/config/ENVIRONMENT.md
   - Identifies undocumented variables
   - Flags obsolete documented variables
   - Ensures documentation stays in sync with actual config

4. **Documentation Bloat Detection**
   - Finds markdown files >1000 lines
   - Recommends breaking into smaller docs
   - Prevents documentation god files

5. **Summary Generation**
   - Reports all check results to GitHub Actions
   - Provides clear pass/fail status
   - No external dependencies (all inline bash)

**Success Criteria**: All checks pass without errors (warnings are non-blocking)

---

#### Workflow 2: Docs CI (`.github/workflows/docs-ci.yml`)

**Trigger**: PR/push changes to docs/ or scripts/docs-check.js

**Runs**: ubuntu-latest with Node.js 20

**Steps**:

1. Checkout code
2. Setup Node.js 20 with npm cache
3. Install dependencies (npm ci || npm install)
4. Build shared package: `npm run build --workspace shared`
5. Run docs check: `npm run docs:check`

**Purpose**: Integrates documentation validation into NPM workflow

---

### 2.2 Documentation Validation Scripts

#### Script 1: `scripts/docs-check.js` (NPM Command)

**Invocation**: `npm run docs:check`

**Language**: JavaScript (ESM)

**Purpose**: Comprehensive documentation guardrails with 5 validation layers

**Guardrail 1: Orphan Detector**
- Finds markdown files not linked from index.md
- Excludes: docs/archive/*, node_modules/*, test files
- Permits: ADRs, workspace READMEs, root standard files
- Permits: Valid in-place navigation stubs
- Reports orphaned files as errors

**Guardrail 2: Stub Detector**
- Finds files marked "Moved to Canonical Documentation"
- Validates stub placement (docs/archive/ or in-place with markers)
- In-place stubs must have: anchor link (*.md#section) + archive reference
- Reports invalid stub placement as violations

**Guardrail 3: Risk Linter**
- Scans canonical docs for dangerous patterns:
  - `Access-Control-Allow-Origin: *`
  - `anonymous websocket`
  - `fallback secret` / `default secret`
  - `demo creds` or `demo@`
  - `sk-<tokenlike>` patterns
- Excludes: archive/, incidents/, strategy/, ADRs, CHANGELOG
- Reports as security risks

**Guardrail 4: Anchor Linter**
- Verifies all markdown links with anchors resolve correctly
- Extracts headings from target files
- Converts to GitHub-style anchors (lowercase, hyphens)
- Supports custom anchors: `{#custom-anchor}` and HTML `<a id="...">`
- Reports broken anchors with file:line references

**Guardrail 5: Reality Greps**
- Validates critical implementation details match documentation claims
- Checks:
  - CORS allowlist (not wildcard)
  - WebSocket JWT authentication
  - RLS (Row Level Security) enabled
  - Refresh token latch/rotation
  - WebSocket reconnect with exponential backoff
  - Voice ordering split audio effects
- Uses pattern matching across codebase
- Reports failed reality checks as evidence gaps

**Exit Behavior**: Exits 0 if all pass, exits 1 if any errors

---

#### Script 2: Claude Command (`.claude/commands/docs-check.md`)

**Invocation**: `/docs-check` in Claude Code

**Purpose**: Quick local documentation check before committing

**Checks**:
1. Broken internal links (fast check)
2. Missing "Last Updated" dates
3. Files >1000 lines (bloat warning)

**Output**: Simple pass/fail with emoji indicators

---

#### Script 3: NPM Script in package.json

**Definition**:
```json
"docs:check": "node scripts/docs-check.js"
```

**Integration**: Called by CI workflows and local development

---

### 2.3 Automation System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Documentation Automation                  │
└─────────────────────────────────────────────────────────────┘

┌─ TRIGGERS ──────────────────────────────────────────────┐
│ • Git push to main/develop                               │
│ • Pull request with docs changes                         │
│ • Manual workflow dispatch                               │
│ • Pre-commit hook (local, optional)                      │
└──────────────────────────────────────────────────────────┘
           ↓
┌─ CI WORKFLOWS ──────────────────────────────────────────┐
│                                                           │
│ docs-check.yml (Pure Bash)        docs-ci.yml (Node.js) │
│ ├─ Link validation               ├─ Checkout           │
│ ├─ Diátaxis structure check      ├─ Setup Node.js 20   │
│ ├─ Env var drift detection      ├─ Install deps       │
│ ├─ Bloat detection              ├─ Build shared       │
│ └─ Summary generation           └─ Run docs:check      │
│                                                           │
└──────────────────────────────────────────────────────────┘
           ↓
┌─ VALIDATION LAYERS (scripts/docs-check.js) ────────────┐
│ • Orphan Detector (finds unlisted files)                │
│ • Stub Detector (validates navigation stubs)            │
│ • Risk Linter (finds security/CORS issues)              │
│ • Anchor Linter (verifies link targets)                 │
│ • Reality Greps (checks code matches docs)              │
└──────────────────────────────────────────────────────────┘
           ↓
┌─ OUTCOMES ──────────────────────────────────────────────┐
│ ✅ All checks pass → PR can merge                        │
│ ⚠️  Warnings only → PR can merge (non-blocking)          │
│ ❌ Errors found → PR blocked until fixed                 │
└──────────────────────────────────────────────────────────┘
```

---

## 3. STANDARDS & CONVENTIONS

### 3.1 Required Metadata

Every documentation file MUST include:

```markdown
# Document Title

**Last Updated**: YYYY-MM-DD
**Version**: See [VERSION.md](VERSION.md)
```

**Exceptions**: 
- Archive files (marked with historical banners)
- Auto-generated files
- Navigation stub files

**Rationale**: Version linkage prevents hardcoded version drift

---

### 3.2 Documentation Standards (from DOCUMENTATION_STANDARDS.md)

#### File Naming Conventions

| Pattern | Usage | Example |
|---------|-------|---------|
| UPPERCASE_WITH_UNDERSCORES.md | Major guides | GETTING_STARTED.md |
| LOWERCASE_WITH_HYPHENS.md | Sub-documents | database-schema.md |
| ADR-###-TOPIC.md | Architecture decisions | ADR-006-dual-authentication-pattern.md |
| README.md | Directory indices | docs/how-to/README.md |
| YYYY-MM-DD prefix | Dated documents | 2025-10-15_KDS-BIBLE.md |

---

#### Content Guidelines

**Accuracy**
- All claims verified against actual code
- Code examples tested and working
- Documentation updated when code changes

**Clarity**
- Simple, direct language
- Technical terms defined on first use
- Examples for complex concepts

**Completeness**
- All major features covered
- Error cases and edge cases included
- Troubleshooting sections provided

**Conciseness**
- No redundancy (link instead of duplicate)
- Tables for structured data
- Avoids documentation bloat

---

#### Cross-References

**Internal Links**: Use relative paths
```markdown
[Link Text](./RELATED_DOC.md)
[Section Link](./DOC.md#section-name)
```

**Code References**: Point to actual implementation
```markdown
For details, see [`server/src/routes/auth.routes.ts`](../server/src/routes/auth.routes.ts)
```

**Version References**: Always link to VERSION.md
```markdown
This uses React (see [VERSION.md](VERSION.md))
```

---

#### Maintenance Requirements

- **Regular Reviews**: Quarterly accuracy checks
- **Breaking Changes**: Update immediately after major releases
- **Broken Links**: Fix immediately
- **Deprecation**: Mark clearly with warnings
- **Historical Content**: Move to archive/ with banners

---

### 3.3 Root Directory Policy (October 2025)

**Only 4 files allowed at root**:

1. **README.md** - Project overview, quick start (brief)
2. **index.md** - Documentation navigation hub
3. **SECURITY.md** - Brief security policy for GitHub Security tab
4. **CONTRIBUTING.md** - Brief contributor guide

**Rationale**: 
- Follows industry best practices (React, Next.js, Vue, Supabase)
- Clean root improves project discoverability
- GitHub integrations for SECURITY.md and CONTRIBUTING.md
- All comprehensive docs in organized /docs/ directory

**No Redirect Stubs**: Previous redirect files removed (October 2025 migration)

---

### 3.4 Diátaxis Framework Application

| Category | Purpose | Reader Type | Content Style |
|----------|---------|-------------|----------------|
| **Tutorials** | Learning | Beginners | Task-driven, numbered steps |
| **How-To** | Problem-solving | Experienced users | Goal-oriented, recipes |
| **Reference** | Facts/lookup | Any user | Structured, tables, complete |
| **Explanation** | Understanding | Learners seeking depth | Narrative, "why", context |

---

## 4. INTEGRATION POINTS

### 4.1 GitHub Integration

**Special Files**:
- `SECURITY.md` (root) → Linked in GitHub Security Policy tab
- `CONTRIBUTING.md` (root) → Linked in GitHub PR interface

**Status Badges**: 
```markdown
[![Docs CI](https://github.com/mikeyoung304/July25/actions/workflows/docs-ci.yml/badge.svg)]
```

**Workflows**: Integrated into standard CI/CD pipeline

---

### 4.2 Development Workflow Integration

**Pre-Commit Check**: Optional local validation
```bash
/docs-check  # Claude Code command
```

**NPM Scripts**:
```bash
npm run docs:check    # Full validation
npm run env:check     # Environment variable checks
```

**CI Gates**: Blocks PRs with documentation errors

---

### 4.3 Version Management Integration

**Single Source of Truth**: `docs/VERSION.md`

**Version Sources**:
- Application version: `package.json` (root, client/, server/)
- React version: `client/package.json`
- Express version: `server/package.json`
- Node.js version: `package.json` engines field

**Documentation Policy**: All version references link to VERSION.md (no hardcoding)

---

### 4.4 Index.md Navigation Hub

`index.md` serves as canonical entry point with:
- Quick navigation links
- Category-based browsing
- Role-based paths
- Search guidance
- Archive pointers

**Guardrail**: Scripts check all markdown files linked from index.md (orphan detection)

---

### 4.5 NPM Ecosystem

**Package.json Documentation Scripts**:

```json
{
  "docs:check": "node scripts/docs-check.js",
  "docs:generate": "tsx scripts/generate-docs.ts",
  "env:check": "node scripts/check-env.mjs",
  "env:validate": "node scripts/validate-env.mjs"
}
```

**Integration with Workspaces**:
- Root package.json coordinates
- Docs validation runs as part of CI
- Environment checks validate against docs

---

## 5. CONTENT LIFECYCLE & MAINTENANCE

### 5.1 Content Creation Flow

```
┌─────────────────┐
│ Feature/Issue   │
│ Identified      │
└────────┬────────┘
         ↓
┌─────────────────────────────────────────┐
│ 1. Create/Update Documentation          │
│    • Follow DOCUMENTATION_STANDARDS.md  │
│    • Add "Last Updated" date           │
│    • Link to VERSION.md for versions   │
│    • Test code examples                │
│    • Add to index.md if new            │
└────────┬────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ 2. Local Pre-Commit Check               │
│    • Run /docs-check command            │
│    • Check for broken links             │
│    • Verify Last Updated dates          │
└────────┬────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ 3. Create Pull Request                  │
│    • Include documentation changes      │
│    • Reference DOCUMENTATION.md         │
│    • Checklist: links, dates, accuracy │
└────────┬────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ 4. CI Validation (Automatic)            │
│    • docs-check.yml (link validation)   │
│    • docs-ci.yml (Node.js integration)  │
│    • scripts/docs-check.js (guardrails) │
└────────┬────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ 5. Merge (if all checks pass)           │
│    • PR merged to main/develop          │
│    • Documentation live                 │
└────────┬────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ 6. Quarterly Review Cycle               │
│    • Check accuracy against code        │
│    • Update if needed                   │
│    • Move obsolete docs to archive/     │
└─────────────────────────────────────────┘
```

---

### 5.2 Deprecation Process

**Step 1**: Add deprecation warning
```markdown
> ⚠️ **DEPRECATED**: This feature removed in v6.0.0
> See [new-feature.md](new-feature.md) for replacement
```

**Step 2**: Update cross-references to point to replacement

**Step 3**: Move to archive/ with historical banner
```markdown
> ⚠️ **HISTORICAL DOCUMENT** - From version 5.x
> Current: [current-doc.md](../current-doc.md)
```

---

### 5.3 Update Triggers & Schedules

| Trigger | Frequency | Owner | Action |
|---------|-----------|-------|--------|
| Feature release | Per version | Developer | Update CHANGELOG, VERSION.md |
| Security issue | Immediate | Security team | Update SECURITY.md |
| Production incident | ASAP | DevOps/Dev | Create investigation post-mortem |
| Quarterly review | Every 3 months | Docs maintainer | Audit accuracy, remove stale |
| API change | Immediate | Backend dev | Update API reference |
| Environment variable change | Immediate | DevOps | Update ENVIRONMENT.md |
| Architecture decision | Per decision | Architects | Create ADR |

---

### 5.4 Version Control & Changelog

**CHANGELOG.md Structure**:
- Semantic versioning format
- Section per version: Added, Changed, Fixed, Removed, Deprecated
- Links to issues/PRs
- Release dates
- Complete technical details

**VERSION.md Structure**:
- Current versions table
- Version policy (no hardcoding)
- Update history with milestone tracking
- Source documentation

**Sync**: Both files updated on every release

---

## 6. INTEGRATION ARCHITECTURE

### 6.1 How Docs Connect to CI/CD

```
┌─────────────────────────────────────────────────────────┐
│                 Documentation System                     │
│                  ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓                        │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  VERSION.md  ← source of truth for versions     │   │
│  └─────────────────────────────────────────────────┘   │
│                        ↓                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  package.json (version sync)                    │   │
│  └─────────────────────────────────────────────────┘   │
│                        ↓                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  CI Workflows                                   │   │
│  │  • docs-check.yml (validation)                  │   │
│  │  • docs-ci.yml (npm integration)                │   │
│  └─────────────────────────────────────────────────┘   │
│                        ↓                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Validation Scripts                             │   │
│  │  • scripts/docs-check.js (5 guardrails)         │   │
│  │  • scripts/docs-check.md (Claude command)       │   │
│  └─────────────────────────────────────────────────┘   │
│                        ↓                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  GitHub Integration                             │   │
│  │  • SECURITY.md (Security Policy tab)            │   │
│  │  • CONTRIBUTING.md (PR interface)               │   │
│  │  • Status badges                                │   │
│  └─────────────────────────────────────────────────┘   │
│                        ↓                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Development Workflow                           │   │
│  │  • Pre-commit checks                            │   │
│  │  • NPM scripts                                  │   │
│  │  • Local validation                             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

### 6.2 Documentation-to-Code Flow

**Code Changes → Documentation Updates**:
1. Developer modifies code
2. Developer updates relevant documentation
3. Updates CHANGELOG.md with change notes
4. Runs `npm run docs:check` locally
5. Submits PR with code + docs changes
6. CI validates documentation
7. Merge triggers live documentation update

**Documentation → Code Verification**:
1. Documentation claims what code should do
2. `scripts/docs-check.js` verifies with reality greps
3. Detects gaps between docs and implementation
4. Reports implementation details as reality checks

---

### 6.3 External Tool Integration

**Environment Variables**: 
- Documented in `docs/reference/config/ENVIRONMENT.md`
- Defined in `.env.example`
- Validated against documentation by `docs-check.yml`

**Square API**:
- Setup guide in `docs/reference/api/api/SQUARE_API_SETUP.md`
- Payment documentation in `docs/reference/api/api/PAYMENT_API_DOCUMENTATION.md`
- Integration patterns in `docs/explanation/concepts/SQUARE_INTEGRATION.md`

**Supabase**:
- Connection guide in `docs/SUPABASE_CONNECTION_GUIDE.md`
- Multi-tenancy/RLS in ADR-002
- Schema reference in `docs/reference/schema/DATABASE.md`

---

## 7. STRENGTHS & WEAKNESSES

### 7.1 Strengths of Current Architecture

✅ **Well-Structured Organization**
- Diátaxis framework provides clear categorization
- Easy to find documentation by purpose
- Users understand where to look

✅ **Comprehensive Automation**
- Multiple validation layers catch issues
- CI/CD integration prevents bad merges
- Scripts enforce quality standards

✅ **Single Source of Truth**
- VERSION.md prevents hardcoded versions
- SOURCE_OF_TRUTH.md centralizes status
- All guides link to canonical sources

✅ **Clear Standards**
- DOCUMENTATION_STANDARDS.md defines all requirements
- Metadata (Last Updated) provides context
- Naming conventions are consistent

✅ **Flexible Validation**
- 5-layer guardrail system
- Reality greps verify code matches docs
- Anchor linting prevents broken links
- Orphan detection finds lost files

✅ **Developer-Friendly**
- Local quick-check command (/docs-check)
- NPM script integration
- Pre-commit hooks available
- Clear error messages

✅ **Historical Preservation**
- Archive structure maintains old docs
- Deprecation process is documented
- Incident analysis retained for learning

---

### 7.2 Weaknesses & Limitations

⚠️ **Metadata Compliance**
- Only 67% of files have "Last Updated" dates
- Some files missing required headers
- No automated enforcement of required metadata
- Stale documentation not automatically detected

⚠️ **Manual Maintenance Burden**
- Developers must remember to update docs
- No automatic doc generation from code
- Version synchronization is manual
- Breaking changes not auto-detected

⚠️ **Documentation Drift Risk**
- Code examples may go stale
- API docs don't auto-sync from code
- Architecture docs can diverge from reality
- Only reality greps check code-to-docs alignment

⚠️ **Limited Search/Discovery**
- No full-text search across docs
- Navigation relies on index.md and README
- No documentation sitemap generator
- Difficult to find related documentation

⚠️ **Complexity in Validation Scripts**
- `docs-check.js` is 437 lines of complex logic
- Multiple pattern matching systems
- Risk of false positives/negatives
- Single point of failure

⚠️ **Archive Management**
- Growing archive could become unwieldy
- No automatic cleanup of very old docs
- Historical documents never purged
- Archive size increasing over time

⚠️ **Testing Coverage**
- No automated testing of documentation accuracy
- Code examples not verified to run
- Links only checked for existence, not validity
- Semantic content quality not validated

---

## 8. IDENTIFIED ISSUES & GAPS

### 8.1 Current Documentation Gaps

1. **Missing Documentation**
   - Some modules lack README.md files
   - Client components lack inline documentation
   - Some complex algorithms undocumented

2. **Incomplete Coverage**
   - Voice ordering implementation needs more detail
   - Detailed WebRTC flow documentation sparse
   - Advanced troubleshooting scenarios missing

3. **Outdated Content**
   - Some deployment docs reference old platforms
   - Legacy authentication patterns still documented
   - Removed features still referenced

---

### 8.2 Automation Gaps

1. **No Auto-Generation**
   - API docs generated manually
   - Database schema docs not auto-generated
   - OpenAPI spec not linked to implementation

2. **Missing Checks**
   - No spell-checking
   - No grammar validation
   - No markdown linting
   - No word count analysis

3. **Incomplete Integration**
   - Docs not part of build artifacts
   - No docs versioning system
   - No rollback mechanism for docs

---

## 9. RECOMMENDATIONS FOR ARCHITECTURAL IMPROVEMENTS

### Priority 1: Critical Improvements (Immediate)

1. **Enforce Metadata Compliance**
   ```bash
   # Add automated check to docs-check.js
   # Fail on missing "Last Updated" for non-archive files
   # Report with file paths for easy fixing
   ```
   **Impact**: Ensures all docs have current date stamps
   **Effort**: 2-3 hours

2. **Auto-Generate API Documentation**
   ```bash
   # Script to extract OpenAPI spec → markdown
   # Generate from docs/reference/api/openapi.yaml
   # Link from api/README.md automatically
   ```
   **Impact**: Keeps API docs in sync with spec
   **Effort**: 4-6 hours

3. **Implement Doc Search**
   ```bash
   # Add GitHub search integration to index.md
   # Or implement local search with lunr.js
   # Index all markdown content
   ```
   **Impact**: Users can find docs faster
   **Effort**: 3-4 hours

---

### Priority 2: Medium-Term Improvements (Next Sprint)

4. **Code Example Validation**
   ```bash
   # Create script to extract code blocks
   # Validate syntax per language
   # Run executable examples (where applicable)
   # Catch outdated examples
   ```
   **Impact**: Ensures code examples actually work
   **Effort**: 6-8 hours

5. **Automated Link Checking**
   ```bash
   # Add external link validation
   # Check for 404s in external references
   # Generate report of dead links
   # Schedule weekly checks
   ```
   **Impact**: Prevents broken external references
   **Effort**: 2-3 hours

6. **Documentation Generation from Code**
   ```bash
   # Extract JSDoc comments → API reference
   # Generate schema docs from TypeScript interfaces
   # Auto-generate role/permission matrix
   ```
   **Impact**: Reduces manual synchronization
   **Effort**: 8-10 hours

---

### Priority 3: Long-Term Improvements (Roadmap)

7. **Documentation Versioning**
   ```bash
   # Branch docs per major version
   # Maintain version-specific docs
   # Archive old versions separately
   # Auto-generate version switcher
   ```
   **Impact**: Users can access docs for their version
   **Effort**: 10-12 hours

8. **Built-In Documentation Server**
   ```bash
   # Generate static site from markdown
   # Deploy to documentation subdomain
   # Add full-text search
   # Include version switcher
   # Dark mode support
   ```
   **Impact**: Better user experience
   **Effort**: 16-20 hours

9. **Documentation Metrics Dashboard**
   ```bash
   # Track: coverage %, staleness, orphaned docs
   # Monitor: last updated dates across categories
   # Alert on docs >6 months old
   # Report on undocumented features
   ```
   **Impact**: Proactive maintenance of docs quality
   **Effort**: 6-8 hours

10. **Automated Compliance Checks**
    ```bash
    # Verify all architectural decisions documented
    # Check all public APIs documented
    # Validate environment variables fully documented
    # Enforce security best practices documented
    ```
    **Impact**: Ensures completeness and consistency
    **Effort**: 4-5 hours

---

## 10. COMPLETE FILE INVENTORY

### Total Documentation Count: 126 markdown files

**By Category**:
- Root level: 19 files
- Tutorials: 2 files
- How-To: 8 files
- Reference: 12 files
- Explanation: 18 files
- Naming: 3 files
- Voice: 1 file
- Investigations: 8 files
- Incidents: 1 file
- Meta: 1 file
- Audit: 3 files
- Research: 1 file
- Strategy: 1 file
- Archive: 30+ files
- **Grand Total: 126 files**

---

## 11. DOCUMENT MAINTENANCE SCHEDULE

### Weekly Checks
- Monitor CI status badges
- Check for failing documentation tests

### Monthly Checks
- Review new files added to archive
- Verify Last Updated dates on critical docs
- Check for broken external links

### Quarterly Reviews
- Full accuracy audit of documentation
- Verify code examples still work
- Check for orphaned or duplicate content
- Archive truly historical documents

### Annual Maintenance
- Review entire Diátaxis structure
- Consolidate redundant documentation
- Update roadmap and vision statements
- Archive full year of old incident reports

---

## 12. GLOSSARY & KEY TERMS

| Term | Definition | Location |
|------|-----------|----------|
| **Diátaxis** | Framework organizing docs by purpose (tutorials, how-to, reference, explanation) | Various |
| **ADR** | Architecture Decision Record - documents key architectural choices | docs/explanation/architecture-decisions/ |
| **RLS** | Row Level Security - Supabase security policy | ADR-002 |
| **Multi-tenancy** | Multiple restaurants isolated within single system | ADR-002 |
| **Source of Truth** | Single authoritative version of information | docs/meta/SOURCE_OF_TRUTH.md |
| **Orphan** | Markdown file not linked from index.md | docs-check.js error |
| **Guardrail** | Automated validation check preventing bad patterns | scripts/docs-check.js |
| **Reality Grep** | Code verification check confirming implementation | docs-check.js guardrail 5 |

---

## 13. QUICK REFERENCE

### Most Important Files

```
index.md                                    # Entry point for all navigation
docs/README.md                             # Documentation overview
docs/VERSION.md                            # Source of truth for versions
docs/DOCUMENTATION_STANDARDS.md            # All standards and requirements
docs/meta/SOURCE_OF_TRUTH.md              # Status document
```

### Critical Workflows

```
docs-check.yml                             # CI validation on push/PR
scripts/docs-check.js                      # 5-layer guardrail system
package.json > docs:check                  # NPM integration point
```

### Validation Entry Points

```
/docs-check                                # Local Claude command
npm run docs:check                         # Full validation script
npm run env:check                          # Environment variable validation
```

---

## CONCLUSION

The Restaurant OS documentation system is **well-architected** with:
- Clear hierarchical organization (Diátaxis framework)
- Comprehensive automation (CI/CD + scripts)
- Strong standards enforcement
- Multiple validation layers
- Single source of truth approach

**Key Strengths**: Organization clarity, automation coverage, standards documentation

**Key Weaknesses**: Manual maintenance burden, metadata compliance gaps, limited search, validation script complexity

**Recommended Priorities**: Enforce metadata, auto-generate API docs, implement search, validate code examples

**Next Steps**: Implement Priority 1 improvements (2-3 sprints), then evaluate Priority 2 items based on usage patterns.

---

**Document Owner**: Restaurant OS Documentation System  
**Last Review**: November 1, 2025  
**Next Review**: December 1, 2025  
**Maintained By**: Development Team  
