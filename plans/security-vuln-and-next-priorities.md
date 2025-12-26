# Security Vulnerabilities & Codebase Excellence

## Guiding Principle

**Codebase excellence over expediency.** Dead code is debt. Inaccurate docs are lies. Untested fixes are hopes.

## Actions

### 1. Update vite (Security Patch)
```bash
npm install vite@5.4.21
```
- Fixes esbuild CORS vulnerability
- Fixes 3 vite CVEs
- Zero breaking changes

### 2. Delete csurf Entirely

CSRF middleware is unused:
- All `/api/v1/*` routes skip CSRF (JWT + RBAC instead)
- Skipped in development
- No form-based submissions in this SPA
- Package is deprecated and unmaintained

**Action:**
1. Verify no routes outside `/api/v1/*` exist
2. Remove `csurf` and `@types/csurf` from dependencies
3. Delete `server/src/middleware/csrf.ts`
4. Remove imports from `server/src/server.ts`

### 3. Hard-Fail Demo Mode in Production

Demo credentials must never be accessible in production.

```typescript
// server startup
if (process.env.NODE_ENV === 'production' && process.env.DEMO_LOGIN_ENABLED === 'true') {
  logger.error('FATAL: DEMO_LOGIN_ENABLED=true in production. Refusing to start.');
  process.exit(1);
}
```

### 4. Fix Square→Stripe Documentation (159 Files)

Inaccurate documentation is technical debt. All references to Square must be corrected:
- OpenAPI spec
- Architecture docs
- ADRs
- Deployment guides

### 5. Verify P0 Payment Fixes

Fixes without tests are hopes. Add verification:
- Stripe webhook: Test raw body signature verification
- Double-payment: Test 409 response for already-paid orders
- RLS: Confirm service role inserts work

## Rejected Approaches

- **`npm audit fix --force`**: Downgrades csurf (wrong direction)
- **Replace csurf with fork**: Installing code for unused middleware
- **"Fix when touched" for docs**: Perpetuates inaccuracy

## Acceptance Criteria

- [ ] `npm audit` shows 0 vulnerabilities
- [ ] No csurf in codebase
- [ ] Demo mode hard-fails in production
- [ ] Zero Square references in documentation
- [ ] Payment fixes have test coverage
