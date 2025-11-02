import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CheckoutPage from '../CheckoutPage';
import { DemoAuthService } from '@/services/auth/demoAuth';

// Create mock functions before vi.mock calls
const mockLoginAsDemo = vi.fn().mockResolvedValue({ token: 'demo-token-123', user: { id: 'demo:customer:test', role: 'customer' } });
const mockPost = vi.fn().mockResolvedValue({
  id: 'order-123',
  order_number: 'ORD-001'
});

// Mock dependencies
vi.mock('@/contexts/UnifiedCartContext', () => ({
  UnifiedCartContext: React.createContext(null),
  UnifiedCartProvider: ({ children }: any) => <>{children}</>,
  useUnifiedCart: () => ({
    cart: {
      items: [{
        id: '1',
        name: 'Test Item',
        price: 10.00,
        quantity: 1,
        menuItemId: 'menu-1',
        modifiers: [],
        specialInstructions: ''
      }],
      subtotal: 10.00,
      tax: 1.00,
      tip: 2.00,
      total: 13.00,
      itemCount: 1,
      restaurantId: '11111111-1111-1111-1111-111111111111'
    },
    updateCartItem: vi.fn(),
    removeFromCart: vi.fn(),
    updateTip: vi.fn(),
    clearCart: vi.fn(),
    addToCart: vi.fn(),
    addItem: vi.fn(),
    updateItemQuantity: vi.fn(),
    isCartOpen: false,
    setIsCartOpen: vi.fn(),
    itemCount: 1,
    restaurantId: '11111111-1111-1111-1111-111111111111'
  })
}));

vi.mock('@/contexts/cart.hooks', () => ({
  useCart: () => ({
    cart: {
      items: [{
        id: '1',
        name: 'Test Item',
        price: 10.00,
        quantity: 1,
        menuItemId: 'menu-1'
      }],
      subtotal: 10.00,
      tax: 1.00,
      tip: 2.00,
      total: 13.00,
      itemCount: 1,
      restaurantId: '11111111-1111-1111-1111-111111111111'
    },
    updateCartItem: vi.fn(),
    removeFromCart: vi.fn(),
    updateTip: vi.fn(),
    clearCart: vi.fn(),
    addToCart: vi.fn(),
    addItem: vi.fn(),
    updateItemQuantity: vi.fn(),
    isCartOpen: false,
    setIsCartOpen: vi.fn(),
    itemCount: 1,
    restaurantId: '11111111-1111-1111-1111-111111111111'
  }),
  useUnifiedCart: () => ({
    cart: {
      items: [{
        id: '1',
        name: 'Test Item',
        price: 10.00,
        quantity: 1,
        menuItemId: 'menu-1'
      }],
      subtotal: 10.00,
      tax: 1.00,
      tip: 2.00,
      total: 13.00,
      itemCount: 1,
      restaurantId: '11111111-1111-1111-1111-111111111111'
    },
    updateCartItem: vi.fn(),
    removeFromCart: vi.fn(),
    updateTip: vi.fn(),
    clearCart: vi.fn(),
    addToCart: vi.fn(),
    addItem: vi.fn(),
    updateItemQuantity: vi.fn(),
    isCartOpen: false,
    setIsCartOpen: vi.fn(),
    itemCount: 1,
    restaurantId: '11111111-1111-1111-1111-111111111111'
  })
}));

vi.mock('@/hooks/useApiRequest', () => ({
  useApiRequest: () => ({
    post: mockPost
  })
}));

vi.mock('@/services/auth/demoAuth', () => ({
  DemoAuthService: {
    getDemoToken: vi.fn().mockResolvedValue('demo-token-123'),
    refreshTokenIfNeeded: vi.fn().mockResolvedValue('demo-token-123')
  }
}));

// Mock AuthContext hooks
vi.mock('@/contexts/auth.hooks', () => ({
  useAuth: () => ({
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: false,
    loginAsDemo: mockLoginAsDemo
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

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('CheckoutPage - Demo Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set demo mode environment
    vi.stubEnv('DEV', true);
  });

  it('shows demo mode banner when in demo environment', () => {
    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Demo Mode – No cards will be charged/)).toBeInTheDocument();
  });

  it('shows "Complete Order (Demo)" button in demo mode', () => {
    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    );

    const demoButton = screen.getByRole('button', { name: /Complete Order \(Demo\)/i });
    expect(demoButton).toBeInTheDocument();
  });

  it('processes demo payment successfully', async () => {
    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    );

    // Fill in required fields
    const emailInput = screen.getByLabelText(/Email Address/i);
    const phoneInput = screen.getByLabelText(/Phone Number/i);
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(phoneInput, { target: { value: '5551234567' } });

    // Click demo payment button
    const demoButton = screen.getByRole('button', { name: /Complete Order \(Demo\)/i });
    fireEvent.click(demoButton);

    // Wait for navigation to confirmation page
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/order-confirmation', {
        state: expect.objectContaining({
          orderId: 'order-123',
          order_number: 'ORD-001',
          total: 13.00
        })
      });
    });

    // Verify loginAsDemo was called
    expect(mockLoginAsDemo).toHaveBeenCalledWith('customer');
  });

  it('validates form before processing demo payment', async () => {
    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    );

    // Click demo button without filling form
    const demoButton = screen.getByRole('button', { name: /Complete Order \(Demo\)/i });
    fireEvent.click(demoButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getAllByText(/required/i).length).toBeGreaterThan(0);
    });

    // Should not navigate
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});