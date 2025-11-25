# Stripe API Configuration Guide


**Last Updated:** 2025-11-25

**Last Updated**: November 25, 2025
**Version**: 6.0

This guide provides step-by-step instructions for configuring Stripe payment processing in Restaurant OS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Getting Stripe Credentials](#getting-stripe-credentials)
3. [Environment Variables](#environment-variables)
4. [Local Development Setup](#local-development-setup)
5. [Production Deployment (Render)](#production-deployment-render)
6. [Testing Your Configuration](#testing-your-configuration)
7. [Troubleshooting](#troubleshooting)
8. [Security Best Practices](#security-best-practices)

---

## Prerequisites

Before you begin, ensure you have:

- A Stripe account (sign up at https://stripe.com/register)
- Access to Stripe Dashboard
- Admin access to your Render deployment (for production)
- Local development environment set up

## Getting Stripe Credentials

### Option 1: Test Mode (Testing/Development)

Recommended for development and testing without processing real payments.

1. **Login to Stripe Dashboard**
   - Go to https://dashboard.stripe.com
   - Sign in with your Stripe account

2. **Navigate to Test Mode**
   - Toggle the **Test mode** switch in the top right to ON
   - The interface will indicate "Test mode" when active

3. **Get Test Secret Key**
   - Click on **Developers** in the left sidebar
   - Select **API keys**
   - Copy your **Secret key** (for backend)
   - Note: Test secret keys start with `sk_test_`
   - WARNING: Never expose secret keys in client-side code

4. **Get Test Publishable Key**
   - On the same API keys page
   - Copy your **Publishable key** (for frontend)
   - Note: Test publishable keys start with `pk_test_`
   - Safe to expose in client-side JavaScript

5. **Get Webhook Signing Secret** (optional)
   - Go to **Developers** > **Webhooks**
   - Click **Add endpoint** to create a webhook endpoint
   - Copy the **Signing secret** (starts with `whsec_`)
   - Used to verify webhook events from Stripe

### Option 2: Live Mode (Production Payments)

Use only when ready to process real credit card transactions.

1. **Login to Stripe Dashboard**
   - Go to https://dashboard.stripe.com

2. **Navigate to Live Mode**
   - Toggle the **Test mode** switch in the top right to OFF
   - The interface will indicate "Live mode" when active
   - WARNING: Live mode processes real charges

3. **Get Production Secret Key**
   - Click on **Developers** in the left sidebar
   - Select **API keys**
   - Copy your **Secret key**
   - Note: Production secret keys start with `sk_live_`
   - WARNING: Keep this secret - it can charge real credit cards

4. **Get Production Publishable Key**
   - On the same API keys page
   - Copy your **Publishable key**
   - Note: Production publishable keys start with `pk_live_`

5. **Get Production Webhook Signing Secret**
   - Go to **Developers** > **Webhooks**
   - Set up your production webhook endpoint
   - Copy the **Signing secret** for production

### Option 3: Demo Mode (No Stripe Account Required)

For local development or testing without Stripe API calls.

- No Stripe account needed
- Mocks payment responses
- Safe for internal testing
- Does NOT process real payments

---

## Environment Variables

### Required Environment Variables

You need to configure these variables in both your local `.env` file and production environment.

#### Server-Side Variables

```bash
# Stripe Secret Key
# Test Mode: Get from Developers > API keys (test mode ON)
# Live Mode: Get from Developers > API keys (test mode OFF)
STRIPE_SECRET_KEY=sk_test_your-secret-key-here

# Stripe Webhook Signing Secret (optional, for webhook verification)
# Get from Developers > Webhooks > [your endpoint] > Signing secret
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret-here
```

#### Client-Side Variables

```bash
# Stripe Publishable Key (for Stripe Elements in frontend)
# Test Mode: starts with 'pk_test_'
# Live Mode: starts with 'pk_live_'
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-publishable-key-here
```

### Demo Mode Configuration

For development without Stripe API:

```bash
# Server-side only
STRIPE_SECRET_KEY=demo
```

When `STRIPE_SECRET_KEY=demo`, the server will:
- Skip real Stripe API calls
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

2. **Add Stripe credentials** to `.env`:
   ```bash
   # Server configuration
   STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxx  # Optional

   # Client configuration
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. **Validate your configuration**:
   ```bash
   # Load environment variables
   source .env

   # Run Stripe credential validation
   ./scripts/validate-stripe-credentials.sh
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
   - Use Stripe test card: `4242 4242 4242 4242`
   - Expiration: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

---

## Production Deployment (Render)

### Step 1: Access Render Dashboard

1. Go to https://dashboard.render.com
2. Select your **Restaurant OS** backend service
3. Click on **Environment** in the left sidebar

### Step 2: Add Stripe Environment Variables

Click **Add Environment Variable** and add each of the following:

#### Variable 1: STRIPE_SECRET_KEY
- **Key**: `STRIPE_SECRET_KEY`
- **Value**: Your production or test secret key
- **Example**: `sk_live_XXXX...` or `sk_test_XXXX...`
- **Important**: Test keys for staging, live keys for production

#### Variable 2: STRIPE_WEBHOOK_SECRET (Optional)
- **Key**: `STRIPE_WEBHOOK_SECRET`
- **Value**: Your webhook signing secret
- **Example**: `whsec_xxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Note**: Only needed if using Stripe webhooks for payment confirmations

### Step 3: Save and Deploy

1. Click **Save Changes**
2. Render will automatically redeploy your service
3. Monitor the deployment logs for successful startup

### Step 4: Verify Deployment

Check the Render logs for Stripe credential validation:

**Success message**:
```
✅ Stripe credentials validated successfully
   Mode: test
   Publishable Key: pk_test_xxx...
   Secret Key: sk_test_xxx...
```

**Error message** (if misconfigured):
```
🚨 Stripe API key validation failed!
   Error: Invalid API key provided
   Key starts with: sk_test_
```

---

## Testing Your Configuration

### Automated Validation Script

The repository includes a validation script that checks your Stripe credentials:

```bash
# Export your environment variables
export STRIPE_SECRET_KEY="sk_test_your-key"
export VITE_STRIPE_PUBLISHABLE_KEY="pk_test_your-key"

# Run validation
./scripts/validate-stripe-credentials.sh
```

**What it checks**:
- Secret key is valid and has correct format
- Publishable key matches the secret key (test/live mode)
- Payment Intent API is accessible
- Credentials have necessary permissions

**Expected output**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Stripe Credentials Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mode: test

📍 Test 1: Validating Stripe Secret Key...
✅ Secret key is valid
   Key format: sk_test_xxx...
   Live mode: false

📍 Test 2: Validating Stripe Publishable Key...
✅ Publishable key is valid
   Key format: pk_test_xxx...
   Matches secret key mode: true

💳 Test 3: Testing Payment Intent creation...
✅ Payment API accessible
   Test Payment Intent created successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All Stripe credentials validated successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary:
  Mode:           test
  Secret Key:     sk_test_xxx...
  Publishable:    pk_test_xxx...

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

### Test Cards (Test Mode Only)

Use these test cards in Stripe Test Mode:

| Card Number | Result |
| --- | --- |
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Card declined |
| 4000 0000 0000 9995 | Insufficient funds |
| 4000 0025 0000 3155 | Requires authentication (3D Secure) |
| 5555 5555 5555 4444 | Success (Mastercard) |

**Note**: Live mode requires real credit cards.

---

## Troubleshooting

### Issue: "Invalid API key provided"

**Symptom**: Server logs show API key validation error

**Cause**: The configured `STRIPE_SECRET_KEY` is invalid or malformed

**Solution**:
1. Verify the key starts with `sk_test_` (test) or `sk_live_` (production)
2. Ensure no extra spaces or characters were copied
3. Generate a new key in Stripe Dashboard if needed:
   - Go to **Developers** > **API keys**
   - Click **Create secret key**
4. Update `STRIPE_SECRET_KEY` in Render environment variables
5. Save and redeploy

**Common cause**: Copying the key with extra whitespace or truncating characters

### Issue: "Test/Live mode mismatch"

**Symptom**: Payment creation fails with mode mismatch error

**Possible causes**:
1. **Mismatched keys**: Using test secret key with live publishable key (or vice versa)
2. **Wrong environment**: Test keys used in production environment

**Solution**:
1. Verify both keys use the same mode:
   - Test: Both start with `sk_test_` and `pk_test_`
   - Live: Both start with `sk_live_` and `pk_live_`
2. Check Stripe Dashboard to confirm key modes
3. Update environment variables to match modes
4. For production, use live keys; for development/staging, use test keys

### Issue: "Payment Intent creation returns 500 error"

**Symptom**: Payment endpoint returns HTTP 500

**Check these**:
1. **Render logs**: Look for detailed error message
2. **Key validity**: Run `./scripts/validate-stripe-credentials.sh`
3. **Mode mismatch**: Verify test/live mode consistency
4. **API permissions**: Ensure key has payment creation permissions

**Debug steps**:
```bash
# Check Render logs
render logs --service your-service-name --tail

# Validate credentials
./scripts/validate-stripe-credentials.sh

# Test payment flow
./scripts/test-payment-flow.sh
```

### Issue: "Stripe Elements doesn't load"

**Symptom**: Payment form is blank or shows initialization error

**Possible causes**:
1. Missing `VITE_STRIPE_PUBLISHABLE_KEY`
2. Invalid publishable key format
3. CORS issues between frontend and Stripe
4. Network blocking Stripe.js

**Solution**:
1. Verify frontend environment variables in Vercel:
   - `VITE_STRIPE_PUBLISHABLE_KEY`
2. Ensure key starts with `pk_test_` or `pk_live_`
3. Check browser console for specific errors
4. Verify Stripe.js loads: check Network tab for `https://js.stripe.com/v3/`
5. Test with a different network if corporate firewall blocks Stripe

### Issue: "Test card declined in test mode"

**Symptom**: Valid test card shows as declined

**Solution**:
1. Verify you're using `sk_test_` secret key (test mode)
2. Use official Stripe test cards (see Test Cards section)
3. For decline testing, use specific decline test cards (e.g., 4000 0000 0000 0002)
4. Check Stripe Dashboard logs for detailed decline reason

### Issue: "Webhook signature verification failed"

**Symptom**: Webhooks return 400 with signature verification error

**Check**:
1. Webhook signing secret is correct (`whsec_xxx`)
2. Webhook endpoint URL matches exactly (no trailing slashes)
3. Raw request body is used for verification (not parsed JSON)

**Debug**:
```bash
# Test webhook locally with Stripe CLI
stripe listen --forward-to localhost:3001/webhooks/stripe

# Trigger test webhook
stripe trigger payment_intent.succeeded
```

### Issue: "Startup validation passes but payments fail"

**Symptom**: Server starts successfully but payments return errors

**Check**:
1. Order state: Ensure order is in valid state for payment
2. Amount validation: Server recalculates amount - check logs
3. Idempotency key: Ensure unique key per payment attempt
4. Currency: Verify currency code is supported (USD, EUR, etc.)

**Debug**:
```bash
# Enable debug logging
export LOG_LEVEL=debug

# Restart server and check logs
npm run dev
```

---

## Security Best Practices

### API Key Security

**DO**:
- Store secret keys in environment variables only
- Use separate keys for test and live mode
- Rotate live keys regularly (quarterly)
- Restrict API key permissions to minimum required
- Use webhook signing secrets to verify events

**DON'T**:
- Commit keys to version control
- Share keys in chat or email
- Use live keys in development
- Log full key values
- Expose secret keys in client-side code

### Environment Separation

**Recommended setup**:

| Environment | STRIPE_SECRET_KEY | VITE_STRIPE_PUBLISHABLE_KEY | Purpose |
| --- | --- | --- | --- |
| Local Dev | demo | (not needed) | Development without API calls |
| Staging | sk_test_xxx | pk_test_xxx | Integration testing |
| Production | sk_live_xxx | pk_live_xxx | Live payments |

### Credential Rotation

**Production checklist** (every 3 months):
1. Generate new secret key in Stripe Dashboard
   - **Developers** > **API keys** > **Create secret key**
2. Update `STRIPE_SECRET_KEY` in Render
3. Test with validation script
4. Roll old keys (Stripe allows multiple active keys for rotation)
5. Delete old key after confirming new key works

### Monitoring

**Set up alerts for**:
- Payment failures (>5% error rate)
- Stripe API downtime
- Invalid credential errors
- Webhook delivery failures
- Unusual charge patterns

**Check logs for**:
```
✅ Stripe credentials validated successfully
```

If you see this on startup, your configuration is correct.

**Stripe Dashboard monitoring**:
- Check **Developers** > **Webhooks** for delivery failures
- Monitor **Payments** for failed charges
- Review **Logs** for API errors

---

## Quick Reference

### Environment Variable Summary

| Variable | Required | Where to Get It | Example |
| --- | --- | --- | --- |
| STRIPE_SECRET_KEY | Yes | Stripe Dashboard > Developers > API keys | `sk_test_xxxxxxxx` or `sk_live_xxxxxxxx` |
| STRIPE_WEBHOOK_SECRET | No | Stripe Dashboard > Developers > Webhooks | `whsec_xxxxxxxx` |
| VITE_STRIPE_PUBLISHABLE_KEY | Yes | Stripe Dashboard > Developers > API keys | `pk_test_xxxxxxxx` or `pk_live_xxxxxxxx` |

### Useful Links

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Stripe API Reference**: https://stripe.com/docs/api
- **Stripe Test Cards**: https://stripe.com/docs/testing
- **Stripe Status Page**: https://status.stripe.com
- **Stripe Elements Docs**: https://stripe.com/docs/stripe-js
- **Render Dashboard**: https://dashboard.render.com

### Support Commands

```bash
# Validate Stripe credentials
./scripts/validate-stripe-credentials.sh

# Test payment flow
./scripts/test-payment-flow.sh

# Check environment variables
npm run env:check

# View Render logs
render logs --service your-service-name --tail

# Test webhooks locally (requires Stripe CLI)
stripe listen --forward-to localhost:3001/webhooks/stripe
```

---

## Next Steps

After configuring Stripe API:

1. **Test locally**: Create and process a test order with Stripe Elements
2. **Deploy to staging**: Test in Render staging environment with test keys
3. **Verify production**: Use validation script on production credentials
4. **Set up webhooks**: Configure webhook endpoints for payment confirmations
5. **Monitor payments**: Set up alerts for payment failures in Stripe Dashboard
6. **Document**: Keep track of which keys are used where

For more information:
- See [DEPLOYMENT.md](../../../how-to/operations/DEPLOYMENT.md#stripe-integration) for deployment details
- See [ENVIRONMENT.md](../../config/ENVIRONMENT.md) for all environment variables
- See [TROUBLESHOOTING.md](../../../how-to/troubleshooting/TROUBLESHOOTING.md) for common issues

---

## Stripe Elements Integration

### Client-Side Implementation

Stripe uses **Stripe Elements** for secure client-side card tokenization:

1. **Load Stripe.js**:
   ```javascript
   import { loadStripe } from '@stripe/stripe-js';
   const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
   ```

2. **Create Payment Intent** (server-side):
   ```typescript
   const paymentIntent = await stripe.paymentIntents.create({
     amount: 2999, // Amount in cents
     currency: 'usd',
     metadata: { order_id: '123' }
   });
   ```

3. **Confirm Payment** (client-side):
   ```javascript
   const { error } = await stripe.confirmCardPayment(clientSecret, {
     payment_method: {
       card: cardElement,
       billing_details: { name: 'Customer Name' }
     }
   });
   ```

### Security Features

- **PCI Compliance**: Stripe handles card data, never touches your server
- **3D Secure**: Automatic authentication for European cards
- **Tokenization**: Card details converted to secure tokens
- **Webhook Verification**: HMAC signature verification for events

---

**Version**: 6.0
**Last Updated**: November 25, 2025
**Maintained by**: Restaurant OS Team
