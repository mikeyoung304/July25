import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { OrderConfirmationPage } from '@/pages/OrderConfirmationPage';
import { TipSlider } from '../components/TipSlider';
import { SquarePaymentForm } from '../components/SquarePaymentForm';

expect.extend(toHaveNoViolations);

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

  it('CheckoutPage should have no accessibility violations', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
        </Routes>
      </MemoryRouter>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('OrderConfirmationPage should have no accessibility violations', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={[{ pathname: '/order-confirmation', state: mockLocationState }]}>
        <Routes>
          <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
        </Routes>
      </MemoryRouter>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('TipSlider component should have no accessibility violations', async () => {
    const { container } = render(
      <TipSlider 
        subtotal={10.00} 
        onTipChange={() => {}} 
        initialTip={0}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('SquarePaymentForm component should have no accessibility violations', async () => {
    const { container } = render(
      <SquarePaymentForm 
        onPaymentNonce={() => {}} 
        amount={14.06}
        isProcessing={false}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('CheckoutPage with empty cart should have no accessibility violations', async () => {
    localStorage.clear(); // Clear cart to test empty state
    
    const { container } = render(
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
        </Routes>
      </MemoryRouter>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('SquarePaymentForm in processing state should have no accessibility violations', async () => {
    const { container } = render(
      <SquarePaymentForm 
        onPaymentNonce={() => {}} 
        amount={14.06}
        isProcessing={true}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // Test specific ARIA attributes
  it('CheckoutPage should have proper ARIA labels', () => {
    const { getByLabelText } = render(
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(getByLabelText('Email Address')).toBeInTheDocument();
    expect(getByLabelText('Phone Number')).toBeInTheDocument();
  });

  it('TipSlider should have proper ARIA labels for buttons', () => {
    const { getByLabelText } = render(
      <TipSlider 
        subtotal={10.00} 
        onTipChange={() => {}} 
        initialTip={0}
      />
    );

    expect(getByLabelText('Set tip to 15%')).toBeInTheDocument();
    expect(getByLabelText('Set tip to 18%')).toBeInTheDocument();
    expect(getByLabelText('Set tip to 20%')).toBeInTheDocument();
    expect(getByLabelText('Set tip to 25%')).toBeInTheDocument();
  });

  it('SquarePaymentForm should have proper form labels', () => {
    const { getByLabelText } = render(
      <SquarePaymentForm 
        onPaymentNonce={() => {}} 
        amount={14.06}
        isProcessing={false}
      />
    );

    expect(getByLabelText('Card Number')).toBeInTheDocument();
    expect(getByLabelText('Expiry Date')).toBeInTheDocument();
    expect(getByLabelText('CVV')).toBeInTheDocument();
    expect(getByLabelText('Postal Code')).toBeInTheDocument();
  });
});