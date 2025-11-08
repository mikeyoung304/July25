# Issue Management Strategy for Restaurant OS

**Last Updated:** 2025-11-07
**Version:** 6.0.14
**Project:** Restaurant OS (July25)
**Purpose:** Comprehensive strategy for managing issues, milestones, and project tracking

---

## Executive Summary

This document establishes a complete issue management framework for Restaurant OS, a production restaurant management system with complex multi-tenancy, voice ordering, POS integration, and real-time features. The strategy builds on existing workflows while addressing gaps in project organization, triage processes, and team coordination.

**Current State:**
- 26 existing labels (well-organized for audits and priorities)
- 4 issue templates (codex-focused: plan, fix, dependency, verification)
- Active use of milestones (Audit 2025-10-19, P0 Audit Fixes)
- Strong CI/CD automation with quality gates
- Mix of open issues (14 active, mostly verification tasks)

**Key Improvements:**
- Enhanced label taxonomy for broader use cases
- Additional templates for bugs, features, and incidents
- Standardized triage and prioritization workflow
- Project board recommendations
- Automated issue lifecycle management
- Team coordination guidelines

---

## Table of Contents

1. [Label System](#label-system)
2. [Issue Templates](#issue-templates)
3. [Triage and Prioritization](#triage-and-prioritization)
4. [Milestones and Roadmap](#milestones-and-roadmap)
5. [Project Boards](#project-boards)
6. [Automation](#automation)
7. [Workflows and Best Practices](#workflows-and-best-practices)
8. [Migration Plan](#migration-plan)
9. [Quick Reference](#quick-reference)

---

## Label System

### Current Labels Analysis

**Strengths:**
- Well-defined priority system (P0, P1)
- Audit workflow labels (codex:*, verification, verified:*)
- Category labels (bug, enhancement, fix, optimization, refactoring, stability)
- Domain labels (database, schema-drift, migration-failure)

**Gaps:**
- No component/area labels (frontend, backend, voice, KDS, etc.)
- Limited status labels beyond priority
- No effort estimation labels
- Missing user-facing vs internal distinction

### Recommended Label Structure

#### 1. Type Labels (What is it?)

| Label | Color | Description | Usage |
|-------|-------|-------------|-------|
| `type: bug` | `#d73a4a` | Something isn't working | Production bugs, regressions |
| `type: feature` | `#0E8A16` | New feature or capability | User-facing features |
| `type: enhancement` | `#a2eeef` | Improvement to existing feature | UX improvements, optimizations |
| `type: refactoring` | `#FBCA04` | Code quality improvements | No user-facing changes |
| `type: documentation` | `#0075ca` | Documentation updates | Docs, guides, comments |
| `type: security` | `#B60205` | Security vulnerability or concern | CVEs, auth issues |
| `type: performance` | `#0075CA` | Performance optimization | Speed, bundle size, memory |
| `type: incident` | `#D93F0B` | Production incident or postmortem | P0/P1 production issues |
| `type: tech-debt` | `#ededed` | Technical debt reduction | Cleanup, modernization |

#### 2. Component Labels (Where?)

| Label | Color | Description |
|-------|-------|-------------|
| `area: authentication` | `#1D76DB` | Auth, sessions, permissions |
| `area: voice-ordering` | `#5319E7` | Voice AI, WebRTC, transcription |
| `area: kds` | `#FBCA04` | Kitchen Display System |
| `area: pos` | `#0E8A16` | Point of Sale, orders, payments |
| `area: payments` | `#D93F0B` | Square integration, transactions |
| `area: database` | `#ededed` | Schema, migrations, Prisma |
| `area: api` | `#0075CA` | REST/WebSocket endpoints |
| `area: frontend` | `#BFD4F2` | React components, UI/UX |
| `area: backend` | `#D4C5F9` | Server-side logic |
| `area: deployment` | `#5319E7` | CI/CD, Vercel, Render |
| `area: testing` | `#AADCEE` | Test infrastructure, coverage |

#### 3. Priority Labels (When?)

**Keep existing:**
- `P0` - Fix this week (Critical) - `#B60205`
- `P1` - High priority - `#D93F0B`

**Add:**
- `P2` - Medium priority - `#FBCA04`
- `P3` - Low priority / Nice to have - `#ededed`
- `P4` - Backlog / Future consideration - `#f0f0f0`

#### 4. Status Labels (What's happening?)

| Label | Color | Description |
|-------|-------|-------------|
| `status: triage` | `#e99695` | Needs initial review |
| `status: needs-info` | `#d876e3` | Waiting for more information |
| `status: ready` | `#0E8A16` | Ready for development |
| `status: in-progress` | `#1D76DB` | Actively being worked on |
| `status: blocked` | `#B60205` | Blocked by external dependency |
| `status: needs-review` | `#FBCA04` | Needs code/design review |
| `status: needs-testing` | `#0075CA` | Implemented, needs QA |
| `status: wontfix` | `#ffffff` | Will not be addressed |
| `status: duplicate` | `#cfd3d7` | Duplicate of another issue |

#### 5. Effort Labels (How much work?)

| Label | Color | Description |
|-------|-------|-------------|
| `effort: xs` | `#f0f0f0` | < 1 hour |
| `effort: s` | `#e0e0e0` | 1-4 hours |
| `effort: m` | `#d0d0d0` | 4-8 hours (1 day) |
| `effort: l` | `#c0c0c0` | 8-16 hours (2-3 days) |
| `effort: xl` | `#b0b0b0` | > 16 hours (week+) |

#### 6. Special Labels

**Keep existing:**
- `codex:plan` - Agent planning
- `codex:fix` - Test-backed fixes
- `codex:dependency` - Dependency updates
- `codex:nonprod-only` - Dev/staging only
- `verification` - Audit verification
- `verified:valid` - Claim verified
- `verified:not-valid` - Claim disproven
- `audit-2025-10-19` - Audit batch tracking

**Add:**
- `good first issue` - Good for newcomers - `#7057ff`
- `help wanted` - Extra attention needed - `#008672`
- `breaking-change` - Breaking API/schema change - `#B60205`
- `needs-migration` - Requires database migration - `#ededed`
- `customer-facing` - Impacts end users - `#0E8A16`
- `monitoring` - Needs monitoring/alerts - `#1D76DB`

### Label Creation Script

```bash
#!/bin/bash
# scripts/setup-labels.sh
# Run: gh auth login && ./scripts/setup-labels.sh

# Type labels
gh label create "type: bug" --color d73a4a --description "Something isn't working" --force
gh label create "type: feature" --color 0E8A16 --description "New feature or capability" --force
gh label create "type: enhancement" --color a2eeef --description "Improvement to existing feature" --force
gh label create "type: refactoring" --color FBCA04 --description "Code quality improvements" --force
gh label create "type: documentation" --color 0075ca --description "Documentation updates" --force
gh label create "type: security" --color B60205 --description "Security vulnerability" --force
gh label create "type: performance" --color 0075CA --description "Performance optimization" --force
gh label create "type: incident" --color D93F0B --description "Production incident" --force
gh label create "type: tech-debt" --color ededed --description "Technical debt" --force

# Component labels
gh label create "area: authentication" --color 1D76DB --description "Auth, sessions, permissions" --force
gh label create "area: voice-ordering" --color 5319E7 --description "Voice AI, WebRTC" --force
gh label create "area: kds" --color FBCA04 --description "Kitchen Display System" --force
gh label create "area: pos" --color 0E8A16 --description "Point of Sale" --force
gh label create "area: payments" --color D93F0B --description "Square integration" --force
gh label create "area: database" --color ededed --description "Schema, migrations" --force
gh label create "area: api" --color 0075CA --description "REST/WebSocket endpoints" --force
gh label create "area: frontend" --color BFD4F2 --description "React components" --force
gh label create "area: backend" --color D4C5F9 --description "Server-side logic" --force
gh label create "area: deployment" --color 5319E7 --description "CI/CD" --force
gh label create "area: testing" --color AADCEE --description "Test infrastructure" --force

# Priority labels (P0, P1 already exist)
gh label create "P2" --color FBCA04 --description "Medium priority" --force
gh label create "P3" --color ededed --description "Low priority" --force
gh label create "P4" --color f0f0f0 --description "Backlog" --force

# Status labels
gh label create "status: triage" --color e99695 --description "Needs triage" --force
gh label create "status: needs-info" --color d876e3 --description "Needs more info" --force
gh label create "status: ready" --color 0E8A16 --description "Ready for dev" --force
gh label create "status: in-progress" --color 1D76DB --description "In progress" --force
gh label create "status: blocked" --color B60205 --description "Blocked" --force
gh label create "status: needs-review" --color FBCA04 --description "Needs review" --force
gh label create "status: needs-testing" --color 0075CA --description "Needs QA" --force

# Effort labels
gh label create "effort: xs" --color f0f0f0 --description "< 1 hour" --force
gh label create "effort: s" --color e0e0e0 --description "1-4 hours" --force
gh label create "effort: m" --color d0d0d0 --description "4-8 hours" --force
gh label create "effort: l" --color c0c0c0 --description "8-16 hours" --force
gh label create "effort: xl" --color b0b0b0 --description "> 16 hours" --force

# Special labels
gh label create "breaking-change" --color B60205 --description "Breaking change" --force
gh label create "needs-migration" --color ededed --description "Requires migration" --force
gh label create "customer-facing" --color 0E8A16 --description "Impacts end users" --force
gh label create "monitoring" --color 1D76DB --description "Needs monitoring" --force

echo "✅ Labels created/updated successfully"
```

---

## Issue Templates

### Current Templates Assessment

**Existing templates:**
1. ✅ `1-codex-plan.yml` - Agent planning (excellent)
2. ✅ `2-codex-fix.yml` - Test-backed fixes (excellent)
3. ✅ `3-dependency.yml` - Dependency maintenance (good)
4. ✅ `verification.yml` - Audit verification (excellent)

**Missing templates:**
- General bug report
- Feature request
- Performance issue
- Security vulnerability
- Production incident
- Database migration request
- Documentation request

### Recommended New Templates

#### Template 1: Bug Report

**File:** `.github/ISSUE_TEMPLATE/bug-report.yml`

```yaml
name: Bug Report
description: Report a bug or unexpected behavior
labels: ["type: bug", "status: triage"]
body:
  - type: markdown
    attributes:
      value: |
        ## Before submitting
        - Search existing issues to avoid duplicates
        - Include steps to reproduce
        - Add logs, screenshots, or error messages

  - type: dropdown
    id: severity
    attributes:
      label: Severity
      description: How critical is this bug?
      options:
        - P0 - Production down / Data loss
        - P1 - Major feature broken
        - P2 - Minor feature broken
        - P3 - Cosmetic issue
    validations:
      required: true

  - type: dropdown
    id: component
    attributes:
      label: Component
      description: Which area is affected?
      multiple: true
      options:
        - Authentication
        - Voice Ordering
        - KDS (Kitchen Display)
        - POS / Orders
        - Payments (Square)
        - Database
        - API
        - Frontend
        - Backend
        - Deployment
    validations:
      required: true

  - type: textarea
    id: description
    attributes:
      label: Bug Description
      description: What's broken or unexpected?
      placeholder: "Example: Voice ordering fails with 'WebRTC connection timeout' after 30 seconds"
    validations:
      required: true

  - type: textarea
    id: reproduction
    attributes:
      label: Steps to Reproduce
      description: Exact steps to trigger the bug
      placeholder: |
        1. Navigate to kiosk demo (https://july25.vercel.app/kiosk-demo)
        2. Click "Start Voice Order"
        3. Wait 30 seconds
        4. See error: "WebRTC connection timeout"
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What should happen instead?
      placeholder: "Voice ordering should connect within 5 seconds"
    validations:
      required: true

  - type: textarea
    id: actual
    attributes:
      label: Actual Behavior
      description: What actually happens?
      placeholder: "Connection times out after 30s with error"
    validations:
      required: true

  - type: textarea
    id: environment
    attributes:
      label: Environment
      description: Where does this occur?
      value: |
        - Environment: [Production / Staging / Local]
        - Browser: [Chrome 120 / Safari 17 / etc.]
        - Device: [Desktop / Mobile / Kiosk]
        - Version: [6.0.14]
    validations:
      required: true

  - type: textarea
    id: logs
    attributes:
      label: Logs / Error Messages
      description: Paste relevant logs or screenshots
      placeholder: |
        ```
        [2025-11-07 10:30:45] ERROR: WebRTC connection timeout
        Stack trace: ...
        ```

  - type: textarea
    id: context
    attributes:
      label: Additional Context
      description: Any other relevant information
      placeholder: "Started happening after deployment on 2025-11-06"

  - type: checkboxes
    id: checklist
    attributes:
      label: Pre-submission Checklist
      options:
        - label: I've searched existing issues for duplicates
          required: true
        - label: I've included reproduction steps
          required: true
        - label: I've included environment details
          required: true
        - label: I've attached logs or screenshots (if applicable)
          required: false
```

#### Template 2: Feature Request

**File:** `.github/ISSUE_TEMPLATE/feature-request.yml`

```yaml
name: Feature Request
description: Propose a new feature or capability
labels: ["type: feature", "status: triage"]
body:
  - type: markdown
    attributes:
      value: |
        ## Before submitting
        - Check the roadmap: docs/ROADMAP.md
        - Search existing feature requests
        - Consider if this is an enhancement to existing feature (use enhancement template)

  - type: dropdown
    id: component
    attributes:
      label: Component
      description: Which area does this feature belong to?
      multiple: true
      options:
        - Authentication
        - Voice Ordering
        - KDS (Kitchen Display)
        - POS / Orders
        - Payments (Square)
        - Database
        - API
        - Frontend
        - Backend
        - Deployment
        - Other
    validations:
      required: true

  - type: textarea
    id: problem
    attributes:
      label: Problem Statement
      description: What problem does this solve?
      placeholder: |
        **User story:** As a [restaurant manager], I want [ability to split checks], so that [customers can pay separately].

        **Current limitation:** Currently, all items on an order must be paid together...
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
      description: How should this work?
      placeholder: |
        1. Add "Split Check" button to order review screen
        2. Allow selection of items per payment
        3. Generate separate Square transactions
        4. Update order status when all splits are paid
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
      description: What other approaches did you consider?
      placeholder: "Could use Square's built-in split tender, but..."

  - type: dropdown
    id: priority
    attributes:
      label: Business Priority
      description: How important is this?
      options:
        - Critical - Blocking launch
        - High - Major value add
        - Medium - Nice to have
        - Low - Future consideration
    validations:
      required: true

  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance Criteria
      description: What does "done" look like?
      placeholder: |
        - [ ] UI supports selecting items for each split
        - [ ] Backend creates multiple Square transactions
        - [ ] Order marked complete when all splits paid
        - [ ] Tests cover split payment flows
        - [ ] Documentation updated
    validations:
      required: true

  - type: textarea
    id: design
    attributes:
      label: Design Mockups / Technical Design
      description: Attach mockups, wireframes, or technical design docs
      placeholder: "Link to Figma, architecture diagrams, etc."

  - type: textarea
    id: impact
    attributes:
      label: Impact Assessment
      description: What areas of the system will this affect?
      placeholder: |
        - Database: New `order_splits` table
        - API: New `/orders/:id/split` endpoint
        - Frontend: New SplitCheckModal component
        - Square: Multiple capture transactions

  - type: checkboxes
    id: considerations
    attributes:
      label: Technical Considerations
      options:
        - label: Requires database migration
        - label: Breaking API change
        - label: Impacts existing features
        - label: Third-party API changes required (Square, etc.)
        - label: Security review needed
        - label: Performance impact expected
```

#### Template 3: Production Incident

**File:** `.github/ISSUE_TEMPLATE/incident.yml`

```yaml
name: Production Incident
description: Report a production outage or critical issue
labels: ["type: incident", "P0", "status: triage"]
body:
  - type: markdown
    attributes:
      value: |
        ## 🚨 Production Incident
        Use this template for active production issues requiring immediate attention.

        **For postmortems:** Create issue first, then add postmortem to docs/archive/incidents/

  - type: input
    id: incident-id
    attributes:
      label: Incident ID
      description: Unique identifier (format: INC-YYYYMMDD-NNN)
      placeholder: "INC-20251107-001"
    validations:
      required: true

  - type: dropdown
    id: severity
    attributes:
      label: Severity
      description: Impact level
      options:
        - SEV1 - Complete outage / Data loss
        - SEV2 - Major feature down
        - SEV3 - Degraded performance
        - SEV4 - Minor issue
    validations:
      required: true

  - type: dropdown
    id: status
    attributes:
      label: Current Status
      options:
        - INVESTIGATING - Root cause unknown
        - IDENTIFIED - Root cause found
        - MONITORING - Fix deployed, monitoring
        - RESOLVED - Incident closed
    validations:
      required: true

  - type: input
    id: detected
    attributes:
      label: Time Detected
      description: When was this first noticed? (UTC)
      placeholder: "2025-11-07 14:30 UTC"
    validations:
      required: true

  - type: textarea
    id: impact
    attributes:
      label: Customer Impact
      description: What's broken for users?
      placeholder: |
        - All voice orders failing
        - Affects: Kiosk demo users
        - Error rate: 100% since 14:30 UTC
    validations:
      required: true

  - type: textarea
    id: symptoms
    attributes:
      label: Symptoms
      description: Observable issues
      placeholder: |
        - WebRTC connections timing out
        - Server logs show: "Voice service unreachable"
        - Monitoring shows voice-gateway CPU at 100%
    validations:
      required: true

  - type: textarea
    id: timeline
    attributes:
      label: Timeline
      description: Chronological events
      value: |
        - **14:30 UTC** - First error reports
        - **14:35 UTC** - Investigation started
        - **14:40 UTC** - Root cause identified
        - **14:50 UTC** - Fix deployed
        - **15:00 UTC** - Monitoring for recovery

  - type: textarea
    id: root-cause
    attributes:
      label: Root Cause
      description: What caused this? (update as investigation progresses)
      placeholder: "Voice gateway crashed due to memory leak in WebRTC connection pool"

  - type: textarea
    id: resolution
    attributes:
      label: Resolution
      description: What was done to fix it?
      placeholder: |
        - Restarted voice gateway service
        - Deployed hotfix for memory leak (commit abc123)
        - Added memory monitoring alerts

  - type: textarea
    id: action-items
    attributes:
      label: Follow-up Action Items
      description: Preventive measures
      placeholder: |
        - [ ] Create postmortem: docs/archive/incidents/2025-11-07_voice_outage.md
        - [ ] Add memory leak test: tests/voice/connection-pool.test.ts
        - [ ] Implement connection pool limits
        - [ ] Add alerting for voice gateway memory usage

  - type: checkboxes
    id: notifications
    attributes:
      label: Notifications Sent
      options:
        - label: Engineering team notified
        - label: Customer support notified
        - label: Status page updated
        - label: Customers notified (if needed)
```

#### Template 4: Database Migration Request

**File:** `.github/ISSUE_TEMPLATE/migration.yml`

```yaml
name: Database Migration
description: Request a database schema change
labels: ["area: database", "needs-migration", "status: triage"]
body:
  - type: markdown
    attributes:
      value: |
        ## Database Migration Request

        **Before submitting:**
        - Review: docs/how-to/development/DEVELOPMENT_PROCESS.md (Migration Planning Checklist)
        - Consider: Can this be done without a migration?

  - type: textarea
    id: purpose
    attributes:
      label: Purpose
      description: Why is this migration needed?
      placeholder: "Support multi-seat ordering feature (issue #123)"
    validations:
      required: true

  - type: textarea
    id: schema-changes
    attributes:
      label: Schema Changes
      description: Describe table/column changes
      placeholder: |
        **Tables:**
        - orders: Add column `seat_number` (INTEGER)
        - orders: Add column `table_id` (UUID REFERENCES tables)

        **Indexes:**
        - Create index on (restaurant_id, table_id, status)

        **Functions:**
        - Update create_order_with_audit() to accept seat_number
    validations:
      required: true

  - type: textarea
    id: impact
    attributes:
      label: Impact Analysis
      description: What will this affect?
      placeholder: |
        **API Endpoints:**
        - POST /api/orders - Add optional seat_number field
        - GET /api/orders/:id - Include seat_number in response

        **Client Components:**
        - OrderForm.tsx - Add seat number input
        - OrderList.tsx - Display seat number

        **Database Performance:**
        - New index improves table order queries by ~40%
    validations:
      required: true

  - type: dropdown
    id: risk
    attributes:
      label: Risk Level
      options:
        - Low - Adding optional columns
        - Medium - Modifying existing columns
        - High - Dropping columns or tables
        - Critical - Data transformation required
    validations:
      required: true

  - type: textarea
    id: rollback
    attributes:
      label: Rollback Strategy
      description: How to undo this migration?
      placeholder: |
        ```sql
        ALTER TABLE orders DROP COLUMN IF EXISTS seat_number;
        ALTER TABLE orders DROP COLUMN IF EXISTS table_id;
        DROP INDEX IF EXISTS idx_orders_table;
        ```
    validations:
      required: true

  - type: textarea
    id: testing
    attributes:
      label: Testing Plan
      description: How will you test this?
      placeholder: |
        - [ ] Test locally with supabase/migrations/test.sql
        - [ ] Verify Prisma schema sync
        - [ ] Test API endpoints with new fields
        - [ ] Run integration tests: npm test
        - [ ] Test rollback script
    validations:
      required: true

  - type: checkboxes
    id: checklist
    attributes:
      label: Pre-migration Checklist
      options:
        - label: Reviewed DEVELOPMENT_PROCESS.md migration checklist
          required: true
        - label: Batched all related changes in one migration
          required: true
        - label: Used TEXT instead of VARCHAR for strings
          required: true
        - label: RPC function signatures match table types
          required: true
        - label: Created rollback script
          required: true
        - label: Tested locally on realistic data
          required: false
        - label: Peer reviewed schema design
          required: false
```

#### Template 5: Performance Issue

**File:** `.github/ISSUE_TEMPLATE/performance.yml`

```yaml
name: Performance Issue
description: Report slow performance or optimization opportunity
labels: ["type: performance", "status: triage"]
body:
  - type: dropdown
    id: area
    attributes:
      label: Performance Area
      options:
        - Page Load Time
        - API Response Time
        - Database Query Performance
        - Bundle Size
        - Memory Usage
        - WebSocket Latency
        - Voice Recognition Speed
      multiple: true
    validations:
      required: true

  - type: textarea
    id: description
    attributes:
      label: Performance Issue Description
      description: What's slow?
      placeholder: "KDS order list takes 5 seconds to load when restaurant has >100 orders"
    validations:
      required: true

  - type: textarea
    id: metrics
    attributes:
      label: Current Metrics
      description: Quantify the issue
      placeholder: |
        **Current:**
        - Page load: 5.2 seconds
        - API response: 4.8 seconds
        - Database query: 4.5 seconds

        **Evidence:**
        - Lighthouse score: 45/100
        - Chrome DevTools Performance tab (attached)
        - Database EXPLAIN ANALYZE (attached)
    validations:
      required: true

  - type: textarea
    id: target
    attributes:
      label: Target Metrics
      description: What's acceptable?
      placeholder: |
        **Target:**
        - Page load: < 1 second
        - API response: < 500ms
        - Database query: < 100ms

        **Baseline:** Core Web Vitals targets
    validations:
      required: true

  - type: textarea
    id: analysis
    attributes:
      label: Performance Analysis
      description: What's causing the slowness?
      placeholder: |
        **Bottleneck identified:**
        - GET /api/orders endpoint doing N+1 queries
        - Loading all order items individually
        - No pagination (loading 1000+ orders)

        **Evidence:**
        - Network tab shows 150+ database queries
        - Each order makes 3 separate queries

  - type: textarea
    id: solution
    attributes:
      label: Proposed Optimization
      description: How to fix it?
      placeholder: |
        1. Add eager loading for order items (JOIN instead of N+1)
        2. Implement pagination (25 orders per page)
        3. Add database index on (restaurant_id, created_at DESC)
        4. Cache results for 30 seconds

        **Expected improvement:** < 500ms load time

  - type: checkboxes
    id: verification
    attributes:
      label: Verification Method
      options:
        - label: Lighthouse performance score
        - label: Chrome DevTools Performance tab
        - label: Database EXPLAIN ANALYZE
        - label: Load testing (k6, Artillery)
        - label: Real User Monitoring (RUM)
```

### Template Usage Guidelines

**When to use each template:**

| Template | Use When |
|----------|----------|
| `bug-report.yml` | Something works incorrectly |
| `feature-request.yml` | Requesting entirely new capability |
| `1-codex-plan.yml` | AI agent needs to plan complex task |
| `2-codex-fix.yml` | Small, test-backed bug fix |
| `3-dependency.yml` | Weekly dependency updates |
| `verification.yml` | Verifying audit findings |
| `incident.yml` | Active production outage |
| `migration.yml` | Database schema change needed |
| `performance.yml` | Something is slow |

---

## Triage and Prioritization

### Triage Process

#### Daily Triage (Engineering Lead)

**Time commitment:** 15 minutes/day

**Process:**
1. Filter: `is:issue is:open label:"status: triage"`
2. For each issue:
   - **Add labels:**
     - Type (bug, feature, etc.)
     - Component (area: *)
     - Priority (P0-P4)
     - Effort (xs, s, m, l, xl)
   - **Add to milestone** (if applicable)
   - **Assign** if clear owner
   - **Remove** `status: triage` label
   - **Add** `status: ready` or `status: needs-info`

**Decision tree:**

```
New issue created
    ├─ Production down? → P0, status: ready, notify on-call
    ├─ Security issue? → type: security, P0/P1, status: ready
    ├─ Missing info? → status: needs-info, comment with questions
    ├─ Duplicate? → status: duplicate, close with reference
    ├─ Feature request → Add to backlog milestone, P3/P4
    └─ Normal bug → Prioritize based on impact, add to sprint
```

#### Weekly Planning (Team)

**Time commitment:** 1 hour/week

**Agenda:**
1. Review P0/P1 issues (are they still urgent?)
2. Select issues for current sprint from backlog
3. Update milestone targets
4. Identify blocked issues
5. Assign issues to team members

**Sprint selection criteria:**
- High business value
- Clear requirements (status: ready)
- Dependencies resolved
- Team capacity available

### Priority Definitions

#### P0 - Critical (Fix This Week)

**Criteria:**
- Production is down or severely degraded
- Data loss or security vulnerability
- Blocking major customer launch
- Affecting >50% of users

**SLA:** Fix within 24-48 hours

**Examples:**
- Voice ordering completely broken
- Payment processing failing
- Database migration failure
- Authentication not working
- WebSocket server crashed

**Process:**
1. Notify team immediately (#engineering Slack)
2. Assign to on-call engineer
3. Create incident issue if not exists
4. Update status every 2-4 hours
5. Postmortem required after resolution

#### P1 - High Priority (Fix This Sprint)

**Criteria:**
- Major feature degraded (not completely broken)
- Affecting specific user segment
- Blocking non-critical feature development
- Moderate security concern

**SLA:** Fix within 1-2 weeks

**Examples:**
- KDS orders not auto-refreshing
- Specific payment methods failing
- Slow database queries (>2s)
- UI broken on mobile devices

#### P2 - Medium Priority (Next Sprint)

**Criteria:**
- Minor feature broken
- Enhancement with clear business value
- Technical debt causing developer friction
- Low security risk

**SLA:** Fix within 1 month

**Examples:**
- Optional features not working
- UI inconsistencies
- Missing error messages
- Code quality improvements

#### P3 - Low Priority (Backlog)

**Criteria:**
- Nice to have feature
- Cosmetic issues
- Minor optimizations
- Documentation improvements

**SLA:** Fix when capacity allows

**Examples:**
- Color scheme tweaks
- Additional logging
- Refactoring for clarity
- Performance optimizations (<20% gain)

#### P4 - Future Consideration

**Criteria:**
- Speculative features
- Very low impact
- Research tasks
- "Wouldn't it be cool if..."

**SLA:** No commitment

**Examples:**
- Experimental features
- Alternative implementations
- Long-term refactoring
- Exploratory spikes

### Escalation Process

**When to escalate:**
- P1 issue blocked for >3 days → Escalate to P0
- P2 issue blocked for >2 weeks → Escalate to P1
- Security issue identified → Always P0/P1
- Customer complaint received → Review priority

**How to escalate:**
1. Comment on issue with escalation reason
2. Update priority label
3. Notify engineering lead
4. Add to current sprint
5. Remove blockers or add resources

### SLA Tracking

**Automated tracking script:**

```bash
#!/bin/bash
# scripts/check-sla.sh
# Run daily via cron or GitHub Actions

echo "=== SLA Violations ==="

# P0 open >48 hours
gh issue list --label P0 --json number,title,createdAt \
  --jq '.[] | select((now - (.createdAt | fromdateiso8601)) > 172800) | "🚨 P0 #\(.number): \(.title)"'

# P1 open >2 weeks
gh issue list --label P1 --json number,title,createdAt \
  --jq '.[] | select((now - (.createdAt | fromdateiso8601)) > 1209600) | "⚠️  P1 #\(.number): \(.title)"'

# Issues in triage >3 days
gh issue list --label "status: triage" --json number,title,createdAt \
  --jq '.[] | select((now - (.createdAt | fromdateiso8601)) > 259200) | "📋 Untriaged #\(.number): \(.title)"'
```

---

## Milestones and Roadmap

### Current Milestones

**Existing:**
1. "Audit 2025-10-19" (9 open, 1 closed)
2. "P0 Audit Fixes - Oct 2025" (0 open, 8 closed)

**Status:** Good use of milestones for audit tracking

### Recommended Milestone Structure

#### 1. Time-Based Milestones (Sprints)

**Format:** `Sprint YYYY-MM-DD` or `Q# YYYY`

```bash
# Create sprint milestones
gh api /repos/mikeyoung304/July25/milestones \
  -f title="Sprint 2025-11-11" \
  -f state="open" \
  -f description="2-week sprint ending Nov 25" \
  -f due_on="2025-11-25T23:59:59Z"

gh api /repos/mikeyoung304/July25/milestones \
  -f title="Q1 2026" \
  -f state="open" \
  -f description="Q1 2026 roadmap items" \
  -f due_on="2026-03-31T23:59:59Z"
```

**Purpose:**
- Organize work into 2-week sprints
- Track quarterly goals
- Measure velocity

**Usage:**
- Add P0/P1 issues to current sprint
- Add P2 to next sprint
- Add P3/P4 to quarterly milestones

#### 2. Feature-Based Milestones

**Format:** `Feature: [Name]`

```bash
# Examples
gh api /repos/mikeyoung304/July25/milestones \
  -f title="Feature: Split Payments" \
  -f description="Support splitting checks across multiple payment methods"

gh api /repos/mikeyoung304/July25/milestones \
  -f title="Feature: Voice 2.0" \
  -f description="Next-gen voice ordering with context awareness"
```

**Purpose:**
- Group related issues for major features
- Track feature completion
- Coordinate cross-team work

**Usage:**
- All issues for a feature → same milestone
- Close milestone when feature ships
- Reference in release notes

#### 3. Incident/Audit Milestones

**Format:** `Incident: [Date]` or `Audit: [Date]`

```bash
# Keep existing pattern
gh api /repos/mikeyoung304/July25/milestones \
  -f title="Audit 2025-11-15" \
  -f description="Post-launch audit findings"
```

**Purpose:**
- Track incident follow-ups
- Track audit remediation
- Ensure all findings addressed

**Usage:**
- Create milestone for each incident/audit
- Link verification issues
- Link fix issues
- Close when all verified + fixed

#### 4. Release Milestones

**Format:** `v6.1.0`, `v7.0.0`

```bash
gh api /repos/mikeyoung304/July25/milestones \
  -f title="v6.1.0" \
  -f description="Next minor release" \
  -f due_on="2025-12-01T00:00:00Z"
```

**Purpose:**
- Track what goes in each release
- Generate release notes
- Coordinate breaking changes

**Usage:**
- Add issues/PRs that will be in release
- Use for changelog generation
- Close when release deployed

### Roadmap Management

**Quarterly roadmap process:**

1. **Month 1 (Planning)**
   - Review backlog
   - Stakeholder input
   - Create quarterly milestone
   - Assign priorities

2. **Month 2-3 (Execution)**
   - Weekly sprint planning
   - Move issues to sprint milestones
   - Track progress

3. **End of Quarter**
   - Review completion rate
   - Close quarterly milestone
   - Retrospective
   - Plan next quarter

**Public roadmap:**
- Keep `docs/ROADMAP.md` updated
- Reference GitHub milestones
- Publish quarterly updates

**Example roadmap structure:**

```markdown
# Restaurant OS Roadmap

## Q4 2025 (Current)

### In Progress
- [x] Voice ordering bug fixes (#130, #131)
- [ ] Split payment support (#145)
- [ ] KDS performance optimization (#147)

### Planned
- Multi-location support
- Advanced reporting dashboard
- Mobile app (iOS/Android)

## Q1 2026

### Focus Areas
1. Scale: Support 100+ locations
2. Analytics: Real-time business insights
3. Integrations: DoorDash, UberEats APIs

### Major Features
- Location management dashboard
- Revenue analytics
- Third-party delivery integration

## Backlog (No Commitment)
- Inventory management
- Employee scheduling
- Loyalty program
```

---

## Project Boards

### Recommended Board Structure

#### Board 1: Sprint Board (Primary)

**Columns:**
1. **Backlog** - Triaged, not yet in sprint
2. **Todo** - In current sprint, not started
3. **In Progress** - Actively being worked
4. **In Review** - PR open, needs review
5. **Testing** - Merged, needs QA
6. **Done** - Deployed to production

**Automation:**
- Issues → Backlog when labeled `status: ready`
- Issues → In Progress when labeled `status: in-progress`
- PRs → In Review when opened
- Issues → Testing when PR merged
- Issues → Done when closed

**Filters:**
- Default view: Current sprint milestone
- Assignee views per team member
- Priority views (P0, P1, etc.)

**Setup:**

```bash
# Create project board
gh project create --title "Sprint Board" --body "Main development board"

# Add columns
gh project column create "Backlog" --project "Sprint Board"
gh project column create "Todo" --project "Sprint Board"
gh project column create "In Progress" --project "Sprint Board"
gh project column create "In Review" --project "Sprint Board"
gh project column create "Testing" --project "Sprint Board"
gh project column create "Done" --project "Sprint Board"
```

#### Board 2: Incident Board

**Columns:**
1. **Active Incidents** - Currently being worked
2. **Monitoring** - Fix deployed, watching
3. **Postmortem Needed** - Requires writeup
4. **Closed** - Fully resolved

**Usage:**
- Only P0 incidents
- Active until postmortem complete
- Archive monthly

#### Board 3: Feature Roadmap Board

**Columns organized by status:**
1. **Proposed** - Feature requests
2. **Approved** - Accepted for roadmap
3. **In Design** - Being designed
4. **In Development** - Being built
5. **In Beta** - Testing with select users
6. **Shipped** - Live in production

**Usage:**
- High-level feature tracking
- Stakeholder visibility
- Release planning

### Automation Recommendations

#### GitHub Actions Workflow: Board Automation

**File:** `.github/workflows/board-automation.yml`

```yaml
name: Project Board Automation
on:
  issues:
    types: [opened, labeled, assigned, closed]
  pull_request:
    types: [opened, ready_for_review, closed]

jobs:
  update-board:
    runs-on: ubuntu-latest
    steps:
      - name: Move new issues to Backlog
        if: github.event.action == 'opened' && github.event.issue
        uses: alex-page/github-project-automation-plus@v0.8.3
        with:
          project: Sprint Board
          column: Backlog
          repo-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Move to In Progress when labeled
        if: |
          github.event.action == 'labeled' &&
          github.event.label.name == 'status: in-progress'
        uses: alex-page/github-project-automation-plus@v0.8.3
        with:
          project: Sprint Board
          column: In Progress
          repo-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Move PRs to In Review
        if: |
          github.event.pull_request &&
          github.event.action == 'opened'
        uses: alex-page/github-project-automation-plus@v0.8.3
        with:
          project: Sprint Board
          column: In Review
          repo-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Move to Done when closed
        if: |
          github.event.action == 'closed' &&
          github.event.issue
        uses: alex-page/github-project-automation-plus@v0.8.3
        with:
          project: Sprint Board
          column: Done
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

---

## Automation

### Current Automation

**Existing workflows:**
- ✅ PR validation (migrations, schema sync)
- ✅ Quality gates (typecheck, lint, tests)
- ✅ Auto-labeling (documentation)
- ✅ Deployment automation
- ✅ Drift detection (creates issues)

**Gaps:**
- No issue triage automation
- No SLA violation alerts
- No stale issue management
- No auto-assignment
- No milestone automation

### Recommended Automation

#### 1. Auto-Triage Bot

**File:** `.github/workflows/auto-triage.yml`

```yaml
name: Auto-Triage Issues
on:
  issues:
    types: [opened]

jobs:
  auto-label:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Apply area labels based on keywords
        uses: actions/github-script@v7
        with:
          script: |
            const issue = context.payload.issue;
            const body = (issue.body || '').toLowerCase();
            const title = (issue.title || '').toLowerCase();
            const text = `${title} ${body}`;

            const labelMap = {
              'authentication|login|logout|session|auth': 'area: authentication',
              'voice|webrtc|transcription|ai': 'area: voice-ordering',
              'kds|kitchen|display': 'area: kds',
              'pos|order|payment|checkout': 'area: pos',
              'square|transaction': 'area: payments',
              'database|migration|schema|prisma': 'area: database',
              'api|endpoint|rest|websocket': 'area: api',
              'react|component|frontend|ui': 'area: frontend',
              'server|backend|express': 'area: backend',
              'deploy|vercel|render|ci/cd': 'area: deployment',
              'test|testing|coverage': 'area: testing'
            };

            const labelsToAdd = [];
            for (const [pattern, label] of Object.entries(labelMap)) {
              if (new RegExp(pattern, 'i').test(text)) {
                labelsToAdd.push(label);
              }
            }

            // Add status: triage to all new issues
            labelsToAdd.push('status: triage');

            // Detect priority from keywords
            if (/production|outage|down|critical|urgent/i.test(text)) {
              labelsToAdd.push('P0');
            } else if (/important|high priority/i.test(text)) {
              labelsToAdd.push('P1');
            }

            if (labelsToAdd.length > 0) {
              await github.rest.issues.addLabels({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issue.number,
                labels: labelsToAdd
              });
            }

      - name: Comment with triage template
        uses: actions/github-script@v7
        with:
          script: |
            const comment = `👋 Thank you for opening this issue!

            **Next steps:**
            1. Our team will triage this within 24 hours
            2. We'll add appropriate labels and priority
            3. You'll be notified of any questions or updates

            **Meanwhile:**
            - Check that you've provided all requested information
            - Add any additional context that might help
            - Search for related issues

            **Priority definitions:**
            - 🔴 **P0**: Production down, fix within 48h
            - 🟠 **P1**: Major feature broken, fix within 1-2 weeks
            - 🟡 **P2**: Minor issue, fix within 1 month
            - 🟢 **P3**: Enhancement, fix when capacity allows

            For urgent production issues, also notify #engineering on Slack.`;

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: comment
            });
```

#### 2. SLA Monitoring

**File:** `.github/workflows/sla-check.yml`

```yaml
name: SLA Monitoring
on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM UTC
  workflow_dispatch:

jobs:
  check-sla:
    runs-on: ubuntu-latest
    steps:
      - name: Check P0 SLA violations
        uses: actions/github-script@v7
        with:
          script: |
            const { data: issues } = await github.rest.issues.listForRepo({
              owner: context.repo.owner,
              repo: context.repo.repo,
              labels: 'P0',
              state: 'open'
            });

            const now = new Date();
            const violations = [];

            for (const issue of issues) {
              const created = new Date(issue.created_at);
              const ageHours = (now - created) / (1000 * 60 * 60);

              if (ageHours > 48) {
                violations.push({
                  number: issue.number,
                  title: issue.title,
                  ageHours: Math.floor(ageHours),
                  url: issue.html_url
                });
              }
            }

            if (violations.length > 0) {
              const body = `## 🚨 P0 SLA Violations Detected

              The following P0 issues have been open for >48 hours:

              ${violations.map(v => `- #${v.number}: ${v.title} (${v.ageHours}h old) - ${v.url}`).join('\n')}

              **Action required:** Review these issues immediately.
              `;

              // Create or update SLA violation issue
              const { data: existing } = await github.rest.issues.listForRepo({
                owner: context.repo.owner,
                repo: context.repo.repo,
                labels: 'sla-violation',
                state: 'open'
              });

              if (existing.length > 0) {
                await github.rest.issues.update({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  issue_number: existing[0].number,
                  body: body
                });
              } else {
                await github.rest.issues.create({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  title: '🚨 P0 SLA Violations',
                  body: body,
                  labels: ['sla-violation', 'P0']
                });
              }
            }

      - name: Check stale triage issues
        uses: actions/github-script@v7
        with:
          script: |
            const { data: issues } = await github.rest.issues.listForRepo({
              owner: context.repo.owner,
              repo: context.repo.repo,
              labels: 'status: triage',
              state: 'open'
            });

            const now = new Date();
            const stale = [];

            for (const issue of issues) {
              const created = new Date(issue.created_at);
              const ageDays = (now - created) / (1000 * 60 * 60 * 24);

              if (ageDays > 3) {
                stale.push(issue);

                await github.rest.issues.createComment({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  issue_number: issue.number,
                  body: `⏰ This issue has been in triage for ${Math.floor(ageDays)} days. @engineering-lead please review and prioritize.`
                });
              }
            }
```

#### 3. Stale Issue Management

**File:** `.github/workflows/stale.yml`

```yaml
name: Mark Stale Issues
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
  workflow_dispatch:

jobs:
  stale:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/stale@v9
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}

          # Don't mark as stale if has these labels
          exempt-issue-labels: 'P0,P1,status: in-progress,status: blocked'

          # Stale after 90 days of inactivity
          days-before-stale: 90
          days-before-close: 14

          stale-issue-message: |
            👋 This issue has been inactive for 90 days.

            **Is this still relevant?**
            - If yes: Comment to keep it open
            - If no: Close the issue

            This issue will auto-close in 14 days without activity.

          stale-issue-label: 'status: stale'
          close-issue-message: |
            🔒 Closing due to inactivity.

            If this is still relevant, please reopen and provide an update.
```

#### 4. Auto-Assignment by Component

**File:** `.github/workflows/auto-assign.yml`

```yaml
name: Auto-Assign Issues
on:
  issues:
    types: [labeled]

jobs:
  auto-assign:
    runs-on: ubuntu-latest
    steps:
      - name: Assign based on area label
        uses: actions/github-script@v7
        with:
          script: |
            const labelAssignments = {
              'area: voice-ordering': ['username1'],
              'area: kds': ['username2'],
              'area: payments': ['username3'],
              'area: database': ['username4'],
              'area: deployment': ['username5']
            };

            const label = context.payload.label.name;
            const assignees = labelAssignments[label];

            if (assignees) {
              await github.rest.issues.addAssignees({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                assignees: assignees
              });

              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: `📌 Auto-assigned to @${assignees.join(', @')} based on area label.`
              });
            }
```

#### 5. Milestone Automation

**File:** `.github/workflows/milestone-automation.yml`

```yaml
name: Milestone Automation
on:
  issues:
    types: [labeled, closed]
  pull_request:
    types: [closed]

jobs:
  update-milestone:
    runs-on: ubuntu-latest
    steps:
      - name: Add P0 to current sprint
        if: |
          github.event.action == 'labeled' &&
          github.event.label.name == 'P0'
        uses: actions/github-script@v7
        with:
          script: |
            // Find "current sprint" milestone (next due date)
            const { data: milestones } = await github.rest.issues.listMilestones({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'open',
              sort: 'due_on',
              direction: 'asc'
            });

            const sprint = milestones.find(m => m.title.startsWith('Sprint'));

            if (sprint) {
              await github.rest.issues.update({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                milestone: sprint.number
              });
            }

      - name: Close milestone when all issues closed
        if: github.event.action == 'closed'
        uses: actions/github-script@v7
        with:
          script: |
            const issue = context.payload.issue || context.payload.pull_request;
            if (!issue.milestone) return;

            const { data: milestone } = await github.rest.issues.getMilestone({
              owner: context.repo.owner,
              repo: context.repo.repo,
              milestone_number: issue.milestone.number
            });

            if (milestone.open_issues === 0) {
              await github.rest.issues.updateMilestone({
                owner: context.repo.owner,
                repo: context.repo.repo,
                milestone_number: milestone.number,
                state: 'closed'
              });

              // Post celebration comment
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issue.number,
                body: `🎉 Milestone **${milestone.title}** is now complete! All issues closed.`
              });
            }
```

---

## Workflows and Best Practices

### Issue Lifecycle

```
1. CREATED
   ↓
2. TRIAGED (label: status: triage removed, priority added)
   ↓
3. READY (label: status: ready, added to sprint/backlog)
   ↓
4. IN PROGRESS (label: status: in-progress, assigned)
   ↓
5. IN REVIEW (PR opened, linked to issue)
   ↓
6. TESTING (PR merged, QA verification)
   ↓
7. CLOSED (deployed to production)
```

### PR to Issue Linking

**Best practices:**

1. **Reference issues in PR title:**
   ```
   fix(voice): resolve WebRTC timeout (#145)
   feat(kds): add order grouping (#156)
   ```

2. **Use closing keywords in PR description:**
   ```markdown
   ## Changes
   - Fixed voice ordering timeout
   - Added retry logic

   Closes #145
   Fixes #146
   Resolves #147
   ```

3. **Link related (but not closed) issues:**
   ```markdown
   Related to #200
   Part of #201
   Blocked by #202
   ```

**Supported keywords:**
- `closes #123` - Closes issue when PR merged
- `fixes #123` - Same as closes
- `resolves #123` - Same as closes
- `closes #123, #456` - Close multiple
- `part of #123` - Link without closing

### Commit Message Integration

**Format:** `type(scope): description (#issue)`

**Examples:**
```bash
git commit -m "fix(voice): resolve timeout issue (closes #145)"
git commit -m "feat(kds): implement order grouping (part of #156)"
git commit -m "docs: update deployment guide (#178)"
```

**Benefits:**
- Automatic issue linking
- Generate changelogs
- Track feature development
- Audit trail

### Branch Naming

**Format:** `type/issue-number-description`

**Examples:**
```bash
git checkout -b fix/145-voice-timeout
git checkout -b feat/156-order-grouping
git checkout -b docs/178-deployment-guide
git checkout -b hotfix/201-payment-error
```

**Types:**
- `feat/` - New feature
- `fix/` - Bug fix
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Test updates
- `chore/` - Maintenance
- `hotfix/` - Urgent production fix

### Code Review Process

**PR checklist** (already in `.github/PULL_REQUEST_TEMPLATE.md`):
- ✅ Plan section
- ✅ Files changed
- ✅ Diff summary
- ✅ Checks passing
- ✅ Documentation updated
- ✅ Auth checklist (if applicable)
- ✅ Risk assessment
- ✅ Audit hygiene

**Review SLA:**
- P0 fixes: Review within 2 hours
- P1 fixes: Review within 1 day
- P2/P3: Review within 2-3 days
- Features: Review within 1 week

**Approval requirements:**
- Normal PRs: 1 approval
- Breaking changes: 2 approvals
- Security fixes: Security team approval
- Database migrations: DBA approval

### Issue Communication

**Good issue comments:**

```markdown
✅ GOOD:

**Update:** Identified root cause - memory leak in WebRTC connection pool.

**Next steps:**
1. Create fix in PR #234
2. Add memory monitoring alerts
3. Backport to v6.0.x branch

ETA: Fix deployed by EOD Friday
```

```markdown
❌ BAD:

"Still looking into it"
"Maybe fixed?"
"Not sure yet"
```

**Communication guidelines:**
- Update issues every 2-3 days (at minimum)
- @ mention people when asking questions
- Use task lists for tracking progress
- Link to relevant PRs, commits, docs
- Provide ETAs when possible
- Share findings even if not solved

### Documentation Requirements

**Issues requiring docs updates:**
- New features → Update docs/
- API changes → Update OpenAPI spec
- Database changes → Update schema docs
- Deployment changes → Update DEPLOYMENT.md
- Breaking changes → Update MIGRATION_GUIDE.md

**Checklist:**
```markdown
- [ ] Code implemented
- [ ] Tests added
- [ ] Documentation updated
- [ ] Changelog entry added
- [ ] Issue marked as resolved
```

---

## Migration Plan

### Phase 1: Setup (Week 1)

#### Day 1-2: Label System

```bash
# 1. Backup current labels
gh label list --json name,color,description > labels-backup.json

# 2. Run setup script
chmod +x scripts/setup-labels.sh
./scripts/setup-labels.sh

# 3. Verify labels created
gh label list | grep "area:"
gh label list | grep "status:"
gh label list | grep "effort:"

# 4. Document in CONTRIBUTING.md
```

#### Day 3-4: Issue Templates

```bash
# 1. Add new templates
mkdir -p .github/ISSUE_TEMPLATE
cp templates/bug-report.yml .github/ISSUE_TEMPLATE/
cp templates/feature-request.yml .github/ISSUE_TEMPLATE/
cp templates/incident.yml .github/ISSUE_TEMPLATE/
cp templates/migration.yml .github/ISSUE_TEMPLATE/
cp templates/performance.yml .github/ISSUE_TEMPLATE/

# 2. Test templates
# Visit: https://github.com/mikeyoung304/July25/issues/new/choose

# 3. Commit and push
git add .github/ISSUE_TEMPLATE/
git commit -m "feat(github): add comprehensive issue templates"
git push
```

#### Day 5: Milestones

```bash
# 1. Create sprint milestone
gh api /repos/mikeyoung304/July25/milestones \
  -f title="Sprint 2025-11-11" \
  -f description="Current 2-week sprint" \
  -f due_on="2025-11-25T23:59:59Z"

# 2. Create quarterly milestone
gh api /repos/mikeyoung304/July25/milestones \
  -f title="Q4 2025" \
  -f description="Q4 roadmap items" \
  -f due_on="2025-12-31T23:59:59Z"

# 3. Verify created
gh api /repos/mikeyoung304/July25/milestones | jq '.[].title'
```

### Phase 2: Triage Existing Issues (Week 2)

#### Process:

```bash
# 1. Get all open issues
gh issue list --state open --limit 100 > open-issues.txt

# 2. For each issue, add labels:
gh issue edit <number> --add-label "area: voice-ordering,P1,effort: m"

# 3. Bulk triage script
cat > scripts/bulk-triage.sh <<'EOF'
#!/bin/bash
# Triage all open issues

for issue in $(gh issue list --state open --json number --jq '.[].number'); do
  echo "Triaging #$issue..."

  # Get issue details
  TITLE=$(gh issue view $issue --json title --jq '.title')
  BODY=$(gh issue view $issue --json body --jq '.body')

  # Auto-label based on title/body
  if echo "$TITLE $BODY" | grep -qi "voice\|webrtc"; then
    gh issue edit $issue --add-label "area: voice-ordering"
  fi

  if echo "$TITLE $BODY" | grep -qi "kds\|kitchen"; then
    gh issue edit $issue --add-label "area: kds"
  fi

  # Add to sprint if P0/P1
  LABELS=$(gh issue view $issue --json labels --jq '.labels[].name')
  if echo "$LABELS" | grep -q "P0\|P1"; then
    gh issue edit $issue --milestone "Sprint 2025-11-11"
  fi

  sleep 1  # Rate limiting
done
EOF

chmod +x scripts/bulk-triage.sh
./scripts/bulk-triage.sh
```

**Manual review:**
- Review auto-labeled issues
- Correct any mislabeled
- Add priority if missing
- Add effort estimates
- Assign owners

### Phase 3: Automation (Week 3)

```bash
# 1. Add workflow files
mkdir -p .github/workflows
cp workflows/auto-triage.yml .github/workflows/
cp workflows/sla-check.yml .github/workflows/
cp workflows/stale.yml .github/workflows/
cp workflows/auto-assign.yml .github/workflows/
cp workflows/milestone-automation.yml .github/workflows/

# 2. Configure auto-assignment
# Edit .github/workflows/auto-assign.yml
# Replace 'username1' etc. with actual GitHub usernames

# 3. Test workflows
git add .github/workflows/
git commit -m "feat(ci): add issue management automation"
git push

# 4. Trigger manually to test
gh workflow run auto-triage.yml
gh workflow run sla-check.yml
```

### Phase 4: Project Boards (Week 4)

**Option 1: GitHub Projects (Classic)**

```bash
# Create via UI (easier)
# Navigate to: https://github.com/mikeyoung304/July25/projects
# Click "New project" → "Project (classic)"
# Name: "Sprint Board"
# Add columns: Backlog, Todo, In Progress, In Review, Testing, Done
```

**Option 2: GitHub Projects (Beta)**

```bash
# Use GitHub CLI
gh project create --owner mikeyoung304 --title "Sprint Board"
```

**Manual setup:**
1. Create board
2. Add columns
3. Add automation rules
4. Add existing issues
5. Configure views (by assignee, priority, etc.)

### Phase 5: Team Rollout (Week 5)

#### Day 1: Documentation

```bash
# 1. Update CONTRIBUTING.md
cat >> CONTRIBUTING.md <<'EOF'

## Issue Management

### Creating Issues
- Use issue templates: https://github.com/mikeyoung304/July25/issues/new/choose
- Review label guide: ISSUE_MANAGEMENT_STRATEGY.md#label-system
- Check for duplicates first

### Issue Labels
- **Type:** What is it? (bug, feature, etc.)
- **Area:** Which component? (voice, kds, etc.)
- **Priority:** When to fix? (P0-P4)
- **Status:** Current state (triage, ready, in-progress, etc.)
- **Effort:** How much work? (xs, s, m, l, xl)

See full guide: [ISSUE_MANAGEMENT_STRATEGY.md](ISSUE_MANAGEMENT_STRATEGY.md)
EOF

# 2. Create quick reference card
cat > docs/ISSUE_QUICK_REFERENCE.md <<'EOF'
# Issue Management Quick Reference

## Creating Issues
1. Choose template: https://github.com/mikeyoung304/July25/issues/new/choose
2. Fill in all required fields
3. Submit (team will triage within 24h)

## Priority Definitions
- **P0**: Production down, fix in 24-48h
- **P1**: Major feature broken, fix in 1-2 weeks
- **P2**: Minor issue, fix in 1 month
- **P3**: Enhancement, no deadline

## Linking Issues
- In PR title: `fix(voice): resolve timeout (#145)`
- In PR body: `Closes #145`
- In commit: `git commit -m "fix: issue (closes #145)"`

## Getting Help
- Slack: #engineering
- Docs: /docs
- GitHub Discussions
EOF
```

#### Day 2: Team Training

**Training session agenda (1 hour):**

1. **Overview (10 min)**
   - Why we're doing this
   - Benefits for team
   - New processes

2. **Demo (20 min)**
   - Creating issues with templates
   - Using labels
   - Linking PRs to issues
   - Project board workflow

3. **Practice (20 min)**
   - Each person creates test issue
   - Practice labeling
   - Link to test PR
   - Move through board

4. **Q&A (10 min)**
   - Questions
   - Feedback
   - Adjustments needed

**Training materials:**
- Slides: Share this document
- Recording: Record session
- Cheat sheet: Print quick reference

#### Day 3-5: Monitoring and Adjustment

```bash
# Daily checks
gh issue list --label "status: triage"  # Should be low
gh issue list --label "P0"  # Review priority
gh workflow run sla-check.yml  # Check violations

# Weekly review
gh issue list --milestone "Sprint 2025-11-11"  # Sprint progress
gh api /repos/mikeyoung304/July25/milestones/1 | jq '.open_issues'  # Count
```

**Metrics to track:**
- Time to triage (goal: <24h)
- P0 resolution time (goal: <48h)
- Issues in triage >3 days (goal: 0)
- Sprint completion rate (goal: >80%)
- Label adoption rate (goal: 100%)

### Rollback Plan

If issues arise:

```bash
# 1. Restore old labels
gh label delete "area: voice-ordering" --yes
# ... delete new labels

cat labels-backup.json | jq -r '.[] | [.name, .color, .description] | @tsv' | \
  while IFS=$'\t' read name color desc; do
    gh label create "$name" --color "$color" --description "$desc" --force
  done

# 2. Remove templates
rm .github/ISSUE_TEMPLATE/{bug-report,feature-request,incident,migration,performance}.yml

# 3. Disable workflows
mv .github/workflows/auto-triage.yml .github/workflows/auto-triage.yml.disabled

# 4. Delete project boards
# Manual via UI

# 5. Communicate rollback to team
```

---

## Quick Reference

### Common Commands

```bash
# Create issue
gh issue create --title "Bug: ..." --body "..." --label "type: bug,P1"

# List issues
gh issue list --label P0
gh issue list --assignee @me
gh issue list --milestone "Sprint 2025-11-11"

# Edit issue
gh issue edit 145 --add-label "area: voice-ordering"
gh issue edit 145 --add-assignee username
gh issue edit 145 --milestone "Sprint 2025-11-11"

# Close issue
gh issue close 145 --comment "Fixed in #234"

# View issue
gh issue view 145

# Create PR linked to issue
gh pr create --title "fix(voice): timeout (#145)" --body "Closes #145"

# Create milestone
gh api /repos/mikeyoung304/July25/milestones \
  -f title="Sprint 2025-11-25" \
  -f due_on="2025-11-25T23:59:59Z"

# List milestones
gh api /repos/mikeyoung304/July25/milestones | jq '.[].title'

# Run workflow manually
gh workflow run auto-triage.yml
gh workflow run sla-check.yml
```

### Label Quick Reference

**Format:** `category: value`

| Category | Values |
|----------|--------|
| type | bug, feature, enhancement, refactoring, documentation, security, performance, incident, tech-debt |
| area | authentication, voice-ordering, kds, pos, payments, database, api, frontend, backend, deployment, testing |
| priority | P0, P1, P2, P3, P4 |
| status | triage, needs-info, ready, in-progress, blocked, needs-review, needs-testing, wontfix, duplicate |
| effort | xs (<1h), s (1-4h), m (4-8h), l (8-16h), xl (>16h) |

### Issue Template Selector

| Need | Template |
|------|----------|
| Report bug | `bug-report.yml` |
| Request feature | `feature-request.yml` |
| AI agent plan | `1-codex-plan.yml` |
| Small fix | `2-codex-fix.yml` |
| Dependencies | `3-dependency.yml` |
| Verify audit | `verification.yml` |
| Production incident | `incident.yml` |
| Database change | `migration.yml` |
| Slow performance | `performance.yml` |

### Priority Decision Tree

```
Is production down or data at risk?
├─ YES → P0
└─ NO → Is major feature broken?
    ├─ YES → P1
    └─ NO → Is minor feature broken?
        ├─ YES → P2
        └─ NO → Is it nice to have?
            ├─ YES → P3
            └─ NO → P4 (backlog)
```

### SLA Reference

| Priority | Response Time | Resolution Time |
|----------|--------------|-----------------|
| P0 | 2 hours | 24-48 hours |
| P1 | 1 day | 1-2 weeks |
| P2 | 2-3 days | 1 month |
| P3 | 1 week | When capacity allows |
| P4 | No SLA | No commitment |

---

## Appendix

### A. Glossary

- **Triage**: Initial review and categorization of new issues
- **Sprint**: 2-week development cycle
- **Milestone**: Collection of issues targeting specific goal/date
- **Label**: Metadata tag for categorization
- **SLA**: Service Level Agreement (time commitment)
- **Backlog**: Approved issues not yet in active sprint
- **Technical Debt**: Code quality issues from shortcuts
- **Breaking Change**: Update that requires client code changes
- **Postmortem**: Incident analysis document

### B. Related Documentation

- [CONTRIBUTING.md](/Users/mikeyoung/CODING/rebuild-6.0/CONTRIBUTING.md) - Contribution guidelines
- [docs/how-to/development/CI_CD_WORKFLOWS.md](/Users/mikeyoung/CODING/rebuild-6.0/docs/how-to/development/CI_CD_WORKFLOWS.md) - CI/CD automation
- [docs/how-to/development/DEVELOPMENT_PROCESS.md](/Users/mikeyoung/CODING/rebuild-6.0/docs/how-to/development/DEVELOPMENT_PROCESS.md) - Development workflows
- [docs/ROADMAP.md](/Users/mikeyoung/CODING/rebuild-6.0/docs/ROADMAP.md) - Product roadmap
- [.github/PULL_REQUEST_TEMPLATE.md](/Users/mikeyoung/CODING/rebuild-6.0/.github/PULL_REQUEST_TEMPLATE.md) - PR template

### C. Support and Feedback

**Questions?**
- GitHub Discussions: https://github.com/mikeyoung304/July25/discussions
- Slack: #engineering channel
- Email: engineering@example.com

**Feedback on this strategy?**
- Create issue: https://github.com/mikeyoung304/July25/issues/new
- Label it: `type: documentation, area: deployment`
- Title: "Issue Management Strategy Feedback"

### D. Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-11-07 | Initial creation | AI Assistant |

---

**Last Updated:** 2025-11-07
**Version:** 1.0.0
**Status:** Ready for Review
**Next Review:** 2025-12-07
