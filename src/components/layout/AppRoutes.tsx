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
            <Route path="/kiosk" element={
              <ErrorBoundary level="section">
                <KioskDemo />
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
          </Routes>
        </Profiler>
      </ErrorBoundary>
    </main>
  )
}