# Documentation Drift Prevention

**Comprehensive Strategies to Maintain Documentation Health**

## Overview

This document details the prevention systems implemented after the November 2025 documentation crisis. These strategies transformed documentation health from 64.75/100 to 95/100 and maintain it automatically.

---

## 1. Automated Link Validation

### Implementation

**File**: `.github/workflows/check-links.yml`

**Triggers**:
```yaml
on:
  push:
    branches: [main]
    paths: ['docs/**/*.md', '*.md']
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 8 * * 1'  # Weekly Monday 8am UTC
  workflow_dispatch:
```

**What It Does**:
1. Runs `scripts/validate_links.py` on every PR
2. Extracts link health percentage
3. Comments on PR with status (  )
4. Blocks merge if health <90%
5. Creates weekly issues if problems found
6. Optional: Auto-fix and create PR

**Link Health Standards**:
-  95%+ - Excellent (merge allowed)
-  90-94% - Good (review recommended)
-  <90% - Poor (fixes required)

### Scripts Provided

#### validate_links.py
```bash
# Validate all internal links
python scripts/validate_links.py

# Output:
# Link health: 97.4%
# Broken links: 30
# Files affected: 5
```

**Features**:
- Scans all markdown files
- Validates internal relative links
- Checks anchor references
- Reports broken links by file
- Generates validation report

#### fix_broken_links.py
```bash
# Dry run (preview fixes)
python scripts/fix_broken_links.py --dry-run

# Apply fixes
python scripts/fix_broken_links.py

# Custom report
python scripts/fix_broken_links.py --report=custom_report.md
```

**Features**:
- Builds file location cache
- Intelligent path resolution
- Confidence scoring (minimum 3/10)
- Preserves anchors
- Comprehensive reporting

### Usage

**In Pull Requests**:
```markdown
##  Documentation Link Check

**Link Health:** 97.4%
**Broken Links:** 2

 Some broken links detected. Please review:
- docs/PRODUCTION_STATUS.md: 2 broken links
  - `./old-path/FILE.md` (line 45)
  - `./moved/DOCUMENT.md` (line 67)

Run `python scripts/validate_links.py` locally for details.
```

**Weekly Scheduled**:
```markdown
# Weekly Docs Check: 5 broken links found

The automated weekly documentation check found issues:

- **Link Health:** 96.2%
- **Broken Links:** 5

### Action Required
1. Run `python scripts/validate_links.py` locally
2. Run `python scripts/fix_broken_links.py` to auto-fix
3. Manually fix any remaining issues
4. Commit fixes to improve link health
```

---

## 2. API Documentation Generation

### Current State (Manual)

**Process**:
1. Developer updates route code
2. Developer manually updates OpenAPI spec
3.  Often forgotten
4.  Leads to API drift (42% accuracy crisis)

### Future State (Automated)

**Implementation Plan**:

```typescript
// server/src/routes/orders.routes.ts
import { api, ApiParam, ApiResponse } from '@rebuild/api-docs';

@api.post('/api/v1/orders')
@api.summary('Create a new order')
@api.tag('orders')
@ApiParam('restaurantId', 'string', 'Restaurant UUID', { required: true })
@ApiParam('items', 'array', 'Order items', { required: true })
@ApiResponse(201, 'Order', 'Order created successfully')
@ApiResponse(400, 'Error', 'Validation failed')
@ApiResponse(401, 'Error', 'Unauthorized')
export async function createOrder(req: Request, res: Response) {
  // Implementation
}
```

**Benefits**:
- Single source of truth (code)
- Automatic OpenAPI generation
- Impossible for docs to drift
- Refactoring updates docs automatically
- TypeScript ensures type safety

**Build Script**:
```typescript
// scripts/generate-openapi.ts
import { extractRoutes } from '@rebuild/api-docs';
import { generateOpenAPI } from '@rebuild/openapi-generator';
import packageJson from '../package.json';

async function generate() {
  const routes = await extractRoutes('./server/src/routes/**/*.ts');

  const spec = generateOpenAPI(routes, {
    version: packageJson.version,
    title: 'Restaurant OS API',
    basePath: '/api/v1'
  });

  await fs.writeFile('docs/reference/api/openapi.yaml', yaml.stringify(spec));
  console.log(' OpenAPI spec generated');
}
```

**CI/CD Integration**:
```yaml
# .github/workflows/api-docs.yml
name: Generate API Documentation

on:
  push:
    branches: [main]
    paths: ['server/src/routes/**']

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate OpenAPI
        run: npm run generate-openapi
      - name: Commit if changed
        run: |
          if [ -n "$(git status --porcelain)" ]; then
            git config user.name "github-actions[bot]"
            git add docs/reference/api/openapi.yaml
            git commit -m "docs: auto-generate OpenAPI specification"
            git push
          fi
```

