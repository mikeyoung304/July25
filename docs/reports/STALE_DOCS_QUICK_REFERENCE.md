# Stale Documentation - Quick Reference Guide
**Date:** November 19, 2025
**Total Files Requiring Updates:** 15

---

## P0 CRITICAL (Update This Week)

### File 1: VOICE_ORDERING_TROUBLESHOOTING.md
- **Path:** `/Users/mikeyoung/CODING/rebuild-6.0/docs/how-to/operations/VOICE_ORDERING_TROUBLESHOOTING.md`
- **Last Updated:** January 18, 2025 (301 days old)
- **Current Status:** STALE - Predates Phase 2/3 improvements
- **Priority:** CRITICAL
- **Effort:** 90 minutes
- **Key Action:** Update timestamp, add Phase 2 findings, document current model status

### File 2: VOICE_MODEL_MIGRATION_GUIDE.md
- **Path:** `/Users/mikeyoung/CODING/rebuild-6.0/docs/how-to/operations/VOICE_MODEL_MIGRATION_GUIDE.md`
- **Last Updated:** January 18, 2025 (306 days old)
- **Current Status:** VERY STALE - Outdated, needs archive + Phase 2 update
- **Priority:** CRITICAL
- **Effort:** 120 minutes
- **Key Action:** Archive whisper-1 section, document Phase 2 refactoring, update timestamp

### File 3: GETTING_STARTED.md
- **Path:** `/Users/mikeyoung/CODING/rebuild-6.0/docs/tutorials/GETTING_STARTED.md`
- **Last Updated:** October 31, 2025 (19 days old)
- **Current Status:** FRESH but references deprecated code
- **Priority:** CRITICAL
- **Effort:** 45 minutes
- **Key Action:** Mark deprecated auth methods, add dual-auth pattern, document Phase 3 auth

### File 4: PRODUCTION_STATUS.md
- **Path:** `/Users/mikeyoung/CODING/rebuild-6.0/docs/PRODUCTION_STATUS.md`
- **Last Updated:** November 2, 2025 (17 days old)
- **Current Status:** STALE VERSION - Shows v6.0.15 (should be v6.0.14)
- **Priority:** CRITICAL
- **Effort:** 60 minutes
- **Key Action:** Update version, add documentation readiness section, revise readiness %

### File 5: AUTH_ROLES.md
- **Path:** `/Users/mikeyoung/CODING/rebuild-6.0/docs/reference/config/AUTH_ROLES.md`
- **Last Updated:** November 7, 2025 (12 days old)
- **Current Status:** STALE VERSION - Shows v6.0.15 (should be v6.0.14)
- **Priority:** CRITICAL
- **Effort:** 45 minutes
- **Key Action:** Update version, add Phase 3 auth methods (PIN, station), document JWT scope fix

### File 6: SECURITY.md
- **Path:** `/Users/mikeyoung/CODING/rebuild-6.0/SECURITY.md` (ROOT LEVEL)
- **Last Updated:** Unknown (before Oct 15)
- **Current Status:** VERY STALE VERSION - Shows v6.0.8 (should be v6.0.14)
- **Priority:** CRITICAL
- **Effort:** 75 minutes
- **Key Action:** Update version, add Nov security updates, document incident response

### File 7: ENVIRONMENT.md
- **Path:** `/Users/mikeyoung/CODING/rebuild-6.0/docs/reference/config/ENVIRONMENT.md`
- **Last Updated:** November 15, 2025 (4 days old)
- **Current Status:** CORRUPT - Table formatting broken, VITE_OPENAI_API_KEY security risk
- **Priority:** CRITICAL
- **Effort:** 60 minutes
- **Key Action:** Fix table corruption, remove VITE_OPENAI_API_KEY, document Phase 3 variables

### File 8: DEPLOYMENT.md
- **Path:** `/Users/mikeyoung/CODING/rebuild-6.0/docs/how-to/operations/DEPLOYMENT.md`
- **Last Updated:** October 31, 2025 (19 days old)
- **Current Status:** INCOMPLETE - Missing November deployment learnings
- **Priority:** CRITICAL
- **Effort:** 90 minutes
- **Key Action:** Add Nov learnings, document Sentry setup, add rollback procedures

---

## P1 HIGH PRIORITY (Update Within 2 Weeks)

### File 9: AUTHENTICATION_ARCHITECTURE.md
- **Path:** `/Users/mikeyoung/CODING/rebuild-6.0/docs/explanation/architecture/AUTHENTICATION_ARCHITECTURE.md`
- **Last Updated:** November 19, 2025 (TODAY but needs expansion)
- **Current Status:** Recent but incomplete - Missing 3 auth rewrites history
- **Priority:** HIGH
- **Effort:** 90 minutes
- **Key Action:** Add evolution timeline, document why rewrites happened, add Phase 3 changes

### File 10: APP_OVERVIEW.md
- **Path:** `/Users/mikeyoung/CODING/rebuild-6.0/docs/learning-path/01_APP_OVERVIEW.md`
- **Last Updated:** November 18, 2025 (1 day old)
- **Current Status:** RECENT but has API path errors (flagged in audit)
- **Priority:** HIGH
- **Effort:** 60 minutes
- **Key Action:** Verify all API paths, add Phase 3 features, update feature completeness

### File 11: KDS-BIBLE.md
- **Path:** `/Users/mikeyoung/CODING/rebuild-6.0/docs/how-to/operations/KDS-BIBLE.md`
- **Last Updated:** Unknown (need to check)
- **Current Status:** Unknown - Critical ops feature, may be stale
- **Priority:** HIGH
- **Effort:** 60 minutes
- **Key Action:** Verify timestamp, add Phase 3 improvements, document performance metrics

