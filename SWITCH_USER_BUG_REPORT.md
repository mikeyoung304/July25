# Switch User Bug Report
**Date:** November 6, 2025
**Reporter:** MCP Puppeteer Automated Testing
**Severity:** **HIGH** (Security Issue)
**Status:** Confirmed

---

## Executive Summary

The "Switch User" functionality in the Restaurant OS **does not clear the previous user's session**, creating a security vulnerability where:
1. Previous user remains authenticated in localStorage
2. Session token persists across user switches
3. No clean separation between user sessions
4. Potential for session hijacking or data leakage

**User Report:** "if you click sign out, you are still saved in the system, switch user does not work"

**Testing Result:** Sign Out works correctly, but **Switch User is broken**.

---

## Issue Details

### What the User Reported
- Clicking "Sign Out" doesn't clear the session (❌ **FALSE** - Sign Out works)
- Clicking "Switch User" doesn't switch users (✅ **TRUE** - confirmed bug)

### Actual Behavior

**Sign Out (WORKS CORRECTLY):**
```
1. Click "Sign Out" → Confirmation modal appears
2. Click "Yes, Sign Out" → Session cleared
3. Auth token removed from localStorage ✓
4. User redirected to homepage ✓
5. No session data persists ✓
```

**Switch User (BROKEN):**
```
1. Click "Switch User" → PIN login screen appears
2. BUT: Manager auth token still in localStorage ❌
3. User still authenticated as: manager@restaurant.com ❌
4. Session ID still active: 660dc0b2-3f5f-4a38-b3a5-266282c4b96f ❌
5. No session cleared ❌
```

---

## Root Cause Analysis

### File: `client/src/components/auth/UserMenu.tsx:67-71`

```typescript
const handleSwitchUser = () => {
  // For quick switching without full logout
  setIsOpen(false);
  navigate('/pin-login');
};
```

**Problems:**
1. **Only navigates to `/pin-login`** - no session cleanup
2. **Does not call `logout()`** - auth token persists
3. **Does not clear localStorage** - previous user data remains
4. **Comment acknowledges the flaw:** "For quick switching without full logout"

### Comparison: Sign Out Implementation

```typescript
const handleLogout = async () => {
  if (!showLogoutConfirm) {
    setShowLogoutConfirm(true);
    return;
  }

  try {
    logger.info('User initiated logout', { userId: user.id, role: user.role });
    await logout();  // ← Properly clears session
    navigate('/login');
  } catch (error) {
    logger.error('Logout failed', error);
    navigate('/login');
  }
};
```

**Sign Out correctly:**
- Calls `logout()` function
- Clears auth token from localStorage
- Clears user session
- Then navigates

**Switch User incorrectly:**
- Skips `logout()` call
- Leaves auth token in localStorage
- Leaves user session active
- Just navigates without cleanup

---

## Security Impact

### Severity: HIGH

**Risks:**
1. **Session Persistence:** Previous user's auth token remains active
2. **Data Leakage:** New user could potentially access previous user's data
3. **Audit Trail Confusion:** Actions might be logged to wrong user
4. **Shared Device Problem:** Restaurant terminals used by multiple staff

**Attack Scenario:**
```
1. Manager logs in (manager@restaurant.com)
2. Manager clicks "Switch User"
3. Server enters their PIN
4. System shows Server interface
5. BUT: localStorage still has Manager's auth token
6. Subsequent API calls might use Manager's credentials
7. Server actions logged as Manager actions
8. Audit trail compromised
```

---

## Evidence from MCP Puppeteer Testing

### Test 1: Sign Out ✅ PASS

**Before Sign Out:**
```json
{
  "hasAuthToken": true,
  "authTokenValue": "{\"access_token\":\"eyJ...\"",
  "userInfo": {
    "email": "manager@restaurant.com",
    "userId": "660dc0b2-3f5f-4a38-b3a5-266282c4b96f"
  }
}
```

