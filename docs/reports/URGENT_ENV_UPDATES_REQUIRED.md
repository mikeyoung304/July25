# 🚨 URGENT: Production Environment Updates Required

## Security Alert
The following secrets have been COMPROMISED and rotated locally. You MUST update these in production dashboards immediately:

1. **OpenAI API Key** - Exposed in repository
2. **JWT Secrets** - All authentication tokens compromised
3. **Database credentials** - May be exposed

## Action Required

### 1. OpenAI Dashboard (CRITICAL - Voice Ordering)
1. Visit https://platform.openai.com/api-keys
2. **Delete** the compromised key starting with `sk-proj-clV1_`
3. **Create** a new API key
4. **Save** the new key securely

### 2. Vercel Dashboard (Client Variables)
Visit: https://vercel.com/your-team/july25-client/settings/environment-variables

**DELETE these incorrect variables:**
- `VITE_API_URL` (wrong name)
- `VITE_APP_MODE`
- `VITE_E2E`

**ADD/UPDATE these variables for Production:**
```
VITE_API_BASE_URL=https://july25.onrender.com
VITE_SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd2ZoY2lrZmRvc2h4d2J0anh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNDkzMDIsImV4cCI6MjA2NzgyNTMwMn0.f0jqtYOR4oU7-7lJPF9nkL8uk40qQ6G91xzjRpTnCSc
VITE_DEFAULT_RESTAURANT_ID=grow
VITE_USE_REALTIME_VOICE=true
VITE_DEBUG_VOICE=false
VITE_ENVIRONMENT=production
VITE_DEMO_PANEL=false
VITE_SQUARE_APP_ID=sandbox-sq0idb-test
VITE_SQUARE_LOCATION_ID=L1V8KTKZN0DHD
VITE_SQUARE_ENVIRONMENT=sandbox
```

### 3. Render Dashboard (Server Variables)
Visit: https://dashboard.render.com/web/your-service/env

**UPDATE these rotated secrets:**
```
OPENAI_API_KEY=[NEW KEY FROM STEP 1]
KIOSK_JWT_SECRET=d6891cc41e29a379c8092b8d0df36afa7179e3014269ecf1b83737213aa52028
PIN_PEPPER=1786e4f29d84b49494cdbc5c66d40175968c98a9348a4d2ae1e54634532b70f5
DEVICE_FINGERPRINT_SALT=4ad5e29da8df415454a6fba5b3db2b69513adfb10084b6e955dcc6918691a012
STATION_TOKEN_SECRET=f0745e683def8911eb9bfc9885ada2bff49f428287a525f97ee4744537681a32
WEBHOOK_SECRET=475c811c7d0a2b736ee211a8eaaa763e8f92e2a05d65c039bbcf992272839ce8
```

**ENSURE these are correct:**
```
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
FRONTEND_URL=https://july25-client.vercel.app
ALLOWED_ORIGINS=https://july25-client.vercel.app,http://localhost:5173
```

## Verification Steps

After updating:

1. **Redeploy both services**
   - Vercel: Trigger new deployment
   - Render: Restart service

2. **Test voice ordering**
   ```bash
   curl https://july25.onrender.com/api/v1/ai/voice/handshake
   ```
   Should return: `{"status":"ready","version":"1.0.0"}`

3. **Test authentication**
   - Try logging in as a server
   - Create a test order
   - Verify multi-tenant isolation

## Timeline
⏰ **Complete within 2 hours to prevent service disruption**

The compromised OpenAI key may be revoked by OpenAI at any time, breaking voice ordering.

## Support
If you encounter issues:
1. Check server logs in Render dashboard
2. Check browser console for VITE_ variable issues
3. Ensure you clicked "Save" and redeployed after changes

---
Generated: 2025-11-15
Priority: CRITICAL - Production Security