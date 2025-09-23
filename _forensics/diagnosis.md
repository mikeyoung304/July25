# Deployment Failure Diagnosis

## 1. Timeline
- **Last Green**: `6238f67` (Sep 2024) - "chore(ci): add auto-deploy workflows"
- **First Red**: `5c7bd4a` to `d97ef36` - Series of shared module refactoring commits
- **Key Change Window**: Shared module export configuration and Node version pinning

## 2. Primary Suspected Root Causes (Ranked)

### ROOT CAUSE #1: Node Version Enforcement (90% confidence)
**Both Vercel and Render are likely using Node 18, not Node 20**
- Evidence: `package.json` changed from `"node": ">=18.0.0"` to `"node": "20.x"`
- Evidence: Added `"packageManager": "npm@10.7.0"` (Node 20+ feature)
- Evidence: `.nvmrc` specifies `20.18.1` but providers may ignore this
- Evidence: Local build succeeds with Node 24 (warning only), but strict CI may fail

### ROOT CAUSE #2: NPM Version Mismatch (75% confidence)
**Workspace install commands require NPM 7+, providers may have NPM 6**
- Evidence: Changed to `npm ci --workspaces` in both vercel.json and render.yaml
- Evidence: Added `"packageManager": "npm@10.7.0"` specification
- Evidence: Node 18 ships with NPM 8.x, but custom images might have older NPM

### ROOT CAUSE #3: Missing Environment Variables (60% confidence)
**Server runtime failures due to missing security env vars**
- Evidence: 8 critical env vars missing from Render config
- Evidence: Security vars (DEVICE_FINGERPRINT_SALT, PIN_PEPPER, STATION_TOKEN_SECRET) undefined
- Evidence: These were likely added recently but not configured in providers

## 3. Blocking Errors (Inferred)
- Vercel: `npm ERR! Workspaces not supported in npm@6` or `engine "node" incompatible`
- Render: Similar npm/node version errors or runtime crash from missing env vars

## 4. Local Repro Status
- **Node 24**: ✅ Both client and server build successfully
- **Node 20**: Not tested (would require nvm)
- **Node 18**: Not tested (likely to fail due to engine restriction)

## 5. Env Matrix
Missing from Render dashboard (likely):
- `DEVICE_FINGERPRINT_SALT`
- `KIOSK_JWT_SECRET`
- `PIN_PEPPER`
- `SQUARE_APP_ID`
- `STATION_TOKEN_SECRET`
- `SUPABASE_JWT_SECRET`
- `OPENAI_API_KEY`
- `AI_DEGRADED_MODE`

## 6. Config Drift
- `vercel.json`: Moved from client/ to root, added shared build step
- `render.yaml`: Changed from `npm ci` to `npm ci --workspaces`
- `package.json`: Node pinned to 20.x, packageManager specified

## 7. Path/Module Resolution Risks
- Shared module now requires build step (dist/)
- Subpath imports blocked by exports map
- All imports successfully migrated to barrel export

## 8. Minimal Fix Plan
1. **Immediate**: Change `package.json` engines back to `"node": ">=18.0.0"`
2. **Immediate**: Remove `"packageManager": "npm@10.7.0"` line
3. **Verify**: Check Vercel/Render Node versions in their dashboards
4. **Configure**: Add missing env vars to Render dashboard
5. **Test**: Deploy and monitor build logs