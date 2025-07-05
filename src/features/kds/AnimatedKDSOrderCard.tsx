import React, { useEffect, useRef, useState } from 'react'
import { KDSOrderCard } from './KDSOrderCard'
import { cn } from '@/lib/utils'

interface AnimatedKDSOrderCardProps extends React.ComponentProps<typeof KDSOrderCard> {
  status: 'new' | 'preparing' | 'ready'
}

export const AnimatedKDSOrderCard: React.FC<AnimatedKDSOrderCardProps> = (props) => {
  const { status, className, ...rest } = props
  const [previousStatus, setPreviousStatus] = useState<typeof status | undefined>()
  const [isAnimating, setIsAnimating] = useState(false)
  const prevStatusRef = useRef(status)
  
  useEffect(() => {
    if (prevStatusRef.current !== status) {
      setPreviousStatus(prevStatusRef.current)
      setIsAnimating(true)
      
      // Reset animation state after animation completes
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, 600)
      
      prevStatusRef.current = status
      return () => clearTimeout(timer)
    }
  }, [status])
  
  // Determine animation based on status transition
  const getAnimationClass = () => {
    if (!isAnimating || !previousStatus) return ''
    
    // New → Preparing
    if (previousStatus === 'new' && status === 'preparing') {
      return 'animate-pulse-once border-blue-400 shadow-blue-200/50'
    }
    
    // Preparing → Ready
    if (previousStatus === 'preparing' && status === 'ready') {
      return 'animate-bounce-in border-green-400 shadow-green-200/50 shadow-lg'
    }
    
    // Any → Ready (catch-all for ready state)
    if (status === 'ready' && previousStatus !== 'ready') {
      return 'animate-pulse-ready'
    }
    
    return 'transition-all duration-500'
  }
  
  return (
    <div className={cn(
      'relative transition-all duration-500 ease-in-out',
      isAnimating && 'transform scale-[1.02]',
      className
    )}>
      <KDSOrderCard
        {...rest}
        status={status}
        className={cn(
          getAnimationClass(),
          'transition-shadow duration-500'
        )}
      />
      
      {/* Visual feedback overlay for status changes */}
      {isAnimating && (
        <div 
          className={cn(
            'absolute inset-0 rounded-lg pointer-events-none transition-opacity duration-500',
            status === 'preparing' && 'bg-blue-500/5',
            status === 'ready' && 'bg-green-500/5'
          )}
        />
      )}
    </div>
  )
}