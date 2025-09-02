import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Menu, ShoppingCart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ActionButton } from '@/components/ui/ActionButton';

export type KioskMode = 'voice' | 'selection';

interface KioskModeSelectorProps {
  onModeSelect: (mode: KioskMode) => void;
  cartItemCount: number;
  cartTotal: number;
  onViewCart?: () => void;
}

export const KioskModeSelector: React.FC<KioskModeSelectorProps> = ({
  onModeSelect,
  cartItemCount,
  cartTotal,
  onViewCart
}) => {
  const navigate = useNavigate();
  return (
    <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12" role="banner">
          <h1 className="text-5xl font-bold text-gray-900 mb-6" id="kiosk-welcome">
            Welcome to Self-Service Ordering
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose how you'd like to place your order today. Both options support full customization and secure payment.
          </p>
        </div>

        {/* Cart Status Bar */}
        {cartItemCount > 0 && (
          <div className="mb-8">
            <Card className="p-6 bg-white/90 backdrop-blur-sm border-2 border-teal-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <ShoppingCart className="w-8 h-8 text-teal-600" aria-hidden="true" />
                  <div>
                    <p className="text-xl font-semibold text-gray-900">
                      Current Order: {cartItemCount} items
                    </p>
                    <p className="text-lg text-gray-600">
                      Total: ${cartTotal.toFixed(2)}
                    </p>
                  </div>
                </div>
                {onViewCart && (
                  <ActionButton
                    onClick={onViewCart}
                    size="small"
                    className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 text-lg"
                    aria-label={`View cart with ${cartItemCount} items, total $${cartTotal.toFixed(2)}`}
                  >
                    View Cart
                  </ActionButton>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Mode Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto" role="region" aria-labelledby="kiosk-welcome">
          {/* Voice Ordering Card */}
          <Card className="group hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer bg-white/90 backdrop-blur-sm border-2 border-transparent hover:border-orange-300">
            <div 
              className="p-12 text-center"
              onClick={() => onModeSelect('voice')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onModeSelect('voice');
                }
              }}
              aria-label="Select voice ordering mode"
            >
              <div className="mb-8">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
                  <Mic className="w-12 h-12 text-white" aria-hidden="true" />
                </div>
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Voice Order
                </h2>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Simply speak your order and we'll take care of the rest. 
                  Fast, easy, and hands-free ordering experience.
                </p>
              </div>
              
              <div className="space-y-3 text-lg text-gray-700">
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Just press and speak</span>
                </div>
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>AI-powered order processing</span>
                </div>
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Quick and convenient</span>
                </div>
              </div>

              <div className="mt-8">
                <ActionButton
                  size="large"
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-12 py-6 text-2xl font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Start Voice Order
                </ActionButton>
              </div>
            </div>
          </Card>

          {/* Menu Browsing Card - Redirects to online ordering */}
          <Card className="group hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer bg-white/90 backdrop-blur-sm border-2 border-transparent hover:border-teal-300">
            <div 
              className="p-12 text-center"
              onClick={() => navigate('/order')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/order');
                }
              }}
              aria-label="Browse menu and place order online"
            >
              <div className="mb-8">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-teal-500 to-blue-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
                  <Menu className="w-12 h-12 text-white" aria-hidden="true" />
                </div>
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  View Menu
                </h2>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Browse our full menu online with photos, descriptions, and 
                  complete customization options.
                </p>
              </div>
              
              <div className="space-y-3 text-lg text-gray-700">
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                  <span>Full online ordering system</span>
                </div>
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                  <span>Complete checkout process</span>
                </div>
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                  <span>Order confirmation & tracking</span>
                </div>
              </div>

              <div className="mt-8">
                <ActionButton
                  size="large"
                  className="bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white px-12 py-6 text-2xl font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  View Menu
                </ActionButton>
              </div>
            </div>
          </Card>
        </div>
      </div>
  );
};