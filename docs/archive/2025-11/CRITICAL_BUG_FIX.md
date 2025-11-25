# CRITICAL BUG FIX: Session Endpoint Empty Menu Validation

## Problem Statement

The session endpoint (`POST /api/v1/realtime/session`) successfully creates voice sessions even when the restaurant has no menu items, returning a 200 OK with an empty `menu_context` string. This allows the voice ordering UI to load without menu data, preventing customers from placing orders.

## Root Cause

**File**: `server/src/routes/realtime.routes.ts`
**Lines**: 195-293

The code has comprehensive error handling in the catch block (lines 294-315), but this is only triggered when MenuService **throws an error**. When a restaurant doesn't exist or has no menu items, MenuService returns successfully with empty arrays `[]`, bypassing the error handler.

```typescript
try {
  const [menuData, categories] = await Promise.all([
    MenuService.getItems(restaurantId as string),
    MenuService.getCategories(restaurantId as string)
  ]);

  if (menuData && menuData.length > 0) {
    // Build menu context...
    menuContext = '...';
  }
  // ❌ BUG: No else clause - menuContext stays empty!
  // ❌ Code continues to create session with empty menu

} catch (error: any) {
  // ✅ This error handling is perfect
  // ❌ But it's never reached for empty menu case
  return res.status(503).json({...});
}

// ❌ Session creation proceeds with menuContext = ""
```

## The Fix

Add validation after line 292 to fail fast when menu is empty:

```typescript
// After the closing brace of the if block (line 292), add:

      }
    } else {
      // CRITICAL: Menu data is empty - fail fast
      const userId = req.user?.id;
      logMenuLoadFailure(new Error('No menu items found for restaurant'), {
        restaurantId: restaurantId,
        ...(userId && { userId }),
        attemptedOperation: 'load_menu_for_voice_session'
      });

      realtimeLogger.error('Menu data empty - cannot proceed with voice session', {
        restaurantId,
        itemCount: menuData?.length || 0,
        categoryCount: categories?.length || 0,
        timestamp: new Date().toISOString()
      });

      return res.status(503).json({
        error: 'Menu temporarily unavailable',
        code: 'MENU_LOAD_FAILED',
        details: 'No menu items found for this restaurant. Voice ordering requires menu data.'
      });
    }
  } catch (error: any) {
    // Existing error handler remains unchanged...
```

## Testing the Fix

### Before Fix (Current Behavior)
```bash
$ curl -X POST -H "x-restaurant-id: 99999999-9999-9999-9999-999999999999" \
  http://localhost:3001/api/v1/realtime/session

# Returns 200 OK with empty menu_context ❌
{
  "object": "realtime.session",
  "restaurant_id": "99999999-9999-9999-9999-999999999999",
  "menu_context": "",
  "client_secret": {...}
}
```

### After Fix (Expected Behavior)
```bash
$ curl -X POST -H "x-restaurant-id: 99999999-9999-9999-9999-999999999999" \
  http://localhost:3001/api/v1/realtime/session

# Returns 503 Service Unavailable ✅
{
  "error": "Menu temporarily unavailable",
  "code": "MENU_LOAD_FAILED",
  "details": "No menu items found for this restaurant. Voice ordering requires menu data."
}
```

## Complete Code Patch

**File**: `server/src/routes/realtime.routes.ts`

```diff
       realtimeLogger.info('Loaded menu for voice context', {
         restaurantId,
         itemCount: menuItems.length,
         categories: Object.keys(menuByCategory),
         menuContextLength: menuContext.length
       });
+    } else {
+      // CRITICAL: Menu data is empty - fail fast
+      const userId = req.user?.id;
+      logMenuLoadFailure(new Error('No menu items found for restaurant'), {
+        restaurantId: restaurantId,
+        ...(userId && { userId }),
+        attemptedOperation: 'load_menu_for_voice_session'
+      });
+
+      realtimeLogger.error('Menu data empty - cannot proceed with voice session', {
+        restaurantId,
+        itemCount: menuData?.length || 0,
+        categoryCount: categories?.length || 0,
+        timestamp: new Date().toISOString()
+      });
+
+      return res.status(503).json({
+        error: 'Menu temporarily unavailable',
+        code: 'MENU_LOAD_FAILED',
+        details: 'No menu items found for this restaurant. Voice ordering requires menu data.'
+      });
     }
   } catch (error: any) {
     // CRITICAL FIX: Fail fast instead of continuing with empty menu
```

## Impact Analysis

### Fixes Production Bug
This fix addresses the **exact scenario** that causes voice ordering to fail in production:
1. Restaurant exists in database
2. But has zero menu items (or RLS policy blocks access)
3. MenuService returns empty array
4. Session created with no menu
5. Voice UI loads but cannot take orders

### No Breaking Changes
- Valid restaurants with menu items: No change (still works)
- Invalid restaurant IDs: No change (still works via slug resolver)
- Database errors: No change (still caught by catch block)
- New behavior: Only affects empty menu case (fail fast instead of silent failure)

### Client-Side Validation
Once this fix is deployed, the client-side validation in `VoiceSessionConfig.ts` will:
1. Never receive empty menu_context (server returns 503 error instead)
2. Can still validate as defense-in-depth
3. Will show proper error to user: "Menu temporarily unavailable"

## Recommended Next Steps

1. **Apply this patch** to `server/src/routes/realtime.routes.ts`
2. **Test manually** with curl commands above
3. **Run server tests**: `cd server && npm test`
4. **Add integration test** (see INTEGRATION_TEST_REPORT.md section 8.2)
5. **Deploy to staging** and verify with non-existent restaurant
6. **Deploy to production** with monitoring

## Verification Checklist

- [ ] Code patch applied
- [ ] Server restarts without errors
- [ ] Valid restaurant UUID still works (200 OK with menu)
- [ ] Slug "grow" still works (200 OK with menu)
- [ ] Non-existent restaurant UUID returns 503
- [ ] Empty menu restaurant returns 503
- [ ] Server logs show proper error messages
- [ ] Client receives 503 status code
- [ ] Integration tests pass
- [ ] No TypeScript errors introduced

---

**Priority**: P0 (Critical - Blocks production deployment)
**Effort**: 5 minutes (10 lines of code)
**Risk**: Low (fail-fast is safer than current behavior)
**Author**: Agent 4 - Integration Testing & Verification
