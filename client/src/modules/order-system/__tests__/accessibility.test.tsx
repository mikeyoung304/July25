import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import CheckoutPage from '@/pages/CheckoutPage';
import { OrderConfirmationPage } from '@/pages/OrderConfirmationPage';
import { TipSlider } from '../components/TipSlider';
import { StripePaymentForm } from '../components/StripePaymentForm';

// Mock cart hooks
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
      tip: 0,
      total: 11.00,
      itemCount: 1,
      restaurantId: 'test-restaurant'
    },
    updateCartItem: vi.fn(),
    removeFromCart: vi.fn(),
    updateTip: vi.fn(),
    clearCart: vi.fn(),
    addToCart: vi.fn()
  })
}));

// Mock auth hooks
// NOTE: Customer orders don't require authentication (v6.0.15+)
vi.mock('@/contexts/auth.hooks', () => ({
  useAuth: () => ({
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: false
  })
}));

// Mock API request hook
vi.mock('@/hooks/useApiRequest', () => ({
  useApiRequest: () => ({
    post: vi.fn().mockResolvedValue({
      id: 'order-123',
      order_number: 'ORD-001'
    })
  })
}));

// Mock restaurant context
vi.mock('@/core/restaurant-hooks', () => ({
  useRestaurant: () => ({
    restaurant: {
      id: 'test-restaurant',
      name: 'Test Restaurant'
    }
  })
}));

// Mock cart data for checkout page
const mockCart = {
  items: [{
    id: 'test-1',
    menuItemId: 'burger-1',
    name: 'Classic Burger',
    price: 12.99,
    quantity: 1
  }],
  subtotal: 12.99,
  tax: 1.07,
  tip: 0,
  total: 14.06,
  restaurantId: 'test-restaurant'
};

// Mock location state for confirmation page
const mockLocationState = {
  orderId: 'ORD-123456',
  orderNumber: 1234,
  estimatedTime: '15-20 minutes',
  items: mockCart.items,
  total: mockCart.total
};

describe('Accessibility Tests', () => {
  beforeEach(() => {
    localStorage.setItem('cart_test-restaurant', JSON.stringify(mockCart));
  });

  afterEach(() => {
    localStorage.clear();
  });

  // Test specific ARIA attributes and form accessibility
  it('CheckoutPage should have proper form labels and accessibility', () => {
    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Check form labels (matching CheckoutPage.tsx lines 267 and 288)
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();

    // Check that form inputs are accessible
    const emailInput = screen.getByLabelText('Email Address');
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('id', 'email');

    const phoneInput = screen.getByLabelText('Phone Number');
    expect(phoneInput).toHaveAttribute('type', 'tel');
    expect(phoneInput).toHaveAttribute('id', 'phone');
  });

  it('TipSlider should have proper ARIA labels for buttons and custom input', () => {
    render(
      <TipSlider
        subtotal={10.00}
        onTipChange={vi.fn()}
        initialTip={0}
      />
    );

    // Check preset tip buttons have proper ARIA labels (matching TipSlider.tsx line 107)
    expect(screen.getByLabelText('Set tip to 15%')).toBeInTheDocument();
    expect(screen.getByLabelText('Set tip to 18%')).toBeInTheDocument();
    expect(screen.getByLabelText('Set tip to 20%')).toBeInTheDocument();
    expect(screen.getByLabelText('Set tip to 25%')).toBeInTheDocument();

    // Check custom tip input has proper label (matching TipSlider.tsx lines 116-124)
    expect(screen.getByLabelText('Custom tip amount')).toBeInTheDocument();
    const customInput = screen.getByLabelText('Custom tip amount');
    expect(customInput).toHaveAttribute('type', 'number');
    expect(customInput).toHaveAttribute('id', 'custom-tip');
  });

  it('StripePaymentForm should have proper payment button in demo mode', () => {
    render(
      <StripePaymentForm
        onPaymentNonce={vi.fn()}
        amount={14.06}
        isProcessing={false}
      />
    );

    // In demo mode, the button should be present and accessible (StripePaymentForm.tsx lines 202-219)
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAccessibleName();
    expect(button).not.toBeDisabled();
    // Check button text includes amount
    expect(button).toHaveTextContent('14.06');
    expect(button).toHaveTextContent('Demo');
  });

  it('StripePaymentForm should disable button when processing', () => {
    render(
      <StripePaymentForm
        onPaymentNonce={vi.fn()}
        amount={14.06}
        isProcessing={true}
      />
    );

    // Button should be disabled when processing
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Processing');
  });

  it('OrderConfirmationPage should have proper heading and accessible structure', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/order-confirmation', state: mockLocationState }]}>
        <Routes>
          <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Check main heading (OrderConfirmationPage.tsx line 61)
    expect(screen.getByRole('heading', { name: 'Order Confirmed!' })).toBeInTheDocument();

    // Check order summary heading exists
    expect(screen.getByRole('heading', { name: 'Order Summary' })).toBeInTheDocument();

    // Check action buttons are accessible
    const homeButton = screen.getByRole('link', { name: /back to home/i });
    expect(homeButton).toBeInTheDocument();
    expect(homeButton).toHaveAttribute('href', '/');

    const printButton = screen.getByRole('button', { name: /print receipt/i });
    expect(printButton).toBeInTheDocument();
  });

  it('CheckoutPage should have semantic headings for sections', () => {
    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Check section headings (CheckoutPage.tsx lines 248, 263, 323, 334)
    expect(screen.getByRole('heading', { name: 'Order Summary' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Contact Information' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Order Total' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Payment Method' })).toBeInTheDocument();
  });

  it('TipSlider should have accessible headings and labels', () => {
    render(
      <TipSlider
        subtotal={10.00}
        onTipChange={vi.fn()}
        initialTip={0}
      />
    );

    // Check heading exists (TipSlider.tsx line 89)
    expect(screen.getByRole('heading', { name: 'Add a tip' })).toBeInTheDocument();

    // All buttons should have accessible names via aria-label
    const tipButtons = screen.getAllByRole('button');
    tipButtons.forEach(button => {
      expect(button).toHaveAccessibleName();
    });
  });
});