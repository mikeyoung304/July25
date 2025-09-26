# Foundation Report: Vercel Deployment Baseline
Generated: 2025-09-24

## Phase 0: Context & Preconditions

### System Information
- **Node Version**: v24.2.0
- **NPM Version**: 11.3.0
- **Current Branch**: fix/critical-security-audit-findings
- **Git State**: Clean (no uncommitted changes)
- **Vercel CLI**: 48.1.0
- **Vercel User**: mikeyoung304-8686

### Project Structure
- ✅ `vercel.json` exists at root
- ✅ No `client/vercel.json` (single source of truth)
- ✅ Reports directories created: `reports/v3/` and `reports/v3/artifacts/`

## Phase 1: Vercel Project Linkage

### Link Status
✅ **Project Successfully Linked**
- **Project Name**: rebuild-6.0
- **Project ID**: prj_0H8m4inpecbGnssq8mie29SOI4O6
- **Organization ID**: team_OesWPwxqmdOsNGDnz0RqS4kA
- **Team**: mikeyoung304-gmailcoms-projects

### .vercel/project.json
```json
{
  "projectId": "prj_0H8m4inpecbGnssq8mie29SOI4O6",
  "orgId": "team_OesWPwxqmdOsNGDnz0RqS4kA",
  "projectName": "rebuild-6.0"
}
```

### Vercel.json Validation
Current `vercel.json` configuration:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "installCommand": "npm ci --workspaces --include-workspace-root",
  "buildCommand": "ROLLUP_NO_NATIVE=1 npm run build --workspace shared && ROLLUP_NO_NATIVE=1 npm run build --workspace client",
  "outputDirectory": "client/dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

**Validation Results:**
- ✅ Uses Vite framework
- ✅ Ignores server (only builds client)
- ✅ Correct output directory (client/dist)
- ✅ SPA rewrites configured
- ✅ Cache headers for assets
- ✅ ROLLUP_NO_NATIVE=1 already included in build command

## Phase 2: Environment Variables Separation

### Current Vercel Environment Variables
Found 12 environment variables on Vercel (all VITE_* prefixed - client-side safe):

| Variable | Environment | Status |
|----------|-------------|--------|
| VITE_ENABLE_PERF | Production | ✅ Client-safe |
| VITE_DEMO_PANEL | Production | ✅ Client-safe |
| VITE_DEBUG_VOICE | Production | ✅ Client-safe |
| VITE_SQUARE_ENVIRONMENT | Production | ✅ Client-safe |
| VITE_SQUARE_LOCATION_ID | Production | ✅ Client-safe |
| VITE_SQUARE_APP_ID | Production | ✅ Client-safe |
| VITE_USE_REALTIME_VOICE | Production | ✅ Client-safe |
| VITE_USE_MOCK_DATA | Production | ✅ Client-safe |
| VITE_DEFAULT_RESTAURANT_ID | Production | ✅ Client-safe |
| VITE_SUPABASE_ANON_KEY | Production | ✅ Client-safe |
| VITE_SUPABASE_URL | Production | ✅ Client-safe |
| VITE_API_BASE_URL | Production | ✅ Client-safe |

### Environment Variable Separation Table

| Variable Category | Current Location | Target Location | Action Required |
|-------------------|-----------------|-----------------|-----------------|
| **Client Variables (VITE_*)** | Vercel ✅ | Vercel | Keep as-is |
| **Server Secrets** | Local .env files | Render | Move later (not in this PR) |
| - OPENAI_API_KEY | server/.env | Render | Keep current key per team decision |
| - DATABASE_URL | server/.env | Render | Move to Render |
| - SUPABASE_SERVICE_ROLE_KEY | server/.env | Render | Move to Render |
| - JWT_SECRET | server/.env | Render | Move to Render |
| - SESSION_SECRET | server/.env | Render | Move to Render |

### Security Scan Results
- ✅ No server-only secrets found in client code paths
- ✅ All Vercel env vars are VITE_* prefixed (client-safe)
- ✅ Server secrets isolated in server/.env

### Local .env Files Found
```
./.env
./.env.example
./.env.production
./.env.production.template
./.env.vercel.local
./.env.july25-check
./client/.env
./client/.env.example
./client/.env.local
./client/.env.production
./server/.env
./server/.env.example
./server/.env.test
./config/.env.production.template
./config/.env.security.template
```

## Assumptions & Risks

### Assumptions
1. Vercel project "rebuild-6.0" is the correct production project
2. Server remains on Render (not migrating in this PR)
3. Current OpenAI API key retained per team decision
4. VITE_* variables are safe for client exposure

### Risks
1. **Low**: Multiple .env files may cause confusion - needs cleanup in future PR
2. **Mitigated**: Server secrets remain isolated from client build
3. **None**: No production deployment in this PR (preview only)

### Rollback Strategy
If issues arise:
1. Delete `.vercel/project.json`
2. Remove `scripts/deploy-preview.sh`
3. Revert to manual deployment process

## Next Steps (Phase 3-5)
- [ ] Create deploy-preview.sh script
- [ ] Test preview deployment (dry run)
- [ ] Create DEPLOY_RUNBOOK.md
- [ ] Create draft PR with all changes