### Interim Manual Process

**Until automated generation is implemented**:

**PR Checklist**:
```markdown
## API Changes Checklist

- [ ] Added/updated OpenAPI spec for changed endpoints
- [ ] Added request/response examples
- [ ] Updated authentication requirements
- [ ] Added error response codes
- [ ] Tested endpoint matches documentation
- [ ] Updated CHANGELOG.md with API changes
```

**Validation Script**:
```bash
# Compare documented vs actual endpoints
npm run validate-api-docs

# Output:
#  58 endpoints match
#  4 endpoints missing from docs:
#   - POST /api/v1/auth/station-login
#   - GET /api/v1/realtime/health
#   - ...
```

---

## 3. ADR Requirements

### When to Create an ADR

**Required ADR Criteria** (any one triggers):
- Implementation effort >4 hours
- Affects multiple modules/services
- Changes public API contract
- Impacts security or compliance
- Introduces new dependencies
- Changes architectural patterns
- Affects performance significantly

**Examples**:
-  ADR Required: Dual authentication pattern
-  ADR Required: Remote-first database approach
-  ADR Required: Client-side voice ordering
-  ADR Not Required: Renaming a function
-  ADR Not Required: Fixing a bug
-  ADR Not Required: Updating a dependency

### ADR Template

**Location**: `docs/explanation/architecture-decisions/ADR-XXX-[title].md`

**Template Structure**:
```markdown
# ADR-XXX: [Decision Title]

**Status**: PROPOSED | ACCEPTED | DEPRECATED | SUPERSEDED
**Date**: YYYY-MM-DD
**Deciders**: [Names/Roles]
**Related**: [Links to related ADRs]

---

## Context

What problem are we solving?
What constraints exist?
What forces are at play?

## Decision

What did we decide to do?
Be specific and actionable.

## Consequences

### Positive
- What benefits does this provide?

### Negative
- What drawbacks or costs?

### Neutral
- What changes but is neither good nor bad?

## Alternatives Considered

What other options did we evaluate?
Why were they rejected?

## Implementation Notes

How is this decision implemented?
Link to code examples.

## Review Date

When should we revisit this decision?
```

### ADR Process

**1. Proposal Phase**:
```markdown
Status: PROPOSED
Date: When proposed

Discussion:
- What are we trying to solve?
- What are the options?
- What are the tradeoffs?
```

**2. Review Phase**:
- Present in architecture review meeting
- Gather feedback
- Update based on input
- Require 2+ architect approvals

**3. Acceptance Phase**:
```markdown
Status: ACCEPTED
Date: When accepted
Deciders: [List of approvers]
```

**4. Implementation**:
- Create implementation PR
- Link PR to ADR
- Update ADR with implementation details

**5. Maintenance**:
- Review annually
- Update if decision changes
- Deprecate if superseded

### ADR Index

**Create**: `docs/explanation/architecture-decisions/README.md`

```markdown
# Architecture Decision Records

## Active ADRs

| ID | Title | Date | Status |
|----|-------|------|--------|
| ADR-001 | Snake Case Convention | 2025-07 | ACCEPTED |
| ADR-002 | Multi-Tenancy Architecture | 2025-07 | ACCEPTED |
| ADR-011 | Authentication Evolution | 2025-11 | ACCEPTED |

## Deprecated ADRs

| ID | Title | Date | Superseded By |
|----|-------|------|---------------|
| ADR-010 | JWT Payload Standards | 2025-10 | ADR-011 |

## How to Create an ADR

1. Copy template from `ADR-TEMPLATE.md`
2. Number sequentially (next available)
3. Fill out all sections
4. Set status to PROPOSED
5. Present in architecture review
6. Get 2+ approvals
7. Update status to ACCEPTED
8. Implement decision
```

---

## 4. Stale Documentation Detection

### Automated Staleness Script

**File**: `scripts/update_stale_docs.py`

**Features**:
1. Find docs with timestamps >30 days old
2. Identify outdated version references
3. Detect deprecated API paths
4. Find security issues (like VITE_OPENAI_API_KEY)
5. Update timestamps
6. Dry-run mode for safety

**Usage**:
```bash
# Dry run (preview changes)
python scripts/update_stale_docs.py --dry-run

# Apply updates
python scripts/update_stale_docs.py

# Update specific files
python scripts/update_stale_docs.py --files docs/README.md docs/API.md
```

