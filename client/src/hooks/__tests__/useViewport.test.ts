import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useViewport, useMediaQuery, BREAKPOINTS } from '../useViewport';

describe('useViewport', () => {
  // Store original window properties
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    // Reset window dimensions before each test
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1080,
    });
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
    vi.clearAllMocks();
  });

  describe('viewport dimensions', () => {
    it('should initialize with current window dimensions', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 1920 });
      Object.defineProperty(window, 'innerHeight', { writable: true, value: 1080 });

      const { result } = renderHook(() => useViewport());

      expect(result.current.width).toBe(1920);
      expect(result.current.height).toBe(1080);
    });

    it('should update dimensions on window resize', () => {
      const { result } = renderHook(() => useViewport());

      act(() => {
        Object.defineProperty(window, 'innerWidth', { writable: true, value: 768 });
        Object.defineProperty(window, 'innerHeight', { writable: true, value: 1024 });
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current.width).toBe(768);
      expect(result.current.height).toBe(1024);
    });
  });

  describe('mobile breakpoint (< 768px)', () => {
    it('should detect mobile viewport at 375px width', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 });
      const { result } = renderHook(() => useViewport());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isLargeDesktop).toBe(false);
    });

    it('should detect mobile viewport at 767px width (edge case)', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 767 });
      const { result } = renderHook(() => useViewport());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
    });

    it('should update to mobile on resize', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 1920 });
      const { result } = renderHook(() => useViewport());

      expect(result.current.isMobile).toBe(false);

      act(() => {
        Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 });
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isLargeDesktop).toBe(false);
    });
  });

  describe('tablet breakpoint (768px - 1023px)', () => {
    it('should detect tablet viewport at 768px width', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 768 });
      const { result } = renderHook(() => useViewport());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isLargeDesktop).toBe(false);
    });

    it('should detect tablet viewport at 1023px width (edge case)', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 1023 });
      const { result } = renderHook(() => useViewport());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
    });

    it('should detect tablet viewport at 900px width', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 900 });
      const { result } = renderHook(() => useViewport());

      expect(result.current.isTablet).toBe(true);
    });
  });

  describe('desktop breakpoint (1024px - 1919px)', () => {
    it('should detect desktop viewport at 1024px width', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });
      const { result } = renderHook(() => useViewport());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isLargeDesktop).toBe(false);
    });

    it('should detect desktop viewport at 1919px width (edge case)', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 1919 });
      const { result } = renderHook(() => useViewport());

      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isLargeDesktop).toBe(false);
    });

    it('should detect desktop viewport at 1440px width', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 1440 });
      const { result } = renderHook(() => useViewport());

      expect(result.current.isDesktop).toBe(true);
    });
  });

  describe('large desktop breakpoint (>= 1920px)', () => {
    it('should detect large desktop viewport at 1920px width', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 1920 });
      const { result } = renderHook(() => useViewport());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isLargeDesktop).toBe(true);
    });

    it('should detect large desktop viewport at 2560px width', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 2560 });
      const { result } = renderHook(() => useViewport());

      expect(result.current.isLargeDesktop).toBe(true);
    });

    it('should detect large desktop viewport at 3840px width (4K)', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 3840 });
      const { result } = renderHook(() => useViewport());

      expect(result.current.isLargeDesktop).toBe(true);
    });
  });

  describe('resize event handling', () => {
    it('should clean up resize listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => useViewport());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should handle multiple rapid resize events', () => {
      const { result } = renderHook(() => useViewport());

      act(() => {
        Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 });
        window.dispatchEvent(new Event('resize'));
      });
      expect(result.current.width).toBe(375);

      act(() => {
        Object.defineProperty(window, 'innerWidth', { writable: true, value: 768 });
        window.dispatchEvent(new Event('resize'));
      });
      expect(result.current.width).toBe(768);

      act(() => {
        Object.defineProperty(window, 'innerWidth', { writable: true, value: 1920 });
        window.dispatchEvent(new Event('resize'));
      });
      expect(result.current.width).toBe(1920);
    });
  });

  describe('breakpoint constants', () => {
    it('should export correct breakpoint values', () => {
      expect(BREAKPOINTS.mobile).toBe(375);
      expect(BREAKPOINTS.tablet).toBe(768);
      expect(BREAKPOINTS.desktop).toBe(1024);
      expect(BREAKPOINTS.large).toBe(1920);
    });
  });
});

