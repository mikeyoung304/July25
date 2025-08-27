import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { MaconLogo } from '@/components/brand/MaconLogo'
import { pageInfo } from './BrandHeaderPresets'

interface BrandHeaderProps {
  /**
   * Override the default page title from presets
   */
  pageTitle?: string
  /**
   * Override the default page description from presets
   */
  pageDescription?: string
  /**
   * Show/hide the back to dashboard button
   */
  showBackButton?: boolean
  /**
   * Custom back button destination (defaults to "/")
   */
  backTo?: string
}

export function BrandHeader({ 
  pageTitle, 
  pageDescription, 
  showBackButton = true,
  backTo = "/"
}: BrandHeaderProps) {
  const location = useLocation()
  const currentPath = location.pathname

  // Get page info from presets or use provided props
  const currentPageInfo = pageInfo[currentPath] || { title: 'Dashboard', description: '' }
  const title = pageTitle || currentPageInfo.title
  const description = pageDescription || currentPageInfo.description

  return (
    <header className="relative bg-white/80 backdrop-blur-xl border-b border-gray-200/50 z-40">
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-white/40 pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Section - Non-clickable brand identity */}
          <div className="flex items-center min-w-0 flex-shrink-0">
            <div className="flex items-center p-2 -m-2">
              <MaconLogo 
                size="sm" 
                className="h-10 w-auto" 
              />
            </div>
          </div>

          {/* Page Information - Apple-style centered title */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight leading-none mb-1 truncate max-w-full">
              {title}
            </h1>
            {description && (
              <p className="text-sm font-medium text-gray-500 leading-tight max-w-sm truncate">
                {description}
              </p>
            )}
          </div>

          {/* Back Button - Apple-style subtle but clear */}
          <div className="flex items-center justify-end min-w-0 flex-shrink-0">
            {showBackButton && currentPath !== "/" && (
              <Link
                to={backTo}
                className="group inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-full shadow-sm hover:bg-blue-600 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-2 active:scale-[0.98] transition-all duration-150 min-h-[44px] touch-manipulation"
                aria-label="Return to Dashboard"
              >
                <ArrowLeft 
                  className="w-4 h-4 transition-transform duration-150 group-hover:-translate-x-0.5" 
                  aria-hidden="true" 
                />
                <span className="font-medium">Dashboard</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Subtle bottom highlight */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300/50 to-transparent" />
    </header>
  )
}