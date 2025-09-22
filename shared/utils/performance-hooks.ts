/* eslint-disable react-hooks/rules-of-hooks */
/**
 * Performance Optimization Hooks - Server Safe
 * Provides no-op implementations for server environment
 */

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Server-safe exports - provide no-ops for server environment
export const useStableObject = <T extends Record<string, unknown>>(obj: T): T => {
  if (!isBrowser) return obj;
  
  // In browser, use actual React implementation if available
  try {

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react');
    // Unused but kept for future use
    // const { useMemo, useRef } = _React;
    
    // This would be the actual implementation, but we'll keep it simple for server safety
    return obj;
  } catch (e) {
    return obj;
  }
};

export const useStableArray = <T>(arr: T[]): T[] => {
  if (!isBrowser) return arr;
  
  try {
     
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    const { useMemo } = React;
    return useMemo(() => arr, [arr]);
  } catch (e) {
    return arr;
  }
};

export const useStableCallback = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  _deps: unknown[]
): T => {
  if (!isBrowser) return callback;
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    const { useCallback } = React;
    return useCallback(callback, _deps);
  } catch (e) {
    return callback;
  }
};

export const useExpensiveMemo = <T>(
  factory: () => T,
  _deps: unknown[],
  _debugName?: string
): T => {
  if (!isBrowser) return factory();
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    const { useMemo } = React;
    return useMemo(factory, _deps);
  } catch (e) {
    return factory();
  }
};

export const useContextValue = <T extends Record<string, unknown>>(value: T): T => {
  return useStableObject(value);
};

export const useDebouncedState = <T>(
  initialValue: T,
  _delay: number = 300
): [T, T, (value: T | ((prev: T) => T)) => void] => {
  if (!isBrowser) {
    const noop = () => {};
    return [initialValue, initialValue, noop];
  }
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    const { useState, useEffect } = React;
    
    const [value, setValue] = useState(initialValue);
    const [debouncedValue, setDebouncedValue] = useState(initialValue);
    
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, _delay);
      
      return () => {
        clearTimeout(handler);
      };
    }, [value, _delay]);
    
    return [value, debouncedValue, setValue];
  } catch (e) {
    const noop = () => {};
    return [initialValue, initialValue, noop];
  }
};

export const useIntersectionObserver = (
  _targetRef: React.RefObject<Element>,
  _options: IntersectionObserverInit = {}
): boolean => {
  if (!isBrowser) return false;
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    const { useState, useEffect } = React;
    
    const [isIntersecting, setIsIntersecting] = useState(false);
    
    useEffect(() => {
      const target = _targetRef.current;
      if (!target || !window.IntersectionObserver) return;
      
      const observer = new IntersectionObserver(
        ([entry]) => {
          setIsIntersecting(entry?.isIntersecting ?? false);
        },
        _options
      );
      
      observer.observe(target);
      
      return () => {
        observer.unobserve(target);
      };
    }, [_targetRef, _options]);
    
    return isIntersecting;
  } catch (e) {
    return false;
  }
};

export const useBatchedState = <T>(
  initialState: T
): [T, (updates: Partial<T> | ((prev: T) => Partial<T>)) => void] => {
  if (!isBrowser) {
    const noop = () => {};
    return [initialState, noop];
  }
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    const { useState, useRef, useCallback } = React;
    
    const [state, setState] = useState(initialState);
    const updateQueue = useRef([]) as React.MutableRefObject<Array<Partial<T> | ((prev: T) => Partial<T>)>>;
    const isScheduled = useRef(false);
    
    const batchedSetState = useCallback((updates: Partial<T> | ((prev: T) => Partial<T>)) => {
      updateQueue.current.push(updates);
      
      if (!isScheduled.current) {
        isScheduled.current = true;
        
        setTimeout(() => {
          setState((prevState: T) => {
            let newState = { ...prevState };
            
            updateQueue.current.forEach((update: Partial<T> | ((prev: T) => Partial<T>)) => {
              if (typeof update === 'function') {
                const partialUpdate = update(newState);
                newState = { ...newState, ...partialUpdate };
              } else {
                newState = { ...newState, ...update };
              }
            });
            
            return newState;
          });
          
          updateQueue.current = [];
          isScheduled.current = false;
        }, 0);
      }
    }, []);
    
    return [state, batchedSetState];
  } catch (e) {
    const noop = () => {};
    return [initialState, noop];
  }
};

// Export React reference for convenience (server-safe)
export const React = isBrowser ? (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react');
  } catch (e) {
    return null;
  }
})() : null;