**What It Fixes**:
- Version numbers (v6.0.8 → v6.0.14)
- API paths (/payments/process → /payments/create)
- Security issues (removes dangerous env vars)
- Feature status (marks planned features as PLANNED)
- Timestamps (updates to current date)

### CI/CD Staleness Detection

**File**: `.github/workflows/docs-validation.yml`

**Staleness Check**:
```yaml
- name: Check Documentation Timestamps
  run: |
    current_date=$(date +%Y-%m-%d)
    thirty_days_ago=$(date -d '30 days ago' +%Y-%m-%d)

    find docs -name "*.md" -type f | while read file; do
      if grep -q "Last Updated:" "$file"; then
        last_updated=$(grep "Last Updated:" "$file" | head -1 | sed 's/.*Last Updated: *//' | cut -d' ' -f1)

        if [[ "$last_updated" < "$thirty_days_ago" ]]; then
          echo " STALE: $file (Last updated: $last_updated)"
          # Create issue or comment on PR
        fi
      fi
    done
```

### Documentation Freshness Targets

| Doc Type | Target Freshness | Review Frequency |
|----------|------------------|------------------|
| API docs | <14 days | Every release |
| Core architecture | <30 days | Monthly |
| How-to guides | <60 days | Quarterly |
| Explanation | <90 days | Bi-annually |
| Archive | No limit | N/A |

### Timestamp Standards

**Format**: `Last Updated: YYYY-MM-DD`

**Placement**: At top of document after title

**Example**:
```markdown
# Feature Documentation

**Last Updated**: 2025-11-19

## Overview
...
```

**Update Triggers**:
- Content changes (always)
- Link fixes (if substantial)
- Validation review (even if no changes)
- Version updates
- Related code changes

---

## 5. Post-Mortem Templates

### When to Create a Post-Mortem

**Required for**:
- P0 (Critical): Always
- P1 (High): Always
- P2 (Medium): If >1 hour downtime or affects customers
- P3 (Low): Optional

**Not Required for**:
- Bug fixes without incident
- Planned maintenance
- Minor issues with no customer impact

### Post-Mortem Template

**Location**: `docs/templates/post-mortem.md`

**Process**:
1. **Within 24 hours**: Create draft
2. **Within 48 hours**: Hold blameless review meeting
3. **Within 1 week**: Complete post-mortem
4. **Within 2 weeks**: Complete action items

**Template Sections**:
```markdown
# Post-Mortem: [Incident Title]

**Incident ID**: INC-YYYY-MM-DD-###
**Date**: YYYY-MM-DD
**Duration**: XX hours XX minutes
**Severity**: P0 | P1 | P2 | P3

## Impact
- Users affected
- Services affected
- Revenue impact

## Timeline
| Time | Event |
|------|-------|

## Root Cause (5 Whys)
1. Why? [Answer]
2. Why? [Answer]
3. Why? [Root cause]

## Action Items
- [ ] Immediate (24h)
- [ ] Short-term (1 week)
- [ ] Long-term (1 month)

## Lessons Learned
- Technical
- Process
- Communication

## Prevention Measures
- Monitoring
- Testing
- Documentation
- Process changes
```

### Action Item Tracking

**GitHub Issue Template**:
```markdown
---
name: Post-Mortem Action Item
about: Track action items from incident post-mortems
title: '[PM-xxx] Action: [Brief description]'
labels: post-mortem, action-item
---

## From Post-Mortem

**Incident**: INC-YYYY-MM-DD-### [Link to post-mortem]
**Priority**: Immediate | Short-term | Long-term
**Due Date**: YYYY-MM-DD

## Action

[Specific action to take]

## Acceptance Criteria

- [ ] [Specific outcome]
- [ ] [Measurable result]
- [ ] Documentation updated

## Related

- Related PRs:
- Related issues:
```

---

## 6. Migration Checklists

### Database Migration Checklist

**Location**: `docs/templates/migration-checklist.md`

**Documentation Section**:
```markdown
## Documentation Updates

### Pre-Migration
- [ ] Document migration rationale
- [ ] List affected tables/columns
- [ ] Document breaking changes
- [ ] Create rollback plan

### Schema Documentation
- [ ] Update DATABASE.md with new schema
- [ ] Regenerate Prisma schema docs
- [ ] Update ERD diagrams
- [ ] Update type definitions in shared package

### API Documentation
- [ ] Update OpenAPI if endpoints affected
- [ ] Update request/response examples
- [ ] Document new query parameters
- [ ] Update error codes

### Application Documentation
- [ ] Update affected feature documentation
- [ ] Update integration guides
- [ ] Add migration notes to CHANGELOG.md
- [ ] Update version compatibility matrix

### Post-Migration
- [ ] Verify documentation accuracy
- [ ] Update "Last Updated" timestamps
- [ ] Announce migration in release notes
```

