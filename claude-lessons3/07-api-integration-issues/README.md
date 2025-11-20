# api integration issues

## Files in this category:
- **LESSONS.md** - Incidents, patterns, and quick reference
- **PREVENTION.md** - How to prevent these issues

# Lesson 07: API Integration Issues - The $20K Education

**Created:** 2025-11-19
**Category:** Critical Incident Analysis
**Impact:** $20,000+ in debugging costs, 61+ hours on top 5 issues
**Status:** Active Learning Document

---

## Executive Summary

Over 6 months of development (June-November 2025), the Restaurant OS project encountered **168 API integration bug fixes** out of 1,750 total commits (9.6% of all work). The top 5 incidents consumed **61+ developer hours** and taught critical lessons about API provider reliability, timeout handling, and silent API changes.

### Financial Impact

| Category | Hours | Rate | Cost |
|----------|-------|------|------|
| Top 5 Incidents | 61+ | $150/hr | $9,150+ |
| 163 Other API Fixes | 80+ | $150/hr | $12,000+ |
| **Total Estimated** | **141+** | **$150/hr** | **$21,150+** |

### The Hard Truth

**Silent API changes are the #1 threat to production systems.** OpenAI's whisper-1 deprecation cost 8 hours to debug because:
- No deprecation notice was sent
- The API accepted the config but silently ignored it
- Everything else worked (connection, audio, responses)
- Only transcription events stopped coming

---

## Top 5 Most Expensive Incidents

### 1. OpenAI Model Breaking Change (8 hours)
- **Date:** November 18, 2025
- **Cost:** $1,200
- **Root Cause:** OpenAI silently deprecated whisper-1 for Realtime API
- **Fix:** 1 line: `model: 'whisper-1'` → `model: 'gpt-4o-transcribe'`
- **Commits:** 3a5d126f, d42b2c74

### 2. Auth Token Synchronization Crisis (24 hours)
- **Date:** November 2-18, 2025
- **Cost:** $3,600
- **Root Cause:** httpClient state not synced with React auth context
- **Symptom:** Login hung at "Signing in..." indefinitely
- **Commits:** acd6125c, 9e97f720, a3514472

### 3. Square Payment Timeout (12 hours)
- **Date:** November 10, 2025
- **Cost:** $1,800
- **Root Cause:** No timeout on Square API calls
- **Impact:** Customers waiting indefinitely, abandoned carts
- **Fix:** 30-second timeout wrapper with Promise.race()
- **Commit:** cf7d9320

### 4. Square Audit Race Condition (10 hours)
- **Date:** November 10, 2025
- **Cost:** $1,500
- **Root Cause:** Audit logging AFTER payment processing
- **Impact:** Customers charged but system shows error
- **Fix:** Two-phase audit (log before charge, update after)
- **Commit:** dc8afec6

### 5. Voice WebRTC Race Condition (7 hours)
- **Date:** November 10, 2025
- **Cost:** $1,050
- **Root Cause:** DataChannel onmessage attached 50-100ms late
- **Impact:** Lost session.created events, cascade failures
- **Fix:** Attach handler BEFORE channel opens
- **Commit:** 500b820c

---

## API Provider Issues Encountered

### OpenAI Realtime API
- **Issue:** Silent model deprecation (whisper-1)
- **Cost:** 8 hours debugging
- **Pattern:** Accepted config but ignored transcription
- **Learning:** Always check provider changelogs before debugging

### Square Payments API
- **Issue:** No timeout protection, race conditions
- **Cost:** 22 hours across 3 incidents
- **Pattern:** Network hangs, audit timing bugs
- **Learning:** Always add timeouts, log before external API calls

### Supabase Auth
- **Issue:** JWT token synchronization, RLS policy conflicts
- **Cost:** 24 hours across multiple rewrites
- **Pattern:** State drift between auth providers
- **Learning:** Single source of truth for auth state

---

## Key Patterns Identified

### 1. Silent API Changes (40% of incidents)
- Provider deprecates feature without notice
- API accepts old config but ignores it
- No error events or response codes
- Everything else works normally

**Prevention:** Monitor provider changelogs, set up alerts

### 2. Timeout Failures (30% of incidents)
- No timeout on external API calls
- Network issues cause infinite hangs
- Customers wait indefinitely with no feedback

**Prevention:** 30-second default timeout on all external APIs

### 3. Race Conditions (20% of incidents)
- Async handlers attached too late
- State updates out of order
- Audit logs after state changes

**Prevention:** Attach handlers before operations, log before state changes

### 4. Environment Variable Issues (10% of incidents)
- Newline characters from CLI tools
- Missing validation at startup
- Silent failures in production

**Prevention:** Trim all env vars, validate at startup

---

## Business Impact

### Customer Experience
- **Voice Ordering:** Complete failure for 2 weeks (OpenAI model change)
- **Payments:** Infinite loading states, abandoned carts (timeout issue)
- **Auth:** "Signing in..." hang for 16 days (token sync issue)

### Development Velocity
- **168 bug fixes** = 9.6% of all commits
- **141+ hours** debugging API issues
- **3 authentication rewrites** in 4 months

### Production Incidents
- **5 P0 incidents** requiring immediate fixes
- **$20K+ in debugging costs**
- **Multiple production deployments** to resolve issues

---

## Success Metrics (Current State)

After implementing lessons learned:
-  **30-second timeout** on all external APIs
-  **Two-phase audit logging** for payments
-  **Environment variable trimming** at startup
-  **API key validation** before first use
-  **Comprehensive logging** for race condition debugging
-  **97.4% documentation link health** (from 84%)
-  **90% production readiness** (from 65%)

---

## Related Documentation

- [PATTERNS.md](./PATTERNS.md) - API integration patterns and best practices
- [INCIDENTS.md](./INCIDENTS.md) - Detailed incident reports with timelines
- [PREVENTION.md](./PREVENTION.md) - Solutions and monitoring strategies
- [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Practical code examples
- [AI-AGENT-GUIDE.md](./AI-AGENT-GUIDE.md) - Guidelines for AI-assisted development

---

## Key Takeaways

1. **Always add timeouts** - 30 seconds for payments, 5 seconds for DB queries
2. **Log before external APIs** - Enables forensic analysis when things fail
3. **Validate at startup** - Catch config issues before production traffic
4. **Monitor provider changelogs** - Silent API changes are common
5. **Single source of truth** - State synchronization is error-prone

---

**Last Updated:** 2025-11-19
**Next Review:** 2025-12-19
**Maintainer:** Technical Lead

