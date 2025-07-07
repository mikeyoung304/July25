import React from 'react'
import { Toaster } from 'react-hot-toast'
import { useLocation } from 'react-router-dom'
import { SkipNavigation } from '@/components/shared/accessibility/SkipNavigation'
import { PerformanceOverlay } from '@/components/shared/debug/PerformanceOverlay'
import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts'
import { Navigation, NavigationSpacer } from '@/design-system/components'
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
      <div className="min-h-screen bg-background">
        {showNavigation && <Navigation />}
        {showNavigation && <NavigationSpacer />}
        <AppRoutes />
        <Toaster position="top-right" />
        {isDevelopment && <PerformanceOverlay />}
      </div>
    </>
  )
}