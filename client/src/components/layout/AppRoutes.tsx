import React, { Profiler, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from '@/components/shared/errors/ErrorBoundary'
import { ProtectedRoute, ManagerRoute, KitchenRoute, ServerRoute, AdminRoute } from '@/components/auth/ProtectedRoute'
import { env } from '@/utils/env'
import { performanceMonitor } from '@/services/performance/performanceMonitor'

// Eager load critical/common pages
import { HomePage } from '@/pages/HomePage'

// Lazy load auth pages
const Login = lazy(() => import('@/pages/Login'))
const PinLogin = lazy(() => import('@/pages/PinLogin'))
const StationLogin = lazy(() => import('@/pages/StationLogin'))
const UnauthorizedPage = lazy(() => import('@/pages/UnauthorizedPage').then(m => ({ default: m.UnauthorizedPage })))

// Lazy load all other routes for code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const KitchenDisplaySimple = lazy(() => import('@/pages/KitchenDisplaySimple'))
const KioskDemo = lazy(() => import('@/pages/KioskDemo'))
const OrderHistory = lazy(() => import('@/pages/OrderHistory').then(m => ({ default: m.OrderHistory })))
const PerformanceDashboard = lazy(() => import('@/pages/PerformanceDashboard'))
const ServerView = lazy(() => import('@/pages/ServerView').then(m => ({ default: m.ServerView })))
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'))
const ExpoPage = lazy(() => import('@/pages/ExpoPage'))
const ExpoPageDebug = lazy(() => import('@/pages/ExpoPageDebug'))
const KioskPage = lazy(() => import('@/pages/KioskPage'))
const DriveThruPage = lazy(() => import('@/pages/DriveThruPage'))
const CustomerOrderPage = lazy(() => import('@/modules/order-system/components').then(m => ({ default: m.CustomerOrderPage })))
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'))
const OrderConfirmationPage = lazy(() => import('@/pages/OrderConfirmationPage').then(m => ({ default: m.OrderConfirmationPage })))

// Loading component for Suspense fallback
const RouteLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
)

// Profiler callback for performance tracking
const onRenderCallback = (
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number
) => {
  performanceMonitor.trackRender(id, actualDuration)
}

