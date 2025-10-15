# Documentation Stragglers Analysis

**Repository:** rebuild-6.0
**Branch:** docs/refresh-v6.0.8
**Generated:** 2025-10-15T20:42:10.672Z

## Summary

- **Total Markdown files found:** 101
- **Accounted (core docs):** 14
- **Stragglers to review:** 67

## Overview Table

| Path | Title | Last Commit | Size/Words | Flags | Overlap | Action |
|------|-------|-------------|------------|-------|---------|--------|
| .github/PULL_REQUEST_TEMPLATE.md | PULL_REQUEST_TEMPLATE | 7bfd165 (2025-09-20) | 248B / 31w | ✓ | None obvious | Review |
| ARCHITECTURE.md | Architecture | ae96327 (2025-09-02) | 670B / 100w | ✓ | ROADMAP.md / PRODUCTION_STA... | Review |
| AUTH_DIAGNOSTIC_GUIDE.md | Auth Diagnostic Guide - Server Login ... | 101650f (2025-10-09) | 3934B / 527w | ✓ | DEPLOYMENT.md | Review |
| client/src/modules/kitchen/PERFORMANCE-FIX.md | Kitchen Display Performance Optimization | e212d23 (2025-08-12) | 2529B / 331w | ✓ | DEPLOYMENT.md | Review |
| docs/ADR-001-snake-case-convention.md | ADR-001: Adopt snake_case Convention ... | 758a670 (2025-10-12) | 7485B / 958w | ⚠️ 1 | DEPLOYMENT.md | Keep (ADR/historical) |
| docs/ADR-002-multi-tenancy-architecture.md | ADR-002: Multi-Tenancy Architecture w... | 60d4dd1 (2025-10-13) | 14998B / 1858w | ✓ | DEPLOYMENT.md | Keep (ADR/historical) |
| docs/ADR-003-embedded-orders-pattern.md | ADR-003: Embedded Orders Pattern (JSO... | 60d4dd1 (2025-10-13) | 18027B / 2347w | ✓ | KDS_ORDER_FLOW.md / TROUBLE... | Keep (ADR/historical) |
| docs/ADR-004-websocket-realtime-architecture.md | ADR-004: WebSocket Real-Time Architec... | 60d4dd1 (2025-10-13) | 19188B / 2311w | ✓ | DEPLOYMENT.md | Keep (ADR/historical) |
| docs/ADR-005-client-side-voice-ordering.md | ADR-005: Client-Side Voice Ordering w... | 60d4dd1 (2025-10-13) | 22441B / 2586w | ✓ | SECURITY.md / AUTHENTICATIO... | Keep (ADR/historical) |
| docs/AGENTS.md | AGENTS.md — Agent & Human Operator Guide | 0a6ebd2 (2025-09-26) | 1371B / 192w | ✓ | SECURITY.md / AUTHENTICATIO... | Review/Merge → SECURITY.md / AUTHENTICATION_ARCHITECTURE.md |
| docs/ARCHITECTURE.md | Architecture Overview | 7bfd165 (2025-09-20) | 877B / 101w | ✓ | SECURITY.md / AUTHENTICATIO... | Review/Merge → SECURITY.md / AUTHENTICATION_ARCHITECTURE.md |
| docs/CONTRIBUTING.md | Contributing to Restaurant OS | 0a6ebd2 (2025-09-26) | 5103B / 731w | ✓ | DEPLOYMENT.md | Review/Merge → DEPLOYMENT.md |
| docs/DOCUMENTATION_STANDARDS.md | Documentation Standards | 0a6ebd2 (2025-09-26) | 6124B / 831w | ✓ | SECURITY.md / AUTHENTICATIO... | Review/Merge → SECURITY.md / AUTHENTICATION_ARCHITECTURE.md |
| docs/KDS-BIBLE.md | 🚨 THE DIGITAL KITCHEN DISPLAY BIBLE 🚨 | 6be325f (2025-09-01) | 12317B / 1714w | ✓ | DEPLOYMENT.md | Review/Merge → DEPLOYMENT.md |
| docs/MENU_SYSTEM.md | Menu System Architecture | 758a670 (2025-10-12) | 14394B / 1771w | ✓ | ROADMAP.md / PRODUCTION_STA... | Review/Merge → ROADMAP.md / PRODUCTION_STATUS.md |
| docs/MIGRATION_V6_AUTH.md | Migration Guide: Authentication v6.0 | 93055bc (2025-10-08) | 9412B / 1225w | ✓ | DEPLOYMENT.md | Review/Merge → DEPLOYMENT.md |
| docs/ORDER_FLOW.md | Order Flow Documentation | 758a670 (2025-10-12) | 21708B / 2290w | ✓ | SECURITY.md / AUTHENTICATIO... | Review/Merge → SECURITY.md / AUTHENTICATION_ARCHITECTURE.md |
| docs/POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md | Post-Mortem: Square Payment Integrati... | 78426a1 (2025-10-14) | 12717B / 1616w | ✓ | DEPLOYMENT.md | Review/Merge → DEPLOYMENT.md |
| docs/PRODUCTION_DIAGNOSTICS.md | 🚨 PRODUCTION SYSTEM DIAGNOSTIC REPORT | 7c13ef5 (2025-09-27) | 7501B / 903w | ✓ | DEPLOYMENT.md | Review/Merge → DEPLOYMENT.md |
| docs/SQUARE_INTEGRATION.md | Square Payment Integration | 41ff6c0 (2025-10-14) | 25491B / 2805w | ✓ | DEPLOYMENT.md | Review/Merge → DEPLOYMENT.md |
| docs/voice/VOICE_ORDERING_EXPLAINED.md | Voice Ordering Magic Explained 🎙️ | 6be325f (2025-09-01) | 13771B / 1637w | ✓ | ROADMAP.md / PRODUCTION_STA... | Review/Merge → ROADMAP.md / PRODUCTION_STATUS.md |
| docs/WEBSOCKET_EVENTS.md | WebSocket Events Documentation | 0a6ebd2 (2025-09-26) | 7386B / 829w | ✓ | DEPLOYMENT.md | Review/Merge → DEPLOYMENT.md |
| KITCHEN_DISPLAY_UPGRADE.md | Kitchen Display System - v6.0 Upgrade | 7fda07a (2025-10-10) | 11166B / 1513w | ✓ | DEPLOYMENT.md | Review |
| KITCHEN_FIX_SUMMARY.md | Kitchen Display Fix Summary | 7fda07a (2025-10-10) | 7249B / 972w | ✓ | DEPLOYMENT.md | Review |
| reports/00_context.md | PHASE 0: PERMISSIONS & CONTEXT CHECK ... | f4fbd81 (2025-09-24) | 3242B / 451w | ✓ | DEPLOYMENT.md | Keep (historical) |
| reports/01_static-health.md | PHASE 1: STATIC HEALTH REPORT | f4fbd81 (2025-09-24) | 4726B / 665w | ✓ | DEPLOYMENT.md | Keep (historical) |
| reports/02_naming-alignment.md | PHASE 2: NAMING & SCHEMA ALIGNMENT RE... | f4fbd81 (2025-09-24) | 5971B / 760w | ✓ | SECURITY.md / AUTHENTICATIO... | Keep (historical) |
| reports/03_security-auth.md | PHASE 3: SECURITY & AUTH RAILS REPORT | f4fbd81 (2025-09-24) | 7021B / 958w | ✓ | DEPLOYMENT.md | Keep (historical) |
| reports/04_order-flow.md | PHASE 4: ORDER FLOW DEEP WALK REPORT | f4fbd81 (2025-09-24) | 7237B / 950w | ✓ | KDS_ORDER_FLOW.md / TROUBLE... | Keep (historical) |
| reports/05_ai-bloat.md | PHASE 5: AI & VOICE LAYER BLOAT AUDIT... | f4fbd81 (2025-09-24) | 7535B / 1006w | ✓ | DEPLOYMENT.md | Keep (historical) |
| reports/07_refactor-queue.md | PHASE 7: TECH DEBT & REFACTOR QUEUE | f4fbd81 (2025-09-24) | 8630B / 1241w | ✓ | DEPLOYMENT.md | Keep (historical) |
| reports/BLACKLIGHT-changemap.md | BLACKLIGHT Change Map - Auth & Paymen... | 1f332e5 (2025-08-30) | 9415B / 947w | ✓ | DEPLOYMENT.md | Keep (historical) |
| reports/BLACKLIGHT-e2e-audit.md | BLACKLIGHT E2E Security & Quality Aud... | 1f332e5 (2025-08-30) | 8541B / 1090w | ✓ | DEPLOYMENT.md | Keep (historical) |
| reports/EXECUTIVE_SUMMARY.md | 🌙 JULY25 NIGHT AUDIT - EXECUTIVE SUM... | f4fbd81 (2025-09-24) | 8067B / 1140w | ✓ | DEPLOYMENT.md | Keep (historical) |
| reports/LINT-BURNDOWN.md | ESLint Burndown Report | 54fbda0 (2025-08-31) | 2182B / 291w | ✓ | ROADMAP.md / PRODUCTION_STA... | Keep (historical) |
| reports/RCTX_STABILIZATION_SUMMARY.md | RCTX Stabilization Summary | 5ef0d38 (2025-09-12) | 2927B / 381w | ✓ | DEPLOYMENT.md | Keep (historical) |
| reports/TS-BURNDOWN.md | TypeScript Error Burndown Report | fc1e145 (2025-08-31) | 4804B / 751w | ✓ | KDS_ORDER_FLOW.md / TROUBLE... | Keep (historical) |
| scans/agents/agent-1-multi-tenancy-guardian.md | Agent 1: Multi-Tenancy Guardian | 7172fef (2025-10-14) | 8727B / 1196w | ✓ | SECURITY.md / AUTHENTICATIO... | Keep (historical) |
| scans/agents/agent-2-convention-enforcer.md | Agent 2: Convention Enforcer | 7172fef (2025-10-14) | 10693B / 1454w | ✓ | DATABASE.md | Keep (historical) |
| scans/agents/agent-3-race-condition-detective.md | Agent 3: Race Condition Detective | 7172fef (2025-10-14) | 12788B / 1743w | ✓ | DEPLOYMENT.md | Keep (historical) |
| scans/agents/agent-4-security-auditor.md | Agent 4: Security Auditor | 7172fef (2025-10-14) | 13922B / 1939w | ✓ | SECURITY.md / AUTHENTICATIO... | Keep (historical) |
| scans/agents/agent-5-performance-profiler.md | Agent 5: Performance Profiler | 7172fef (2025-10-14) | 16113B / 2175w | ✓ | DEPLOYMENT.md | Keep (historical) |
| scans/agents/agent-6-complexity-analyzer.md | Agent 6: Complexity Analyzer | 7172fef (2025-10-14) | 18032B / 2333w | ✓ | KDS_ORDER_FLOW.md / TROUBLE... | Keep (historical) |
| scans/AUTH_FIX_REPORT.md | Demo User Authentication Fix Report | 5d37cc7 (2025-10-15) | 10639B / 1420w | ✓ | DEPLOYMENT.md | Keep (historical) |
| scans/COMPLETED_WORK_SUMMARY.md | Completed Work Summary - Kitchen Disp... | 5d37cc7 (2025-10-15) | 11285B / 1511w | ✓ | DEPLOYMENT.md | Keep (historical) |
| scans/DIAGNOSTIC_REPORT.md | Restaurant OS Login Diagnostic Report | 5d37cc7 (2025-10-15) | 16345B / 1955w | ✓ | DEPLOYMENT.md | Keep (historical) |
| scans/otherscan.md | 🔥 COMPREHENSIVE CODEBASE AUDIT REPORT | 5d37cc7 (2025-10-15) | 52157B / 6862w | ✓ | DEPLOYMENT.md | Keep (historical) |
| scans/reports/2025-10-14-22-02-28/complexity-analyzer.md | Complexity Analyzer - Scan Report | 7172fef (2025-10-14) | 26126B / 3251w | ✓ | DEPLOYMENT.md | Keep (historical) |
| scans/reports/2025-10-14-22-02-28/convention-enforcer.md | Convention Enforcer - Scan Report | 7172fef (2025-10-14) | 15420B / 1877w | ✓ | ROADMAP.md / PRODUCTION_STA... | Keep (historical) |
| scans/reports/2025-10-14-22-02-28/EXECUTIVE_SUMMARY.md | Security Audit - Executive Summary | 7172fef (2025-10-14) | 7471B / 1069w | ⚠️ 2 | DEPLOYMENT.md | Keep (historical) |
| scans/reports/2025-10-14-22-02-28/EXECUTIVE-SUMMARY.md | Overnight Code Scan - Executive Summary | 7172fef (2025-10-14) | 16273B / 2280w | ⚠️ 2 | DEPLOYMENT.md | Keep (historical) |
| scans/reports/2025-10-14-22-02-28/INDEX.md | ADR-001 Convention Enforcement Scan | 7172fef (2025-10-14) | 5410B / 690w | ✓ | ROADMAP.md / PRODUCTION_STA... | Keep (historical) |
| scans/reports/2025-10-14-22-02-28/multi-tenancy-guardian.md | Multi-Tenancy Guardian - Scan Report | 7172fef (2025-10-14) | 12726B / 1493w | ✓ | DEPLOYMENT.md | Keep (historical) |
| scans/reports/2025-10-14-22-02-28/performance-index.md | Performance Profiler - Index | 7172fef (2025-10-14) | 3101B / 455w | ✓ | DEPLOYMENT.md | Keep (historical) |
| scans/reports/2025-10-14-22-02-28/performance-profiler.md | Performance Profiler - Scan Report | 7172fef (2025-10-14) | 22086B / 2713w | ✓ | DEPLOYMENT.md | Keep (historical) |
| scans/reports/2025-10-14-22-02-28/QUICK-REFERENCE.md | Performance Quick Reference Card | 7172fef (2025-10-14) | 6318B / 977w | ✓ | DEPLOYMENT.md | Keep (historical) |
| scans/reports/2025-10-14-22-02-28/race-condition-detective.md | Race Condition Detective - Scan Report | 7172fef (2025-10-14) | 35716B / 3940w | ✓ | DEPLOYMENT.md | Keep (historical) |
| scans/reports/2025-10-14-22-02-28/security-auditor.md | Security Auditor - Comprehensive Scan... | 7172fef (2025-10-14) | 17067B / 2179w | ⚠️ 3 | DEPLOYMENT.md | Keep (historical) |
| scans/reports/2025-10-14-22-02-28/SUMMARY.md | Performance Scan Summary | 7172fef (2025-10-14) | 2758B / 437w | ✓ | DEPLOYMENT.md | Keep (historical) |
| scans/ROLE_PERMISSIONS_AUDIT_REPORT.md | Restaurant OS v6.0 - Role & Permissio... | 5d37cc7 (2025-10-15) | 11817B / 1514w | ✓ | DEPLOYMENT.md | Keep (historical) |
| scans/SOLUTION_SUMMARY.md | Restaurant OS Login Issue - RESOLVED ✅ | 5d37cc7 (2025-10-15) | 5720B / 793w | ✓ | DEPLOYMENT.md | Keep (historical) |
| scans/USAGE-EXAMPLES.md | Usage Examples for Overnight Scanning... | 7172fef (2025-10-14) | 10080B / 1539w | ✓ | DEPLOYMENT.md | Keep (historical) |
| server/AUTHENTICATION_DIAGNOSTIC_COMPLETE.md | Restaurant OS Authentication - Comple... | b273fb0 (2025-10-06) | 7964B / 1032w | ⚠️ 1 | DEPLOYMENT.md | Archive |
| server/AUTHENTICATION_DIAGNOSTIC.md | Restaurant OS Authentication Failure ... | 91fcfd0 (2025-10-06) | 4920B / 618w | ✓ | DEPLOYMENT.md | Archive |
| server/src/voice/INTEGRATION.md | Voice System Integration Guide | 2eb5329 (2025-08-18) | 5082B / 599w | ✓ | SECURITY.md / AUTHENTICATIO... | Review |
| supabase/MIGRATION_GUIDE.md | Supabase Cloud Migration Guide | e212d23 (2025-08-12) | 3839B / 544w | ✓ | ROADMAP.md / PRODUCTION_STA... | Review |
| TESTING_CHECKLIST.md | Restaurant OS v6.0.7 - Testing Checklist | 758a670 (2025-10-12) | 16820B / 2428w | ✓ | DEPLOYMENT.md | Review |

---

## Detailed Analysis

### .github/PULL_REQUEST_TEMPLATE.md

**Title:** PULL_REQUEST_TEMPLATE

**Last Commit:**
- Hash: 7bfd165
- Date: 2025-09-20
- Author: mikeyoung304

**Stats:** 248 bytes, 31 words

**Risk Flags:** None

**Overlap Category:** None obvious

**Suggested Action:** Review

**Rationale:** Assess relevance and overlap with core docs

**First 10 lines:**
```
PLAN
What/why, constraints, risks

FILES CHANGED
Paths

DIFF SUMMARY
Key changes

CHECKS
```

---

### ARCHITECTURE.md

**Title:** Architecture

**Last Commit:**
- Hash: ae96327
- Date: 2025-09-02
- Author: mikeyoung304

**Stats:** 670 bytes, 100 words

**Risk Flags:** None

**Overlap Category:** ROADMAP.md / PRODUCTION_STATUS.md

**Suggested Action:** Review

**Rationale:** Root-level operational doc - assess if still current

**First 10 lines:**
```
# Architecture

See [docs/architecture/README.md](./docs/architecture/README.md) for complete architecture documentation.

**Last Updated**: September 2, 2025

## Quick Reference

### Unified Backend (Port 3001)
- ALL services in one Express backend
```

---

### AUTH_DIAGNOSTIC_GUIDE.md

**Title:** Auth Diagnostic Guide - Server Login "Access Denied" Issue

**Last Commit:**
- Hash: 101650f
- Date: 2025-10-09
- Author: mikeyoung304

**Stats:** 3934 bytes, 527 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Review

**Rationale:** Root-level operational doc - assess if still current

**First 10 lines:**
```
# Auth Diagnostic Guide - Server Login "Access Denied" Issue

## Problem
Clicking "Server" demo button on production (`https://july25-client.vercel.app`) shows "Access Denied"

## Diagnostic Steps

### Step 1: Check Browser Console
1. Open `https://july25-client.vercel.app` in **incognito**
2. Open DevTools (F12) → Console tab
```

---

### client/src/modules/kitchen/PERFORMANCE-FIX.md

**Title:** Kitchen Display Performance Optimization

**Last Commit:**
- Hash: e212d23
- Date: 2025-08-12
- Author: mikeyoung304

**Stats:** 2529 bytes, 331 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Review

**Rationale:** Assess relevance and overlap with core docs

**First 10 lines:**
```
# Kitchen Display Performance Optimization

## Issue: recursivelyTraverseLayoutEffects Warnings

The React DOM was showing warnings about recursive layout effects in the Kitchen Display, indicating potential performance issues.

## Root Causes Identified

1. **React StrictMode** - Double-invokes effects in development
2. **Multiple overlapping animations** in AnimatedKDSOrderCard
```

---

### docs/ADR-001-snake-case-convention.md

**Title:** ADR-001: Adopt snake_case Convention for All Layers

**Last Commit:**
- Hash: 758a670
- Date: 2025-10-12
- Author: mikeyoung304

**Stats:** 7485 bytes, 958 words

**Risk Flags:**
- ⚠️ **camelCase API mention** (2 occurrences)
  - Samples: `camelCase API`, `camelCase API`

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (ADR/historical)

**Rationale:** ADR - preserve as architectural history

**First 10 lines:**
```
# ADR-001: Adopt snake_case Convention for All Layers

**Date**: 2025-10-12
**Status**: ✅ ACCEPTED
**Authors**: Development Team
**Supersedes**: Previous camelCase API boundary attempt (commit c812f34)

---

## Context
```

---

### docs/ADR-002-multi-tenancy-architecture.md

**Title:** ADR-002: Multi-Tenancy Architecture with restaurant_id Enforcement

**Last Commit:**
- Hash: 60d4dd1
- Date: 2025-10-13
- Author: mikeyoung304

**Stats:** 14998 bytes, 1858 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (ADR/historical)

**Rationale:** ADR - preserve as architectural history

**First 10 lines:**
```
# ADR-002: Multi-Tenancy Architecture with restaurant_id Enforcement

**Date**: 2025-10-13
**Status**: ✅ ACCEPTED (Documenting Existing Architecture)
**Authors**: Development Team
**Related**: DATABASE.md, RLS Policies, Auth Middleware

---

## Context
```

---

### docs/ADR-003-embedded-orders-pattern.md

**Title:** ADR-003: Embedded Orders Pattern (JSONB items Array)

**Last Commit:**
- Hash: 60d4dd1
- Date: 2025-10-13
- Author: mikeyoung304

**Stats:** 18027 bytes, 2347 words

**Risk Flags:** None

**Overlap Category:** KDS_ORDER_FLOW.md / TROUBLESHOOTING.md

**Suggested Action:** Keep (ADR/historical)

**Rationale:** ADR - preserve as architectural history

**First 10 lines:**
```
# ADR-003: Embedded Orders Pattern (JSONB items Array)

**Date**: 2025-10-13
**Status**: ✅ ACCEPTED (Documenting Existing Architecture)
**Authors**: Development Team
**Related**: DATABASE.md, OrdersService

---

## Context
```

---

### docs/ADR-004-websocket-realtime-architecture.md

**Title:** ADR-004: WebSocket Real-Time Architecture

**Last Commit:**
- Hash: 60d4dd1
- Date: 2025-10-13
- Author: mikeyoung304

**Stats:** 19188 bytes, 2311 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (ADR/historical)

**Rationale:** ADR - preserve as architectural history

**First 10 lines:**
```
# ADR-004: WebSocket Real-Time Architecture

**Date**: 2025-10-13
**Status**: ✅ ACCEPTED (Documenting Existing Architecture)
**Authors**: Development Team
**Related**: server/src/utils/websocket.ts, Kitchen Display System

---

## Context
```

---

### docs/ADR-005-client-side-voice-ordering.md

**Title:** ADR-005: Client-Side Voice Ordering with OpenAI Realtime API

**Last Commit:**
- Hash: 60d4dd1
- Date: 2025-10-13
- Author: mikeyoung304

**Stats:** 22441 bytes, 2586 words

**Risk Flags:** None

**Overlap Category:** SECURITY.md / AUTHENTICATION_ARCHITECTURE.md

**Suggested Action:** Keep (ADR/historical)

**Rationale:** ADR - preserve as architectural history

**First 10 lines:**
```
# ADR-005: Client-Side Voice Ordering with OpenAI Realtime API

**Date**: 2025-10-13
**Status**: ✅ ACCEPTED (Documenting Existing Architecture)
**Authors**: Development Team
**Related**: voice/VOICE_ORDERING_EXPLAINED.md, WebRTCVoiceClient.ts

---

## Context
```

---

### docs/AGENTS.md

**Title:** AGENTS.md — Agent & Human Operator Guide

**Last Commit:**
- Hash: 0a6ebd2
- Date: 2025-09-26
- Author: mikeyoung304

**Stats:** 1371 bytes, 192 words

**Risk Flags:** None

**Overlap Category:** SECURITY.md / AUTHENTICATION_ARCHITECTURE.md

**Suggested Action:** Review/Merge → SECURITY.md / AUTHENTICATION_ARCHITECTURE.md

**Rationale:** Likely duplicate of core doc; verify unique content before archiving

**First 10 lines:**
```
# AGENTS.md — Agent & Human Operator Guide

## Mission
Keep `main` green with small, auditable PRs. Prefer correctness, security, reproducibility.

## Repo Structure
client/ (React+Vite) • server/ (Express+TS) • shared/ • supabase/ • scripts/ • tests/

## Models
Default **gpt-5-codex** for code; fallback **gpt-5** for planning/summary.
```

---

### docs/ARCHITECTURE.md

**Title:** Architecture Overview

**Last Commit:**
- Hash: 7bfd165
- Date: 2025-09-20
- Author: mikeyoung304

**Stats:** 877 bytes, 101 words

**Risk Flags:** None

**Overlap Category:** SECURITY.md / AUTHENTICATION_ARCHITECTURE.md

**Suggested Action:** Review/Merge → SECURITY.md / AUTHENTICATION_ARCHITECTURE.md

**Rationale:** Likely duplicate of core doc; verify unique content before archiving

**First 10 lines:**
```
# Architecture Overview

## System
```mermaid
graph LR
  subgraph Client[client (React+Vite)]
    UI[POS/KDS/Checkout]
    Voice[Voice Controls]
  end
  subgraph Server[server (Express+TS)]
```

---

### docs/CONTRIBUTING.md

**Title:** Contributing to Restaurant OS

**Last Commit:**
- Hash: 0a6ebd2
- Date: 2025-09-26
- Author: mikeyoung304

**Stats:** 5103 bytes, 731 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Review/Merge → DEPLOYMENT.md

**Rationale:** Likely duplicate of core doc; verify unique content before archiving

**First 10 lines:**
```
# Contributing to Restaurant OS

Thank you for your interest in contributing to Restaurant OS! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

```

---

### docs/DOCUMENTATION_STANDARDS.md

**Title:** Documentation Standards

**Last Commit:**
- Hash: 0a6ebd2
- Date: 2025-09-26
- Author: mikeyoung304

**Stats:** 6124 bytes, 831 words

**Risk Flags:** None

**Overlap Category:** SECURITY.md / AUTHENTICATION_ARCHITECTURE.md

**Suggested Action:** Review/Merge → SECURITY.md / AUTHENTICATION_ARCHITECTURE.md

**Rationale:** Likely duplicate of core doc; verify unique content before archiving

**First 10 lines:**
```
# Documentation Standards

**Last Updated**: 2025-09-26
**Version**: See [VERSION.md](VERSION.md)

## Purpose

This document defines standards for maintaining accurate, consistent, and useful documentation across the Restaurant OS project.

## Required Headers
```

---

### docs/KDS-BIBLE.md

**Title:** 🚨 THE DIGITAL KITCHEN DISPLAY BIBLE 🚨

**Last Commit:**
- Hash: 6be325f
- Date: 2025-09-01
- Author: mikeyoung304

**Stats:** 12317 bytes, 1714 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Review/Merge → DEPLOYMENT.md

**Rationale:** Likely duplicate of core doc; verify unique content before archiving

**First 10 lines:**
```
# 🚨 THE DIGITAL KITCHEN DISPLAY BIBLE 🚨
## Mike's Must-Read KDS Operations Manual

---

## ⚠️ BIG RED WARNING - READ THIS FIRST! ⚠️

### THE #1 RULE THAT WILL SAVE YOUR SANITY:
**ALL 7 ORDER STATUSES MUST BE HANDLED. NO EXCEPTIONS. EVER.**

```

---

### docs/MENU_SYSTEM.md

**Title:** Menu System Architecture

**Last Commit:**
- Hash: 758a670
- Date: 2025-10-12
- Author: mikeyoung304

**Stats:** 14394 bytes, 1771 words

**Risk Flags:** None

**Overlap Category:** ROADMAP.md / PRODUCTION_STATUS.md

**Suggested Action:** Review/Merge → ROADMAP.md / PRODUCTION_STATUS.md

**Rationale:** Likely duplicate of core doc; verify unique content before archiving

**First 10 lines:**
```
# Menu System Architecture

**Last Updated**: October 11, 2025
**Version**: 6.0.7
**Status**: ✅ Production Ready

---

## Overview

```

---

### docs/MIGRATION_V6_AUTH.md

**Title:** Migration Guide: Authentication v6.0

**Last Commit:**
- Hash: 93055bc
- Date: 2025-10-08
- Author: mikeyoung304

**Stats:** 9412 bytes, 1225 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Review/Merge → DEPLOYMENT.md

**Rationale:** Likely duplicate of core doc; verify unique content before archiving

**First 10 lines:**
```
# Migration Guide: Authentication v6.0

## Summary

Restaurant OS v6.0 migrates from **backend-proxied authentication** to **pure Supabase Auth** for web users. This eliminates race conditions, reduces complexity, and improves reliability.

## What Changed

### Before (v5.x)
```typescript
```

---

### docs/ORDER_FLOW.md

**Title:** Order Flow Documentation

**Last Commit:**
- Hash: 758a670
- Date: 2025-10-12
- Author: mikeyoung304

**Stats:** 21708 bytes, 2290 words

**Risk Flags:** None

**Overlap Category:** SECURITY.md / AUTHENTICATION_ARCHITECTURE.md

**Suggested Action:** Review/Merge → SECURITY.md / AUTHENTICATION_ARCHITECTURE.md

**Rationale:** Likely duplicate of core doc; verify unique content before archiving

**First 10 lines:**
```
# Order Flow Documentation

**Last Updated**: October 11, 2025
**Version**: 6.0.7
**Status**: ✅ Production Ready

## Overview

The Restaurant OS 6.0 order flow is designed to handle the complete lifecycle of an order from creation through fulfillment. This document outlines the technical implementation and data flow for all order channels: online ordering, kiosk, voice ordering, and in-person.

```

---

### docs/POST_MORTEM_PAYMENT_CREDENTIALS_2025-10-14.md

**Title:** Post-Mortem: Square Payment Integration Credential Mismatch

**Last Commit:**
- Hash: 78426a1
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 12717 bytes, 1616 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Review/Merge → DEPLOYMENT.md

**Rationale:** Likely duplicate of core doc; verify unique content before archiving

**First 10 lines:**
```
# Post-Mortem: Square Payment Integration Credential Mismatch

**Date**: October 14, 2025
**Severity**: High (Payment processing failure in production)
**Duration**: ~4 hours debugging
**Status**: Resolved
**Root Cause**: Single-character typo in `SQUARE_LOCATION_ID` environment variable

---

```

---

### docs/PRODUCTION_DIAGNOSTICS.md

**Title:** 🚨 PRODUCTION SYSTEM DIAGNOSTIC REPORT

**Last Commit:**
- Hash: 7c13ef5
- Date: 2025-09-27
- Author: mikeyoung304

**Stats:** 7501 bytes, 903 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Review/Merge → DEPLOYMENT.md

**Rationale:** Likely duplicate of core doc; verify unique content before archiving

**First 10 lines:**
```
# 🚨 PRODUCTION SYSTEM DIAGNOSTIC REPORT

> ⚠️ **HISTORICAL DOCUMENT** - This report documents an incident from September 23, 2025
>
> **Current System Status**: ✅ Operational
>
> For current operational status and monitoring, see [README.md](README.md)

---

```

---

### docs/SQUARE_INTEGRATION.md

**Title:** Square Payment Integration

**Last Commit:**
- Hash: 41ff6c0
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 25491 bytes, 2805 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Review/Merge → DEPLOYMENT.md

**Rationale:** Likely duplicate of core doc; verify unique content before archiving

**First 10 lines:**
```
# Square Payment Integration

**Last Updated**: October 14, 2025
**Version**: 6.0.7
**Status**: ✅ Production Ready - Payment System Fully Operational
**SDK Version**: Square Node.js SDK v43

---

## Executive Summary
```

---

### docs/voice/VOICE_ORDERING_EXPLAINED.md

**Title:** Voice Ordering Magic Explained 🎙️

**Last Commit:**
- Hash: 6be325f
- Date: 2025-09-01
- Author: mikeyoung304

**Stats:** 13771 bytes, 1637 words

**Risk Flags:** None

**Overlap Category:** ROADMAP.md / PRODUCTION_STATUS.md

**Suggested Action:** Review/Merge → ROADMAP.md / PRODUCTION_STATUS.md

**Rationale:** Likely duplicate of core doc; verify unique content before archiving

**First 10 lines:**
```
# Voice Ordering Magic Explained 🎙️

## The Big Picture: Your Digital Waiter That Never Forgets

Imagine having a waiter who:
- Never mishears your order
- Remembers every menu item perfectly
- Never forgets to ask about sides or drinks
- Can take multiple orders simultaneously
- Never gets tired or takes breaks
```

---

### docs/WEBSOCKET_EVENTS.md

**Title:** WebSocket Events Documentation

**Last Commit:**
- Hash: 0a6ebd2
- Date: 2025-09-26
- Author: mikeyoung304

**Stats:** 7386 bytes, 829 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Review/Merge → DEPLOYMENT.md

**Rationale:** Likely duplicate of core doc; verify unique content before archiving

**First 10 lines:**
```
# WebSocket Events Documentation

**Last Updated**: 2025-09-26
**Version**: See [VERSION.md](VERSION.md)
**WebSocket URL**: `ws://localhost:3001` (dev) | `wss://july25.onrender.com` (prod)

## Overview

Restaurant OS uses WebSockets for real-time communication between server and clients. The WebSocket server handles order updates, kitchen display synchronization, and voice streaming.

```

---

### KITCHEN_DISPLAY_UPGRADE.md

**Title:** Kitchen Display System - v6.0 Upgrade

**Last Commit:**
- Hash: 7fda07a
- Date: 2025-10-10
- Author: mikeyoung304

**Stats:** 11166 bytes, 1513 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Review

**Rationale:** Root-level operational doc - assess if still current

**First 10 lines:**
```
# Kitchen Display System - v6.0 Upgrade
**Date**: 2025-10-10
**Status**: ✅ COMPLETE

---

## Executive Summary

Upgraded the kitchen display system from basic (`KitchenDisplaySimple`) to advanced (`KitchenDisplayOptimized`) with integrated table grouping functionality. This provides kitchen staff with professional-grade tools for managing orders efficiently.

```

---

### KITCHEN_FIX_SUMMARY.md

**Title:** Kitchen Display Fix Summary

**Last Commit:**
- Hash: 7fda07a
- Date: 2025-10-10
- Author: mikeyoung304

**Stats:** 7249 bytes, 972 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Review

**Rationale:** Root-level operational doc - assess if still current

**First 10 lines:**
```
# Kitchen Display Fix Summary
**Date**: 2025-10-10
**Status**: ✅ PERMISSIONS FIXED, 🔄 TABLE GROUPING PENDING

---

## Issue Summary

The user reported two problems with demo kitchen/expo users:
1. **Permission Error**: Kitchen/expo users couldn't update order status ("order not found")
```

---

### reports/00_context.md

**Title:** PHASE 0: PERMISSIONS & CONTEXT CHECK REPORT

**Last Commit:**
- Hash: f4fbd81
- Date: 2025-09-24
- Author: mikeyoung304

**Stats:** 3242 bytes, 451 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# PHASE 0: PERMISSIONS & CONTEXT CHECK REPORT
## July25 Night Audit - Context Analysis
*Generated: 2025-09-23*

## 🔍 Environment Detection

### System Info
- **Node Version**: v24.2.0
- **npm Version**: 11.3.0
- **pnpm**: Not installed (using npm)
```

---

### reports/01_static-health.md

**Title:** PHASE 1: STATIC HEALTH REPORT

**Last Commit:**
- Hash: f4fbd81
- Date: 2025-09-24
- Author: mikeyoung304

**Stats:** 4726 bytes, 665 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# PHASE 1: STATIC HEALTH REPORT
## July25 Night Audit - Code Quality Analysis
*Generated: 2025-09-23*

## 📊 Summary Metrics

### TypeScript Health
- **Status**: ✅ PASSING (0 errors)
- **Workspaces Checked**: client, server, shared
- **Type Safety**: Clean compilation
```

---

### reports/02_naming-alignment.md

**Title:** PHASE 2: NAMING & SCHEMA ALIGNMENT REPORT

**Last Commit:**
- Hash: f4fbd81
- Date: 2025-09-24
- Author: mikeyoung304

**Stats:** 5971 bytes, 760 words

**Risk Flags:** None

**Overlap Category:** SECURITY.md / AUTHENTICATION_ARCHITECTURE.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# PHASE 2: NAMING & SCHEMA ALIGNMENT REPORT
## July25 Night Audit - Convention Analysis
*Generated: 2025-09-23*

## 🎯 Executive Summary

**Critical Finding**: The codebase has a **30% naming mismatch rate** between client and server, with mixed camelCase/snake_case conventions creating data transformation overhead and bug risk.

## 📊 Naming Convention Statistics

```

---

### reports/03_security-auth.md

**Title:** PHASE 3: SECURITY & AUTH RAILS REPORT

**Last Commit:**
- Hash: f4fbd81
- Date: 2025-09-24
- Author: mikeyoung304

**Stats:** 7021 bytes, 958 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# PHASE 3: SECURITY & AUTH RAILS REPORT
## July25 Night Audit - Security Analysis
*Generated: 2025-09-23*

## 🔒 Executive Summary

**Security Posture**: GOOD (B+)
- ✅ Comprehensive security middleware implementation
- ✅ RBAC with granular scopes
- ✅ Rate limiting on all critical endpoints
```

---

### reports/04_order-flow.md

**Title:** PHASE 4: ORDER FLOW DEEP WALK REPORT

**Last Commit:**
- Hash: f4fbd81
- Date: 2025-09-24
- Author: mikeyoung304

**Stats:** 7237 bytes, 950 words

**Risk Flags:** None

**Overlap Category:** KDS_ORDER_FLOW.md / TROUBLESHOOTING.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# PHASE 4: ORDER FLOW DEEP WALK REPORT
## July25 Night Audit - End-to-End Flow Analysis
*Generated: 2025-09-23*

## 🛒 Executive Summary

**Flow Status**: FUNCTIONAL BUT FRAGILE
- ✅ Complete order flow from menu to KDS
- ✅ Multi-channel support (kiosk, online, voice)
- ⚠️ Missing error boundaries in critical paths
```

---

### reports/05_ai-bloat.md

**Title:** PHASE 5: AI & VOICE LAYER BLOAT AUDIT REPORT

**Last Commit:**
- Hash: f4fbd81
- Date: 2025-09-24
- Author: mikeyoung304

**Stats:** 7535 bytes, 1006 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# PHASE 5: AI & VOICE LAYER BLOAT AUDIT REPORT
## July25 Night Audit - AI/ML Infrastructure Analysis
*Generated: 2025-09-23*

## 🤖 Executive Summary

**AI Infrastructure Status**: OVER-ENGINEERED
- **127 AI/Voice-related files** detected
- **Multiple AI providers** configured (OpenAI, Twilio, WebRTC)
- **No ElevenLabs** usage found (good)
```

---

### reports/07_refactor-queue.md

**Title:** PHASE 7: TECH DEBT & REFACTOR QUEUE

**Last Commit:**
- Hash: f4fbd81
- Date: 2025-09-24
- Author: mikeyoung304

**Stats:** 8630 bytes, 1241 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# PHASE 7: TECH DEBT & REFACTOR QUEUE
## July25 Night Audit - Prioritized Action Items
*Generated: 2025-09-23*

## 📊 Tech Debt Summary

### Total Issues Found: 721
- **Critical (P0)**: 12 issues
- **High (P1)**: 47 issues
- **Medium (P2)**: 183 issues
```

---

### reports/BLACKLIGHT-changemap.md

**Title:** BLACKLIGHT Change Map - Auth & Payments Implementation

**Last Commit:**
- Hash: 1f332e5
- Date: 2025-08-30
- Author: mikeyoung304

**Stats:** 9415 bytes, 947 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# BLACKLIGHT Change Map - Auth & Payments Implementation

**Analysis Date**: August 31, 2025  
**Scope**: Authentication/RBAC & Payments Week 2 Changes  
**Commits Analyzed**: `cdeec0f` (auth) and `40de941` (payments)

---

## File Impact Analysis

```

---

### reports/BLACKLIGHT-e2e-audit.md

**Title:** BLACKLIGHT E2E Security & Quality Audit Report

**Last Commit:**
- Hash: 1f332e5
- Date: 2025-08-30
- Author: mikeyoung304

**Stats:** 8541 bytes, 1090 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# BLACKLIGHT E2E Security & Quality Audit Report

**Audit Date**: August 31, 2025  
**Auditor**: BLACKLIGHT Sub-Agent  
**Repository**: Restaurant OS v6.0.2  
**Scope**: Authentication/RBAC & Payments Week 2 Implementation  

---

## Executive Summary
```

---

### reports/EXECUTIVE_SUMMARY.md

**Title:** 🌙 JULY25 NIGHT AUDIT - EXECUTIVE SUMMARY

**Last Commit:**
- Hash: f4fbd81
- Date: 2025-09-24
- Author: mikeyoung304

**Stats:** 8067 bytes, 1140 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# 🌙 JULY25 NIGHT AUDIT - EXECUTIVE SUMMARY
## Comprehensive System Analysis Report
*Generated: 2025-09-23 | Duration: Full Night Audit*

---

## 🎯 AUDIT SCOPE & METHODOLOGY

### Phases Completed
1. ✅ Permissions & Context Check
```

---

### reports/LINT-BURNDOWN.md

**Title:** ESLint Burndown Report

**Last Commit:**
- Hash: 54fbda0
- Date: 2025-08-31
- Author: mikeyoung304

**Stats:** 2182 bytes, 291 words

**Risk Flags:** None

**Overlap Category:** ROADMAP.md / PRODUCTION_STATUS.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# ESLint Burndown Report

**Generated**: August 31, 2025  
**Status**: 0 Errors ✅ | 459 Warnings ⚠️

## Executive Summary

Successfully achieved **zero ESLint errors** (down from 37). Remaining warnings are non-critical and can be addressed incrementally.

## Warning Distribution
```

---

### reports/RCTX_STABILIZATION_SUMMARY.md

**Title:** RCTX Stabilization Summary

**Last Commit:**
- Hash: 5ef0d38
- Date: 2025-09-12
- Author: mikeyoung304

**Stats:** 2927 bytes, 381 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# RCTX Stabilization Summary

## Executive Summary

Completed post-merge stabilization for restaurant context (rctx) auth enforcement. Fixed critical AI runtime crash, resolved HIGH security vulnerability, and added test coverage for auth middleware.

## PRs Opened

1. **fix(ai): stabilize realtime-menu-tools (args crash)** - https://github.com/mikeyoung304/July25/pull/24
   - Fixed runtime crashes caused by `args` vs `_args` parameter mismatch
```

---

### reports/TS-BURNDOWN.md

**Title:** TypeScript Error Burndown Report

**Last Commit:**
- Hash: fc1e145
- Date: 2025-08-31
- Author: mikeyoung304

**Stats:** 4804 bytes, 751 words

**Risk Flags:** None

**Overlap Category:** KDS_ORDER_FLOW.md / TROUBLESHOOTING.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# TypeScript Error Burndown Report

**Generated**: 2025-01-31  
**Updated**: 2025-01-31 (Complete Victory! 🎉)
**Total Errors**: 0 (was 526 → 476 → 0)  
**Target**: EXCEEDED! 0 errors achieved (target was 420)

## Error Summary by Type

| Code | Count | Description | Priority |
```

---

### scans/agents/agent-1-multi-tenancy-guardian.md

**Title:** Agent 1: Multi-Tenancy Guardian

**Last Commit:**
- Hash: 7172fef
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 8727 bytes, 1196 words

**Risk Flags:** None

**Overlap Category:** SECURITY.md / AUTHENTICATION_ARCHITECTURE.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Agent 1: Multi-Tenancy Guardian

**Priority**: CRITICAL
**Estimated Runtime**: 30-45 minutes
**Focus**: Data leak prevention through restaurant_id enforcement

## Mission

Scan the entire codebase to identify potential data leak vulnerabilities where `restaurant_id` filtering is missing or improperly implemented. This is enterprise-critical as multi-tenant data leaks can expose customer data across restaurant boundaries.

```

---

### scans/agents/agent-2-convention-enforcer.md

**Title:** Agent 2: Convention Enforcer

**Last Commit:**
- Hash: 7172fef
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 10693 bytes, 1454 words

**Risk Flags:** None

**Overlap Category:** DATABASE.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Agent 2: Convention Enforcer

**Priority**: HIGH
**Estimated Runtime**: 30-40 minutes
**Focus**: Snake_case convention enforcement (ADR-001)

## Mission

Scan the entire codebase to identify violations of the snake_case naming convention established in ADR-001. This is an architectural decision that establishes **ALL LAYERS USE SNAKE_CASE** - database, API, and client.

```

---

### scans/agents/agent-3-race-condition-detective.md

**Title:** Agent 3: Race Condition Detective

**Last Commit:**
- Hash: 7172fef
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 12788 bytes, 1743 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Agent 3: Race Condition Detective

**Priority**: HIGH
**Estimated Runtime**: 40-50 minutes
**Focus**: Async/await patterns and race condition detection

## Mission

Scan the codebase to identify race conditions, improper async/await usage, and concurrency bugs. Based on recent git commits ("fix(kds): resolve grid mode infinite loading due to race condition"), these bugs are actively causing production issues.

```

---

### scans/agents/agent-4-security-auditor.md

**Title:** Agent 4: Security Auditor

**Last Commit:**
- Hash: 7172fef
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 13922 bytes, 1939 words

**Risk Flags:** None

**Overlap Category:** SECURITY.md / AUTHENTICATION_ARCHITECTURE.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Agent 4: Security Auditor

**Priority**: CRITICAL
**Estimated Runtime**: 35-45 minutes
**Focus**: Security vulnerabilities and exposed secrets

## Mission

Scan the codebase for security vulnerabilities, exposed API keys, weak authentication, and RLS policy gaps. Based on recent commits ("fix(security): skip sanitization for auth tokens"), security is an active concern.

```

---

### scans/agents/agent-5-performance-profiler.md

**Title:** Agent 5: Performance Profiler

**Last Commit:**
- Hash: 7172fef
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 16113 bytes, 2175 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Agent 5: Performance Profiler

**Priority**: MEDIUM
**Estimated Runtime**: 35-45 minutes
**Focus**: Performance bottlenecks, bundle size, and memory optimization

## Mission

Scan the codebase for performance issues including oversized bundles, memory leaks, inefficient re-renders, and slow operations. Based on recent commits ("fix(monitoring): disable analytics endpoint causing infinite load"), performance issues are impacting production.

```

---

### scans/agents/agent-6-complexity-analyzer.md

**Title:** Agent 6: Complexity Analyzer

**Last Commit:**
- Hash: 7172fef
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 18032 bytes, 2333 words

**Risk Flags:** None

**Overlap Category:** KDS_ORDER_FLOW.md / TROUBLESHOOTING.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Agent 6: Complexity Analyzer

**Priority**: MEDIUM (Long-term code quality)
**Estimated Runtime**: 40-50 minutes
**Focus**: Code complexity, duplication, and refactoring opportunities

## Mission

Scan the codebase for code smells, high complexity, duplication, and architectural issues that accumulate as technical debt. Based on recent commits ("feat(kds): simplify to 2 order types"), the team is actively working to reduce complexity.

```

---

### scans/AUTH_FIX_REPORT.md

**Title:** Demo User Authentication Fix Report

**Last Commit:**
- Hash: 5d37cc7
- Date: 2025-10-15
- Author: mikeyoung304

**Stats:** 10639 bytes, 1420 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Demo User Authentication Fix Report
**Date**: 2025-10-10
**Issue**: Demo sign-in users exist in Supabase but permissions don't work + missing table grouping feature
**Status**: ✅ FULLY RESOLVED

---

## Problem Summary

Demo users (manager@restaurant.com, server@restaurant.com, etc.) were successfully authenticating with Supabase, but their permissions/scopes were not being loaded. This caused authorization failures when trying to access protected routes or API endpoints.
```

---

### scans/COMPLETED_WORK_SUMMARY.md

**Title:** Completed Work Summary - Kitchen Display & Auth Fixes

**Last Commit:**
- Hash: 5d37cc7
- Date: 2025-10-15
- Author: mikeyoung304

**Stats:** 11285 bytes, 1511 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Completed Work Summary - Kitchen Display & Auth Fixes
**Date**: 2025-10-10
**Version**: 6.0.7
**Status**: ✅ PRODUCTION READY

---

## Overview

Successfully resolved authentication issues and upgraded the kitchen display system from basic to professional-grade with intelligent table grouping. All demo users now have proper permissions, and kitchen staff have a polished interface for managing orders efficiently.
```

---

### scans/DIAGNOSTIC_REPORT.md

**Title:** Restaurant OS Login Diagnostic Report

**Last Commit:**
- Hash: 5d37cc7
- Date: 2025-10-15
- Author: mikeyoung304

**Stats:** 16345 bytes, 1955 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Restaurant OS Login Diagnostic Report

**Date:** October 5, 2025, 13:12 UTC
**Test Environment:** localhost:5173 (client) + localhost:3001 (server)
**Test Duration:** 35.5 seconds
**Test Framework:** Playwright + Custom Diagnostic Suite

---

## Executive Summary
```

---

### scans/otherscan.md

**Title:** 🔥 COMPREHENSIVE CODEBASE AUDIT REPORT

**Last Commit:**
- Hash: 5d37cc7
- Date: 2025-10-15
- Author: mikeyoung304

**Stats:** 52157 bytes, 6862 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# 🔥 COMPREHENSIVE CODEBASE AUDIT REPORT
## Grow App - Restaurant Management System v6.0.7

**Audit Date:** 2025-10-14
**Auditor:** Claude Code Comprehensive Analysis System
**Analysis Duration:** ~7 hours (parallel execution)
**Files Analyzed:** 1,156 TypeScript files, 81,359 lines of code
**Databases Reviewed:** Supabase schema with 4 migrations

---
```

---

### scans/reports/2025-10-14-22-02-28/complexity-analyzer.md

**Title:** Complexity Analyzer - Scan Report

**Last Commit:**
- Hash: 7172fef
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 26126 bytes, 3251 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Complexity Analyzer - Scan Report
**Generated**: 2025-10-14 22:02:28
**Project**: Grow App - Restaurant Management System v6.0.7
**Codebase Size**: 381 TypeScript files (79 server, 302 client)

---

## Executive Summary
**Total Issues Identified**: 47
- **CRITICAL** (Complexity 20+): 5 files
```

---

### scans/reports/2025-10-14-22-02-28/convention-enforcer.md

**Title:** Convention Enforcer - Scan Report

**Last Commit:**
- Hash: 7172fef
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 15420 bytes, 1877 words

**Risk Flags:** None

**Overlap Category:** ROADMAP.md / PRODUCTION_STATUS.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Convention Enforcer - Scan Report
**Generated**: 2025-10-14 22:02:28
**ADR-001 Compliance**: 23%
**Scan Agent**: Agent 2 - Convention Enforcer

---

## Executive Summary
**Total Violations**: 47
- **CRITICAL**: 12 (Transformation utilities that violate ADR-001)
```

---

### scans/reports/2025-10-14-22-02-28/EXECUTIVE_SUMMARY.md

**Title:** Security Audit - Executive Summary

**Last Commit:**
- Hash: 7172fef
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 7471 bytes, 1069 words

**Risk Flags:**
- ⚠️ **demo credentials** (6 occurrences)
  - Samples: `Demo Cred`, `demo cred`
- ⚠️ **anonymous websocket** (2 occurrences)
  - Samples: `Anonymous WebSocket`, `anonymous WebSocket`

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Security Audit - Executive Summary
**Grow App v6.0.7 - Restaurant Management System**
**Date**: October 14, 2025
**Auditor**: Security Auditor Agent (Autonomous)

---

## 🎯 Bottom Line

**Production Readiness**: ⚠️ NOT READY (4 blockers identified)
```

---

### scans/reports/2025-10-14-22-02-28/EXECUTIVE-SUMMARY.md

**Title:** Overnight Code Scan - Executive Summary

**Last Commit:**
- Hash: 7172fef
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 16273 bytes, 2280 words

**Risk Flags:**
- ⚠️ **demo credentials** (6 occurrences)
  - Samples: `Demo Cred`, `Demo Cred`
- ⚠️ **anonymous websocket** (1 occurrence)
  - Samples: `anonymous WebSocket`

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Overnight Code Scan - Executive Summary

**Generated**: 2025-10-14 22:02:28
**Scan Duration**: 6 minutes (parallel execution)
**Codebase**: Grow App v6.0.7 - Restaurant Management System

---

## 🎯 TL;DR - Read This First (30 seconds)

```

---

### scans/reports/2025-10-14-22-02-28/INDEX.md

**Title:** ADR-001 Convention Enforcement Scan

**Last Commit:**
- Hash: 7172fef
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 5410 bytes, 690 words

**Risk Flags:** None

**Overlap Category:** ROADMAP.md / PRODUCTION_STATUS.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# ADR-001 Convention Enforcement Scan
**Report Index**

---

## Scan Details

- **Scan Date**: 2025-10-14 22:02:28
- **Agent**: Agent 2 - Convention Enforcer
- **Target**: ADR-001 snake_case convention compliance
```

---

### scans/reports/2025-10-14-22-02-28/multi-tenancy-guardian.md

**Title:** Multi-Tenancy Guardian - Scan Report

**Last Commit:**
- Hash: 7172fef
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 12726 bytes, 1493 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Multi-Tenancy Guardian - Scan Report
**Generated**: 2025-10-14 22:02:28
**Agent**: Multi-Tenancy Guardian
**Files Scanned**: 89
**Database Queries Analyzed**: 127

## Executive Summary

Completed comprehensive autonomous scan of the Grow App codebase to identify multi-tenancy violations that could lead to data leaks across restaurants. The scan analyzed 89 server-side TypeScript files containing 127 Supabase database queries.

```

---

### scans/reports/2025-10-14-22-02-28/performance-index.md

**Title:** Performance Profiler - Index

**Last Commit:**
- Hash: 7172fef
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 3101 bytes, 455 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Performance Profiler - Index
**Agent 5**: Performance Profiler
**Date**: 2025-10-14 22:08
**Total Reports**: 3

---

## Report Files

### 1. SUMMARY.md (118 lines)
```

---

### scans/reports/2025-10-14-22-02-28/performance-profiler.md

**Title:** Performance Profiler - Scan Report

**Last Commit:**
- Hash: 7172fef
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 22086 bytes, 2713 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Performance Profiler - Scan Report
**Generated**: 2025-10-14 22:02:28
**Scanned**: Grow App Restaurant Management System v6.0.6
**Bundle Target**: <800KB (<250KB gzipped) per CLAUDE.md
**Main Chunk Limit**: <100KB per CLAUDE.md

---

## Executive Summary

```

---

### scans/reports/2025-10-14-22-02-28/QUICK-REFERENCE.md

**Title:** Performance Quick Reference Card

**Last Commit:**
- Hash: 7172fef
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 6318 bytes, 977 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Performance Quick Reference Card
**For**: Development Team
**Date**: 2025-10-14

---

## Bundle Size Targets

| Target | Limit | Current | Status |
|--------|-------|---------|--------|
```

---

### scans/reports/2025-10-14-22-02-28/race-condition-detective.md

**Title:** Race Condition Detective - Scan Report

**Last Commit:**
- Hash: 7172fef
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 35716 bytes, 3940 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Race Condition Detective - Scan Report
**Generated**: 2025-10-14 22:02:28
**Codebase**: Grow App v6.0.7 - Restaurant Management System
**Scan Scope**: Client-side TypeScript/React (rebuild-6.0/client/src)

---

## Executive Summary
**Total Issues**: 12
- **CRITICAL**: 4 (infinite loops, memory leaks)
```

---

### scans/reports/2025-10-14-22-02-28/security-auditor.md

**Title:** Security Auditor - Comprehensive Scan Report

**Last Commit:**
- Hash: 7172fef
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 17067 bytes, 2179 words

**Risk Flags:**
- ⚠️ **demo credentials** (8 occurrences)
  - Samples: `Demo Cred`, `demoCred`
- ⚠️ **anonymous websocket** (3 occurrences)
  - Samples: `Anonymous WebSocket`, `anonymous WebSocket`
- ⚠️ **fallback/default secret** (1 occurrence)
  - Samples: `fallback secret`

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Security Auditor - Comprehensive Scan Report
**Generated**: 2025-10-14 22:02:28
**Risk Level**: MEDIUM
**Codebase**: Grow App - Restaurant Management System v6.0.7

## Executive Summary
**Total Security Issues**: 8
- CRITICAL: 0 (immediate breach risk)
- HIGH: 3 (auth weaknesses, exposed credentials)
- MEDIUM: 5 (CORS, unprotected endpoints, logging)
```

---

### scans/reports/2025-10-14-22-02-28/SUMMARY.md

**Title:** Performance Scan Summary

**Last Commit:**
- Hash: 7172fef
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 2758 bytes, 437 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Performance Scan Summary
**Date**: 2025-10-14 22:02:28
**Agent**: Performance Profiler (Agent 5)
**Project**: Grow App Restaurant Management System v6.0.6

---

## Quick Stats

| Metric | Value | Status |
```

---

### scans/ROLE_PERMISSIONS_AUDIT_REPORT.md

**Title:** Restaurant OS v6.0 - Role & Permissions Audit Report

**Last Commit:**
- Hash: 5d37cc7
- Date: 2025-10-15
- Author: mikeyoung304

**Stats:** 11817 bytes, 1514 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Restaurant OS v6.0 - Role & Permissions Audit Report
**Date:** 2025-10-06
**Issue:** Blank screen after login, unauthorized access errors

---

## Executive Summary

**ROOT CAUSE IDENTIFIED:** Missing `/unauthorized` route causes blank page when authorization fails.

```

---

### scans/SOLUTION_SUMMARY.md

**Title:** Restaurant OS Login Issue - RESOLVED ✅

**Last Commit:**
- Hash: 5d37cc7
- Date: 2025-10-15
- Author: mikeyoung304

**Stats:** 5720 bytes, 793 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Restaurant OS Login Issue - RESOLVED ✅

**Date:** October 5, 2025
**Status:** FIXED AND DEPLOYED
**Fix Time:** 15 minutes

---

## Problem Summary

```

---

### scans/USAGE-EXAMPLES.md

**Title:** Usage Examples for Overnight Scanning Agents

**Last Commit:**
- Hash: 7172fef
- Date: 2025-10-14
- Author: mikeyoung304

**Stats:** 10080 bytes, 1539 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Keep (historical)

**Rationale:** Historical analysis/scan report - preserve for reference

**First 10 lines:**
```
# Usage Examples for Overnight Scanning Agents

## How to Run Agents with Claude Code

### Example 1: Run a Single Agent

```bash
# Run the Multi-Tenancy Guardian
```

```

---

### server/AUTHENTICATION_DIAGNOSTIC_COMPLETE.md

**Title:** Restaurant OS Authentication - Complete Diagnostic Report

**Last Commit:**
- Hash: b273fb0
- Date: 2025-10-06
- Author: mikeyoung304

**Stats:** 7964 bytes, 1032 words

**Risk Flags:**
- ⚠️ **demo credentials** (2 occurrences)
  - Samples: `demo cred`, `Demo Cred`

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Archive

**Rationale:** Testing/diagnostic artifact - move to docs/archive/ if not current

**First 10 lines:**
```
# Restaurant OS Authentication - Complete Diagnostic Report

**Date:** 2025-10-06
**Status:** CSRF BLOCKING RESOLVED - SUPABASE AUTH ISSUE IDENTIFIED

---

## Executive Summary

**Initial Problem:** ALL authentication failed with "No authentication available"
```

---

### server/AUTHENTICATION_DIAGNOSTIC.md

**Title:** Restaurant OS Authentication Failure - Root Cause Analysis

**Last Commit:**
- Hash: 91fcfd0
- Date: 2025-10-06
- Author: mikeyoung304

**Stats:** 4920 bytes, 618 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Archive

**Rationale:** Testing/diagnostic artifact - move to docs/archive/ if not current

**First 10 lines:**
```
# Restaurant OS Authentication Failure - Root Cause Analysis

**Date:** 2025-10-06
**Status:** ROOT CAUSE IDENTIFIED ✓

---

## Executive Summary

**ALL authentication fails with "No authentication available"**
```

---

### server/src/voice/INTEGRATION.md

**Title:** Voice System Integration Guide

**Last Commit:**
- Hash: 2eb5329
- Date: 2025-08-18
- Author: mikeyoung304

**Stats:** 5082 bytes, 599 words

**Risk Flags:** None

**Overlap Category:** SECURITY.md / AUTHENTICATION_ARCHITECTURE.md

**Suggested Action:** Review

**Rationale:** Assess relevance and overlap with core docs

**First 10 lines:**
```
# Voice System Integration Guide

## Quick Start

### 1. Environment Variables
Add these to your `.env` file:

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

---

### supabase/MIGRATION_GUIDE.md

**Title:** Supabase Cloud Migration Guide

**Last Commit:**
- Hash: e212d23
- Date: 2025-08-12
- Author: mikeyoung304

**Stats:** 3839 bytes, 544 words

**Risk Flags:** None

**Overlap Category:** ROADMAP.md / PRODUCTION_STATUS.md

**Suggested Action:** Review

**Rationale:** Assess relevance and overlap with core docs

**First 10 lines:**
```
# Supabase Cloud Migration Guide

## Overview

This project uses **cloud-only Supabase** - no local database required!

## Quick Start

### First Time Setup
```bash
```

---

### TESTING_CHECKLIST.md

**Title:** Restaurant OS v6.0.7 - Testing Checklist

**Last Commit:**
- Hash: 758a670
- Date: 2025-10-12
- Author: mikeyoung304

**Stats:** 16820 bytes, 2428 words

**Risk Flags:** None

**Overlap Category:** DEPLOYMENT.md

**Suggested Action:** Review

**Rationale:** Root-level operational doc - assess if still current

**First 10 lines:**
```
# Restaurant OS v6.0.7 - Testing Checklist

## ✅ Status: 90% Production Ready, Awaiting Fall Menu

**Recent Commits**:
- `c675a1a` - feat(auth): grant managers full admin access
- `1ef8ef5` - fix(auth): correct role_scopes column name
- `7fda07a` - feat(kitchen): upgrade to optimized display with table grouping
- `93055bc` - refactor: migrate to pure supabase auth

```

---

