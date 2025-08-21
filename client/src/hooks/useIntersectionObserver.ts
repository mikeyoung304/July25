import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  rootMargin?: string;
  root?: Element | null;
  freezeOnceVisible?: boolean;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
) {
  const { 
    threshold = 0, 
    rootMargin = '50px', // Reduced from 100px for better control
    root = null,
    freezeOnceVisible = true // Once visible, stay visible
  } = options;
  
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Skip if IntersectionObserver is not supported (fallback to eager loading)
    if (!('IntersectionObserver' in window)) {
      setIsIntersecting(true);
      setHasIntersected(true);
      return;
    }

    // Skip if already intersected and we're freezing
    if (hasIntersected && freezeOnceVisible) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isCurrentlyIntersecting = entry.isIntersecting;
        setIsIntersecting(isCurrentlyIntersecting);
        
        if (isCurrentlyIntersecting) {
          setHasIntersected(true);
          
          // Unobserve if freezing once visible
          if (freezeOnceVisible) {
            observer.unobserve(element);
          }
        }
      },
      {
        threshold,
        rootMargin,
        root
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, root, hasIntersected, freezeOnceVisible]);

  return {
    ref: elementRef,
    isIntersecting,
    hasIntersected
  };
}