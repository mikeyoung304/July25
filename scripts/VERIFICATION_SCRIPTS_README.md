# Environment Verification Scripts

**Last Updated**: 2025-11-14
**Purpose**: Automated scripts to verify environment configuration across local, Vercel, and Render

---

## 📋 AVAILABLE SCRIPTS

### 1. `verify-env-health.sh` - Local .env Health Check
**Purpose**: Validates your local `.env` file against requirements
**Runtime**: ~1 second
**Usage**:
```bash
./scripts/verify-env-health.sh
```

**What it checks**:
- ✅ All required variables present
- ✅ Variable format validation (UUIDs, URLs, etc.)
- ✅ Security token length (min 32 chars)
- ✅ Newline contamination detection
- ✅ VITE_DEMO_PANEL security check
- ✅ Square environment consistency
- ✅ CORS configuration
- ✅ Database URL port configuration

**Exit codes**:
- `0` = All checks passed (or warnings only)
- `1` = Critical failures found

---

### 2. `verify-vercel-env.sh` - Vercel Environment Verification
**Purpose**: Validates Vercel production environment variables
**Runtime**: ~3-5 seconds (pulls env from Vercel)
**Usage**:
```bash
./scripts/verify-vercel-env.sh
```

**Prerequisites**:
- Vercel CLI installed (`npm install -g vercel`)
- Authenticated with Vercel (`vercel login`)

**What it checks**:
- ✅ All required VITE_ variables present
- ✅ VITE_DEMO_PANEL set to 0 (production security)
- ✅ No newline contamination
- ✅ No server-only variables in Vercel (security)
- ✅ Square environment consistency
- ✅ API URL format validation
- ✅ Variable count sanity check

**Exit codes**:
- `0` = All checks passed (or warnings only)
- `1` = Critical failures found

---

### 3. `verify-render-api.sh` - Render Backend API Testing
**Purpose**: Tests Render production backend endpoints and configuration
**Runtime**: ~5-10 seconds
**Usage**:
```bash
# Default: https://july25.onrender.com
./scripts/verify-render-api.sh

# Custom backend URL
./scripts/verify-render-api.sh https://your-backend.onrender.com
```

**What it checks**:
- ✅ Health endpoint accessibility
- ✅ Database connectivity
- ✅ Restaurant slug resolution (grow → UUID)
- ✅ CORS headers configuration
- ✅ Auth endpoint response
- ✅ Menu API accessibility
- ✅ Response time performance
- ✅ HTTPS/SSL enabled
- ✅ Security headers present

**Exit codes**:
- `0` = All tests passed (or warnings only)
- `1` = Critical tests failed

---

### 4. `verify-all.sh` - Master Verification Suite
**Purpose**: Runs all verification scripts in sequence
**Runtime**: ~10-20 seconds
**Usage**:
```bash
# Run all verifications
./scripts/verify-all.sh

# Run all with custom Render URL
./scripts/verify-all.sh https://your-backend.onrender.com
```

**What it does**:
1. Runs local .env health check
2. Runs Vercel environment verification
3. Runs Render API testing
4. Provides overall summary

**Exit codes**:
- `0` = All scripts passed
- `1` = One or more scripts failed

---

## 🚀 QUICK START

### Run All Verifications (Recommended)
```bash
./scripts/verify-all.sh
```

### Run Individual Checks
```bash
# Check local .env only
./scripts/verify-env-health.sh

# Check Vercel only
./scripts/verify-vercel-env.sh

# Check Render backend only
./scripts/verify-render-api.sh
```

### Using NPM Scripts
```bash
# Run all verifications
npm run verify:all

# Individual checks
npm run verify:env
npm run verify:vercel
npm run verify:render
```

---

## 📊 INTERPRETING RESULTS

### Status Indicators
- ✅ **Green checkmarks**: Test passed
- ❌ **Red X**: Critical failure (must fix before production)
- ⚠️  **Yellow warning**: Non-critical issue (recommended to fix)

### Exit Codes
- `0`: Success (all critical checks passed)
- `1`: Failure (one or more critical issues found)

