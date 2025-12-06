/**
 * Window Mock Utilities
 *
 * Centralized mocks for window properties and methods.
 * Extends the global mocks in client/test/setup.ts for test-specific overrides.
 *
 * Usage:
 * ```typescript
 * import { setupWindowMocks, setViewportSize, setMediaQueryMatch } from '@/test/mocks/window';
 *
 * beforeEach(() => {
 *   setViewportSize(1920, 1080);
 *   setMediaQueryMatch('(min-width: 768px)', true);
 * });
 * ```
 */

import { vi } from 'vitest';

// Track active media query listeners for cleanup
const mediaQueryListeners = new Map<string, Set<(e: MediaQueryListEvent) => void>>();

/**
 * Create a mock MediaQueryList for a specific query
 */
export function createMockMediaQueryList(query: string, matches = false): MediaQueryList {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  mediaQueryListeners.set(query, listeners);

  return {
    matches,
    media: query,
    onchange: null,
    // Modern API
    addEventListener: vi.fn((event: string, callback: (e: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        listeners.add(callback);
      }
    }),
    removeEventListener: vi.fn((event: string, callback: (e: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        listeners.delete(callback);
      }
    }),
    // Legacy API (deprecated but still used)
    addListener: vi.fn((callback: (e: MediaQueryListEvent) => void) => {
      listeners.add(callback);
    }),
    removeListener: vi.fn((callback: (e: MediaQueryListEvent) => void) => {
      listeners.delete(callback);
    }),
    dispatchEvent: vi.fn(() => true),
  };
}

// Store for media query match states
const mediaQueryMatches = new Map<string, boolean>();

/**
 * Setup window.matchMedia mock with configurable matches
 */
export function setupMatchMediaMock() {
  window.matchMedia = vi.fn((query: string) => {
    const matches = mediaQueryMatches.get(query) ?? false;
    return createMockMediaQueryList(query, matches);
  });
}

/**
 * Set whether a specific media query matches
 */
export function setMediaQueryMatch(query: string, matches: boolean) {
  mediaQueryMatches.set(query, matches);

  // Notify listeners if they exist
  const listeners = mediaQueryListeners.get(query);
  if (listeners) {
    const event = {
      matches,
      media: query,
    } as MediaQueryListEvent;
    listeners.forEach((listener) => listener(event));
  }
}

/**
 * Set viewport dimensions
 */
export function setViewportSize(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });

  // Update common responsive breakpoint queries
  setMediaQueryMatch('(min-width: 640px)', width >= 640);
  setMediaQueryMatch('(min-width: 768px)', width >= 768);
  setMediaQueryMatch('(min-width: 1024px)', width >= 1024);
  setMediaQueryMatch('(min-width: 1280px)', width >= 1280);
  setMediaQueryMatch('(min-width: 1536px)', width >= 1536);

  // Dispatch resize event
  window.dispatchEvent(new Event('resize'));
}

/**
 * Mock window.location
 */
export function setWindowLocation(location: Partial<Location>) {
  const defaultLocation: Location = {
    href: 'http://localhost:5173/',
    origin: 'http://localhost:5173',
    protocol: 'http:',
    host: 'localhost:5173',
    hostname: 'localhost',
    port: '5173',
    pathname: '/',
    search: '',
    hash: '',
    assign: vi.fn(),
    reload: vi.fn(),
    replace: vi.fn(),
    ancestorOrigins: { length: 0, contains: () => false, item: () => null, [Symbol.iterator]: function* () {} } as DOMStringList,
  };

  Object.defineProperty(window, 'location', {
    writable: true,
    configurable: true,
    value: { ...defaultLocation, ...location },
  });
}

/**
 * Mock localStorage
 */
export function setupLocalStorageMock(initialData: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initialData));

  const mockLocalStorage = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    get length() {
      return store.size;
    },
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
  };

  Object.defineProperty(window, 'localStorage', {
    writable: true,
    configurable: true,
    value: mockLocalStorage,
  });

  return mockLocalStorage;
}

/**
 * Mock sessionStorage
 */
export function setupSessionStorageMock(initialData: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initialData));

  const mockSessionStorage = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    get length() {
      return store.size;
    },
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
  };

  Object.defineProperty(window, 'sessionStorage', {
    writable: true,
    configurable: true,
    value: mockSessionStorage,
  });

  return mockSessionStorage;
}

/**
 * Combined setup for all window mocks
 */
export function setupWindowMocks(options: {
  viewport?: { width: number; height: number };
  location?: Partial<Location>;
  localStorage?: Record<string, string>;
  sessionStorage?: Record<string, string>;
} = {}) {
  const { viewport, location, localStorage, sessionStorage } = options;

  setupMatchMediaMock();

  if (viewport) {
    setViewportSize(viewport.width, viewport.height);
  }

  if (location) {
    setWindowLocation(location);
  }

  const localStorageMock = setupLocalStorageMock(localStorage);
  const sessionStorageMock = setupSessionStorageMock(sessionStorage);

  return {
    localStorage: localStorageMock,
    sessionStorage: sessionStorageMock,
  };
}

/**
 * Reset all window mocks
 */
export function resetWindowMocks() {
  mediaQueryMatches.clear();
  mediaQueryListeners.clear();
}
