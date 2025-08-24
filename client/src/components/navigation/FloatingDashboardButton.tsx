/**
 * FloatingDashboardButton - Mobile-optimized floating action button
 * Provides quick access to dashboard from any page on mobile devices
 */

import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FloatingDashboardButtonProps {
  className?: string
}

export function FloatingDashboardButton({ className = '' }: FloatingDashboardButtonProps) {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Don't show on homepage or dashboard
  if (location.pathname === '/' || location.pathname === '/dashboard') {
    return null
  }

  return (
    <Button
      onClick={() => navigate('/')}
      className={`
        fixed bottom-6 right-6 z-50 
        w-14 h-14 rounded-full 
        bg-macon-orange hover:bg-macon-orange/90 
        text-white shadow-xl hover:shadow-2xl 
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-4 focus:ring-macon-orange/30
        md:hidden
        ${className}
      `}
      aria-label="Go to Dashboard"
      title="Dashboard"
    >
      <Home className="h-6 w-6" aria-hidden="true" />
    </Button>
  )
}