# Authentication Flow Confirmation
Generated: 2025-09-03

## Auth Token Reality Check

| Endpoint | File:Line | Token Type | Returns | RLS Compatible |
|----------|-----------|------------|---------|----------------|
| `/api/v1/auth/kiosk` | auth.routes.ts:72-75 | Local JWT (HS256) | `{ token, expiresIn }` | ❌ No - not a real Supabase user |
| `/api/v1/auth/login` | auth.routes.ts:167-178 | Supabase Session | `{ user, session: { access_token, refresh_token } }` | ✅ Yes - real auth.users entry |
| `/api/v1/auth/pin-login` | auth.routes.ts:220-234 | Supabase Session | `{ user, token, session: { access_token } }` | ✅ Yes - uses userService.authenticateWithPin |
| `/api/v1/auth/station-login` | auth.routes.ts:271-276 | Local JWT | `{ token, expiresAt, stationType }` | ❌ No - local station token |

## Critical Finding: Auth Table Dependencies

The RLS policies found in the database ALL reference `user_restaurants` table:
- Example: `menu_categories` policy uses `current_setting('request.jwt.claims')::jsonb ->> 'restaurant_id'`
- **Problem**: The `user_restaurants` table DOES NOT EXIST

## Token Format Analysis

### Supabase Tokens (Working)
- JWT with `sub` = UUID from auth.users
- Contains standard claims (iat, exp, email, role)
- Works with `auth.uid()` function in RLS

### Local Tokens (Broken for RLS)
- Kiosk: `sub: "demo:randomid"`
- Station: `sub: station_token_id, type: "station"`
- These will return NULL for `auth.uid()` in policies

## Database Reality vs Expectations

### Expected (from migrations)
- `user_restaurants` - for role/restaurant mapping
- `user_profiles` - for user details
- `user_pins` - for PIN authentication
- `station_tokens` - for station sessions
- `api_scopes` - for RBAC
- `role_scopes` - for RBAC

### Actual (from DB check)
- **NONE of these tables exist**
- Migration `20250130_auth_tables.sql` was never applied
- Migration `20250903_rls_policies.sql` references non-existent tables

## Implications

1. **RLS policies will fail** - they reference `user_restaurants` which doesn't exist
2. **PIN auth might fail** - depends on `user_pins` table
3. **Role checks will fail** - no `user_restaurants` to check roles
4. **Station/Kiosk auth incompatible** - not real Supabase users

## Evidence

- Database query output: `/docs/reports/DB_STATE_CONFIRM.json`
- Missing tables confirmed via SQL query
- Auth route analysis shows mixed token types
- RLS policies reference non-existent foreign tables