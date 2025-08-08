import React, { useEffect, useRef, useState, memo } from 'react'
import { KDSOrderCard } from '@/components/orders'
import { cn } from '@/utils'

type AnimatedKDSOrderCardProps = React.ComponentProps<typeof KDSOrderCard>

export const AnimatedKDSOrderCard = memo<AnimatedKDSOrderCardProps>((props) => {
  const { order, className, ...rest } = props
  const prevStatusRef = useRef(order.status)
  const animationTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  
  // Calculate animation class directly without state
  const [isAnimating, setIsAnimating] = useState(false)
  const animationClass = useRef<string>('')
  
  useEffect(() => {
    // Skip if status hasn't changed
    if (prevStatusRef.current === order.status) return
    
    const previousStatus = prevStatusRef.current
    prevStatusRef.current = order.status
    
    // Clear any existing animation timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current)
    }
    
    // Determine animation based on status transition
    if (previousStatus === 'new' && order.status === 'preparing') {
      animationClass.current = 'animate-pulse-once border-blue-400 shadow-blue-200/50'
    } else if (previousStatus === 'preparing' && order.status === 'ready') {
      animationClass.current = 'animate-bounce-in border-green-400 shadow-green-200/50 shadow-lg'
    } else if (order.status === 'ready' && previousStatus !== 'ready') {
      animationClass.current = 'animate-pulse-ready'
    } else {
      animationClass.current = ''
    }
    
    // Trigger animation
    if (animationClass.current) {
      setIsAnimating(true)
      
      // Remove animation after completion
      animationTimeoutRef.current = setTimeout(() => {
        animationClass.current = ''
        setIsAnimating(false)
      }, 600)
    }
    
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [order.status])
  
  
  return (
    <KDSOrderCard
      {...rest}
      order={order}
      className={cn(
        isAnimating ? animationClass.current : '',
        'transition-shadow duration-500',
        className
      )}
    />
  )
})

AnimatedKDSOrderCard.displayName = 'AnimatedKDSOrderCard'