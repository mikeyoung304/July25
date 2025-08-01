import React, { Profiler } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from '@/components/shared/errors/ErrorBoundary'
import { Dashboard } from '@/pages/Dashboard'
import { HomePage } from '@/pages/HomePage'
import { KitchenDisplay } from '@/pages/KitchenDisplay'
import { KioskDemo } from '@/pages/KioskDemo'
import { OrderHistory } from '@/pages/OrderHistory'
import { PerformanceDashboard } from '@/pages/PerformanceDashboard'
import { ServerView } from '@/pages/ServerView'
import { AdminDashboard } from '@/pages/AdminDashboard'
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
    <main id="main-content" role="main">
      <ErrorBoundary level="section">
        <Profiler id="Routes" onRender={onRenderCallback}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/kitchen" element={
              <ErrorBoundary level="section">
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