**After Sign Out:**
```json
{
  "hasAuthToken": false,
  "authTokenValue": null,
  "allLocalStorageKeys": ["cart_current"],
  "currentURL": "https://july25-client.vercel.app/"
}
```

**Result:** ✅ Auth token properly removed, session cleared

### Test 2: Switch User ❌ FAIL

**Before Switch User:**
```json
{
  "isStillAuthenticated": true,
  "userInfo": {
    "email": "manager@restaurant.com",
    "role": "authenticated",
    "userId": "660dc0b2-3f5f-4a38-b3a5-266282c4b96f"
  }
}
```

**After Clicking "Switch User":**
```json
{
  "isStillAuthenticated": true,  ← ❌ Still authenticated!
  "currentURL": "https://july25-client.vercel.app/pin-login",
  "userInfo": {
    "email": "manager@restaurant.com",  ← ❌ Still manager!
    "role": "authenticated",
    "userId": "660dc0b2-3f5f-4a38-b3a5-266282c4b96f"  ← ❌ Same user ID!
  }
}
```

**Result:** ❌ Auth token NOT removed, session persists

---

## Expected vs Actual Behavior

| Aspect | Expected | Actual | Status |
|--------|----------|--------|--------|
| Sign Out clears session | ✓ Yes | ✓ Yes | ✅ PASS |
| Sign Out removes token | ✓ Yes | ✓ Yes | ✅ PASS |
| Sign Out redirects | ✓ Yes | ✓ Yes | ✅ PASS |
| Switch User clears session | ✓ Yes | ✗ No | ❌ FAIL |
| Switch User removes token | ✓ Yes | ✗ No | ❌ FAIL |
| Switch User shows login | ✓ Yes | ✓ Yes | ⚠️ Partial |

---

## Recommended Fix

### Option 1: Clear Session Before Switch (Recommended)

```typescript
const handleSwitchUser = async () => {
  try {
    // Clear current session
    await logout();

    // Navigate to PIN login
    setIsOpen(false);
    navigate('/pin-login');
  } catch (error) {
    logger.error('Switch user failed', error);
    // Still navigate even if logout fails
    navigate('/pin-login');
  }
};
```

**Pros:**
- Clean session separation
- Secure user switching
- Consistent with Sign Out behavior

**Cons:**
- None (this is the correct behavior)

### Option 2: Clear Session on PIN Login Page (Not Recommended)

```typescript
// In PIN login page useEffect
useEffect(() => {
  // Clear previous session when landing on PIN login
  logout();
}, []);
```

**Pros:**
- Minimal changes to UserMenu

**Cons:**
- Race condition risk
- Unclear responsibility
- Could affect other navigation paths

---

## Testing Plan

### Manual Testing

**Test Case 1: Sign Out**
1. Log in as Manager (manager@restaurant.com)
2. Click User Menu → Sign Out
3. Confirm sign out
4. ✅ **Expected:** Redirected to homepage, no auth token
5. ✅ **Actual:** PASS

**Test Case 2: Switch User (Current Broken Behavior)**
1. Log in as Manager (manager@restaurant.com)
2. Click User Menu → Switch User
3. ❌ **Expected:** Session cleared, ready for new user
4. ❌ **Actual:** FAIL - Manager session persists

**Test Case 3: Switch User (After Fix)**
1. Implement recommended fix
2. Log in as Manager
3. Click User Menu → Switch User
4. Verify localStorage cleared
5. Enter PIN for Server role
6. Verify new session created for Server
7. ✅ **Expected:** New user session, no Manager data

### Automated Testing (Recommended)

```typescript
describe('User Session Management', () => {
  it('should clear session on sign out', async () => {
    // Login
    await loginAsManager();
    expect(localStorage.getItem('sb-*-auth-token')).toBeTruthy();

    // Sign out
    await clickSignOut();
    expect(localStorage.getItem('sb-*-auth-token')).toBeNull();
  });

  it('should clear session on switch user', async () => {
    // Login
    await loginAsManager();
    const managerToken = localStorage.getItem('sb-*-auth-token');
    expect(managerToken).toBeTruthy();

    // Switch user
    await clickSwitchUser();
    expect(localStorage.getItem('sb-*-auth-token')).toBeNull();

    // Login as different user
    await loginWithPIN('1234');
    const serverToken = localStorage.getItem('sb-*-auth-token');
    expect(serverToken).toBeTruthy();
    expect(serverToken).not.toEqual(managerToken);
  });
});
```

