/* eslint-disable react-hooks/rules-of-hooks */
/**
 * React Performance Optimization Utilities
 * Enterprise-grade performance optimization patterns for React components
 */

// Conditional React import for browser environment only
let React: typeof import('react') | undefined;
if (typeof window !== 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    React = require('react');
  } catch (e) {
    console.warn('React not available in shared utils react-performance');
  }
}

// Re-export hooks that don't depend on JSX
export * from './performance-hooks';

// Type definitions for components (no actual JSX)
export interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  estimatedItemSize?: number;
  overscan?: number;
  className?: string;
}

export interface PerformanceProfilerProps {
  id: string;
  children: React.ReactNode;
  onRender?: (id: string, phase: 'mount' | 'update', actualDuration: number) => void;
}

/**
 * Enhanced React.memo with performance profiling
 */
export function memoWithProfiling<P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
): React.ForwardRefExoticComponent<P & React.RefAttributes<any>> {
  if (!React) {
    throw new Error('React is not available in memoWithProfiling');
  }

  const componentName = Component.displayName || Component.name || 'Anonymous';

  const MemoizedComponent = React.memo(Component, propsAreEqual);
  MemoizedComponent.displayName = `Memo(${componentName})`;

  return React.forwardRef((props: any, ref: any) => {
    // Profile component memory usage
    if (typeof window !== 'undefined') {
      // Only run memory profiling in browser
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { useMemoryProfile } = require('./memory-monitoring');
        useMemoryProfile(componentName);
      } catch (e) {
        // Memory monitoring not available
      }
    }
    
    return React.createElement(MemoizedComponent, { ...props, ref });
  });
}

/**
 * Component performance wrapper with measurements
 */
export function withPerformanceTracking<P extends object>(
  Component: any,
  trackingName?: string
): any {
  if (!React) {
    throw new Error('React is not available in withPerformanceTracking');
  }

  const componentName = trackingName || Component.displayName || Component.name || 'Anonymous';

  return React.forwardRef((props: any, ref: any) => {
    const renderStartTime = React.useRef(0);
    const renderCount = React.useRef(0);
    
    // Track render start
    if (renderStartTime.current !== undefined) {
      renderStartTime.current = performance.now();
    }
    if (renderCount.current !== undefined) {
      renderCount.current++;
    }

    // Profile component memory (browser only)
    if (typeof window !== 'undefined') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { useMemoryProfile } = require('./memory-monitoring');
        useMemoryProfile(componentName);
      } catch (e) {
        // Memory monitoring not available
      }
    }

    React.useEffect(() => {
      if (renderStartTime.current !== undefined && renderCount.current !== undefined) {
        const renderTime = performance.now() - renderStartTime.current;

        if (renderTime > 16) { // > 1 frame at 60fps
          console.warn(
            `[Performance] ${componentName} render #${renderCount.current} took ${renderTime.toFixed(2)}ms`
          );
        }
      }
    });

    return React.createElement(Component, { ...props, ref });
  });
}

/**
 * HOC for automatic React.memo with prop comparison
 */
export function withSmartMemo<P extends object>(
  Component: any,
  options: {
    propsToIgnore?: (keyof P)[];
    deepCompareProps?: (keyof P)[];
    debugName?: string;
  } = {}
): any {
  const { propsToIgnore = [], deepCompareProps = [], debugName } = options;
  const componentName = debugName || Component.displayName || Component.name || 'Anonymous';
  
  const arePropsEqual = (prevProps: P, nextProps: P): boolean => {
    const prevKeys = Object.keys(prevProps) as (keyof P)[];
    const nextKeys = Object.keys(nextProps) as (keyof P)[];
    
    // Check if prop keys changed
    if (prevKeys.length !== nextKeys.length) {
      return false;
    }
    
    // Compare each prop
    for (const key of prevKeys) {
      if (propsToIgnore.includes(key)) {
        continue;
      }
      
      if (deepCompareProps.includes(key)) {
        // Deep comparison for specified props
        if (JSON.stringify(prevProps[key]) !== JSON.stringify(nextProps[key])) {
          return false;
        }
      } else {
        // Shallow comparison
        if (prevProps[key] !== nextProps[key]) {
          return false;
        }
      }
    }
    
    return true;
  };
  
  if (!React) {
    throw new Error('React is not available in withSmartMemo');
  }

  const MemoizedComponent = React.memo(Component, arePropsEqual);
  MemoizedComponent.displayName = `SmartMemo(${componentName})`;

  return MemoizedComponent;
}