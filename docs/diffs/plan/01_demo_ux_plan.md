# Demo UX Implementation Plan
Generated: 2025-01-30

## Objective
Replace silent demo token fallback with explicit demo UI using real Supabase sessions (dev-only).

## Key Changes

### 1. AuthContext Enhancement
**File**: `client/src/contexts/AuthContext.tsx`
- Add `loginAsDemo(role)` method
- Use pre-seeded Supabase users (e.g., server@restaurant.com)
- Store session like normal login (no local JWT)

### 2. Demo Auth Overlay Component  
**New File**: `client/src/components/auth/DevAuthOverlay.tsx`
- Only renders when `import.meta.env.VITE_DEMO_AUTH === '1'`
- Shows role selection buttons: Manager, Server, Kitchen, Expo, Cashier
- Calls `loginAsDemo(role)` from AuthContext
- Shows "Demo Mode" badge in header

### 3. HomePage Enhancement
**File**: `client/src/pages/HomePage.tsx`  
- Add "Friends & Family Demo" card (dev-only)
- Links to login with demo overlay pre-opened
- Only visible when VITE_DEMO_AUTH=1

### 4. Login Page Update
**File**: `client/src/pages/Login.tsx`
- Import and render DevAuthOverlay when VITE_DEMO_AUTH=1
- Position as modal or prominent card

### 5. Remove Silent Fallback
**File**: `client/src/services/http/httpClient.ts`
- Remove getDemoToken() import and usage (lines 139-169)
- Keep only Supabase session auth

### 6. Protected Route Updates
**File**: `client/src/components/layout/AppRoutes.tsx`
- Wrap Server, Admin, History, Performance, Expo in appropriate guards
- Use consistent auth protection

### Files to Modify
1. `client/src/contexts/AuthContext.tsx` - Add loginAsDemo
2. `client/src/components/auth/DevAuthOverlay.tsx` - Create new
3. `client/src/pages/HomePage.tsx` - Add demo CTA
4. `client/src/pages/Login.tsx` - Show overlay
5. `client/src/services/http/httpClient.ts` - Remove demo fallback
6. `client/src/components/layout/AppRoutes.tsx` - Fix route protection
7. `client/.env` - Add VITE_DEMO_AUTH=1