### Feature Checklist

**Location**: `docs/templates/feature-checklist.md`

**Documentation Section**:
```markdown
## Documentation

### Planning
- [ ] Create feature specification document
- [ ] Add to product roadmap
- [ ] Create ADR if architectural decision

### Development
- [ ] Update API documentation (OpenAPI)
- [ ] Add code examples
- [ ] Document configuration options
- [ ] Update environment variable docs

### Testing
- [ ] Document testing approach
- [ ] Create test data setup guide
- [ ] Document edge cases

### Pre-Launch
- [ ] Create user-facing documentation
- [ ] Update README.md features list
- [ ] Add to CHANGELOG.md
- [ ] Create how-to guides

### Post-Launch
- [ ] Gather feedback on documentation
- [ ] Update based on common questions
- [ ] Create troubleshooting guide
```

---

## 7. Continuous Monitoring

### Documentation Health Dashboard

**Metrics to Track**:
1. Link health percentage
2. API documentation accuracy
3. Documentation freshness
4. ADR coverage
5. Post-mortem completion rate

**Dashboard Structure**:
```markdown
# Documentation Health Dashboard

**Last Updated**: 2025-11-19

## Current Status:  HEALTHY

### Link Health
- **Current**: 97.4% (30 broken out of 1,156)
- **Target**: ≥95%
- **Trend**: ↗️ Improving (was 63% on Nov 18)

### API Documentation
- **Accuracy**: 95% (59 of 62 endpoints)
- **Target**: ≥95%
- **Missing**: 3 endpoints (webhooks)

### Documentation Freshness
- **<30 days**: 85% (136 of 160 files)
- **Target**: ≥90%
- **Stale (>60 days)**: 8 files

### ADR Coverage
- **Total ADRs**: 11
- **Active**: 10
- **Deprecated**: 1
- **Coverage**: Good (all major decisions documented)

### Post-Mortems
- **Required**: 3 incidents (P0-P2)
- **Completed**: 3 (100%)
- **Action Items**: 12 total, 8 complete
```

### Weekly Review Process

**Every Monday 8am UTC** (automated):
1. Run link validation
2. Check API documentation
3. Scan for stale docs
4. Generate health report
5. Create issues for problems
6. Send summary to team

**Review Checklist**:
```markdown
## Weekly Documentation Review

- [ ] Check link health (target: ≥95%)
- [ ] Review new broken links
- [ ] Check for stale documentation (>30 days)
- [ ] Verify API documentation current
- [ ] Review new ADRs
- [ ] Check post-mortem completion
- [ ] Update dashboard
- [ ] Create action items
```

### Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Link Health | <95% | <90% |
| API Accuracy | <95% | <85% |
| Stale Docs | >10% >60 days | >20% >60 days |
| Broken Links | >50 | >100 |

**Alert Actions**:
- Warning: Create GitHub issue
- Critical: Block PR merges + alert team

---

## 8. PR Documentation Checklist

### Pull Request Template

**File**: `.github/pull_request_template.md`

```markdown
## Documentation Checklist

Please review this checklist before submitting your PR:

### Code Changes
- [ ] API changes: OpenAPI spec updated
- [ ] New feature: Added to README.md features list
- [ ] Breaking change: CHANGELOG.md entry added
- [ ] New environment variable: Updated .env.example and ENVIRONMENT.md
- [ ] Database change: Schema documentation updated

### Architecture
- [ ] Significant decision: ADR created (>4 hours work or affects multiple modules)
- [ ] Pattern change: Architecture docs updated
- [ ] Security impact: Security documentation updated

### Testing & Validation
- [ ] Links validated: No broken links introduced (run `python scripts/validate_links.py`)
- [ ] Examples tested: Code examples compile and run
- [ ] Documentation reviewed: No typos or unclear sections

### Review
- [ ] Documentation review requested: @docs-team
- [ ] All checkboxes completed or N/A explained below

## Documentation Changes

List documentation files changed:
- [ ] docs/...
- [ ] README.md
- [ ] CHANGELOG.md

## Notes

If any checkbox above is unchecked, explain why:
```

### Review Guidelines

**For Code Reviewers**:
1. Check that documentation checklist is complete
2. Verify API docs if endpoints changed
3. Validate links if documentation modified
4. Request ADR if architectural decision not documented
5. Check CHANGELOG.md for user-facing changes

