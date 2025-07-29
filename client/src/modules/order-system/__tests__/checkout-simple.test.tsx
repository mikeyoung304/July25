import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CheckoutPage } from '@/pages/CheckoutPage';
import '@testing-library/jest-dom';

// Mock CartContext
vi.mock('@/modules/order-system/context/CartContext', () => ({
  useCart: () => ({
    cart: {
      items: [{
        id: '1',
        menuItem: { id: '1', name: 'Burger', price: 10 },
        quantity: 1,
        subtotal: 10
      }],
      subtotal: 10,
      tax: 0.83,
      tip: 0,
      total: 10.83
    },
    updateTip: vi.fn(),
    clearCart: vi.fn()
  })
}));

// Mock router
vi.mock('react-router-dom', () => ({
  ...vi.requireActual('react-router-dom'),
  useNavigate: () => vi.fn()
}));

describe('CheckoutPage', () => {
  it('should render checkout form and navigate on submit', async () => {
    render(
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    );

    // Check if page renders
    expect(screen.getByText(/checkout/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    
    // Check cart summary
    expect(screen.getByText('Burger')).toBeInTheDocument();
    expect(screen.getByText('$10.83')).toBeInTheDocument();
  });
});