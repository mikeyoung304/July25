# Authentication Issue

**Date**: 2025-09-04  
**Status**: ⚠️ Auth failing despite users having passwords

## Issue
All 5 test users return "Invalid email or password" despite having:
- Valid auth.users entries  
- encrypted_password set
- Correct restaurant mappings

## Root Cause
Likely password encoding mismatch between how they were set (bcrypt via script) and how Supabase expects them.

## Workaround for Testing
Since users exist with correct structure, we can proceed with smoke tests using service role for now.

## Fix Required
Use Supabase admin API to properly set passwords:
```javascript
await supabase.auth.admin.updateUserById(userId, { 
  password: 'Password123!' 
})
```