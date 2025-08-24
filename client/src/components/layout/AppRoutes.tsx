import React, { Profiler } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from '@/components/shared/errors/ErrorBoundary'
import { env } from '@/utils/env'
import { LazyRoutes, LazyRoute } from '@/routes/LazyRoutes'
import { performanceMonitor } from '@/services/performance/performanceMonitor'

// Static imports only for critical/home pages (immediate load needed)
import { HomePage } from '@/pages/HomePage'
import { Dashboard } from '@/pages/Dashboard'

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
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/kitchen" element={
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
                  <LazyRoute component={LazyRoutes.KitchenDisplay} />
                </Profiler>
              </ErrorBoundary>
            } />
            <Route path="/kiosk-demo" element={
              <ErrorBoundary level="section">
                <LazyRoute component={LazyRoutes.KioskDemo} />
              </ErrorBoundary>
            } />
            <Route path="/kiosk" element={
              <ErrorBoundary level="section">
                <Profiler id="KioskVoice" onRender={onRenderCallback}>
                  <LazyRoute component={LazyRoutes.KioskPage} />
                </Profiler>
              </ErrorBoundary>
            } />
            <Route path="/drive-thru" element={
              <ErrorBoundary level="section">
                <Profiler id="DriveThru" onRender={onRenderCallback}>
                  <LazyRoute component={LazyRoutes.DriveThruPage} />
                </Profiler>
              </ErrorBoundary>
            } />
            <Route path="/history" element={
              <ErrorBoundary level="section">
                <LazyRoute component={LazyRoutes.OrderHistory} />
              </ErrorBoundary>
            } />
            <Route path="/performance" element={
              <ErrorBoundary level="section">
                <LazyRoute component={LazyRoutes.PerformanceDashboard} />
              </ErrorBoundary>
            } />
            <Route path="/server" element={
              <ErrorBoundary level="section">
                <LazyRoute component={LazyRoutes.ServerView} />
              </ErrorBoundary>
            } />
            <Route path="/admin" element={
              <ErrorBoundary level="section">
                <LazyRoute component={LazyRoutes.AdminDashboard} />
              </ErrorBoundary>
            } />
            <Route path="/expo" element={
              <ErrorBoundary level="section">
                <Profiler id="ExpoPage" onRender={onRenderCallback}>
                  <LazyRoute component={LazyRoutes.ExpoPage} />
                </Profiler>
              </ErrorBoundary>
            } />
            {/* Default order redirect to Grow Fresh Local Food */}
            <Route 
              path="/order" 
              element={<Navigate to={`/order/${env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111'}`} replace />} 
            />
            <Route path="/order/:restaurantId" element={
              <ErrorBoundary level="section">
                <Profiler id="CustomerOrder" onRender={onRenderCallback}>
                  <LazyRoute component={LazyRoutes.CustomerOrderPage} />
                </Profiler>
              </ErrorBoundary>
            } />
            <Route path="/checkout" element={
              <ErrorBoundary level="section">
                <Profiler id="Checkout" onRender={onRenderCallback}>
                  <LazyRoute component={LazyRoutes.CheckoutPage} />
                </Profiler>
              </ErrorBoundary>
            } />
            <Route path="/order-confirmation" element={
              <ErrorBoundary level="section">
                <Profiler id="OrderConfirmation" onRender={onRenderCallback}>
                  <LazyRoute component={LazyRoutes.OrderConfirmationPage} />
                </Profiler>
              </ErrorBoundary>
            } />
          </Routes>
        </Profiler>
      </ErrorBoundary>
    </main>
  )
}