describe('useMediaQuery', () => {
  let mockMediaQuery: {
    matches: boolean;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
    addListener: ReturnType<typeof vi.fn>;
    removeListener: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockMediaQuery = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    };

    window.matchMedia = vi.fn().mockReturnValue(mockMediaQuery);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with current media query match state', () => {
      mockMediaQuery.matches = true;
      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

      expect(result.current).toBe(true);
      expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 768px)');
    });

    it('should initialize as false when media query does not match', () => {
      mockMediaQuery.matches = false;
      const { result } = renderHook(() => useMediaQuery('(min-width: 1920px)'));

      expect(result.current).toBe(false);
    });
  });

  describe('media query change handling', () => {
    it('should update when media query match changes', () => {
      mockMediaQuery.matches = false;
      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

      expect(result.current).toBe(false);

      // Simulate media query change
      act(() => {
        const changeHandler = mockMediaQuery.addEventListener.mock.calls[0][1];
        changeHandler({ matches: true } as MediaQueryListEvent);
      });

      expect(result.current).toBe(true);
    });

    it('should handle transition from match to no-match', () => {
      mockMediaQuery.matches = true;
      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

      expect(result.current).toBe(true);

      act(() => {
        const changeHandler = mockMediaQuery.addEventListener.mock.calls[0][1];
        changeHandler({ matches: false } as MediaQueryListEvent);
      });

      expect(result.current).toBe(false);
    });
  });

  describe('responsive breakpoint queries', () => {
    it('should handle mobile breakpoint query', () => {
      mockMediaQuery.matches = true;
      const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));

      expect(result.current).toBe(true);
    });

    it('should handle tablet breakpoint query', () => {
      mockMediaQuery.matches = true;
      const { result } = renderHook(() => useMediaQuery('(min-width: 768px) and (max-width: 1023px)'));

      expect(result.current).toBe(true);
    });

    it('should handle desktop breakpoint query', () => {
      mockMediaQuery.matches = true;
      const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

      expect(result.current).toBe(true);
    });

    it('should handle large desktop breakpoint query', () => {
      mockMediaQuery.matches = true;
      const { result } = renderHook(() => useMediaQuery('(min-width: 1920px)'));

      expect(result.current).toBe(true);
    });
  });

  describe('media feature queries', () => {
    it('should handle prefers-reduced-motion query', () => {
      mockMediaQuery.matches = true;
      const { result } = renderHook(() => useMediaQuery('(prefers-reduced-motion: reduce)'));

      expect(result.current).toBe(true);
    });

    it('should handle prefers-color-scheme query', () => {
      mockMediaQuery.matches = true;
      const { result } = renderHook(() => useMediaQuery('(prefers-color-scheme: dark)'));

      expect(result.current).toBe(true);
    });

    it('should handle orientation query', () => {
      mockMediaQuery.matches = true;
      const { result } = renderHook(() => useMediaQuery('(orientation: portrait)'));

      expect(result.current).toBe(true);
    });
  });

  describe('event listener management', () => {
    it('should add event listener on mount', () => {
      renderHook(() => useMediaQuery('(max-width: 768px)'));

      expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should remove event listener on unmount', () => {
      const { unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));

      unmount();

      expect(mockMediaQuery.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should handle legacy addListener API', () => {
      // Mock legacy browser without addEventListener
      const legacyMediaQuery = {
        matches: false,
        addEventListener: undefined,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      };
      window.matchMedia = vi.fn().mockReturnValue(legacyMediaQuery);

      renderHook(() => useMediaQuery('(max-width: 768px)'));

      expect(legacyMediaQuery.addListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should clean up legacy removeListener on unmount', () => {
      const legacyMediaQuery = {
        matches: false,
        addEventListener: undefined,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      };
      window.matchMedia = vi.fn().mockReturnValue(legacyMediaQuery);

      const { unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));
      unmount();

      expect(legacyMediaQuery.removeListener).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('query updates', () => {
    it('should update when query prop changes', () => {
      const { result, rerender } = renderHook(
        ({ query }) => useMediaQuery(query),
        { initialProps: { query: '(max-width: 768px)' } }
      );

      expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 768px)');

      // Change the query
      mockMediaQuery.matches = true;
      rerender({ query: '(min-width: 1920px)' });

      expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 1920px)');
    });
  });
});
