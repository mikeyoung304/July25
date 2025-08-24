import React from 'react'
import { Toaster } from 'react-hot-toast'
import { SkipNavigation } from '@/components/shared/accessibility/SkipNavigation'
import { PerformanceOverlay } from '@/components/shared/debug/PerformanceOverlay'
import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts'
import { FloatingDashboardButton } from '@/components/navigation/FloatingDashboardButton'
import { Navigation } from './Navigation'
import { AppRoutes } from './AppRoutes'

interface AppContentProps {
  isDevelopment: boolean
}

export function AppContent({ isDevelopment }: AppContentProps) {
  useGlobalKeyboardShortcuts()
  
  // Hide internal navigation on all pages - MVP uses BackToDashboard component instead
  const showNavigation = false
  
  return (
    <>
      <SkipNavigation />
      <div className="min-h-screen bg-macon-background">
        {showNavigation && <Navigation />}
        <div className={showNavigation ? "pt-18" : ""}>
          <AppRoutes />
        </div>
        
        {/* Global floating dashboard button - shows on all pages except home */}
        <FloatingDashboardButton hideOnPaths={['/', '/dashboard']} />
        
        <Toaster position="top-right" />
        {isDevelopment && <PerformanceOverlay />}
      </div>
    </>
  )
}