# Square API Configuration Guide


**Last Updated:** 2025-11-01

**Last Updated**: October 25, 2025
**Version**: 6.0

This guide provides step-by-step instructions for configuring Square payment processing in Restaurant OS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Getting Square Credentials](#getting-square-credentials)
3. [Environment Variables](#environment-variables)
4. [Local Development Setup](#local-development-setup)
5. [Production Deployment (Render)](#production-deployment-render)
6. [Testing Your Configuration](#testing-your-configuration)
7. [Troubleshooting](#troubleshooting)
8. [Security Best Practices](#security-best-practices)

---

## Prerequisites

Before you begin, ensure you have:

- A Square account (sign up at https://squareup.com/signup)
- Access to Square Developer Dashboard
- Admin access to your Render deployment (for production)
- Local development environment set up

## Getting Square Credentials

### Option 1: Sandbox (Testing/Development)

Recommended for development and testing without processing real payments.

1. **Login to Square Dashboard**
   - Go to https://squareup.com/dashboard
   - Sign in with your Square account

2. **Navigate to Developer Portal**
   - Click on **Developer** in the left sidebar
   - Select **Sandbox**

3. **Get Sandbox Access Token**
   - Click on **Access Tokens**
   - Copy your **Sandbox Access Token**
   - Note: Sandbox tokens typically start with `EAAA` followed by random characters

4. **Get Sandbox Location ID**
   - In the same page, under **Locations**, find your sandbox location
   - Copy the **Location ID** (format: `L1V8KTKZN0DHD`)

5. **Get Application ID** (for frontend)
   - Go to **Applications** tab
   - Find your application in the sandbox environment
   - Copy the **Application ID** (starts with `sandbox-sq0idb-`)

### Option 2: Production (Live Payments)

Use only when ready to process real credit card transactions.

1. **Login to Square Dashboard**
   - Go to https://squareup.com/dashboard

2. **Navigate to Production Credentials**
   - Click on **Developer** in the left sidebar
   - Select **Production** (not Sandbox)

3. **Get Production Access Token**
   - Click on **Access Tokens**
   - Copy your **Production Access Token**
   - Note: Production tokens start with `EAAA`
   - WARNING: Keep this secret - it can charge real credit cards

4. **Get Production Location ID**
   - Under **Locations**, select your business location
   - Copy the **Location ID**

5. **Get Production Application ID**
   - Go to **Applications** tab
   - Copy the **Application ID** (starts with `sq0idp-`)

### Option 3: Demo Mode (No Square Account Required)

For local development or testing without Square API calls.

- No Square account needed
- Mocks payment responses
- Safe for internal testing
- Does NOT process real payments

---

## Environment Variables

### Required Environment Variables

You need to configure these variables in both your local `.env` file and production environment.

#### Server-Side Variables

```bash
# Square Access Token
# Sandbox: Get from Developer > Sandbox > Access Tokens
# Production: Get from Developer > Production > Access Tokens
SQUARE_ACCESS_TOKEN=your-square-access-token-here

# Square Environment
# Use 'sandbox' for testing, 'production' for live payments
SQUARE_ENVIRONMENT=sandbox

# Square Location ID (CRITICAL: Must match the access token)
# Sandbox: Get from Developer > Sandbox > Locations
# Production: Get from Developer > Production > Locations
SQUARE_LOCATION_ID=your-location-id-here

# Square Webhook Signature Key (optional, for webhook verification)
SQUARE_WEBHOOK_SIGNATURE_KEY=your-webhook-signature-key-here
```

#### Client-Side Variables

```bash
# Square Application ID (for frontend payment form)
# Sandbox: starts with 'sandbox-sq0idb-'
# Production: starts with 'sq0idp-'
VITE_SQUARE_APP_ID=your-square-app-id

# Square Location ID (same as server-side)
VITE_SQUARE_LOCATION_ID=your-location-id-here

# Square Environment (must match server-side setting)
VITE_SQUARE_ENVIRONMENT=sandbox
```

### Demo Mode Configuration

For development without Square API:

```bash
# Server-side only
SQUARE_ACCESS_TOKEN=demo
```

When `SQUARE_ACCESS_TOKEN=demo`, the server will:
- Skip real Square API calls
- Return mock successful payment responses
- Not charge any credit cards
- Allow full user flow testing

---

## Local Development Setup

### Step 1: Configure Local Environment

1. **Open your `.env` file** in the project root:
   ```bash
   # If .env doesn't exist, copy from template
   cp .env.example .env
   ```

2. **Add Square credentials** to `.env`:
   ```bash
   # Server configuration
   SQUARE_ACCESS_TOKEN=EAAAxxxxxxxxxx  # Your sandbox token
   SQUARE_ENVIRONMENT=sandbox
   SQUARE_LOCATION_ID=L1V8KTKZN0DHD  # Your sandbox location

   # Client configuration
   VITE_SQUARE_APP_ID=sandbox-sq0idb-xxxxxxxxxx
   VITE_SQUARE_LOCATION_ID=L1V8KTKZN0DHD  # Same as server
   VITE_SQUARE_ENVIRONMENT=sandbox
   ```

3. **Validate your configuration**:
   ```bash
   # Load environment variables
   source .env

   # Run Square credential validation
   ./scripts/validate-square-credentials.sh
   ```

### Step 2: Test Local Payment Flow

1. **Start the development servers**:
   ```bash
   npm run dev
   ```

2. **Test payment creation**:
   ```bash
   ./scripts/test-payment-flow.sh
   ```

3. **Verify in browser**:
   - Navigate to http://localhost:5173
   - Create an order
   - Proceed to checkout
   - Use Square test card: `4111 1111 1111 1111`
   - Expiration: Any future date
   - CVV: Any 3 digits
   - ZIP: Any 5 digits

---

## Production Deployment (Render)

### Step 1: Access Render Dashboard

1. Go to https://dashboard.render.com
2. Select your **Restaurant OS** backend service
3. Click on **Environment** in the left sidebar

### Step 2: Add Square Environment Variables

Click **Add Environment Variable** and add each of the following:

#### Variable 1: SQUARE_ACCESS_TOKEN
- **Key**: `SQUARE_ACCESS_TOKEN`
- **Value**: Your production or sandbox access token
- **Example**: `EAAAxxxxxxxxxxxxxxxxxxxxxxxxx`

#### Variable 2: SQUARE_ENVIRONMENT
- **Key**: `SQUARE_ENVIRONMENT`
- **Value**: `sandbox` or `production`
- **Important**: Must match your access token type

#### Variable 3: SQUARE_LOCATION_ID
- **Key**: `SQUARE_LOCATION_ID`
- **Value**: Your location ID (e.g., `L1V8KTKZN0DHD`)
- **Critical**: This MUST match a location ID associated with your access token

#### Variable 4: SQUARE_WEBHOOK_SIGNATURE_KEY (Optional)
- **Key**: `SQUARE_WEBHOOK_SIGNATURE_KEY`
- **Value**: Your webhook signature key
- **Note**: Only needed if using Square webhooks

### Step 3: Save and Deploy

1. Click **Save Changes**
2. Render will automatically redeploy your service
3. Monitor the deployment logs for successful startup

### Step 4: Verify Deployment

Check the Render logs for Square credential validation:

**Success message**:
```
✅ Square credentials validated successfully
   Environment: sandbox
   Location ID: L1V8KTKZN0DHD
   Location Name: My Restaurant
```

**Error message** (if misconfigured):
```
🚨 SQUARE_LOCATION_ID mismatch detected!
   Configured: L3V8KTKZN0DHD
   Available: L1V8KTKZN0DHD
```

---

## Testing Your Configuration

### Automated Validation Script

The repository includes a validation script that checks your Square credentials:

```bash
# Export your environment variables
export SQUARE_ACCESS_TOKEN="your-token"
export SQUARE_LOCATION_ID="your-location-id"
export SQUARE_ENVIRONMENT="sandbox"

# Run validation
./scripts/validate-square-credentials.sh
```

**What it checks**:
- Access token is valid
- Location ID exists for the access token
- Payment API is accessible
- Credentials match between token and location

**Expected output**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Square Credentials Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Environment: sandbox

📍 Test 1: Fetching locations for access token...
✅ Access token is valid
   Found 1 location(s)

📍 Test 2: Validating SQUARE_LOCATION_ID...
✅ Location ID matches: L1V8KTKZN0DHD
   Location Name: Test Restaurant
   Merchant ID: MLxxxxxxxxxx

💳 Test 3: Testing payment creation permissions...
✅ Payment API accessible (test validation passed)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All Square credentials validated successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary:
  Environment:    sandbox
  Access Token:   EAAAxxxxxx...
  Location ID:    L1V8KTKZN0DHD
  Location Name:  Test Restaurant
  Merchant ID:    MLxxxxxxxxxx

✅ Ready for payment processing
```

### Manual API Test

Test the payment endpoint directly:

```bash
# Set your API URL
API_URL="https://your-app.onrender.com"  # Or http://localhost:3001

# Create a test order and process payment
./scripts/test-payment-flow.sh
```

### Test Cards (Sandbox Only)

Use these test cards in Square Sandbox:

| Card Number | Result |
| --- | --- |
| 4111 1111 1111 1111 | Success |
| 4000 0000 0000 0002 | Declined |
| 5105 1051 0510 5100 | Success (Mastercard) |

**Note**: Production environment requires real credit cards.

---

## Troubleshooting

### Issue: "SQUARE_LOCATION_ID mismatch detected"

**Symptom**: Server logs show location ID mismatch error

**Cause**: The configured `SQUARE_LOCATION_ID` doesn't exist in the access token's permitted locations

**Solution**:
1. Run validation script to see available location IDs:
   ```bash
   ./scripts/validate-square-credentials.sh
   ```
2. Copy the correct location ID from the output
3. Update `SQUARE_LOCATION_ID` in Render environment variables
4. Save and redeploy

**Common cause**: Typo in location ID (e.g., `L3` instead of `L1`)

### Issue: "Access token validation failed"

**Symptom**: HTTP 401 or 403 when calling Square API

**Possible causes**:
1. **Expired token**: Regenerate access token in Square Dashboard
2. **Wrong environment**: Sandbox token used with production URL (or vice versa)
3. **Invalid token**: Token copied incorrectly (missing characters)

**Solution**:
1. Verify `SQUARE_ENVIRONMENT` matches your token type
   - Sandbox tokens → `SQUARE_ENVIRONMENT=sandbox`
   - Production tokens → `SQUARE_ENVIRONMENT=production`
2. Regenerate access token in Square Dashboard
3. Update environment variables with new token

### Issue: "Payment creation returns 500 error"

**Symptom**: Payment endpoint returns HTTP 500

**Check these**:
1. **Render logs**: Look for detailed error message
2. **Token validity**: Run `./scripts/validate-square-credentials.sh`
3. **Environment mismatch**: Verify sandbox/production consistency
4. **Location permissions**: Ensure token has payment permissions

**Debug steps**:
```bash
# Check Render logs
render logs --service your-service-name --tail

# Validate credentials
./scripts/validate-square-credentials.sh

# Test payment flow
./scripts/test-payment-flow.sh
```

### Issue: "Payment form doesn't load"

**Symptom**: Square payment form is blank or shows error

**Possible causes**:
1. Missing `VITE_SQUARE_APP_ID`
2. Wrong `VITE_SQUARE_ENVIRONMENT`
3. CORS issues between frontend and Square

**Solution**:
1. Verify frontend environment variables in Vercel:
   - `VITE_SQUARE_APP_ID`
   - `VITE_SQUARE_LOCATION_ID`
   - `VITE_SQUARE_ENVIRONMENT`
2. Ensure environment matches backend (sandbox vs production)
3. Check browser console for errors

### Issue: "Test card declined in sandbox"

**Symptom**: Valid test card shows as declined

**Solution**:
1. Verify you're using `SQUARE_ENVIRONMENT=sandbox`
2. Use official Square test cards (see Test Cards section)
3. Check Square Dashboard for sandbox restrictions

### Issue: "Startup validation passes but payments fail"

**Symptom**: Server starts successfully but payments return errors

**Check**:
1. Order state: Ensure order is in valid state for payment
2. Amount validation: Server recalculates amount - check logs
3. Idempotency key: Ensure unique key per payment attempt

**Debug**:
```bash
# Enable debug logging
export LOG_LEVEL=debug

# Restart server and check logs
npm run dev
```

---

## Security Best Practices

### Access Token Security

**DO**:
- Store access tokens in environment variables only
- Use separate tokens for sandbox and production
- Rotate production tokens regularly (quarterly)
- Limit token permissions to minimum required

**DON'T**:
- Commit tokens to version control
- Share tokens in chat or email
- Use production tokens in development
- Log full token values

### Environment Separation

**Recommended setup**:

| Environment | SQUARE_ACCESS_TOKEN | SQUARE_ENVIRONMENT | Purpose |
| --- | --- | --- | --- |
| Local Dev | demo | sandbox | Development without API calls |
| Staging | Sandbox token | sandbox | Integration testing |
| Production | Production token | production | Live payments |

### Credential Rotation

**Production checklist** (every 3 months):
1. Generate new access token in Square Dashboard
2. Update `SQUARE_ACCESS_TOKEN` in Render
3. Test with validation script
4. Delete old token from Square Dashboard

### Monitoring

**Set up alerts for**:
- Payment failures (>5% error rate)
- Square API downtime
- Invalid credential errors
- Location ID mismatches

**Check logs for**:
```
✅ Square credentials validated successfully
```

If you see this on startup, your configuration is correct.

---

## Quick Reference

### Environment Variable Summary

| Variable | Required | Where to Get It | Example |
| --- | --- | --- | --- |
| SQUARE_ACCESS_TOKEN | Yes | Square Dashboard > Developer > Access Tokens | `EAAAxxxxxxxx` |
| SQUARE_ENVIRONMENT | Yes | Manual (sandbox or production) | `sandbox` |
| SQUARE_LOCATION_ID | Yes | Square Dashboard > Developer > Locations | `L1V8KTKZN0DHD` |
| SQUARE_WEBHOOK_SIGNATURE_KEY | No | Square Dashboard > Webhooks | `xxxxx` |
| VITE_SQUARE_APP_ID | Yes | Square Dashboard > Applications | `sandbox-sq0idb-xxx` |
| VITE_SQUARE_LOCATION_ID | Yes | Same as SQUARE_LOCATION_ID | `L1V8KTKZN0DHD` |
| VITE_SQUARE_ENVIRONMENT | Yes | Same as SQUARE_ENVIRONMENT | `sandbox` |

### Useful Links

- **Square Developer Dashboard**: https://developer.squareup.com/apps
- **Square API Reference**: https://developer.squareup.com/reference/square
- **Square Test Values**: https://developer.squareup.com/docs/testing/test-values
- **Square Status Page**: https://www.issquareup.com/
- **Render Dashboard**: https://dashboard.render.com

### Support Commands

```bash
# Validate Square credentials
./scripts/validate-square-credentials.sh

# Test payment flow
./scripts/test-payment-flow.sh

# Check environment variables
npm run env:check

# View Render logs
render logs --service your-service-name --tail
```

---

## Next Steps

After configuring Square API:

1. **Test locally**: Create and process a test order
2. **Deploy to staging**: Test in Render staging environment
3. **Verify production**: Use validation script on production credentials
4. **Monitor payments**: Set up alerts for payment failures
5. **Document**: Keep track of which tokens are used where

For more information:
- See [DEPLOYMENT.md](../../../how-to/operations/DEPLOYMENT.md#square-integration) for deployment details
- See [ENVIRONMENT.md](../../config/ENVIRONMENT.md) for all environment variables
- See [TROUBLESHOOTING.md](../../../how-to/troubleshooting/TROUBLESHOOTING.md) for common issues

---

**Version**: 6.0
**Last Updated**: October 25, 2025
**Maintained by**: Restaurant OS Team
