/**
 * Unit Tests: Checkout Form Components
 *
 * Tests isolated form behaviors for both online and kiosk checkout:
 * - Form field rendering
 * - Auto-fill functionality when VITE_DEMO_PANEL is enabled
 * - Cart button visibility
 *
 * Note: E2E tests in checkout-smoke.spec.ts cover the complete checkout flow.
 * These unit tests focus on component-level behavior.
 */

import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CheckoutPage from '@/pages/CheckoutPage';
import { KioskCheckoutPage } from '@/components/kiosk/KioskCheckoutPage';
import '@testing-library/jest-dom';

// Mock UnifiedCartContext
const mockCart = {
  items: [{
    id: '1',
    name: 'Test Item',
    price: 10,
    quantity: 1,
    menuItemId: '1'
  }],
  subtotal: 10,
  tax: 0.83,
  tip: 0,
  total: 10.83,
  itemCount: 1,
  restaurantId: '11111111-1111-1111-1111-111111111111'
};

const mockCartFunctions = {
  updateTip: vi.fn(),
  clearCart: vi.fn(),
  addToCart: vi.fn(),
  updateCartItem: vi.fn(),
  removeFromCart: vi.fn(),
  addItem: vi.fn(),
  updateItemQuantity: vi.fn(),
  isCartOpen: false,
  setIsCartOpen: vi.fn(),
  itemCount: 1,
  restaurantId: '11111111-1111-1111-1111-111111111111',
  isConfigReady: true,
  isConfigLoading: false,
  configError: null
};

vi.mock('@/contexts/UnifiedCartContext', () => ({
  UnifiedCartContext: React.createContext(null),
  UnifiedCartProvider: ({ children }: any) => <>{children}</>,
  useUnifiedCart: () => ({
    cart: mockCart,
    ...mockCartFunctions
  })
}));

vi.mock('@/contexts/cart.hooks', () => ({
  useCart: () => ({
    cart: mockCart,
    ...mockCartFunctions
  }),
  useUnifiedCart: () => ({
    cart: mockCart,
    ...mockCartFunctions
  })
}));

// Mock AuthContext hooks
vi.mock('@/contexts/auth.hooks', () => ({
  useAuth: () => ({
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: false
  })
}));

// Mock RestaurantContext
vi.mock('@/core/restaurant-hooks', () => ({
  useRestaurant: () => ({
    restaurant: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Test Restaurant'
    }
  })
}));

// Mock Square Terminal hook
vi.mock('@/hooks/useSquareTerminal', () => ({
  useSquareTerminal: () => ({
    availableDevices: [],
    loadDevices: vi.fn(),
    startCheckout: vi.fn(),
    cancelCheckout: vi.fn(),
    currentCheckout: null,
    isCheckoutActive: false,
    isLoading: false
  })
}));

// Mock router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

describe('CheckoutForm - Online Order', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email input field', () => {
    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('renders phone input field', () => {
    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    );

    const phoneInput = screen.getByLabelText(/phone number/i);
    expect(phoneInput).toBeInTheDocument();
    expect(phoneInput).toHaveAttribute('type', 'tel');
  });

  it('auto-fills demo data when VITE_DEMO_PANEL is enabled', async () => {
    vi.stubEnv('VITE_DEMO_PANEL', '1');

    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    const phoneInput = screen.getByLabelText(/phone number/i) as HTMLInputElement;

    // Wait for useEffect to populate fields
    await waitFor(() => {
      expect(emailInput.value).toBe('demo@example.com');
      expect(phoneInput.value).toBe('(555) 555-1234');
    });
  });

  it('does not auto-fill when demo mode is disabled', async () => {
    vi.stubEnv('VITE_DEMO_PANEL', '0');

    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    const phoneInput = screen.getByLabelText(/phone number/i) as HTMLInputElement;

    // Fields should remain empty
    await waitFor(() => {
      expect(emailInput.value).toBe('');
      expect(phoneInput.value).toBe('');
    });
  });

  it('displays cart items in order summary', () => {
    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/order summary/i)).toBeInTheDocument();
    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });
});

describe('CheckoutForm - Kiosk Checkout', () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email input field', () => {
    render(
      <MemoryRouter>
        <KioskCheckoutPage onBack={mockOnBack} />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('renders phone input field', () => {
    render(
      <MemoryRouter>
        <KioskCheckoutPage onBack={mockOnBack} />
      </MemoryRouter>
    );

    const phoneInput = screen.getByLabelText(/phone number/i);
    expect(phoneInput).toBeInTheDocument();
    expect(phoneInput).toHaveAttribute('type', 'tel');
  });

  it('renders name input field in kiosk mode', () => {
    render(
      <MemoryRouter>
        <KioskCheckoutPage onBack={mockOnBack} />
      </MemoryRouter>
    );

    const nameInput = screen.getByLabelText(/full name/i);
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toHaveAttribute('type', 'text');
  });

  it('auto-fills demo data when VITE_DEMO_PANEL is enabled', async () => {
    vi.stubEnv('VITE_DEMO_PANEL', '1');

    render(
      <MemoryRouter>
        <KioskCheckoutPage onBack={mockOnBack} />
      </MemoryRouter>
    );

    const nameInput = screen.getByLabelText(/full name/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    const phoneInput = screen.getByLabelText(/phone number/i) as HTMLInputElement;

    // Wait for useEffect to populate fields
    await waitFor(() => {
      expect(nameInput.value).toBe('Demo Customer');
      expect(emailInput.value).toBe('demo@example.com');
      expect(phoneInput.value).toBe('(555) 555-1234');
    });
  });

  it('does not auto-fill when demo mode is disabled', async () => {
    vi.stubEnv('VITE_DEMO_PANEL', '0');

    render(
      <MemoryRouter>
        <KioskCheckoutPage onBack={mockOnBack} />
      </MemoryRouter>
    );

    const nameInput = screen.getByLabelText(/full name/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    const phoneInput = screen.getByLabelText(/phone number/i) as HTMLInputElement;

    // Fields should remain empty
    await waitFor(() => {
      expect(nameInput.value).toBe('');
      expect(emailInput.value).toBe('');
      expect(phoneInput.value).toBe('');
    });
  });

  it('displays cart items in order summary', () => {
    render(
      <MemoryRouter>
        <KioskCheckoutPage onBack={mockOnBack} />
      </MemoryRouter>
    );

    expect(screen.getByText(/order summary/i)).toBeInTheDocument();
    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });

  it('displays payment method options', () => {
    render(
      <MemoryRouter>
        <KioskCheckoutPage onBack={mockOnBack} />
      </MemoryRouter>
    );

    expect(screen.getByText(/payment method/i)).toBeInTheDocument();
    expect(screen.getByText(/credit\/debit card/i)).toBeInTheDocument();
    expect(screen.getByText(/cash/i)).toBeInTheDocument();
  });
});
