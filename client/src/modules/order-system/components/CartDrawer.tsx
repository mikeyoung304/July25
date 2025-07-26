import React from 'react';
import { X, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';
import { CheckoutButton } from './CheckoutButton';
import { useCart } from '../context/cartContext.hooks';

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const { cart, updateCartItem, removeFromCart, isCartOpen, setIsCartOpen } = useCart();
  
  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <>
      {/* Backdrop */}
      {isCartOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={() => setIsCartOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div 
        className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 ${
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-6 h-6 text-macon-teal" />
              <h2 id="cart-title" className="text-xl font-semibold">Your Cart</h2>
              <span className="text-sm text-gray-500">({cart.items.length} items)</span>
            </div>
            
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close cart"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto">
            {cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-6">
                <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-center">Your cart is empty</p>
                <p className="text-sm text-gray-400 text-center mt-2">
                  Add items from the menu to get started
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {cart.items.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onUpdate={(updates) => updateCartItem(item.id, updates)}
                    onRemove={() => removeFromCart(item.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {cart.items.length > 0 && (
            <div className="border-t p-4 space-y-4">
              <CartSummary 
                subtotal={cart.subtotal}
                tax={cart.tax}
                total={cart.total}
              />
              
              <CheckoutButton 
                onClick={handleCheckout}
                disabled={cart.items.length === 0}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};