export function AppRoutes() {
  return (
    <main id="main-content" role="main" data-testid="app-root">
      <ErrorBoundary level="section">
        <Profiler id="Routes" onRender={onRenderCallback}>
          <Routes>
            {/* Public Routes - NOW PROTECTED */}
            <Route path="/" element={
              <ProtectedRoute requireAuth={true} fallbackPath="/login">
                <HomePage />
              </ProtectedRoute>
            } />
            <Route path="/home" element={
              <ProtectedRoute requireAuth={true} fallbackPath="/login">
                <HomePage />
              </ProtectedRoute>
            } />
            
            {/* Auth Routes (Public) */}
            <Route path="/login" element={
              <Suspense fallback={<RouteLoader />}>
                <Login />
              </Suspense>
            } />
            <Route path="/pin-login" element={
              <Suspense fallback={<RouteLoader />}>
                <PinLogin />
              </Suspense>
            } />
            <Route path="/station-login" element={
              <Suspense fallback={<RouteLoader />}>
                <StationLogin />
              </Suspense>
            } />
            
            {/* Protected Routes - Manager/Owner Access */}
            <Route path="/dashboard" element={
              <ManagerRoute>
                <Suspense fallback={<RouteLoader />}>
                  <Dashboard />
                </Suspense>
              </ManagerRoute>
            } />
            <Route path="/kitchen" element={
              <KitchenRoute>
                <ErrorBoundary 
                  level="section"
                  onError={(error, errorInfo) => {
                    console.error('🚨 [AppRoutes] Kitchen route error:', {
                      error: error.message,
                      componentStack: errorInfo.componentStack,
                      errorStack: error.stack
                    })
                  }}
                >
                  <Profiler id="KitchenDisplay" onRender={onRenderCallback}>
                    <Suspense fallback={<RouteLoader />}>
                      <KitchenDisplaySimple />
                    </Suspense>
                  </Profiler>
                </ErrorBoundary>
              </KitchenRoute>
            } />
            <Route path="/kiosk-demo" element={
              <ErrorBoundary level="section">
                <Suspense fallback={<RouteLoader />}>
                  <KioskDemo />
                </Suspense>
              </ErrorBoundary>
            } />
            <Route path="/kiosk" element={
              <ErrorBoundary level="section">
                <Profiler id="KioskVoice" onRender={onRenderCallback}>
                  <Suspense fallback={<RouteLoader />}>
                    <KioskPage />
                  </Suspense>
                </Profiler>
              </ErrorBoundary>
            } />
            <Route path="/drive-thru" element={
              <ErrorBoundary level="section">
                <Profiler id="DriveThru" onRender={onRenderCallback}>
                  <Suspense fallback={<RouteLoader />}>
                    <DriveThruPage />
                  </Suspense>
                </Profiler>
              </ErrorBoundary>
            } />
            <Route path="/history" element={
              <ServerRoute>
                <ErrorBoundary level="section">
                  <Suspense fallback={<RouteLoader />}>
                    <OrderHistory />
                  </Suspense>
                </ErrorBoundary>
              </ServerRoute>
            } />
            <Route path="/performance" element={
              <ManagerRoute>
                <ErrorBoundary level="section">
                  <Suspense fallback={<RouteLoader />}>
                    <PerformanceDashboard />
                  </Suspense>
                </ErrorBoundary>
              </ManagerRoute>
            } />
            <Route path="/server" element={
              <ServerRoute>
                <ErrorBoundary level="section">
                  <Suspense fallback={<RouteLoader />}>
                    <ServerView />
                  </Suspense>
                </ErrorBoundary>
              </ServerRoute>
            } />
            <Route path="/admin" element={
              <AdminRoute>
                <ErrorBoundary level="section">
                  <Suspense fallback={<RouteLoader />}>
                    <AdminDashboard />
                  </Suspense>
                </ErrorBoundary>
              </AdminRoute>
            } />
            <Route path="/expo" element={
              <KitchenRoute>
                <ErrorBoundary level="section">
                  <Profiler id="ExpoPage" onRender={onRenderCallback}>
                    <Suspense fallback={<RouteLoader />}>
                      <ExpoPage />
                    </Suspense>
                  </Profiler>
                </ErrorBoundary>
              </KitchenRoute>
            } />
            <Route path="/expo-debug" element={
              <KitchenRoute>
                <ErrorBoundary level="section">
                  <Profiler id="ExpoPageDebug" onRender={onRenderCallback}>
                    <Suspense fallback={<RouteLoader />}>
                      <ExpoPageDebug />
                    </Suspense>
                  </Profiler>
                </ErrorBoundary>
              </KitchenRoute>
            } />
            {/* Default order redirect to Grow Fresh Local Food */}
            <Route 
              path="/order" 
              element={<Navigate to={`/order/${env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111'}`} replace />} 
            />
            <Route path="/order/:restaurantId" element={
              <ErrorBoundary level="section">
                <Profiler id="CustomerOrder" onRender={onRenderCallback}>
                  <Suspense fallback={<RouteLoader />}>
                    <CustomerOrderPage />
                  </Suspense>
                </Profiler>
              </ErrorBoundary>
            } />
            <Route path="/checkout" element={
              <ErrorBoundary level="section">
                <Profiler id="Checkout" onRender={onRenderCallback}>
                  <Suspense fallback={<RouteLoader />}>
                    <CheckoutPage />
                  </Suspense>
                </Profiler>
              </ErrorBoundary>
            } />
            <Route path="/order-confirmation" element={
              <ErrorBoundary level="section">
                <Profiler id="OrderConfirmation" onRender={onRenderCallback}>
                  <Suspense fallback={<RouteLoader />}>
                    <OrderConfirmationPage />
                  </Suspense>
                </Profiler>
              </ErrorBoundary>
            } />
            <Route path="/unauthorized" element={
              <Suspense fallback={<RouteLoader />}>
                <UnauthorizedPage />
              </Suspense>
            } />
          </Routes>
        </Profiler>
      </ErrorBoundary>
    </main>
  )
}