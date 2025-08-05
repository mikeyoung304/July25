/**
 * Optimized KDS Order Card Component
 * Enterprise-grade performance optimizations for high-frequency rendering
 * Used in kitchen display systems with real-time order updates
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { KDSOrderCard } from './KDSOrderCard';
import { cn } from '@/utils';
import { 
  withSmartMemo, 
  useStableCallback, 
  useExpensiveMemo, 
  PerformanceProfiler 
} from '@rebuild/shared/utils/react-performance';

type AnimatedKDSOrderCardProps = React.ComponentProps<typeof KDSOrderCard> & {
  onAnimationComplete?: (orderId: string, newStatus: string) => void;
  enablePerformanceTracking?: boolean;
};

// Animation class mappings - computed once at module level
const ANIMATION_CLASSES = {
  'new->preparing': 'animate-pulse-once border-blue-400 shadow-blue-200/50',
  'preparing->ready': 'animate-bounce-in border-green-400 shadow-green-200/50 shadow-lg',
  'ready': 'animate-pulse-ready',
  'completed': 'animate-fade-out',
  'cancelled': 'animate-shake border-red-400'
} as const;

const ANIMATION_DURATION = 600;

/**
 * Optimized animated order card with minimal re-renders
 */
const OptimizedKDSOrderCardImpl: React.FC<AnimatedKDSOrderCardProps> = ({
  status,
  id,
  className,
  onAnimationComplete,
  enablePerformanceTracking = false,
  ...rest
}) => {
  const prevStatusRef = useRef(status);
  const animationTimeoutRef = useRef<NodeJS.Timeout>();
  const isAnimatingRef = useRef(false);
  const forceUpdateRef = useRef<() => void>();
  
  // Force update function for animation state changes
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  forceUpdateRef.current = forceUpdate;
  
  // Memoize animation logic to prevent recalculation
  const animationState = useExpensiveMemo(() => {
    const currentStatus = status;
    const previousStatus = prevStatusRef.current;
    
    // No animation needed if status hasn't changed
    if (previousStatus === currentStatus && !isAnimatingRef.current) {
      return { shouldAnimate: false, animationClass: '' };
    }
    
    // Determine animation class based on transition
    let animationKey: keyof typeof ANIMATION_CLASSES | null = null;
    
    if (previousStatus !== currentStatus) {
      const transitionKey = `${previousStatus}->${currentStatus}` as keyof typeof ANIMATION_CLASSES;
      if (ANIMATION_CLASSES[transitionKey]) {
        animationKey = transitionKey;
      } else if (ANIMATION_CLASSES[currentStatus as keyof typeof ANIMATION_CLASSES]) {
        animationKey = currentStatus as keyof typeof ANIMATION_CLASSES;
      }
    }
    
    return {
      shouldAnimate: animationKey !== null,
      animationClass: animationKey ? ANIMATION_CLASSES[animationKey] : ''
    };
  }, [status, isAnimatingRef.current], 'animation-state-calculation');
  
  // Stable callback for animation completion
  const handleAnimationComplete = useStableCallback(() => {
    isAnimatingRef.current = false;
    
    if (onAnimationComplete && id) {
      onAnimationComplete(id, status);
    }
    
    // Force re-render to remove animation classes
    forceUpdateRef.current?.();
  }, [onAnimationComplete, id, status]);
  
  // Effect for managing animations
  useEffect(() => {
    // Update previous status reference
    const previousStatus = prevStatusRef.current;
    prevStatusRef.current = status;
    
    // Skip if no animation needed
    if (!animationState.shouldAnimate) {
      return;
    }
    
    // Clear existing animation timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    
    // Start animation
    isAnimatingRef.current = true;
    
    // Schedule animation completion
    animationTimeoutRef.current = setTimeout(() => {
      handleAnimationComplete();
    }, ANIMATION_DURATION);
    
    // Cleanup function
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      isAnimatingRef.current = false;
    };
  }, [status, animationState.shouldAnimate, handleAnimationComplete]);
  
  // Memoize final className to prevent unnecessary recalculations
  const finalClassName = useMemo(() => {
    return cn(
      className,
      isAnimatingRef.current ? animationState.animationClass : ''
    );
  }, [className, animationState.animationClass, isAnimatingRef.current]);
  
  // Render component with optional performance tracking
  const cardElement = (
    <KDSOrderCard
      {...rest}
      id={id}
      status={status}
      className={finalClassName}
    />
  );
  
  if (enablePerformanceTracking && id) {
    return (
      <PerformanceProfiler
        id={`kds-order-card-${id}`}
        onRender={(componentId, phase, duration) => {
          if (duration > 16) {
            console.warn(
              `[KDS Performance] Order card ${id} ${phase} render took ${duration.toFixed(2)}ms`
            );
          }
        }}
      >
        {cardElement}
      </PerformanceProfiler>
    );
  }
  
  return cardElement;
};

// Apply smart memo with optimized prop comparison
export const OptimizedKDSOrderCard = withSmartMemo(OptimizedKDSOrderCardImpl, {
  propsToIgnore: ['onAnimationComplete'], // Ignore callback props in comparison
  deepCompareProps: [], // No deep comparison needed for this component
  debugName: 'OptimizedKDSOrderCard'
});

// Display name for debugging
OptimizedKDSOrderCard.displayName = 'OptimizedKDSOrderCard';

/**
 * Hook for managing multiple order card animations efficiently
 */
export function useOrderCardAnimations(orders: Array<{ id: string; status: string }>) {
  const animationStates = useRef(new Map<string, { status: string; isAnimating: boolean }>());
  
  const updateAnimationState = useStableCallback((orderId: string, newStatus: string) => {
    const current = animationStates.current.get(orderId);
    
    if (!current || current.status !== newStatus) {
      animationStates.current.set(orderId, {
        status: newStatus,
        isAnimating: true
      });
      
      // Auto-clear animation state after duration
      setTimeout(() => {
        const state = animationStates.current.get(orderId);
        if (state) {
          animationStates.current.set(orderId, {
            ...state,
            isAnimating: false
          });
        }
      }, ANIMATION_DURATION);
    }
  }, []);
  
  const handleAnimationComplete = useStableCallback((orderId: string, status: string) => {
    const state = animationStates.current.get(orderId);
    if (state) {
      animationStates.current.set(orderId, {
        ...state,
        isAnimating: false
      });
    }
  }, []);
  
  // Clean up animation states for removed orders
  useEffect(() => {
    const currentOrderIds = new Set(orders.map(order => order.id));
    
    for (const [orderId] of animationStates.current) {
      if (!currentOrderIds.has(orderId)) {
        animationStates.current.delete(orderId);
      }
    }
  }, [orders]);
  
  return {
    updateAnimationState,
    handleAnimationComplete,
    getAnimationState: (orderId: string) => animationStates.current.get(orderId)
  };
}

export default OptimizedKDSOrderCard;