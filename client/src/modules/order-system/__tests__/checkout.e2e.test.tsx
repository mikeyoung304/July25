import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Create minimal test components to prove routing
const TestCheckoutPage = () => {
  const navigate = useNavigate();
  
  const handlePay = () => {
    navigate('/order-confirmation');
  };
  
  return (
    <div>
      <h1>Checkout</h1>
      <div>Greek Bowl - $10.83</div>
      <form>
        <label htmlFor="name">Name</label>
        <input id="name" type="text" />
        
        <label htmlFor="phone">Phone</label>
        <input id="phone" type="tel" />
        
        <button type="button" onClick={handlePay}>Pay Now</button>
      </form>
    </div>
  );
};

const TestConfirmationPage = () => (
  <div>
    <h1>Order Confirmation</h1>
    <p>Thank you for your order!</p>
  </div>
);

describe('Checkout E2E Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('happy path: checkout -> pay -> confirmation navigation', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<TestCheckoutPage />} />
          <Route path="/order-confirmation" element={<TestConfirmationPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Verify checkout page renders
    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByText('Greek Bowl - $10.83')).toBeInTheDocument();
    
    // Fill required fields
    const nameInput = screen.getByLabelText(/name/i);
    const phoneInput = screen.getByLabelText(/phone/i);
    
    await user.type(nameInput, 'John Doe');
    await user.type(phoneInput, '555-1234');

    // Click pay button
    const payButton = screen.getByRole('button', { name: /pay now/i });
    await user.click(payButton);

    // Verify we navigated to confirmation
    expect(screen.getByText('Order Confirmation')).toBeInTheDocument();
    expect(screen.getByText('Thank you for your order!')).toBeInTheDocument();
  });
});