import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'

interface BackToDashboardProps {
  variant?: 'minimal' | 'prominent' | 'button' | 'floating'
  showIcon?: boolean
  className?: string
}

/**
 * Enhanced navigation component with multiple display variants
 * Provides clear navigation back to dashboard with improved visibility
 */
export function BackToDashboard({ 
  variant = 'prominent', 
  showIcon = true, 
  className = '' 
}: BackToDashboardProps) {
  
  const baseClasses = "inline-flex items-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-macon-orange"
  
  const variants = {
    minimal: `${baseClasses} text-sm text-gray-600 hover:text-gray-800`,
    
    prominent: `${baseClasses} px-4 py-2.5 text-sm font-medium text-macon-navy bg-white border border-macon-navy/20 rounded-lg hover:bg-macon-navy hover:text-white hover:border-macon-navy shadow-sm hover:shadow-md`,
    
    button: `${baseClasses} px-6 py-3 text-base font-semibold text-white bg-macon-orange rounded-lg hover:bg-macon-orange-dark shadow-medium hover:shadow-large transform hover:-translate-y-0.5`,
    
    floating: `${baseClasses} fixed top-6 left-6 z-50 px-4 py-2.5 text-sm font-medium text-white bg-macon-navy/90 backdrop-blur-sm rounded-full shadow-large hover:bg-macon-navy hover:shadow-xl transform hover:scale-105`
  }

  const IconComponent = variant === 'floating' ? Home : ArrowLeft

  return (
    <Link 
      to="/" 
      className={`${variants[variant]} ${className}`}
      aria-label="Return to Dashboard"
    >
      {showIcon && <IconComponent className="w-4 h-4" />}
      {variant === 'floating' ? 'Dashboard' : 'Back to Dashboard'}
    </Link>
  )
}