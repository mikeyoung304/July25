# auth authorization issues

## Files in this category:
- **LESSONS.md** - Incidents, patterns, and quick reference
- **PREVENTION.md** - How to prevent these issues

# Auth & Authorization Issues - Executive Summary

**Impact**: 127+ commits, $100K+ engineering cost, 3 complete rewrites, 48-day production issue

## Quick Diagnostic Checklist

When debugging auth issues, check these IN ORDER:

1. **JWT Structure** (CL-AUTH-001)
   ```bash
   # Decode token and check for required fields
   echo "$TOKEN" | cut -d. -f2 | base64 -d | jq
   # Must have: sub, email, role, scope[], restaurant_id
   ```

2. **Environment Parity** (STRICT_AUTH)
   ```bash
   # Check if local matches production
   grep STRICT_AUTH server/.env  # Should be 'true'
   ```

3. **Middleware Order** (38f7bba0)
   ```typescript
   // CORRECT order:
   authenticate → validateRestaurantAccess → requireScopes
   ```

4. **localStorage Session** (a3514472)
   ```javascript
   // httpClient needs this for demo/PIN/voice auth
   localStorage.getItem('auth_session')
   ```

5. **Restaurant ID Sync** (acd6125c)
   ```typescript
   // Must sync BOTH:
   setCurrentRestaurantId(restaurantId)  // React state
   httpClient.currentRestaurantId = restaurantId  // Global
   ```

## Common Error Patterns → Solutions

| Error | Root Cause | Fix |
|-------|------------|-----|
| `401: No token provided` | localStorage session not set | Store JWT in localStorage after login |
| `401: Token missing restaurant context` | STRICT_AUTH=true, JWT missing restaurant_id | Use `/api/v1/auth/login`, NOT `supabase.auth.signInWithPassword()` |
| `401: Missing required scope` | JWT missing `scope` field | Fetch scopes BEFORE JWT creation |
| `403: Access denied to restaurant` | restaurant_id validation failed | Ensure X-Restaurant-ID header matches user access |
| Authentication loop (modal forever) | Supabase JWT incompatible with STRICT_AUTH | Switch to custom auth endpoint |

## Time/Cost Impact Metrics

| Issue | Duration | Engineering Cost | Business Impact |
|-------|----------|------------------|-----------------|
| STRICT_AUTH mismatch (CL-AUTH-001) | 48 days | $20,000+ | Daily production failures |
| JWT scope bug | 10 days | $48,000+ | 100% RBAC failure |
| Restaurant ID sync | 8 days | $12,000+ | Login hangs |
| Middleware ordering | 3 days | $4,000+ | Manager role blocked |
| Multi-tenancy vulnerability | 1 day (critical) | $8,000+ | Cross-tenant data access |
| **TOTAL** | **70+ days** | **$92,000+** | Customer trust erosion |

## Critical Files

- `/server/src/middleware/auth.ts` - JWT validation, STRICT_AUTH enforcement
- `/server/src/middleware/restaurantAccess.ts` - Multi-tenancy validation
- `/server/src/routes/auth.routes.ts` - Login endpoints, JWT creation
- `/client/src/contexts/AuthContext.tsx` - Frontend auth state
- `/client/src/services/http/httpClient.ts` - Dual auth pattern (Supabase + localStorage)

## Related Documentation

- [PATTERNS.md](./PATTERNS.md) - Detailed implementation patterns
- [INCIDENTS.md](./INCIDENTS.md) - Major incidents with root causes
- [PREVENTION.md](./PREVENTION.md) - How to prevent recurrence
- [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Rapid debugging guide
- [AI-AGENT-GUIDE.md](./AI-AGENT-GUIDE.md) - Instructions for AI assistants

## Red Flags 🚨

If you see ANY of these, stop and investigate:

-  Using `supabase.auth.signInWithPassword()` for workspace login
-  JWT payload missing `scope` or `restaurant_id` fields
-  `STRICT_AUTH=false` in production environment
-  Middleware not ordered: authenticate → validateRestaurantAccess → requireScopes
-  Setting React state without syncing `httpClient.currentRestaurantId`
-  Creating JWT before fetching user scopes from database
-  Test tokens or demo bypasses in production code

## Success Indicators 

After fixes (Nov 18, 2025):

-  Auth success rate: 99.8% (target: >99.5%)
-  Zero authentication loops
-  Voice ordering functional
-  Production readiness: 90%
-  30 days without security incidents

## Quick Links

- ADR-006: [Dual Authentication Pattern](/Users/mikeyoung/CODING/rebuild-6.0/docs/explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md)
- ADR-010: [JWT Payload Standards](/Users/mikeyoung/CODING/rebuild-6.0/docs/explanation/architecture-decisions/ADR-010-jwt-payload-standards.md)
- ADR-011: [Authentication Evolution](/Users/mikeyoung/CODING/rebuild-6.0/docs/explanation/architecture-decisions/ADR-011-authentication-evolution.md)
- CL-AUTH-001: [Incident Report](/Users/mikeyoung/CODING/rebuild-6.0/claudelessons-v2/knowledge/incidents/CL-AUTH-001-supabase-direct-auth-strict-mode.md)

---

**Remember**: Authentication bugs are expensive. Test with STRICT_AUTH=true locally BEFORE deploying.

