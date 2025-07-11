import { useRef, useCallback, useEffect } from 'react';

/**
 * Creates a stable callback that doesn't change between renders
 * but always calls the latest version of the provided function.
 * This prevents unnecessary re-renders in components that depend on callbacks.
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);
  
  // Update the ref whenever the callback changes
  useEffect(() => {
    callbackRef.current = callback;
  });
  
  // Return a stable function that calls the current callback
  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []) as T;
}