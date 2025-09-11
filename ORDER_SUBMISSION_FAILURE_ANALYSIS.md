# Order Submission Failure - Technical Analysis Report

## Executive Summary
Orders are failing to submit with "Failed to submit order" error due to **missing authentication** in the kiosk checkout flow. The backend properly rejects requests with 401 "Insufficient permissions" because no valid JWT token is present.

## Root Cause Analysis

### 1. The EXACT Failure Point
**Location**: `/server/src/middleware/auth.ts` line 280
```typescript
if (!req.user || !roles.includes(req.user.role || '')) {
  next(Unauthorized('Insufficient permissions'));
}
```

**Evidence from Server Logs**:
```json
{
  "level": "error",
  "message": {
    "error": "Insufficient permissions",
    "statusCode": 401,
    "url": "/api/v1/orders"
  }
}
```

### 2. Why It's Failing

#### Backend Requirements (Working Correctly)
The `/api/v1/orders` POST endpoint requires:
1. **Authentication**: Valid JWT token in Authorization header
2. **Role Check**: User must have one of: `['admin', 'manager', 'user', 'kiosk_demo']`
3. **Scope Check**: User must have scope: `['orders:create']`
4. **Restaurant Access**: Valid restaurant_id in header or token

```typescript
// From orders.routes.ts line 37
router.post('/', 
  authenticate,  // ← Requires valid JWT
  requireRole(['admin', 'manager', 'user', 'kiosk_demo']), // ← Requires specific role
  requireScope(['orders:create']), // ← Requires order creation scope
  validateRestaurantAccess, // ← Requires restaurant context
  async (req: AuthenticatedRequest, res, next) => { ... }
);
```

#### Frontend Issue (Missing Authentication)
The kiosk checkout flow **never authenticates** before trying to submit orders:

1. **KioskPage.tsx** - Sets restaurant context but no authentication
2. **KioskCheckoutPage.tsx** - Uses `useApiRequest` which tries to get Supabase session
3. **useApiRequest.ts** - Falls back to no auth when Supabase session is unavailable

```typescript
// From useApiRequest.ts line 59-65
const { data: { session } } = await supabase.auth.getSession();
if (session?.access_token) {
  headers.set('Authorization', `Bearer ${session.access_token}`);
} else {
  console.warn('No authentication session available'); // ← This happens in kiosk mode
}
```

### 3. The Authentication Architecture Mismatch

#### Server Provides Kiosk Authentication
The server has a **production-ready** kiosk authentication endpoint:
- **Endpoint**: `POST /api/v1/auth/kiosk`
- **Purpose**: Issues limited-scope JWT tokens for customer self-service
- **Token Details**:
  - 1-hour expiry
  - Role: `kiosk_demo` (meaning 'customer')
  - Scopes: `['menu:read', 'orders:create', 'ai.voice:chat', 'payments:process']`
  - Signed with HS256 algorithm

```typescript
// From auth.routes.ts line 43-98
router.post('/kiosk', authLimiter, async (req: Request, res: Response) => {
  // ... validates restaurant ID
  const payload = {
    sub: `customer:${sessionId}`,
    role: 'kiosk_demo', // ← This role is allowed for order creation
    restaurant_id: restaurantId,
    scope: ['menu:read', 'orders:create', ...], // ← Has required scope
    exp: Math.floor(Date.now() / 1000) + 3600
  };
  const token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });
  res.json({ token, expiresIn: 3600 });
});
```

#### Frontend Never Calls Kiosk Auth
**Critical Issue**: The frontend kiosk components never:
1. Call `/api/v1/auth/kiosk` to get a token
2. Store the kiosk token for API requests
3. Pass the token to the order submission

## Data Flow Analysis

### Current (Broken) Flow
```
1. User enters Kiosk mode → Sets restaurant context only
2. User adds items to cart → Works (client-side only)
3. User proceeds to checkout → Shows form correctly
4. User submits order → useApiRequest tries Supabase auth
5. No Supabase session exists → No Authorization header sent
6. Server receives request → authenticate middleware rejects (401)
7. Frontend shows "Failed to submit order"
```

