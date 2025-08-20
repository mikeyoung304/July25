/**
 * Virtual scrolling hook for performance optimization
 * Renders only visible items in long lists
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface VirtualizationOptions {
  itemHeight: number | ((index: number) => number);
  overscan?: number; // Number of items to render outside viewport
  estimateSize?: boolean; // For dynamic heights
}

interface VirtualizationResult<T> {
  virtualItems: Array<{
    index: number;
    item: T;
    offsetTop: number;
    height: number;
  }>;
  totalHeight: number;
  scrollToIndex: (index: number) => void;
  containerProps: {
    onScroll: (e: React.UIEvent<HTMLElement>) => void;
    style: React.CSSProperties;
  };
  wrapperProps: {
    style: React.CSSProperties;
  };
}

export function useVirtualization<T>(
  items: T[],
  containerHeight: number,
  options: VirtualizationOptions
): VirtualizationResult<T> {
  const { itemHeight, overscan = 3, estimateSize = false } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLElement | null>(null);
  const measuredHeightsRef = useRef<Map<number, number>>(new Map());

  // Calculate item heights
  const getItemHeight = useCallback(
    (index: number): number => {
      if (estimateSize && measuredHeightsRef.current.has(index)) {
        return measuredHeightsRef.current.get(index)!;
      }
      return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
    },
    [itemHeight, estimateSize]
  );

  // Calculate total height and item offsets
  const { totalHeight, itemOffsets } = useMemo(() => {
    let total = 0;
    const offsets: number[] = [];
    
    for (let i = 0; i < items.length; i++) {
      offsets.push(total);
      total += getItemHeight(i);
    }
    
    return { totalHeight: total, itemOffsets: offsets };
  }, [items.length, getItemHeight]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = itemOffsets.findIndex(
      offset => offset + getItemHeight(itemOffsets.indexOf(offset)) > scrollTop
    );
    
    let endIndex = startIndex;
    let accumulatedHeight = 0;
    
    while (endIndex < items.length && accumulatedHeight < containerHeight) {
      accumulatedHeight += getItemHeight(endIndex);
      endIndex++;
    }
    
    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(items.length, endIndex + overscan),
    };
  }, [scrollTop, containerHeight, itemOffsets, getItemHeight, items.length, overscan]);

  // Get virtual items
  const virtualItems = useMemo(() => {
    const result = [];
    
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      result.push({
        index: i,
        item: items[i],
        offsetTop: itemOffsets[i],
        height: getItemHeight(i),
      });
    }
    
    return result;
  }, [visibleRange, items, itemOffsets, getItemHeight]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const element = e.currentTarget;
    scrollElementRef.current = element;
    setScrollTop(element.scrollTop);
  }, []);

  // Scroll to index
  const scrollToIndex = useCallback(
    (index: number) => {
      if (scrollElementRef.current && itemOffsets[index] !== undefined) {
        scrollElementRef.current.scrollTop = itemOffsets[index];
      }
    },
    [itemOffsets]
  );

  // Measure dynamic heights if needed
  useEffect(() => {
    if (!estimateSize) return;

    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
        const height = entry.contentRect.height;
        
        if (measuredHeightsRef.current.get(index) !== height) {
          measuredHeightsRef.current.set(index, height);
          // Trigger re-render if height changed significantly
          setScrollTop((prev) => prev); // Force update
        }
      });
    });

    // Observe virtual items
    virtualItems.forEach(({ index }) => {
      const element = document.querySelector(`[data-index="${index}"]`);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [virtualItems, estimateSize]);

  return {
    virtualItems,
    totalHeight,
    scrollToIndex,
    containerProps: {
      onScroll: handleScroll,
      style: {
        height: containerHeight,
        overflow: 'auto',
        position: 'relative' as const,
      },
    },
    wrapperProps: {
      style: {
        height: totalHeight,
        position: 'relative' as const,
      },
    },
  };
}

// Preset configurations for common use cases
export const VIRTUALIZATION_PRESETS = {
  orderList: {
    itemHeight: 120, // Typical order card height
    overscan: 2,
  },
  menuGrid: {
    itemHeight: 180, // Menu item card height
    overscan: 3,
  },
  tableList: {
    itemHeight: 80, // Table row height
    overscan: 5,
  },
  chatMessages: {
    itemHeight: (index: number) => 60 + (index % 3) * 20, // Variable heights
    overscan: 3,
    estimateSize: true,
  },
};