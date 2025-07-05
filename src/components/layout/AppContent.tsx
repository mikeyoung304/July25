import React from 'react'
import { Toaster } from 'react-hot-toast'
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
  
  return (
    <>
      <SkipNavigation />
      <div className="min-h-screen bg-background">
        <Navigation />
        <AppRoutes />
        <Toaster position="top-right" />
        {isDevelopment && <PerformanceOverlay />}
      </div>
    </>
  )
}