### Expected (Working) Flow
```
1. User enters Kiosk mode → Authenticate with /api/v1/auth/kiosk
2. Store kiosk JWT token → Use for all API requests
3. User adds items to cart → Works (client-side)
4. User proceeds to checkout → Shows form
5. User submits order → Include kiosk JWT in Authorization header
6. Server validates token → Role 'kiosk_demo' is allowed
7. Order created successfully → Navigate to confirmation
```

## Additional Issues Found

### 1. Order Data Structure Issues
The order submission includes `menu_item_id` but the field might be undefined:
```typescript
// From KioskCheckoutPage.tsx line 154
menu_item_id: item.menuItemId || item.menuItem?.id, // ← Could be undefined
```

### 2. Database Type Mismatch
The server maps UI order types to database-valid types:
```typescript
// From orders.service.ts line 109-118
const orderTypeMapping: Record<string, string> = {
  'kiosk': 'online',  // ← UI type 'kiosk' becomes DB type 'online'
  'voice': 'online',
  // ... database only accepts: 'online', 'pickup', 'delivery'
};
```

## Solution Implementation

### Immediate Fix (Minimal Changes)
Create a kiosk authentication hook and integrate it:

**Step 1**: Create `/client/src/hooks/useKioskAuth.ts`
```typescript
import { useEffect, useState } from 'react';
import { useRestaurant } from '@/core';

export function useKioskAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { restaurant } = useRestaurant();

  useEffect(() => {
    const authenticateKiosk = async () => {
      if (!restaurant?.id) return;
      
      try {
        const response = await fetch('/api/v1/auth/kiosk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ restaurantId: restaurant.id })
        });
        
        if (response.ok) {
          const data = await response.json();
          setToken(data.token);
          // Store in sessionStorage for useApiRequest to find
          sessionStorage.setItem('kiosk_token', data.token);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Kiosk authentication failed:', error);
      }
    };
    
    authenticateKiosk();
  }, [restaurant?.id]);
  
  return { token, isAuthenticated };
}
```

**Step 2**: Update `KioskPage.tsx` to authenticate on mount
```typescript
import { useKioskAuth } from '@/hooks/useKioskAuth';

const KioskPageContent: React.FC = () => {
  const { isAuthenticated } = useKioskAuth();
  // ... existing code
  
  if (!isAuthenticated) {
    return <div>Initializing kiosk...</div>;
  }
  // ... rest of component
};
```

**Step 3**: Update `useApiRequest.ts` to check for kiosk token
```typescript
// In getHeaders function, after line 56
if (!options?.skipAuth) {
  // Check for kiosk token first
  const kioskToken = sessionStorage.getItem('kiosk_token');
  if (kioskToken) {
    headers.set('Authorization', `Bearer ${kioskToken}`);
  } else {
    // ... existing Supabase auth code
  }
}
```

### Long-term Architecture Improvements
1. **Unified Auth Context**: Create a context that manages both Supabase and kiosk authentication
2. **Token Refresh**: Implement automatic token refresh before expiry
3. **Error Recovery**: Add retry logic with re-authentication on 401 errors
4. **Menu Item ID Validation**: Ensure menu_item_id is always populated before submission

## Testing Checklist
- [ ] Kiosk mode authenticates on entry
- [ ] Token is included in order submission requests
- [ ] Orders submit successfully with kiosk authentication
- [ ] Token refresh works before 1-hour expiry
- [ ] Error messages are user-friendly

## Conclusion
The order submission failure is caused by a **complete absence of authentication** in the kiosk checkout flow. The backend is working correctly by rejecting unauthenticated requests. The solution requires implementing kiosk authentication on the frontend and ensuring the token is included in all API requests from kiosk mode.