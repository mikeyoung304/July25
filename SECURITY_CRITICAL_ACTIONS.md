# 🚨 CRITICAL SECURITY ACTIONS REQUIRED

## Immediate Actions (Within 1 Hour)

### 1. Rotate OpenAI API Key
- [ ] Go to https://platform.openai.com/api-keys
- [ ] Generate new API key
- [ ] Update on Render: https://dashboard.render.com
- [ ] Update on Vercel: https://vercel.com/dashboard
- [ ] **REVOKE OLD KEY IMMEDIATELY**

### 2. Update Supabase Keys
- [ ] Go to Supabase dashboard
- [ ] Generate new anon key
- [ ] Generate new service role key
- [ ] Update JWT secret
- [ ] Update all production environments

### 3. Generate New JWT Secret for Kiosk
```bash
# Generate secure secret
openssl rand -base64 32
```
- [ ] Update KIOSK_JWT_SECRET on Render
- [ ] Update KIOSK_JWT_SECRET on local

### 4. Monitor for Attacks
Check server logs for rate limit violations:
```bash
# On Render dashboard, search logs for:
[RATE_LIMIT]
```

## Security Fixes Deployed (2025-08-16)

### ✅ Test Token Bypass Removed
- **Previously**: `test-token` worked in production
- **Now**: Only works in local development
- **File**: server/src/middleware/auth.ts:37

### ✅ Rate Limiting Activated
- **Previously**: Disabled on Render
- **Now**: Active in production
- **Limits**:
  - AI: 50 requests per 5 minutes
  - Transcription: 20 per minute
  - Auth: 5 attempts per 15 minutes

### ✅ Abuse Logging Added
- Rate limit violations now logged
- Monitor for potential attacks

## Remaining Security Tasks

### Day 2-3: TypeScript Fixes
- Fix 40+ compilation errors
- Prevents CI/CD deployment

### Week 2: Database Security
- Implement Row Level Security
- Add tenant isolation
- Audit logging

### Week 2: Cost Controls
- Implement tiered AI models
- Add spending alerts
- Monitor usage patterns

## Testing After Key Rotation

1. Test authentication:
```bash
curl -X POST https://july25.onrender.com/api/v1/auth/kiosk \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": "11111111-1111-1111-1111-111111111111"}'
```

2. Test AI endpoint (should fail with test-token):
```bash
curl -X POST https://july25.onrender.com/api/v1/ai/chat \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
# Should return 401 Unauthorized
```

3. Test rate limiting:
```bash
# Run this 51 times quickly to trigger rate limit
for i in {1..51}; do
  curl -X POST https://july25.onrender.com/api/v1/ai/chat \
    -H "Authorization: Bearer [VALID_TOKEN]" \
    -H "Content-Type: application/json" \
    -d '{"message": "test"}'
done
# Should get 429 Too Many Requests after 50
```

## Contact for Issues
If you encounter any issues after these changes:
1. Check Render logs for errors
2. Verify all environment variables are set
3. Ensure new keys are properly formatted

## Timeline
- **Hour 1**: Rotate all keys ← YOU ARE HERE
- **Day 2-3**: Fix TypeScript
- **Day 4-5**: Fix memory leaks
- **Week 2**: Database security
- **Week 3**: Full testing

Remember: Security first, features second!