### File 12: WEBSOCKET_EVENTS.md
- **Path:** `/Users/mikeyoung/CODING/rebuild-6.0/docs/reference/api/WEBSOCKET_EVENTS.md`
- **Last Updated:** November 19, 2025 (TODAY but missing status table)
- **Current Status:** MISLEADING - Notifications documented as working but stubbed
- **Priority:** CRITICAL (downgraded from HIGH due to business impact)
- **Effort:** 45 minutes
- **Key Action:** Add implementation status table, mark stubbed features clearly, add timeline

### File 13: PRODUCTION_DEPLOYMENT_CHECKLIST.md
- **Path:** `/Users/mikeyoung/CODING/rebuild-6.0/docs/how-to/operations/runbooks/PRODUCTION_DEPLOYMENT_CHECKLIST.md`
- **Last Updated:** Unknown (need to check)
- **Current Status:** Unknown - May be missing recent security checks
- **Priority:** HIGH
- **Effort:** 45 minutes
- **Key Action:** Add docs validation, add security checks, add version verification

### File 14: INCIDENT_RESPONSE.md
- **Path:** `/Users/mikeyoung/CODING/rebuild-6.0/docs/how-to/operations/runbooks/INCIDENT_RESPONSE.md`
- **Last Updated:** November 19, 2025 (NEW FILE)
- **Current Status:** NEW - Verify completeness (was flagged as "missing" in audit)
- **Priority:** CRITICAL (operations lifeline)
- **Effort:** 120 minutes
- **Key Action:** Verify covers all incident types, include timelines, add escalation procedures

### File 15: ROLLBACK_PROCEDURES.md
- **Path:** `/Users/mikeyoung/CODING/rebuild-6.0/docs/how-to/operations/runbooks/ROLLBACK_PROCEDURES.md`
- **Last Updated:** November 19, 2025 (NEW FILE)
- **Current Status:** NEW - Verify completeness (was flagged as "missing" in audit)
- **Priority:** CRITICAL (incident response dependency)
- **Effort:** 90 minutes
- **Key Action:** Document frontend/backend/database rollbacks, include verification steps

---

## QUICK WINS (Can Do Today - 2.5 Hours)

### Quick Win 1: Version Numbers (15 minutes)
**Files to update:**
- PRODUCTION_STATUS.md: Line 8, v6.0.15 → v6.0.14
- AUTH_ROLES.md: Line 4, v6.0.15 → v6.0.14
- SECURITY.md: Line 45, v6.0.8 → v6.0.14

### Quick Win 2: Timestamps (10 minutes)
**Files to update:**
- VOICE_ORDERING_TROUBLESHOOTING.md: Line 3, change timestamp
- VOICE_MODEL_MIGRATION_GUIDE.md: Line 3, change timestamp

### Quick Win 3: API Paths - Payment (15 minutes)
**File:** `/docs/reference/api/openapi.yaml` and `/docs/learning-path/01_APP_OVERVIEW.md`
**Search:** `/api/v1/payments/process`
**Replace:** `/api/v1/payments/create`

### Quick Win 4: API Paths - Menu (15 minutes)
**Files:** Any file referencing `/api/v1/items`
**Search:** `/api/v1/items`
**Replace:** `/api/v1/menu/items`

### Quick Win 5: Remove Security Risk (10 minutes)
**File:** `/docs/reference/config/ENVIRONMENT.md`
**Action:** Remove VITE_OPENAI_API_KEY from required list
**Add:** Security warning explaining removal

### Quick Win 6: Mark Notifications (5 minutes)
**File:** `/docs/reference/api/WEBSOCKET_EVENTS.md`
**Action:** Add table at top showing implementation status
**Mark:** kitchen:notification, customer:notification as PLANNED

### Quick Win 7: Verify Incident Response (15 minutes)
**File:** `/docs/how-to/operations/runbooks/INCIDENT_RESPONSE.md`
**Action:** Verify includes payment failures, voice failures, auth failures, WebSocket issues

### Quick Win 8: Verify Rollback Procedures (15 minutes)
**File:** `/docs/how-to/operations/runbooks/ROLLBACK_PROCEDURES.md`
**Action:** Verify includes Vercel, Render, and database rollback steps

---

## AUDIT REFERENCES

**Full Audit Report Location:**
- Master synthesis: `/Users/mikeyoung/CODING/rebuild-6.0/nov18scan/docs-audit/00_MASTER_DOCS_SYNTHESIS.md`
- Freshness audit: `/Users/mikeyoung/CODING/rebuild-6.0/nov18scan/docs-audit/06_freshness_links.md`
- API docs audit: `/Users/mikeyoung/CODING/rebuild-6.0/nov18scan/docs-audit/01_api_documentation.md`

**November 18 Execution Summary:**
- Main summary: `/Users/mikeyoung/CODING/rebuild-6.0/nov18scan/EXECUTION_SUMMARY.md`
- Master overview: `/Users/mikeyoung/CODING/rebuild-6.0/nov18scan/00_MASTER_OVERVIEW.md`

---

## NEXT STEPS

1. **TODAY:** Review this document, execute quick wins (2.5 hours)
2. **THIS WEEK:** Complete P0 critical fixes (16 hours)
3. **NEXT 2 WEEKS:** Complete P1 high priority (28 hours)
4. **ONGOING:** Implement docs validation in CI/CD

**Status:** Ready for immediate action
**Generated:** November 19, 2025
