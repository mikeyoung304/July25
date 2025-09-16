# Documentation Index - Restaurant OS v6.0.4
Generated: 2025-01-15

## Root Documentation Files

| File | Last Modified | Status | Owner | Purpose |
|------|--------------|--------|-------|---------|
| README.md | 2025-09-15 | ACTIVE | Core Team | Main project readme |
| CLAUDE.md | 2025-09-15 | ACTIVE | AI/Dev | AI agent instructions |
| CHANGELOG.md | 2025-09-14 | ACTIVE | Core Team | Version history |
| CONTRIBUTING.md | 2025-08-31 | STALE (138 days) | Core Team | Contribution guidelines |
| PAYMENT_HARDENING_REPORT.md | 2025-09-15 | ACTIVE | Security | Payment security audit |
| SECURITY.md | 2025-08-31 | STALE (138 days) | Security | Security policies |

## Active Documentation (/docs)

### Core Documentation
| Path | Last Modified | Status | Category |
|------|--------------|--------|----------|
| AUTHENTICATION_MASTER.md | 2025-09-15 | ACTIVE | Auth |
| BASELINE_REALITY.md | 2025-09-15 | ACTIVE | Architecture |
| CRITICAL_WARNINGS.md | 2025-09-15 | ACTIVE | Operations |
| DOCS_INDEX.md | 2025-09-15 | ACTIVE | Meta |
| ORDER_FLOW.md | 2025-09-15 | ACTIVE | Business Logic |
| VOICE_SYSTEM_CURRENT.md | 2025-09-15 | ACTIVE | Voice |
| ACTUAL_DEPLOYMENT.md | 2025-09-15 | ACTIVE | DevOps |

### Architecture Decision Records (ADRs)
| ADR | Title | Last Modified | Status | Notes |
|-----|-------|--------------|--------|-------|
| ADR-001 | Authentication | 2025-09-14 | ACTIVE | |
| ADR-002 | Unified Backend | 2025-09-14 | ACTIVE | |
| ADR-003 | Cart Unification | 2025-09-14 | ACTIVE | |
| ADR-004 | Voice System Consolidation | 2025-09-14 | ACTIVE | |
| ADR-007 | Order Status Alignment | 2025-09-14 | ACTIVE | Duplicate number |
| ADR-007 | Unified Auth Normalization | 2025-09-14 | ACTIVE | **CONFLICT: Duplicate ADR number** |

### Feature Documentation
| Path | Last Modified | Status |
|------|--------------|--------|
| 03-features/kds-revolution.md | 2025-09-14 | ACTIVE |
| 03-features/kitchen-display.md | 2025-09-14 | ACTIVE |
| 03-features/voice-ordering.md | 2025-09-14 | ACTIVE |

### Voice System Documentation
| Path | Last Modified | Status | Inbound Refs |
|------|--------------|--------|--------------|
| voice/METRICS.md | 2025-09-15 | ACTIVE | Unknown |
| voice/RESTAURANT_VOICE_CONFIG_IMPLEMENTATION.md | 2025-09-15 | ACTIVE | Unknown |
| voice/restaurant-voice-config.md | 2025-09-15 | ACTIVE | Unknown |
| voice/TROUBLESHOOTING.md | 2025-09-14 | ACTIVE | CLAUDE.md |
| voice/VOICE_ORDER_FLOW_FIX.md | 2025-09-14 | ACTIVE | Unknown |
| voice/VOICE_ORDERING_EXPLAINED.md | 2025-09-14 | ACTIVE | Unknown |

### Bug Logs
| Path | Date | Status |
|------|------|--------|
| buglogs/voice-guard/20250915/* | 2025-09-16 | FRESH |
| buglogs/voice-session-config/20250915/* | 2025-09-15 | ACTIVE |
| buglogs/voice-require/* | 2025-09-15 | ACTIVE |

### Reports
| Path | Last Modified | Focus Area |
|------|--------------|------------|
| reports/DEFINITIVE_AUDIT_2025.md | 2025-09-14 | Full System |
| reports/VOICE_GAPS_CHECKLIST.md | 2025-09-14 | Voice System |
| reports/VOICE_SERVER_MODE_*.md | 2025-09-14 | Voice Server Mode |

### Reality Audit (2025-01-15)
| Path | Purpose |
|------|---------|
| reality-audit/2025-01-15/01_reality_matrix.md | System state mapping |
| reality-audit/2025-01-15/07_findings.md | Audit findings |
| reality-audit/2025-01-15/08_patch_plan.md | Fix strategy |
| reality-audit/2025-01-15/09_evidence_snippets.md | Supporting code |

### Operations & Development
| Path | Last Modified | Status |
|------|--------------|--------|
| 01-getting-started/installation.md | 2025-09-14 | ACTIVE |
| 05-operations/deployment.md | 2025-09-14 | ACTIVE |
| 05-operations/troubleshooting.md | 2025-09-14 | ACTIVE |
| 06-development/contributing.md | 2025-09-14 | ACTIVE |
| 06-development/known-issues.md | 2025-09-14 | ACTIVE |
| 06-development/setup.md | 2025-09-14 | ACTIVE |

### Admin Documentation
| Path | Last Modified | Purpose |
|------|--------------|---------|
| admin/chip-monkey-database-workaround.md | 2025-09-14 | Database fixes |
| admin/floor-plan-chip-monkey.md | 2025-09-14 | Floor plan management |

### API Documentation
| Path | Last Modified |
|------|--------------|
| api/API-REFERENCE.md | 2025-09-14 |
| api/README.md | 2025-09-14 |

## Archive Structure

### Recent Archives (2025-09-15)
- 35+ files archived
- Contains: Voice agent analysis, testing guides, system architecture

### Lockdown Archive (2025-01-15)
- 8 files
- Contains: Critical audit findings, production verification

### Historical Archives (2025-01-26, 2025-01-30, 2025-09-10)
- 150+ files total
- Multiple superseded versions
- Extensive voice system evolution history

## Module-Level Documentation

| Module | Path | Last Modified |
|--------|------|--------------|
| Client | client/README.md | 2025-09-14 |
| Server | server/README.md | 2025-09-14 |
| Shared | shared/README.md | 2025-08-31 (STALE) |
| Voice Module | client/src/modules/voice/README.md | 2025-09-14 |
| Kitchen Performance | client/src/modules/kitchen/PERFORMANCE-FIX.md | 2025-09-14 |

## Configuration & Scripts

| Path | Last Modified | Status |
|------|--------------|--------|
| config/guardrails.md | 2025-09-14 | ACTIVE |
| scripts/archive/2025-08-20/CLEANUP_SUMMARY.md | 2025-08-20 | STALE (149 days) |
| supabase/MIGRATION_GUIDE.md | 2025-08-31 | STALE (138 days) |

## Documentation Health Metrics

- **Total Documentation Files**: ~350+ markdown files
- **Active (< 30 days)**: ~50 files
- **Stale (> 90 days)**: ~200+ files (mostly in archives)
- **Orphan Risk**: High in archive directories
- **ADR Conflict**: ADR-007 has duplicate entries

## Critical Observations

1. **ADR Numbering Conflict**: Two different ADR-007 files exist
2. **Large Archive Volume**: 80% of docs are archived
3. **Missing ADRs**: Gap in numbering (005, 006 missing)
4. **Stale Core Files**: CONTRIBUTING.md, SECURITY.md need updates
5. **Voice Documentation Fragmentation**: Voice docs spread across multiple locations