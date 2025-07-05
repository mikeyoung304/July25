import { type ClassValue } from 'clsx'

// Animation presets for different transitions
export const animationClasses = {
  // Status change animations
  statusChange: 'transition-all duration-500 ease-in-out',
  
  // Card animations
  cardPulse: 'animate-pulse-once',
  cardShake: 'animate-shake',
  cardBounce: 'animate-bounce-in',
  
  // Badge animations
  badgeFlash: 'animate-flash',
  badgeScale: 'animate-scale-up',
  
  // Button animations
  buttonPress: 'active:scale-95 transition-transform duration-100',
  
  // New order notification
  newOrder: 'animate-slide-in-right',
  
  // Status-specific animations
  preparing: 'animate-pulse-preparing',
  ready: 'animate-pulse-ready',
} as const

// Get animation classes based on status change
export const getStatusChangeAnimation = (
  oldStatus: string | undefined,
  newStatus: string
): ClassValue => {
  if (!oldStatus || oldStatus === newStatus) return ''
  
  const classes: ClassValue[] = [animationClasses.statusChange]
  
  if (newStatus === 'preparing') {
    classes.push('bg-blue-50/50')
  } else if (newStatus === 'ready') {
    classes.push('bg-green-50/50', animationClasses.cardPulse)
  }
  
  return classes
}

// Animation duration constants (in ms)
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
  statusChange: 500,
  notification: 2000,
} as const