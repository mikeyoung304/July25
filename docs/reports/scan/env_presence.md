# Environment Variable Presence Check
Generated: 2025-01-30

## Client Environment (.env, client/.env)
- VITE_API_BASE: **UNSET** (VITE_API_BASE_URL is SET: http://localhost:3001)
- VITE_WS_URL: **UNSET** 
- VITE_DEMO_AUTH: **UNSET**
- VITE_SUPABASE_URL: **SET**
- VITE_SUPABASE_ANON_KEY: **SET**
- VITE_DEFAULT_RESTAURANT_ID: **SET**

## Server Environment (root .env)
- PORT: **SET** (3001)
- FRONTEND_URL: **SET** (http://localhost:5173)
- SUPABASE_URL: **SET**
- SUPABASE_ANON_KEY: **SET** 
- SUPABASE_SERVICE_KEY: **SET**
- DATABASE_URL: **SET**
- KIOSK_JWT_SECRET: **SET**

## Notes
- Client uses VITE_API_BASE_URL (not VITE_API_BASE)
- No explicit VITE_WS_URL, WebSocket URL derived from API URL
- No VITE_DEMO_AUTH flag currently configured
- Server has all required Supabase credentials