import React from 'react'
import { motion } from 'framer-motion'
import { MaconLogo } from '@/components/brand/MaconLogo'
import { BackToDashboard } from '@/components/navigation/BackToDashboard'
import { PageTitle, Body } from '@/components/ui/Typography'
import { spacing } from '@/lib/typography'

interface BrandHeaderProps {
  /** Show the back to dashboard button */
  showBackToDashboard?: boolean
  /** Style variant for the back to dashboard button */
  backToDashboardVariant?: 'minimal' | 'prominent' | 'button' | 'floating'
  /** Main title text */
  title?: string
  /** Subtitle text */
  subtitle?: string
  /** Logo size variant */
  logoSize?: 'sm' | 'md' | 'lg' | 'xl'
  /** Content to display on the right side */
  rightContent?: React.ReactNode
  /** Additional CSS classes */
  className?: string
  /** Center the content (HomePage style) vs left-aligned (Dashboard style) */
  centered?: boolean
  /** Custom logo height classes for responsive design */
  logoHeightClasses?: string
  /** Animation delay for staggered effects */
  animationDelay?: number
}

/**
 * DRY Brand Header component that combines the best patterns from:
 * - HomePage: Excellent centered logo with responsive sizing and animation
 * - AdminDashboard: BackToDashboard integration and right content
 * - ServerHeader: Restaurant context support
 * - Typography: Consistent title/subtitle styling
 */
export function BrandHeader({
  showBackToDashboard = false,
  backToDashboardVariant = 'prominent',
  title,
  subtitle,
  logoSize = 'md',
  rightContent,
  className = '',
  centered = true,
  logoHeightClasses = 'h-14 md:h-16 lg:h-20',
  animationDelay = 0
}: BrandHeaderProps) {
  
  // For centered layout (HomePage style)
  if (centered) {
    return (
      <motion.div
        className={`text-center ${spacing.page.padding} ${className}`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: animationDelay }}
      >
        {/* Back button for centered layout - positioned absolute */}
        {showBackToDashboard && (
          <div className="absolute top-6 left-6">
            <BackToDashboard variant={backToDashboardVariant} />
          </div>
        )}
        
        {/* Right content for centered layout - positioned absolute */}
        {rightContent && (
          <div className="absolute top-6 right-6">
            {rightContent}
          </div>
        )}
        
        {/* Centered logo and title (HomePage pattern) */}
        <MaconLogo 
          variant="transparent" 
          size={logoSize}
          className={`${logoHeightClasses} w-auto mx-auto mb-3 object-contain`}
        />
        
        {title && (
          <PageTitle className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
            {title}
          </PageTitle>
        )}
        
        {subtitle && (
          <Body className="text-gray-600 mt-1 text-sm md:text-base">
            {subtitle}
          </Body>
        )}
      </motion.div>
    )
  }

  // For left-aligned layout (Dashboard/Admin style)
  return (
    <motion.div
      className={`bg-white ${spacing.page.padding} py-6 ${className}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: animationDelay }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          {/* Back button for left layout */}
          {showBackToDashboard && (
            <BackToDashboard variant={backToDashboardVariant} />
          )}
          
          {/* Logo and title side by side */}
          <div className="flex items-center space-x-4">
            <MaconLogo 
              variant="transparent" 
              size={logoSize}
              className={`${logoHeightClasses} w-auto object-contain`}
            />
            
            {(title || subtitle) && (
              <div>
                {title && (
                  <PageTitle className="text-2xl md:text-3xl">
                    {title}
                  </PageTitle>
                )}
                {subtitle && (
                  <Body className="text-gray-600 mt-1">
                    {subtitle}
                  </Body>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Right content for left layout */}
        {rightContent && (
          <div className="flex items-center">
            {rightContent}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Export just the BrandHeader component to satisfy React Refresh requirements
// Presets are now in ./BrandHeaderPresets.ts