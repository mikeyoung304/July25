import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CustomerOrderPage } from '../components/CustomerOrderPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { OrderConfirmationPage } from '@/pages/OrderConfirmationPage';
import '@testing-library/jest-dom';

// Mock modules
jest.mock('@/core/restaurant-hooks', () => ({
  useRestaurant: () => ({
    setRestaurant: jest.fn()
  })
}));

jest.mock('@/services/menu/MenuService', () => ({
  getMenuSections: jest.fn().mockResolvedValue([
    {
      id: 'section-1',
      name: 'Burgers',
      items: [
        {
          id: 'burger-1',
          name: 'Classic Burger',
          description: 'A delicious classic burger',
          price: 12.99,
          category: 'Burgers',
          available: true
        }
      ]
    }
  ])
}));

// Helper to render app with routing
const renderWithRouter = (initialRoute = '/order/test-restaurant') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/order/:restaurantId" element={<CustomerOrderPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Customer Ordering Flow E2E', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should complete full ordering flow from menu to confirmation', async () => {
    renderWithRouter();

    // Wait for menu to load
    await waitFor(() => {
      expect(screen.getByText('Classic Burger')).toBeInTheDocument();
    });

    // Click on burger to open detail modal
    fireEvent.click(screen.getByText('Classic Burger'));

    // Wait for modal and add to cart
    await waitFor(() => {
      expect(screen.getByText('Add to Cart - $12.99')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Add to Cart - $12.99'));

    // Cart drawer should open
    await waitFor(() => {
      expect(screen.getByText('Your Cart')).toBeInTheDocument();
      expect(screen.getByText('(1 items)')).toBeInTheDocument();
    });

    // Proceed to checkout
    fireEvent.click(screen.getByText('Proceed to Checkout'));

    // Should navigate to checkout page
    await waitFor(() => {
      expect(screen.getByText('Checkout')).toBeInTheDocument();
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
    });

    // Fill in contact information
    const emailInput = screen.getByLabelText('Email Address');
    const phoneInput = screen.getByLabelText('Phone Number');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(phoneInput, { target: { value: '5551234567' } });

    // Add tip
    fireEvent.click(screen.getByLabelText('Set tip to 20%'));

    // Fill in mock payment information
    const cardInput = screen.getByLabelText('Card Number');
    const expiryInput = screen.getByLabelText('Expiry Date');
    const cvvInput = screen.getByLabelText('CVV');
    const postalInput = screen.getByLabelText('Postal Code');

    fireEvent.change(cardInput, { target: { value: '4111111111111111' } });
    fireEvent.change(expiryInput, { target: { value: '1225' } });
    fireEvent.change(cvvInput, { target: { value: '123' } });
    fireEvent.change(postalInput, { target: { value: '12345' } });

    // Submit payment
    const payButton = screen.getByRole('button', { name: /Pay \$/i });
    fireEvent.click(payButton);

    // Wait for processing
    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    // Should navigate to confirmation page
    await waitFor(() => {
      expect(screen.getByText('Order Confirmed!')).toBeInTheDocument();
      expect(screen.getByText(/Thank you for your order/)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify order details on confirmation
    expect(screen.getByText('Order Number')).toBeInTheDocument();
    expect(screen.getByText('1x')).toBeInTheDocument();
    expect(screen.getByText('Classic Burger')).toBeInTheDocument();
    expect(screen.getByText(/Estimated ready time/)).toBeInTheDocument();
  });

  it('should show empty cart message on checkout with no items', async () => {
    renderWithRouter('/checkout');

    await waitFor(() => {
      expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
      expect(screen.getByText('Add some items to your cart to checkout')).toBeInTheDocument();
    });

    // Should have back to menu link
    expect(screen.getByText('Back to Menu')).toBeInTheDocument();
  });

  it('should validate payment form fields', async () => {
    // Add item to cart first
    localStorage.setItem('cart_test-restaurant', JSON.stringify({
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
    }));

    renderWithRouter('/checkout');

    await waitFor(() => {
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
    });

    // Try to submit without filling form
    const payButton = screen.getByRole('button', { name: /Pay \$/i });
    fireEvent.click(payButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid 10-digit phone number')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid 16-digit card number')).toBeInTheDocument();
    });
  });

  it('should update cart totals when tip is changed', async () => {
    // Add item to cart
    localStorage.setItem('cart_test-restaurant', JSON.stringify({
      items: [{
        id: 'test-1',
        menuItemId: 'burger-1',
        name: 'Classic Burger',
        price: 10.00,
        quantity: 1
      }],
      subtotal: 10.00,
      tax: 0.83,
      tip: 0,
      total: 10.83,
      restaurantId: 'test-restaurant'
    }));

    renderWithRouter('/checkout');

    await waitFor(() => {
      expect(screen.getByText('Order Total')).toBeInTheDocument();
    });

    // Initial total should be $10.83
    expect(screen.getByText('$10.83')).toBeInTheDocument();

    // Add 20% tip
    fireEvent.click(screen.getByLabelText('Set tip to 20%'));

    // Total should update to include $2.00 tip
    await waitFor(() => {
      expect(screen.getByText('$12.83')).toBeInTheDocument();
    });
  });
});