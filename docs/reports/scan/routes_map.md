# React Router Tree Analysis
Generated: 2025-01-30

## Route Structure

### Public Routes (No Auth Required)
- `/` - HomePage
- `/home` - HomePage
- `/login` - Login page
- `/pin-login` - PIN login page  
- `/station-login` - Station login page
- `/kiosk-demo` - KioskDemo (public)
- `/kiosk` - KioskPage (public)
- `/drive-thru` - DriveThruPage (public)
- `/order` - Redirects to `/order/{restaurantId}`
- `/order/:restaurantId` - CustomerOrderPage (public)
- `/checkout` - CheckoutPage (public)
- `/order-confirmation` - OrderConfirmationPage (public)

### Protected Routes
- `/dashboard` - Dashboard (ManagerRoute: owner, manager)
- `/kitchen` - KitchenDisplaySimple (KitchenRoute: owner, manager, kitchen, expo)

### Unprotected Routes (SHOULD be protected)
- `/server` - ServerView (NO protection)
- `/admin` - AdminDashboard (NO protection) 
- `/history` - OrderHistory (NO protection)
- `/performance` - PerformanceDashboard (NO protection)
- `/expo` - ExpoPage (NO protection)
- `/expo-debug` - ExpoPageDebug (NO protection)

## Key Issues
1. Most routes that should be protected are NOT using any auth guard
2. Only Dashboard and Kitchen use protected route wrappers
3. Kitchen uses KitchenRoute which requires specific roles
4. No demo/guest authentication UI visible
5. Protected routes use role-based guards from ProtectedRoute component