import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface FadeInScaleProps {
  children: React.ReactNode
  delay?: number
  duration?: number
  className?: string
}

export const FadeInScale: React.FC<FadeInScaleProps> = ({
  children,
  delay = 0,
  duration = 500,
  className
}) => {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)
    
    return () => clearTimeout(timer)
  }, [delay])
  
  return (
    <div
      className={cn(
        'transition-all',
        !isVisible && 'opacity-0 scale-95',
        isVisible && 'opacity-100 scale-100',
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {children}
    </div>
  )
}