import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CheckoutPage from '../CheckoutPage';
import { DemoAuthService } from '@/services/auth/demoAuth';

// Mock dependencies
vi.mock('@/contexts/UnifiedCartContext', () => ({
  useUnifiedCart: () => ({
    cart: {
      items: [{
        id: '1',
        name: 'Test Item',
        price: 10.00,
        quantity: 1,
        modifiers: [],
        specialInstructions: ''
      }],
      subtotal: 10.00,
      tax: 1.00,
      tip: 2.00,
      total: 13.00
    },
    updateCartItem: vi.fn(),
    removeFromCart: vi.fn(),
    updateTip: vi.fn(),
    clearCart: vi.fn()
  })
}));

vi.mock('@/hooks/useApiRequest', () => ({
  useApiRequest: () => ({
    post: vi.fn().mockResolvedValue({
      id: 'order-123',
      order_number: 'ORD-001'
    })
  })
}));

vi.mock('@/services/auth/demoAuth', () => ({
  DemoAuthService: {
    getDemoToken: vi.fn().mockResolvedValue('demo-token-123'),
    refreshTokenIfNeeded: vi.fn().mockResolvedValue('demo-token-123')
  }
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

    // Verify demo token was obtained
    expect(DemoAuthService.getDemoToken).toHaveBeenCalled();
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
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });

    // Should not navigate
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});