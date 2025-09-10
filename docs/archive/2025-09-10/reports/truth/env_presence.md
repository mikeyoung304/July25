# Environment Variables Presence Report
Generated: 2025-01-30

## Client Environment Variables (client/.env)
- ✅ VITE_API_BASE_URL - Present
- ❌ VITE_WS_URL - Not found
- ❌ VITE_STRICT_AUTH - Not found
- ✅ VITE_DEFAULT_RESTAURANT_ID - Present
- ✅ VITE_SUPABASE_URL - Present
- ✅ VITE_SUPABASE_ANON_KEY - Present
- ✅ VITE_USE_MOCK_DATA - Present
- ✅ VITE_USE_REALTIME_VOICE - Present
- ✅ VITE_SQUARE_APP_ID - Present
- ✅ VITE_SQUARE_ENVIRONMENT - Present
- ✅ VITE_SQUARE_LOCATION_ID - Present

## Server Environment Variables (root .env)
- ✅ PORT - Present
- ✅ FRONTEND_URL - Present  
- ✅ SUPABASE_URL - Present
- ✅ SUPABASE_SERVICE_KEY - Present
- ✅ SUPABASE_ANON_KEY - Present
- ✅ KIOSK_JWT_SECRET - Present
- ✅ DATABASE_URL - Present
- ✅ DEFAULT_RESTAURANT_ID - Present
- ✅ NODE_ENV - Present
- ✅ OPENAI_API_KEY - Present
- ✅ OPENAI_REALTIME_MODEL - Present
- ✅ SQUARE_ACCESS_TOKEN - Present
- ✅ SQUARE_ENVIRONMENT - Present
- ✅ SQUARE_LOCATION_ID - Present

## Security Concerns
- ⚠️ VITE_DEMO_PANEL - Present in root .env (should be removed)
- ⚠️ VITE_USE_MOCK_DATA - Present (security concern if used in production)
- ⚠️ DEFAULT_RESTAURANT_ID - Hardcoded tenant ID present
- ⚠️ KIOSK_JWT_SECRET - Should not be needed after demo removal

## Notes
- Server .env file not found in server/ directory (using root .env)
- Multiple VITE_ variables in root .env (likely for build process)
- No VITE_STRICT_AUTH found (good - not using this pattern)
- No VITE_WS_URL found (WebSocket URL likely derived from API base)