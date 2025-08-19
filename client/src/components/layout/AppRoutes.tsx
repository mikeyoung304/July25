import React, { Profiler } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from '@/components/shared/errors/ErrorBoundary'
import { env } from '@/utils/env'
import { Dashboard } from '@/pages/Dashboard'
import { HomePage } from '@/pages/HomePage'
import { KitchenDisplay } from '@/pages/KitchenDisplay'
import { KioskDemo } from '@/pages/KioskDemo'
import { OrderHistory } from '@/pages/OrderHistory'
import { PerformanceDashboard } from '@/pages/PerformanceDashboard'
import { ServerView } from '@/pages/ServerView'
import { AdminDashboard } from '@/pages/AdminDashboard'
import { ExpoPage } from '@/pages/ExpoPage'
import KioskPage from '@/pages/KioskPage'
import DriveThruPage from '@/pages/DriveThruPage'
import { CustomerOrderPage } from '@/modules/order-system/components'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { OrderConfirmationPage } from '@/pages/OrderConfirmationPage'
import { performanceMonitor } from '@/services/performance/performanceMonitor'

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
                  <KitchenDisplay />
                </Profiler>
              </ErrorBoundary>
            } />
            <Route path="/kiosk-demo" element={
              <ErrorBoundary level="section">
                <KioskDemo />
              </ErrorBoundary>
            } />
            <Route path="/kiosk" element={
              <ErrorBoundary level="section">
                <Profiler id="KioskVoice" onRender={onRenderCallback}>
                  <KioskPage />
                </Profiler>
              </ErrorBoundary>
            } />
            <Route path="/drive-thru" element={
              <ErrorBoundary level="section">
                <Profiler id="DriveThru" onRender={onRenderCallback}>
                  <DriveThruPage />
                </Profiler>
              </ErrorBoundary>
            } />
            <Route path="/history" element={
              <ErrorBoundary level="section">
                <OrderHistory />
              </ErrorBoundary>
            } />
            <Route path="/performance" element={
              <ErrorBoundary level="section">
                <PerformanceDashboard />
              </ErrorBoundary>
            } />
            <Route path="/server" element={
              <ErrorBoundary level="section">
                <ServerView />
              </ErrorBoundary>
            } />
            <Route path="/admin" element={
              <ErrorBoundary level="section">
                <AdminDashboard />
              </ErrorBoundary>
            } />
            <Route path="/expo" element={
              <ErrorBoundary level="section">
                <Profiler id="ExpoPage" onRender={onRenderCallback}>
                  <ExpoPage />
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
                  <CustomerOrderPage />
                </Profiler>
              </ErrorBoundary>
            } />
            <Route path="/checkout" element={
              <ErrorBoundary level="section">
                <Profiler id="Checkout" onRender={onRenderCallback}>
                  <CheckoutPage />
                </Profiler>
              </ErrorBoundary>
            } />
            <Route path="/order-confirmation" element={
              <ErrorBoundary level="section">
                <Profiler id="OrderConfirmation" onRender={onRenderCallback}>
                  <OrderConfirmationPage />
                </Profiler>
              </ErrorBoundary>
            } />
          </Routes>
        </Profiler>
      </ErrorBoundary>
    </main>
  )
}