---

## Related Issues

### Documented in Previous Reports

From `ROOT_CAUSE_DIAGNOSTIC_REPORT.md`:
- **ADR-010 Gap:** Token revocation not implemented
- **Auth Context Issue:** `signOut()` only clears client-side token, no API call

From `SECURITY_MATURITY_ASSESSMENT.md`:
- **Session Management:** Rated 3/5 (needs improvement)
- **Token Handling:** Client-side only, no server-side revocation

### This Bug is Related To:
1. No server-side token revocation (ADR-010)
2. Client-side only session management
3. No enforcement of clean session switches

---

## Priority & Timeline

**Priority:** P1 (High) - Security issue affecting multi-user environments

**Impact:**
- **Security:** High (session persistence vulnerability)
- **User Experience:** High (confusing behavior)
- **Audit Trail:** High (actions logged to wrong user)
- **Compliance:** Medium (audit requirements)

**Estimated Fix Time:**
- Code change: 10 minutes
- Testing: 30 minutes
- Deployment: Included in next release

**Recommended Timeline:**
- **Immediate:** Apply recommended fix to `handleSwitchUser`
- **Next Sprint:** Add automated tests for session switching
- **Future:** Implement server-side token revocation (ADR-010)

---

## Dependencies

**Requires:**
- Access to `client/src/components/auth/UserMenu.tsx`
- `logout()` function from AuthContext
- Testing environment with multiple users

**Blocks:**
- Secure multi-user shared device deployment
- Restaurant staff PIN switching
- Compliance audit for session management

---

## Screenshots

**1. Sign Out - Working Correctly**
- Screenshot: `after-sign-out.png`
- Result: Session cleared, redirected to homepage ✓

**2. Switch User - Bug Confirmed**
- Screenshot: `after-switch-user-click.png`
- Shows: PIN login screen displayed
- Hidden: Manager session still active in localStorage ❌

**3. User Menu - Options Visible**
- Screenshot: `user-menu-open-for-switch.png`
- Shows: Both "Switch User" and "Sign Out" options
- Note: Only "Sign Out" works correctly

---

## Next Steps

### For Developers

1. **Apply Fix:**
   ```typescript
   const handleSwitchUser = async () => {
     await logout();
     setIsOpen(false);
     navigate('/pin-login');
   };
   ```

2. **Test Fix:**
   - Verify session cleared after switch
   - Verify no token in localStorage
   - Verify successful login as new user

3. **Add Tests:**
   - Unit test for `handleSwitchUser`
   - Integration test for session switching
   - E2E test with MCP Puppeteer

### For QA

1. Test both "Sign Out" and "Switch User"
2. Verify session cleared in both cases
3. Verify new user can log in cleanly
4. Test on shared device scenario

### For Security Team

1. Review session management architecture
2. Consider implementing server-side token revocation
3. Add session timeout enforcement
4. Audit multi-user scenarios

---

## Conclusion

**The Issue:**
- User reported: "sign out and switch user don't work"
- Reality: Sign Out works ✓, Switch User is broken ✗

**Root Cause:**
- `handleSwitchUser()` doesn't call `logout()`
- Previous user session persists
- Security vulnerability in multi-user environments

**Fix:**
- One-line change: add `await logout()` before navigate
- Testing: Add automated session management tests
- Future: Implement full server-side token revocation

**Impact:**
- **Before Fix:** Security risk, session confusion
- **After Fix:** Clean user switching, proper session isolation

---

**Report Generated:** November 6, 2025
**Tool Used:** MCP Puppeteer Browser Automation
**Production URL:** https://july25-client.vercel.app
**Status:** Bug confirmed, fix recommended, ready for implementation
