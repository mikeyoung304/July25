# Issue Tracking Matrix - Restaurant OS v6.0

## Priority Legend

- **P0**: Critical - System breaking, immediate fix required
- **P1**: High - Major functionality impacted, fix within 48 hours
- **P2**: Medium - Important but not urgent, fix within 1 week
- **P3**: Low - Nice to have, can be scheduled

## Issue Status Codes

- 🔴 **OPEN** - Not started
- 🟡 **IN_PROGRESS** - Being worked on
- 🟢 **RESOLVED** - Completed
- ⚫ **BLOCKED** - Waiting on dependency

---

## Critical Issues (P0)

| ID   | Issue                                               | Component        | Impact                             | Status  | Owner | ETA |
| ---- | --------------------------------------------------- | ---------------- | ---------------------------------- | ------- | ----- | --- |
| C001 | WebSocket tests disabled causing zero coverage      | WebSocketService | No real-time functionality testing | 🔴 OPEN | -     | 24h |
| C002 | Missing KDS status fallbacks causing runtime errors | Kitchen Display  | System crashes on unknown status   | 🔴 OPEN | -     | 24h |
| C003 | Environment variables exposed in client code        | Security         | API keys potentially exposed       | 🔴 OPEN | -     | 24h |
| C004 | No rate limiting on voice order endpoint            | API Security     | DDoS vulnerability                 | 🔴 OPEN | -     | 24h |

## High Priority Issues (P1)

| ID   | Issue                                            | Component       | Impact                          | Status  | Owner | ETA |
| ---- | ------------------------------------------------ | --------------- | ------------------------------- | ------- | ----- | --- |
| H001 | WebRTCVoiceClient needs refactoring (1259 lines) | Voice System    | Maintainability issues          | 🔴 OPEN | -     | 48h |
| H002 | Missing error boundaries in KDS components       | Kitchen Display | Cascading failures              | 🔴 OPEN | -     | 48h |
| H003 | No connection pooling for database               | Database        | Performance degradation         | 🔴 OPEN | -     | 48h |
| H004 | FloorPlanEditor component too large (783 lines)  | UI              | Hard to maintain                | 🔴 OPEN | -     | 72h |
| H005 | OrderParser lacks comprehensive tests            | Orders          | Potential parsing errors        | 🔴 OPEN | -     | 72h |
| H006 | Missing CSRF protection                          | Security        | Cross-site request forgery risk | 🔴 OPEN | -     | 48h |

## Medium Priority Issues (P2)

| ID   | Issue                                       | Component    | Impact                 | Status  | Owner | ETA |
| ---- | ------------------------------------------- | ------------ | ---------------------- | ------- | ----- | --- |
| M001 | 35 TODO/FIXME comments in codebase          | Code Quality | Technical debt         | 🔴 OPEN | -     | 1w  |
| M002 | Test coverage at 45% (target 60%)           | Testing      | Quality assurance gaps | 🔴 OPEN | -     | 1w  |
| M003 | No lazy loading for heavy components        | Performance  | Slower initial load    | 🔴 OPEN | -     | 1w  |
| M004 | Missing input sanitization for voice orders | Security     | Injection attacks      | 🔴 OPEN | -     | 1w  |
| M005 | No monitoring/alerting system               | Operations   | Blind to issues        | 🔴 OPEN | -     | 1w  |
| M006 | Bundle size not optimized                   | Performance  | Slower load times      | 🔴 OPEN | -     | 1w  |
| M007 | N+1 query patterns detected                 | Database     | Performance issues     | 🔴 OPEN | -     | 1w  |
| M008 | No service worker for offline support       | PWA          | No offline capability  | 🔴 OPEN | -     | 2w  |

## Low Priority Issues (P3)

| ID   | Issue                                  | Component     | Impact                  | Status  | Owner | ETA |
| ---- | -------------------------------------- | ------------- | ----------------------- | ------- | ----- | --- |
| L001 | Missing visual regression tests        | Testing       | UI changes undetected   | 🔴 OPEN | -     | 1m  |
| L002 | No CDN for static assets               | Performance   | Higher bandwidth costs  | 🔴 OPEN | -     | 1m  |
| L003 | Incomplete API documentation           | Documentation | Developer experience    | 🔴 OPEN | -     | 2w  |
| L004 | No load testing suite                  | Testing       | Unknown capacity limits | 🔴 OPEN | -     | 1m  |
| L005 | Missing code splitting in voice module | Performance   | Larger initial bundle   | 🔴 OPEN | -     | 2w  |

---

## Technical Debt Items

| Area                     | Count | Severity | Files Affected           |
| ------------------------ | ----- | -------- | ------------------------ |
| TODO Comments            | 35    | Medium   | 16 files                 |
| Skipped Tests            | 15    | High     | 8 test files             |
| Large Files (>500 lines) | 6     | Medium   | Voice, FloorPlan, Orders |
| Outdated Dependencies    | 21    | Low-High | package.json files       |
| Type Coverage Gaps       | 13%   | Low      | Various TypeScript files |

---

## Security Vulnerabilities

| CVE/Issue             | Package        | Severity | Status  | Resolution                   |
| --------------------- | -------------- | -------- | ------- | ---------------------------- |
| API Key Exposure      | Environment    | Critical | 🔴 OPEN | Use secrets manager          |
| Missing Rate Limiting | Express Routes | High     | 🔴 OPEN | Implement express-rate-limit |
| No CSRF Token         | Authentication | High     | 🔴 OPEN | Add csrf middleware          |
| Unvalidated Input     | Voice Orders   | Medium   | 🔴 OPEN | Add joi/zod validation       |
| JWT Secret Hardcoded  | Auth           | High     | 🔴 OPEN | Move to environment          |

---

## Performance Bottlenecks

| Metric            | Current        | Target | Status | Action Required           |
| ----------------- | -------------- | ------ | ------ | ------------------------- |
| Bundle Size       | 172KB          | <150KB | 🟡     | Code splitting needed     |
| Initial Load      | 2.3s           | <2s    | 🔴     | Optimize critical path    |
| Memory Usage      | 8GB            | <4GB   | 🔴     | Memory leak investigation |
| API Response Time | 250ms avg      | <200ms | 🟡     | Add caching layer         |
| Database Queries  | 12 avg/request | <8     | 🔴     | Query optimization        |

---

## Dependencies Requiring Updates

### Critical Security Updates

| Package             | Current | Latest | Risk | Update Command |
| ------------------- | ------- | ------ | ---- | -------------- |
| TBD after npm audit | -       | -      | -    | -              |

### Major Version Updates

| Package    | Current     | Latest | Breaking Changes | Notes                  |
| ---------- | ----------- | ------ | ---------------- | ---------------------- |
| React      | 19.1.0      | 19.1.0 | None             | Already latest         |
| TypeScript | 5.3.3/5.8.3 | 5.8.3  | Align versions   | Update client to match |
| Vite       | 5.4.19      | 5.4.19 | None             | Already latest         |

---

## Escalation Path

1. **P0 Issues**: Immediate escalation to Tech Lead
2. **P1 Issues**: Daily standup review
3. **P2 Issues**: Weekly sprint planning
4. **P3 Issues**: Backlog grooming

## Review Schedule

- **Daily**: P0 and P1 status check
- **Weekly**: Full matrix review
- **Monthly**: Technical debt assessment

---

**Last Updated:** August 25, 2025  
**Next Review:** August 26, 2025 (Daily)  
**Matrix Version:** 1.0.0

_Generated by Autonomous Audit System_
