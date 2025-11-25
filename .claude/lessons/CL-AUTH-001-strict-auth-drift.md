# CL-AUTH-001: STRICT_AUTH Environment Drift

**Severity:** P0 | **Cost:** $20K | **Duration:** 48 days | **Commits:** 9e97f720, acd6125c

## Problem

Local dev uses `STRICT_AUTH=false`, production uses `true`. Supabase JWTs lack `restaurant_id` claim, causing 401 errors in production while local works fine.

## Bug Pattern

```typescript
// BROKEN: Direct Supabase auth returns JWT without restaurant_id
const { data } = await supabase.auth.signInWithPassword({ email, password });
// JWT payload: { sub, email, role } - NO restaurant_id
// Production STRICT_AUTH=true rejects → "Authentication Required" loop
```

## Fix Pattern

```typescript
// CORRECT: Use custom endpoint that includes restaurant_id in JWT
const response = await httpClient.post('/api/v1/auth/login', {
  email,
  password,
  restaurantId: resolvedRestaurantId  // UUID, not slug
});

// Store in localStorage for httpClient access
localStorage.setItem('auth_session', JSON.stringify({
  user: response.user,
  session: response.session,
  restaurantId: response.restaurantId
}));

// Sync httpClient state (CRITICAL - 5 locations need this)
setCurrentRestaurantId(response.restaurantId);
```

## Prevention Checklist

- [ ] Never use `supabase.auth.signInWithPassword()` for workspace login
- [ ] Always test locally with `STRICT_AUTH=true`
- [ ] JWT must include: `sub`, `email`, `role`, `scope[]`, `restaurant_id`
- [ ] Sync both React state AND httpClient state after login
- [ ] Hardcode slug-to-UUID resolution (no network call)

## Detection

- "Authentication Required" modal in infinite loop
- 401 on `/api/v1/auth/me`
- Works locally, fails in production
