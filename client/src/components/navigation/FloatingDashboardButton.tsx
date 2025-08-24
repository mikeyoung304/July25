import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, X } from 'lucide-react'

interface FloatingDashboardButtonProps {
  hideOnPaths?: string[]
  className?: string
}

/**
 * Always-visible floating dashboard button
 * Automatically hides on specified paths or dashboard/home page
 */
export function FloatingDashboardButton({ 
  hideOnPaths = ['/'], 
  className = '' 
}: FloatingDashboardButtonProps) {
  const location = useLocation()
  const [isVisible, setIsVisible] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)

  // Hide on dashboard/home or specified paths
  useEffect(() => {
    const shouldHide = hideOnPaths.some(path => location.pathname === path)
    setIsVisible(!shouldHide)
  }, [location.pathname, hideOnPaths])

  if (!isVisible) return null

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={`fixed top-6 left-6 z-50 w-12 h-12 bg-macon-navy/90 backdrop-blur-sm rounded-full shadow-large hover:bg-macon-navy hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center group ${className}`}
        title="Show Dashboard Button"
      >
        <Home className="w-5 h-5 text-white" />
      </button>
    )
  }

  return (
    <div className={`fixed top-6 left-6 z-50 flex items-center gap-2 ${className}`}>
      <Link 
        to="/" 
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-macon-navy/90 backdrop-blur-sm rounded-full shadow-large hover:bg-macon-navy hover:shadow-xl transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-macon-orange"
        aria-label="Return to Dashboard"
      >
        <Home className="w-4 h-4" />
        Dashboard
      </Link>
      
      <button
        onClick={() => setIsMinimized(true)}
        className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full shadow-medium hover:bg-white/30 transition-all duration-200 flex items-center justify-center group"
        title="Minimize Dashboard Button"
      >
        <X className="w-4 h-4 text-white group-hover:text-gray-200" />
      </button>
    </div>
  )
}