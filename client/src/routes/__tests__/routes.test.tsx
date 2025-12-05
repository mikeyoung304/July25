/**
 * Route Configuration Tests
 * Tests route configuration and component rendering for all app routes
 * Converted from E2E tests in tests/e2e/basic-routes.spec.ts
 */

import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { AppRoutes } from '@/components/layout/AppRoutes';

// Mock all lazy-loaded page components to avoid loading them in tests
vi.mock('@/pages/WorkspaceDashboard', () => ({
  WorkspaceDashboard: () => <div data-testid="home-page">Workspace Dashboard</div>
}));

vi.mock('@/pages/HomePage', () => ({
  HomePage: () => <div data-testid="staff-home-page">Staff Home Page</div>
}));

vi.mock('@/modules/order-system/components', () => ({
  CustomerOrderPage: () => <div data-testid="order-root">Customer Order Page</div>
}));

vi.mock('@/pages/CheckoutPage', () => ({
  default: () => <div data-testid="checkout-root">Checkout Page</div>
}));

vi.mock('@/pages/KitchenDisplayOptimized', () => ({
  default: () => <div data-testid="kitchen-root">Kitchen Display</div>
}));

vi.mock('@/pages/Login', () => ({
  default: () => <div data-testid="login-page">Login Page</div>
}));

vi.mock('@/pages/UnauthorizedPage', () => ({
  UnauthorizedPage: () => <div data-testid="unauthorized-page">Unauthorized Page</div>
}));

vi.mock('@/pages/Dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard-page">Dashboard</div>
}));

vi.mock('@/pages/ServerView', () => ({
  ServerView: () => <div data-testid="server-page">Server View</div>
}));

// Mock auth components
vi.mock('@/components/auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ManagerRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  KitchenRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ServerRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AdminRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock error boundary
vi.mock('@/components/shared/errors/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock performance monitoring
vi.mock('@/services/performance/performanceMonitor', () => ({
  performanceMonitor: {
    trackRender: vi.fn()
  }
}));

// Mock environment
vi.mock('@/utils/env', () => ({
  env: {
    VITE_DEFAULT_RESTAURANT_ID: 'grow'
  }
}));

describe('Route Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Routes', () => {
    it('renders home page at "/" route', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });

    it('renders order page at "/order/:restaurantId" route', async () => {
      render(
        <MemoryRouter initialEntries={['/order/grow']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-root')).toBeInTheDocument();
      });
    });

    it('renders checkout page at "/checkout/:restaurantId" route', async () => {
      render(
        <MemoryRouter initialEntries={['/checkout/grow']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('checkout-root')).toBeInTheDocument();
      });
    });

    it('renders kitchen page at "/kitchen" route', async () => {
      render(
        <MemoryRouter initialEntries={['/kitchen']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('kitchen-root')).toBeInTheDocument();
      });
    });
  });

  describe('Route Parameters', () => {
    it('handles dynamic restaurant ID in order route', async () => {
      const restaurantId = '22222222-2222-2222-2222-222222222222';

      render(
        <MemoryRouter initialEntries={[`/order/${restaurantId}`]}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-root')).toBeInTheDocument();
      });
    });

    it('handles dynamic restaurant ID in checkout route', async () => {
      const restaurantId = '11111111-1111-1111-1111-111111111111';

      render(
        <MemoryRouter initialEntries={[`/checkout/${restaurantId}`]}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('checkout-root')).toBeInTheDocument();
      });
    });

    it('handles slug-based restaurant ID in order route', async () => {
      render(
        <MemoryRouter initialEntries={['/order/grow']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-root')).toBeInTheDocument();
      });
    });
  });

  describe('Protected Routes', () => {
    it('renders staff home page at "/home" route', async () => {
      render(
        <MemoryRouter initialEntries={['/home']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('staff-home-page')).toBeInTheDocument();
      });
    });

    it('renders dashboard at "/dashboard" route', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });

    it('renders server view at "/server" route', async () => {
      render(
        <MemoryRouter initialEntries={['/server']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('server-page')).toBeInTheDocument();
      });
    });
  });

  describe('Auth Routes', () => {
    it('renders login page at "/login" route', async () => {
      render(
        <MemoryRouter initialEntries={['/login']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
    });

    it('renders unauthorized page at "/unauthorized" route', async () => {
      render(
        <MemoryRouter initialEntries={['/unauthorized']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('unauthorized-page')).toBeInTheDocument();
      });
    });
  });

  describe('Route Redirects', () => {
    it('redirects /order to /order/{default-restaurant-id}', async () => {
      render(
        <MemoryRouter initialEntries={['/order']}>
          <AppRoutes />
        </MemoryRouter>
      );

      // After redirect, should render the order page with default restaurant ID
      await waitFor(() => {
        expect(screen.getByTestId('order-root')).toBeInTheDocument();
      });
    });
  });

  describe('App Root', () => {
    it('renders app root with correct test id', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('app-root')).toBeInTheDocument();
      });
    });

    it('app root has correct role attribute', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        const mainElement = screen.getByTestId('app-root');
        expect(mainElement).toHaveAttribute('role', 'main');
      });
    });

    it('app root has correct id for skip navigation', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        const mainElement = screen.getByTestId('app-root');
        expect(mainElement).toHaveAttribute('id', 'main-content');
      });
    });
  });

  describe('Route Rendering Without Errors', () => {
    it('renders home route without throwing', async () => {
      expect(() => {
        render(
          <MemoryRouter initialEntries={['/']}>
            <AppRoutes />
          </MemoryRouter>
        );
      }).not.toThrow();
    });

    it('renders order route without throwing', async () => {
      expect(() => {
        render(
          <MemoryRouter initialEntries={['/order/grow']}>
            <AppRoutes />
          </MemoryRouter>
        );
      }).not.toThrow();
    });

    it('renders checkout route without throwing', async () => {
      expect(() => {
        render(
          <MemoryRouter initialEntries={['/checkout/grow']}>
            <AppRoutes />
          </MemoryRouter>
        );
      }).not.toThrow();
    });

    it('renders kitchen route without throwing', async () => {
      expect(() => {
        render(
          <MemoryRouter initialEntries={['/kitchen']}>
            <AppRoutes />
          </MemoryRouter>
        );
      }).not.toThrow();
    });

    it('renders login route without throwing', async () => {
      expect(() => {
        render(
          <MemoryRouter initialEntries={['/login']}>
            <AppRoutes />
          </MemoryRouter>
        );
      }).not.toThrow();
    });
  });
});
