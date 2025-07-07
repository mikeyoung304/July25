import React from 'react'
import { cn } from '@/utils'

interface MaconLogoProps {
  variant?: 'full' | 'icon' | 'horizontal'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  sm: { width: 120, height: 120 },
  md: { width: 160, height: 160 },
  lg: { width: 200, height: 200 },
  xl: { width: 280, height: 280 }
}

export const MaconLogo: React.FC<MaconLogoProps> = ({ 
  variant = 'full', 
  size = 'md',
  className 
}) => {
  const dimensions = sizeMap[size]
  
  // For now, all variants use the same logo image
  // In the future, we could have different versions
  return (
    <img 
      src="/macon-logo.png" 
      alt="MACON AI SOLUTIONS"
      width={dimensions.width}
      height={dimensions.height}
      className={cn("object-contain", className)}
    />
  )
}