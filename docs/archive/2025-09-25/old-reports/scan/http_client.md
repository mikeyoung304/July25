# HttpClient Analysis
Generated: 2025-01-30

## Demo Auth Integration Points

### Current Implementation
- **Lines 139-153**: Primary demo token fallback
  - If no Supabase session, tries getDemoToken()
  - Imports from '@/services/auth/demoAuth'
  - Sets Authorization header with demo JWT
  - Falls back to 'test-token' in dev mode

- **Lines 157-169**: Secondary fallback on auth error
  - If Supabase session fetch fails, tries demo token again
  - Final fallback to test token in dev

### Headers Added
- `Authorization: Bearer {token}` - Auth token (Supabase, demo, or test)
- `x-restaurant-id` - Restaurant context (defaults to demo ID)

### Key Issues
1. **Silent Auto-Loading**: Demo auth happens invisibly at HTTP layer
2. **No User Feedback**: Users don't know they're in demo mode
3. **Mixed Auth Sources**: Supabase session vs local demo JWT
4. **Multiple Fallbacks**: Complex cascade of auth attempts

### DemoAuthService Usage
- Fetches token from `/api/v1/auth/kiosk` endpoint
- Caches token in sessionStorage with versioning
- Auto-refreshes when expired
- Uses header: `x-demo-token-version`

## Recommendation
Remove this silent fallback and make demo auth explicit through AuthContext with real Supabase sessions.