### Sample Output
```
================================
Environment Variable Health Check
================================

✓ .env file found

=== Core Configuration ===
✓ NODE_ENV
✓ PORT
✓ DEFAULT_RESTAURANT_ID

... (more checks)

================================
Summary
================================
Total Checks: 34
Passed: 29
Failed: 0
Warnings: 7

✓ All critical checks passed!
⚠ Some warnings found - review recommended
```

---

## 🔧 TROUBLESHOOTING

### "Vercel CLI not found"
```bash
npm install -g vercel
vercel login
```

### "Failed to pull Vercel environment"
```bash
# Login to Vercel first
vercel login

# Link to project if needed
vercel link
```

### "Backend connection failed"
```bash
# Check if backend is up
curl https://july25.onrender.com/api/v1/health

# Check Render Dashboard → Service → Logs for errors
```

### "Permission denied"
```bash
# Make scripts executable
chmod +x scripts/verify-*.sh
```

---

## 🎯 WHEN TO RUN THESE SCRIPTS

### Before Every Deployment
```bash
npm run verify:all
```
Ensures your environment is correctly configured before pushing to production.

### After Changing Environment Variables
```bash
# If you changed local .env
npm run verify:env

# If you changed Vercel Dashboard
npm run verify:vercel

# If you changed Render Dashboard
npm run verify:render
```

### Daily Health Check (Recommended)
```bash
# Quick health check (runs in ~10 seconds)
npm run verify:all
```

### When Debugging Issues
```bash
# Check all environments when troubleshooting
npm run verify:all

# Check specific environment
npm run verify:render  # If backend issues
npm run verify:vercel  # If frontend issues
```

---

## ⚙️ CUSTOMIZATION

### Add Custom Checks
Edit the scripts to add your own validation logic:

```bash
# Example: Add custom check to verify-env-health.sh
check_var_exists "MY_CUSTOM_VAR" "REQUIRED" "Description here"
```

### Change Thresholds
Modify performance thresholds in `verify-render-api.sh`:

```bash
# Current: Warning if response > 2s
# Change to 1s threshold:
if [ $response_time -lt 1000 ]; then
```

### Add More Endpoints
Test additional API endpoints in `verify-render-api.sh`:

```bash
# Add after existing tests
test_endpoint "Custom Endpoint" "GET" "/api/v1/your-endpoint" "200"
```

---

## 📝 RELATED DOCUMENTATION

- **`.env-audit-with-secrets.md`** - Complete audit with actual values (git-ignored)
- **`docs/reference/config/VERCEL_RENDER_QUICK_REFERENCE.md`** - Public reference guide
- **`verify-render-config.md`** - Manual Render Dashboard verification guide
- **`RENDER_VERCEL_OPTIMAL_CONFIGURATION_CHECKLIST.md`** - Deployment checklist

---

## 🔄 CI/CD INTEGRATION

### GitHub Actions Example
```yaml
name: Environment Verification
on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run environment verification
        run: |
          chmod +x scripts/verify-env-health.sh
          ./scripts/verify-env-health.sh
```

### Pre-commit Hook
```bash
# .git/hooks/pre-commit
#!/bin/bash
./scripts/verify-env-health.sh
if [ $? -ne 0 ]; then
    echo "Environment verification failed. Fix issues before committing."
    exit 1
fi
```

---

## 💡 TIPS & BEST PRACTICES

### 1. Run Before Committing
Always run `verify-env-health.sh` before committing `.env.example` changes.

### 2. Automate in CI/CD
Add verification scripts to your CI/CD pipeline to catch issues early.

### 3. Schedule Regular Checks
Set up a cron job or GitHub Action to run `verify-all.sh` daily.

### 4. Keep Scripts Updated
When adding new environment variables, update the verification scripts.

### 5. Document Custom Checks
Add comments to explain any custom validation logic you add.

---

## 📞 SUPPORT

If verification scripts fail and you're unsure how to fix:

1. Check the specific error messages in the script output
2. Review `.env-audit-with-secrets.md` for correct values
3. Consult `VERCEL_RENDER_QUICK_REFERENCE.md` for configuration guidance
4. Check Render/Vercel dashboards for manual verification
5. Review recent changes to environment variables

---

**Script Maintenance**:
- Review scripts monthly for accuracy
- Update validation rules when requirements change
- Add new checks for new environment variables
- Test scripts after major environment changes

**Version**: 1.0
**Last Review**: 2025-11-14
