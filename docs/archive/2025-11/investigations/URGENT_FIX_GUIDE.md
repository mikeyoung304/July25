# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](/docs/README.md)
> Category: Investigations

---

# 🚨 URGENT: Fix Touch & Voice Order Issues

**Date**: November 12, 2025
**Status**: Both issues are fixable - follow steps below

---

## Issue 1: Touch Order 401 Error ❌

### Root Cause
Your browser is using an **OLD JWT token** from before the deployment (26 minutes ago).

### Fix (Takes 1 minute):

**Step 1: Logout**
- Click the logout button in the UI

**Step 2: Clear Browser Storage**
```javascript
// In browser DevTools Console, run:
localStorage.clear();
sessionStorage.clear();
```

**Step 3: Login Again**
- Email: `server@restaurant.com`
- Password: `ServerPass123!`
- Restaurant ID: (should auto-fill)

**Step 4: Verify New Token**
```javascript
// In Console, run:
const token = JSON.parse(localStorage.getItem('auth_session')).session.accessToken;
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Has scopes:', !!payload.scope);
console.log('Scopes:', payload.scope);
```

You should see:
```
Has scopes: true
Scopes: ["orders:create", "orders:read", "orders:update", ...]
```

**Step 5: Try Order Again**
- Add item to cart
- Click "Send Order"
- Should get SUCCESS (not 401)

---

## Issue 2: Voice Order Not Transcribing ❌

### Symptoms I See in Your Screenshot:
- ✅ WebSocket connected
- ✅ 18 messages received
- ✅ Microphone enabled
- ✅ Audio transmission working
- ❌ NO transcripts appearing
- ❌ NO items in cart

### Possible Causes:

#### Cause 1: OpenAI API Rate Limit or Error
**Check**: Look for errors in console containing "OpenAI" or "rate limit"

#### Cause 2: Menu Context Too Large
**Check**: Look for "session.update config" - if menu is >5KB, it's truncated

#### Cause 3: No Speech Detected
**What to say**: Speak clearly: "I want a chicken parmesan and a greek salad"

#### Cause 4: Transcript Parsing Failing
**Check**: Voice Debug Panel should show transcript text even if matching fails

---

## Diagnostic Steps for Voice Order

### Step 1: Check Audio Input
```javascript
// In Console:
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(() => console.log('✅ Microphone access granted'))
  .catch(e => console.error('❌ Microphone error:', e));
```

### Step 2: Check Voice Debug Panel
- Should show transcript text as you speak
- If you see transcript but no items → Menu matching issue
- If you see NO transcript → OpenAI connection issue

### Step 3: Check Console for Specific Errors
Look for these patterns:
- `[ERROR]` messages
- `Failed to` messages
- `OpenAI` errors
- `transcript` errors

### Step 4: Check Network Tab
- Filter for "realtime" or "openai"
- Look for WebSocket messages
- Check if responses are coming back

---

## Quick Voice Test Script

Paste this in Console to diagnose:

```javascript
// Check voice order state
const checkVoiceState = () => {
  console.log('=== VOICE ORDER DIAGNOSTICS ===');

  // Check auth
  const authSession = localStorage.getItem('auth_session');
  if (!authSession) {
    console.error('❌ No auth session');
    return;
  }

  const session = JSON.parse(authSession);
  console.log('✅ Logged in as:', session.user?.email);
  console.log('✅ Role:', session.user?.role);

  // Check token
  if (session.session?.accessToken) {
    const token = session.session.accessToken;
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Token has scopes:', !!payload.scope);
    if (payload.scope) {
      console.log('Scopes:', payload.scope);
    } else {
      console.warn('⚠️  OLD TOKEN - Need to re-login!');
    }
  }

  // Check microphone
  navigator.mediaDevices.enumerateDevices()
    .then(devices => {
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      console.log(`✅ ${audioInputs.length} microphone(s) found`);
    });

  console.log('=== END DIAGNOSTICS ===');
};

checkVoiceState();
```

---

## Expected Behavior After Fix

### Touch Order:
1. Add item to cart → ✅ Shows in "Order Items"
2. Click "Send Order" → ✅ HTTP 201 response
3. Success message → ✅ "Order submitted!"
4. Order appears in KDS → ✅ Order visible

### Voice Order:
1. Click "Voice Order" → ✅ Modal opens
2. Click microphone → ✅ "HOLD ME" shows
3. Speak order → ✅ Transcript appears in Voice Debug Panel
4. Release microphone → ✅ Items added to cart
5. Cart shows items → ✅ With "voice" badge
6. Click "Send Order" → ✅ HTTP 201 response

---

## If Issues Persist

### For Touch Order 401:
If you still get 401 after re-login, check:
```javascript
// Verify token is being sent:
fetch('https://july25.onrender.com/api/v1/orders', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + JSON.parse(localStorage.getItem('auth_session')).session.accessToken,
    'Content-Type': 'application/json',
    'X-Restaurant-ID': '11111111-1111-1111-1111-111111111111',
    'X-Client-Flow': 'server'
  },
  body: JSON.stringify({
    type: 'dine-in',
    items: [{
      id: 'test-1',
      menu_item_id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Test',
      quantity: 1,
      price: 10.99
    }],
    table_number: '1',
    seat_number: 1,
    customer_name: 'Test',
    total_amount: 11.88
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

### For Voice Order No Transcripts:
1. Check OpenAI API key is set on server
2. Check VITE_OPENAI_API_KEY in client env
3. Try with shorter, clearer phrases
4. Check if specific menu items are causing issues

---

## Contact Points

If issues persist after following all steps:
1. Take screenshot of Console errors
2. Export HAR file from Network tab
3. Share Voice Debug Panel screenshot
4. Note exactly what you said during voice order

---

**MOST IMPORTANT**:
**🔄 LOGOUT AND RE-LOGIN FIRST!** This will fix the touch order 401 error immediately.

After that, we can focus on voice order transcription debugging.