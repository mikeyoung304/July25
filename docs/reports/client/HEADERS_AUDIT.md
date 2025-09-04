# Client Headers Audit

## Required Headers for Writes
All write operations to tenant-scoped tables require:
- `Authorization: Bearer <token>` - User's Supabase auth token
- `X-Restaurant-ID: <uuid>` - Restaurant context
- `X-CSRF-Token: <token>` - CSRF protection (dev mode accepts 'dev')
- `Content-Type: application/json` - For POST/PUT/PATCH

## Verification
✅ Test confirmed headers work correctly:
- server1@restaurant.com authenticated successfully
- Table created with proper restaurant_id
- RLS policies enforced based on user_restaurants membership

## Client Implementation Status
- ✅ httpClient.ts includes X-Restaurant-ID header
- ✅ AuthContext provides access tokens
- ⚠️ Need to verify all write operations include proper headers