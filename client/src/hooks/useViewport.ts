import { useState, useEffect, useRef, useCallback } from 'react';

export interface ViewportSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
}

export const BREAKPOINTS = {
  mobile: 375,
  tablet: 768,
  desktop: 1024,
  large: 1920,
} as const;

/** Throttle interval for resize events (ms) - limits to ~10 updates/second */
const RESIZE_THROTTLE_MS = 100;

/**
 * Custom hook to track viewport size and responsive breakpoints
 * @returns Current viewport dimensions and breakpoint flags
 */
export const useViewport = (): ViewportSize => {
  const [viewport, setViewport] = useState<ViewportSize>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 0,
        height: 0,
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        isLargeDesktop: false,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    return {
      width,
      height,
      isMobile: width < BREAKPOINTS.tablet,
      isTablet: width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop,
      isDesktop: width >= BREAKPOINTS.desktop && width < BREAKPOINTS.large,
      isLargeDesktop: width >= BREAKPOINTS.large,
    };
  });

  // Track last execution time for throttling
  const lastExecutionRef = useRef<number>(0);
  const pendingUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setViewport({
        width,
        height,
        isMobile: width < BREAKPOINTS.tablet,
        isTablet: width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop,
        isDesktop: width >= BREAKPOINTS.desktop && width < BREAKPOINTS.large,
        isLargeDesktop: width >= BREAKPOINTS.large,
      });
    };

    // Throttled resize handler - limits updates to ~10/second
    const handleResize = () => {
      const now = Date.now();
      const timeSinceLastExecution = now - lastExecutionRef.current;

      if (timeSinceLastExecution >= RESIZE_THROTTLE_MS) {
        // Execute immediately if enough time has passed
        lastExecutionRef.current = now;
        updateViewport();
      } else {
        // Schedule trailing update if not already scheduled
        if (!pendingUpdateRef.current) {
          pendingUpdateRef.current = setTimeout(() => {
            lastExecutionRef.current = Date.now();
            pendingUpdateRef.current = null;
            updateViewport();
          }, RESIZE_THROTTLE_MS - timeSinceLastExecution);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      // Clean up any pending throttled update
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }
    };
  }, []);

  return viewport;
};

/**
 * Custom hook to match media queries
 * @param query - Media query string (e.g., '(max-width: 768px)')
 * @returns Whether the media query matches
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // Sync state if query changed and initial value differs
    // This handles the case where the query prop changes
    const currentMatches = mediaQuery.matches;
    if (currentMatches !== matches) {
      setMatches(currentMatches);
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers (Safari < 14)
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [query]); // Only re-run when query changes, not matches

  return matches;
};
