import React from 'react'
import { Toaster } from 'react-hot-toast'
import { useLocation } from 'react-router-dom'
import { SkipNavigation } from '@/components/shared/accessibility/SkipNavigation'
import { PerformanceOverlay } from '@/components/shared/debug/PerformanceOverlay'
import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts'
import { BrandHeader } from './BrandHeader'
import { AppRoutes } from './AppRoutes'

interface AppContentProps {
  isDevelopment: boolean
}

export function AppContent({ isDevelopment }: AppContentProps) {
  useGlobalKeyboardShortcuts()
  const location = useLocation()
  
  // Hide header on customer-facing order flow pages only
  const isCustomerOrderPage = location.pathname.startsWith('/order') || 
                              location.pathname.startsWith('/checkout') || 
                              location.pathname.startsWith('/order-confirmation')
  
  const showHeader = !isCustomerOrderPage
  
  return (
    <>
      <SkipNavigation />
      <div className="min-h-screen bg-macon-background">
        {showHeader && <BrandHeader />}
        <div className={showHeader ? "pt-18" : ""}>
          <AppRoutes />
        </div>
        <Toaster position="top-right" />
        {isDevelopment && <PerformanceOverlay />}
      </div>
    </>
  )
}