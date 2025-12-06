/**
 * React Router Mock Utilities
 *
 * Centralized mocks for react-router-dom hooks and components.
 * Import this file in tests that need to mock router behavior.
 *
 * Usage:
 * ```typescript
 * import { mockNavigate, setupRouterMocks } from '@/test/mocks/react-router';
 *
 * beforeEach(() => {
 *   setupRouterMocks({ orderId: '123' });
 * });
 *
 * // Assert navigation
 * expect(mockNavigate).toHaveBeenCalledWith('/orders');
 * ```
 */

import { vi } from 'vitest';
import * as React from 'react';

// Exported mock functions for assertions
export const mockNavigate = vi.fn();
export const mockUseParams = vi.fn(() => ({}));
export const mockUseLocation = vi.fn(() => ({
  pathname: '/',
  search: '',
  hash: '',
  state: null,
  key: 'default',
}));
export const mockUseSearchParams = vi.fn(() => [new URLSearchParams(), vi.fn()]);

/**
 * Configure router mocks with specific values
 */
export function setupRouterMocks(options: {
  params?: Record<string, string>;
  location?: Partial<Location>;
  searchParams?: Record<string, string>;
} = {}) {
  const { params = {}, location = {}, searchParams = {} } = options;

  mockUseParams.mockReturnValue(params);
  mockUseLocation.mockReturnValue({
    pathname: '/',
    search: '',
    hash: '',
    state: null,
    key: 'default',
    ...location,
  });
  mockUseSearchParams.mockReturnValue([
    new URLSearchParams(searchParams),
    vi.fn(),
  ]);

  return {
    navigate: mockNavigate,
    params: mockUseParams,
    location: mockUseLocation,
    searchParams: mockUseSearchParams,
  };
}

/**
 * Reset all router mocks to defaults
 */
export function resetRouterMocks() {
  mockNavigate.mockReset();
  mockUseParams.mockReset().mockReturnValue({});
  mockUseLocation.mockReset().mockReturnValue({
    pathname: '/',
    search: '',
    hash: '',
    state: null,
    key: 'default',
  });
  mockUseSearchParams.mockReset().mockReturnValue([new URLSearchParams(), vi.fn()]);
}

// Mock Link component
export const MockLink = ({ children, to, ...props }: { children: React.ReactNode; to: string; [key: string]: unknown }) =>
  React.createElement('a', { href: to, ...props }, children);

// Mock NavLink component
export const MockNavLink = ({ children, to, ...props }: { children: React.ReactNode; to: string; [key: string]: unknown }) =>
  React.createElement('a', { href: to, ...props }, children);

// Mock Outlet component
export const MockOutlet = () => null;

/**
 * The actual vi.mock call - import this file to apply the mock
 */
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
    useLocation: () => mockUseLocation(),
    useSearchParams: () => mockUseSearchParams(),
    Link: MockLink,
    NavLink: MockNavLink,
    Outlet: MockOutlet,
  };
});
