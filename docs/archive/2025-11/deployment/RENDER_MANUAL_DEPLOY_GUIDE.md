# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](../../../README.md)
> Category: Deployment Documentation

---

# Manual Render Deployment Guide
**Issue**: GitHub Actions deploy failed - `RENDER_SERVICE_ID` not configured
**Solution**: Manual deployment via Render Dashboard or Deploy Hook

---

## 🚨 Current Status

- ✅ Code fix pushed to GitHub (commit `4fd9c9d2`)
- ❌ Render auto-deploy did not trigger
- ❌ GitHub Actions workflow failed (missing secrets)
- 🔄 Need manual deployment to apply fix

---

## 🎯 Fastest Solution: Deploy Hook URL

### Step 1: Get Your Deploy Hook URL

1. Visit https://dashboard.render.com and log in
2. Find and click on your **july25-server** service
3. Go to the **Settings** tab
4. Scroll to **Deploy Hook** section
5. Copy the Deploy Hook URL (format: `https://api.render.com/deploy/srv-...`)

### Step 2: Trigger Deployment

Once you have the URL, run:

```bash
curl https://api.render.com/deploy/srv-YOUR-SERVICE-ID
```

**Response**: You should get a JSON response with deploy details:
```json
{
  "id": "dep-...",
  "status": "created",
  "commitId": "4fd9c9d2...",
  ...
}
```

### Step 3: Monitor Deployment

Watch the deployment progress:
1. Go back to Render Dashboard
2. Click on your service
3. Go to **Events** tab or **Logs** tab
4. Watch for deployment completion (typically 2-5 minutes)

---

## 🖱️ Alternative: Manual Deploy via Dashboard

If you prefer using the UI:

1. Visit https://dashboard.render.com
2. Click on **july25-server** service
3. Click **Manual Deploy** button (top right)
4. Select **Deploy latest commit**
5. Confirm deployment
6. Monitor in **Logs** tab

---

## 🔧 Fix GitHub Actions (Optional - For Future)

To enable automated deploys via GitHub Actions, you need to add these secrets to your GitHub repository:

### Get Render Service ID

From your Render Dashboard:
1. Go to your **july25-server** service
2. Look at the URL: `https://dashboard.render.com/web/srv-XXXXXX`
3. The part after `/web/` is your service ID: `srv-XXXXXX`

### Get Render API Key

1. Go to https://dashboard.render.com/u/settings
2. Click **API Keys** section
3. Click **Create API Key**
4. Name it: "GitHub Actions Deploy"
5. Copy the generated key (starts with `rnd_...`)

### Add Secrets to GitHub

1. Go to https://github.com/mikeyoung304/July25/settings/secrets/actions
2. Add two secrets:
   - Name: `RENDER_SERVICE_ID`, Value: `srv-XXXXXX`
   - Name: `RENDER_API_KEY`, Value: `rnd_...`

Once configured, future pushes to `main` will auto-deploy.

---

## ✅ Verify Deployment

After deployment completes (2-5 minutes):

### Test 1: Health Check
```bash
curl -s "https://july25-server.onrender.com/api/v1/health" | jq .
```

**Expected**: JSON response with status information
**Current**: 404 Not Found (before deployment)

### Test 2: JWT Contains Scopes
```bash
# Login via PIN
RESPONSE=$(curl -s -X POST "https://july25-server.onrender.com/api/v1/auth/pin-login" \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234","restaurantId":"11111111-1111-1111-1111-111111111111"}')

# Extract and decode token
TOKEN=$(echo $RESPONSE | jq -r '.token')
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
```

**Expected**: JWT payload should contain:
```json
{
  "scope": [
    "orders:create",
    "orders:read",
    ...
  ]
}
```

### Test 3: Order Submission Works
```bash
# Use token from above
curl -X POST "https://july25-server.onrender.com/api/v1/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111" \
  -d '{
    "items": [{
      "menu_item_id": "some-item-id",
      "quantity": 1,
      "unit_price": 1200
    }],
    "table_number": "1",
    "seat_number": 1,
    "order_type": "dine_in"
  }' | jq .
```

**Expected**: 201 Created (not 401 Unauthorized)

---

## 🔍 Troubleshooting

### "Service not found" or 404 on all endpoints

**Cause**: Deployment hasn't completed yet
**Solution**: Wait 2-3 more minutes and try again

### Deploy Hook returns error

**Possible causes**:
- Invalid deploy hook URL
- Service is paused
- Render account has billing issues

**Solution**: Use manual deploy via dashboard instead

### GitHub Actions still failing

**Cause**: Secrets not configured
**Solution**: Follow "Fix GitHub Actions" section above

---

## 📊 Deployment Timeline

| Time | Status | Action Needed |
|------|--------|---------------|
| 14:58 UTC | Code pushed to GitHub | ✅ Done |
| Now | Need manual deploy | 🔴 **ACTION REQUIRED** |
| +2-5 min | Deployment completes | ⏳ Wait |
| +6 min | Run verification tests | ✅ Verify fix works |

---

## 🎉 Success Criteria

Once deployed and verified:
- ✅ Server responds to health check
- ✅ JWT tokens contain `scope` field
- ✅ Order submission returns 201 (not 401)
- ✅ All role-based operations work
- ✅ No more "Missing required scope" errors

---

## 📞 Next Steps

1. **Immediate**: Use Deploy Hook or Manual Deploy (this takes 1 minute)
2. **After Deploy**: Run verification tests (above)
3. **Then**: Test in production UI at https://july25-client.vercel.app
4. **Optional**: Configure GitHub secrets for future auto-deploys

---

**Created**: 2025-11-12 15:06 UTC
**Code Ready**: Commit `4fd9c9d2` awaiting deployment
**Status**: 🔴 MANUAL DEPLOYMENT REQUIRED
