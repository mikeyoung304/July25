import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CartProvider } from './CartContext';
import { useCart } from './cartContext.hooks';
import { CartItem } from '../../../../../shared/cart';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/order/test-restaurant']}>
    <Routes>
      <Route path="/order/:restaurantId" element={
        <CartProvider>{children}</CartProvider>
      } />
    </Routes>
  </MemoryRouter>
);

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with empty cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    expect(result.current.cart.items).toHaveLength(0);
    expect(result.current.cart.subtotal).toBe(0);
    expect(result.current.cart.tax).toBe(0);
    expect(result.current.cart.tip).toBe(0);
    expect(result.current.cart.total).toBe(0);
  });

  it('should add item to cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    const testItem: Omit<CartItem, 'id'> = {
      menuItemId: 'menu-1',
      name: 'Test Burger',
      price: 10.99,
      quantity: 1
    };

    act(() => {
      result.current.addToCart(testItem);
    });

    expect(result.current.cart.items).toHaveLength(1);
    expect(result.current.cart.items[0].name).toBe('Test Burger');
    expect(result.current.cart.subtotal).toBe(10.99);
    expect(result.current.cart.tax).toBeCloseTo(0.91, 2); // 8.25% of 10.99
    expect(result.current.cart.total).toBeCloseTo(11.90, 2);
    expect(result.current.isCartOpen).toBe(true);
  });

  it('should add item with modifiers', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    const testItem: Omit<CartItem, 'id'> = {
      menuItemId: 'menu-1',
      name: 'Test Burger',
      price: 10.99,
      quantity: 2,
      modifiers: [
        { id: 'mod-1', name: 'Extra Cheese', price: 1.50 },
        { id: 'mod-2', name: 'Bacon', price: 2.00 }
      ]
    };

    act(() => {
      result.current.addToCart(testItem);
    });

    const expectedItemPrice = 10.99 + 1.50 + 2.00; // 14.49
    const expectedSubtotal = expectedItemPrice * 2; // 28.98
    
    expect(result.current.cart.subtotal).toBeCloseTo(expectedSubtotal, 2);
  });

  it('should update cart item quantity', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    act(() => {
      result.current.addToCart({
        menuItemId: 'menu-1',
        name: 'Test Burger',
        price: 10.99,
        quantity: 1
      });
    });

    const itemId = result.current.cart.items[0].id;

    act(() => {
      result.current.updateCartItem(itemId, { quantity: 3 });
    });

    expect(result.current.cart.items[0].quantity).toBe(3);
    expect(result.current.cart.subtotal).toBeCloseTo(32.97, 2); // 10.99 * 3
  });

  it('should remove item from cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    act(() => {
      result.current.addToCart({
        menuItemId: 'menu-1',
        name: 'Test Burger',
        price: 10.99,
        quantity: 1
      });
    });

    const itemId = result.current.cart.items[0].id;

    act(() => {
      result.current.removeFromCart(itemId);
    });

    expect(result.current.cart.items).toHaveLength(0);
    expect(result.current.cart.subtotal).toBe(0);
    expect(result.current.cart.total).toBe(0);
  });

  it('should update tip amount', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    act(() => {
      result.current.addToCart({
        menuItemId: 'menu-1',
        name: 'Test Burger',
        price: 10.00,
        quantity: 1
      });
    });

    act(() => {
      result.current.updateTip(2.00);
    });

    expect(result.current.cart.tip).toBe(2.00);
    expect(result.current.cart.total).toBeCloseTo(12.83, 1); // 10 + 0.83 tax + 2 tip
  });

  it('should clear cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    act(() => {
      result.current.addToCart({
        menuItemId: 'menu-1',
        name: 'Test Burger',
        price: 10.99,
        quantity: 1
      });
      result.current.updateTip(2.00);
    });

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.cart.items).toHaveLength(0);
    expect(result.current.cart.subtotal).toBe(0);
    expect(result.current.cart.tip).toBe(0);
    expect(result.current.cart.total).toBe(0);
  });

  it('should persist cart to localStorage', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    act(() => {
      result.current.addToCart({
        menuItemId: 'menu-1',
        name: 'Test Burger',
        price: 10.99,
        quantity: 1
      });
    });

    const savedCart = localStorage.getItem('cart_test-restaurant');
    expect(savedCart).toBeTruthy();
    
    const parsedCart = JSON.parse(savedCart!);
    expect(parsedCart.items).toHaveLength(1);
    expect(parsedCart.items[0].name).toBe('Test Burger');
  });

  it('should load cart from localStorage on mount', () => {
    const savedCart = {
      items: [{
        id: 'saved-item-1',
        menuItemId: 'menu-1',
        name: 'Saved Burger',
        price: 15.99,
        quantity: 2
      }],
      subtotal: 31.98,
      tax: 2.64,
      tip: 0,
      total: 34.62,
      restaurantId: 'test-restaurant'
    };

    localStorage.setItem('cart_test-restaurant', JSON.stringify(savedCart));

    const { result } = renderHook(() => useCart(), { wrapper });
    
    expect(result.current.cart.items).toHaveLength(1);
    expect(result.current.cart.items[0].name).toBe('Saved Burger');
    expect(result.current.cart.subtotal).toBe(31.98);
  });

  it('should toggle cart drawer', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    expect(result.current.isCartOpen).toBe(false);

    act(() => {
      result.current.setIsCartOpen(true);
    });

    expect(result.current.isCartOpen).toBe(true);

    act(() => {
      result.current.setIsCartOpen(false);
    });

    expect(result.current.isCartOpen).toBe(false);
  });
});