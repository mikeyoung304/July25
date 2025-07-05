import React, { useEffect, useState } from 'react'
import { StatusBadge } from './StatusBadge'
import { cn } from '@/lib/utils'

interface AnimatedStatusBadgeProps {
  status: 'new' | 'preparing' | 'ready'
  previousStatus?: 'new' | 'preparing' | 'ready'
  className?: string
}

export const AnimatedStatusBadge: React.FC<AnimatedStatusBadgeProps> = ({
  status,
  previousStatus,
  className
}) => {
  const [isAnimating, setIsAnimating] = useState(false)
  const [displayStatus, setDisplayStatus] = useState(status)
  
  useEffect(() => {
    if (previousStatus && previousStatus !== status) {
      // Trigger animation
      setIsAnimating(true)
      
      // Update status after a brief delay for visual effect
      const timer = setTimeout(() => {
        setDisplayStatus(status)
        
        // Remove animation class after animation completes
        setTimeout(() => {
          setIsAnimating(false)
        }, 500)
      }, 150)
      
      return () => clearTimeout(timer)
    } else {
      setDisplayStatus(status)
    }
  }, [status, previousStatus])
  
  const animationClasses = cn(
    isAnimating && 'animate-scale-up',
    status === 'preparing' && isAnimating && 'animate-pulse-preparing',
    status === 'ready' && isAnimating && 'animate-pulse-ready animate-flash'
  )
  
  return (
    <div className={cn('relative inline-block', animationClasses, className)}>
      <StatusBadge status={displayStatus} />
      
      {/* Ripple effect for ready status */}
      {status === 'ready' && isAnimating && (
        <div className="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-25" />
      )}
    </div>
  )
}