**For Documentation Reviewers**:
1. Verify accuracy against code
2. Check for broken links
3. Validate examples
4. Check formatting and clarity
5. Verify timestamps updated

---

## 9. Automation Scripts Reference

### Link Validation

```bash
# Validate all links
python scripts/validate_links.py

# Validate specific directory
python scripts/validate_links.py --path docs/reference/

# Generate detailed report
python scripts/validate_links.py --report detailed

# Exit code 0 if healthy (≥95%), 1 if unhealthy
```

### Link Repair

```bash
# Dry run (preview fixes)
python scripts/fix_broken_links.py --dry-run

# Apply fixes
python scripts/fix_broken_links.py

# Custom report location
python scripts/fix_broken_links.py --report link_repair_report.md
```

### Stale Documentation Update

```bash
# Find stale docs
python scripts/update_stale_docs.py --scan

# Dry run updates
python scripts/update_stale_docs.py --dry-run

# Apply updates
python scripts/update_stale_docs.py

# Update specific issues
python scripts/update_stale_docs.py --fix-versions --fix-api-paths
```

### Version Synchronization

```bash
# Bump version (planned)
./scripts/bump-version.sh 6.0.15

# Updates:
# - package.json
# - README.md
# - SECURITY.md
# - OpenAPI spec
# - Creates git tag
# - Updates docs/meta/SOURCE_OF_TRUTH.md
```

### API Validation

```bash
# Compare docs to actual routes (planned)
npm run validate-api-docs

# Generate OpenAPI from code (planned)
npm run generate-openapi

# Test API against OpenAPI spec (planned)
npm run test-api-spec
```

---

## 10. Success Metrics

### Target Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Link Health** | ≥95% | 97.4% |  Exceeds |
| **API Accuracy** | ≥95% | 95% |  Meets |
| **Doc Freshness** | ≥90% <30 days | ~85% |  Near |
| **Version Consistency** | 100% | 100% |  Meets |
| **Broken Links** | <50 | 30 |  Exceeds |
| **ADR Coverage** | 100% major decisions | 100% |  Meets |
| **Post-Mortem Rate** | 100% P0-P2 | 100% |  Meets |

### Leading Indicators (Predict Problems)

**Good Health**:
-  PRs include documentation updates (>90%)
-  Link validation passes consistently (>95%)
-  Weekly checks report 0 issues
-  No doc-related support tickets
-  ADRs created for all major decisions

**Warning Signs**:
-  PRs merging without doc updates (>10%)
-  Link health dropping below 95%
-  Timestamps >60 days increasing
-  Multiple documentation issues created
-  Questions about "why we do X"

**Critical Alerts**:
-  Link health below 90%
-  API accuracy below 90%
-  Security documentation incorrect
-  Version references inconsistent
-  Post-mortems incomplete

### Maintenance Cost

**Weekly** (automated):
- CI/CD validation: <1 minute
- Scheduled link check: <5 minutes
- Total: **~5 minutes/week**

**Monthly** (manual):
- Review outstanding issues: 1 hour
- Update roadmap: 30 minutes
- Audit API docs: 1 hour
- Total: **~2.5 hours/month**

**Quarterly** (manual):
- Full link audit: 2 hours
- Accuracy audit: 4 hours (1 day)
- Architecture review: 2 hours
- Total: **~8 hours/quarter**

**Annual Cost**: ~38 hours/year

**Prevented Cost**: ~160 hours/year (emergency repairs)

**ROI**: 4.2x return on investment

---

## Key Takeaways

1. **Automation prevents 90%+ of drift**: CI/CD catches problems immediately
2. **Process prevents the rest**: PR checklist, ADR requirements, templates
3. **Monitoring enables early intervention**: Weekly checks catch issues before crisis
4. **Templates ensure consistency**: Post-mortems, migrations, ADRs
5. **Cost of prevention << Cost of repair**: 38 hours prevention vs 160 hours repair

**Bottom Line**: Documentation health is maintainable with the right systems. The Restaurant OS prevention system costs ~45 minutes/week and prevents ~3 hours/week of emergency repairs.

---

## Related Documentation

- [README.md](./README.md) - Overview and crisis timeline
- [PATTERNS.md](./PATTERNS.md) - Drift patterns to recognize
- [INCIDENTS.md](./INCIDENTS.md) - Historical incidents
- [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Quick checklist
- [AI-AGENT-GUIDE.md](./AI-AGENT-GUIDE.md) - AI agent guidelines
