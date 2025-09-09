# Authentication Guardrails
Effective: 2025-01-30

## Strict Rules - NO EXCEPTIONS

### 1. Authentication
- ✅ **ONLY** Supabase sessions (email/password + PIN)
- ❌ **NO** test-token
- ❌ **NO** demo headers (x-demo-token-version)
- ❌ **NO** local JWT generation
- ❌ **NO** loginAsDemo methods
- ❌ **NO** DEMO_AUTH_TOKEN in sessionStorage

### 2. WebSocket
- ✅ Connect **ONLY AFTER** valid Supabase session exists
- ❌ **NO** connection without authentication
- ❌ **NO** test-token fallbacks
- ❌ **NO** duplicate WebSocket services

### 3. Route Protection
- ✅ Home page (`/`) is **PUBLIC** - no auth required
- ✅ Protected routes **MUST** redirect to `/login` when unauthenticated
- ✅ Use single `ProtectedRoute` component
- ❌ **NO** rendering protected content before auth check

### 4. Restaurant Context
- ✅ Restaurant ID from user's session/JWT
- ❌ **NO** hardcoded `11111111-1111-1111-1111-111111111111`
- ❌ **NO** default restaurant IDs in client code

### 5. CORS
- ✅ Strict origin allowlist (no wildcards)
- ✅ Standard headers only: Authorization, Content-Type, X-CSRF-Token, X-Restaurant-ID
- ❌ **NO** demo-specific headers
- ❌ **NO** duplicate headers

### 6. Development Mode
- ✅ Login helper shows seeded emails/PINs (display only)
- ✅ Helper calls **REAL** Supabase sign-in
- ❌ **NO** silent token generation
- ❌ **NO** bypass authentication

## Validation Checklist
- [ ] No "test-token" string in codebase
- [ ] No "DEMO_AUTH_TOKEN" references
- [ ] No "loginAsDemo" methods
- [ ] No hardcoded restaurant IDs (except tests)
- [ ] WebSocket requires authentication
- [ ] Home page accessible without login
- [ ] Protected routes redirect when unauthorized
- [ ] CORS headers cleaned up
- [ ] Dev login helper uses real auth

## Breaking These Rules = Build Failure
Any violation of these guardrails should trigger immediate build failure and PR rejection.