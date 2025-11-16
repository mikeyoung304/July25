# Fix Render Deployment - Add Missing RENDER_SERVICE_ID

## Steps to Fix:

### 1. Get your Render Service ID
- Go to https://dashboard.render.com
- Click on your **july25-server** service
- Look at the URL - it will be: `https://dashboard.render.com/web/srv-XXXXX`
- The `srv-XXXXX` part is your SERVICE_ID

### 2. Add to GitHub Secrets
- Go to: https://github.com/mikeyoung304/July25/settings/secrets/actions
- Click "New repository secret"
- Name: `RENDER_SERVICE_ID`
- Value: `srv-XXXXX` (your actual service ID from step 1)
- Click "Add secret"

### 3. Re-run the Failed Workflow
Option A - Re-run from GitHub:
```bash
# Go to: https://github.com/mikeyoung304/July25/actions
# Find the failed "Deploy Server (Render)" workflow
# Click "Re-run failed jobs"
```

Option B - Push a dummy commit:
```bash
# Make a small change to trigger deployment
echo "# Trigger deploy $(date)" >> server/trigger.txt
git add server/trigger.txt
git commit -m "chore: trigger server deployment"
git push origin main
```

### 4. Verify Deployment
After 2-5 minutes, run:
```bash
./scripts/smoke-test-auth.sh
```

## Alternative: Use Render Deploy Hook
If you prefer not to add the GitHub secret:

1. Get your Deploy Hook URL from Render Dashboard
2. Run: `curl <YOUR_DEPLOY_HOOK_URL>`
3. Monitor deployment in Render Dashboard

## Expected Timeline
- GitHub Action trigger: Immediate after secret is added
- Render build time: 2-5 minutes
- Server available: ~5 minutes total