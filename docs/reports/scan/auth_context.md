# AuthContext Capabilities Analysis
Generated: 2025-01-30

## Current Authentication Methods

### Available
1. **login(email, password, restaurantId)** - Email/password authentication via Supabase
2. **loginWithPin(pin, restaurantId)** - PIN-based authentication 
3. **loginAsStation(stationType, stationName, restaurantId)** - Station device authentication
4. **logout()** - Clear session and sign out
5. **refreshSession()** - Refresh auth token
6. **setPin(pin)** - Set PIN for user

### Helper Methods
- **hasRole(role)** - Check if user has specific role
- **hasScope(scope)** - Check if user has specific scope
- **canAccess(requiredRoles, requiredScopes)** - Combined authorization check

## Missing Capabilities
- **NO loginAsDemo() method** - No demo/guest authentication
- **NO loginAsGuest() method** - No anonymous authentication for kiosk/public
- **NO role switching** - Can't switch roles without full re-auth

## Session Storage
- Uses localStorage for PIN/station sessions
- Uses Supabase session for email/password auth
- Stores: user, session (token), restaurantId

## Auth State
- Tracks: user, session, isAuthenticated, isLoading, restaurantId
- Auto-loads from Supabase session or localStorage on init
- Subscribes to Supabase auth state changes

## Key Issues for Demo Mode
1. No demo authentication method exists
2. Would need to add loginAsDemo(role) that:
   - Either uses pre-seeded Supabase users
   - Or creates temporary session (not ideal for RLS)
3. Currently all auth goes through real backend endpoints