/**
 * BrandHeader - Enhanced brand header component with mobile optimization
 * Provides consistent branding with responsive design and accessibility features
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { MaconLogo } from '@/components/brand/MaconLogo'
import { BRAND_PRESETS, BrandPreset } from './BrandHeaderPresets'

interface BrandHeaderProps {
  preset?: BrandPreset
  showTagline?: boolean
  className?: string
  logoSize?: 'sm' | 'md' | 'lg'
  linkTo?: string
}

export function BrandHeader({ 
  preset = 'default',
  showTagline = false,
  className = '',
  logoSize = 'md',
  linkTo = '/'
}: BrandHeaderProps) {
  const config = BRAND_PRESETS[preset]
  
  const content = (
    <div className={`flex items-center gap-3 ${config.container} ${className}`}>
      <MaconLogo 
        size={logoSize} 
        className={`${config.logo} transition-transform hover:scale-105`} 
      />
      <div className="flex flex-col">
        <h1 className={`${config.title} font-bold leading-tight`}>
          MACON AI Solutions
        </h1>
        {showTagline && (
          <p className={`${config.tagline} leading-tight opacity-80`}>
            Smart Restaurant Technology
          </p>
        )}
      </div>
    </div>
  )

  if (linkTo) {
    return (
      <Link 
        to={linkTo}
        className={`
          ${config.wrapper} 
          focus:outline-none focus:ring-2 focus:ring-offset-2 
          focus:ring-macon-orange rounded-lg transition-all duration-200
        `}
        aria-label="MACON AI Solutions - Go to Homepage"
      >
        {content}
      </Link>
    )
  }

  return (
    <div className={config.wrapper}>
      {content}
    </div>
  )
}