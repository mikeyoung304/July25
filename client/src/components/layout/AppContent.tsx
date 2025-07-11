import React from 'react'
import { Toaster } from 'react-hot-toast'
import { useLocation } from 'react-router-dom'
import { SkipNavigation } from '@/components/shared/accessibility/SkipNavigation'
import { PerformanceOverlay } from '@/components/shared/debug/PerformanceOverlay'
import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts'
import { Navigation } from './Navigation'
import { AppRoutes } from './AppRoutes'

interface AppContentProps {
  isDevelopment: boolean
}

export function AppContent({ isDevelopment }: AppContentProps) {
  useGlobalKeyboardShortcuts()
  const location = useLocation()
  
  const showNavigation = location.pathname !== '/'
  
  return (
    <>
      <SkipNavigation />
      <div className="min-h-screen bg-macon-background">
        {showNavigation && <Navigation />}
        <div className={showNavigation ? "pt-18" : ""}>
          <AppRoutes />
        </div>
        <Toaster position="top-right" />
        {isDevelopment && <PerformanceOverlay />}
      </div>
    </>
  )
}