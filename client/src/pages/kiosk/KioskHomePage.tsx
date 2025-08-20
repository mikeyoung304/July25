/**
 * Simplified Kiosk Home Page with new Voice Order Widget
 * Demonstrates the new client-side audio pipeline and voice UI
 */

import React, { useCallback, useState } from 'react';
import { logger } from '@/services/logger'
import { ShoppingCart, Menu, Settings, HelpCircle } from 'lucide-react';
import { VoiceOrderWidget } from '../../components/kiosk/VoiceOrderWidget';
import { useRestaurant } from '../../core/restaurant-hooks';

export interface KioskHomePageProps {
  className?: string;
}

export const KioskHomePage: React.FC<KioskHomePageProps> = ({ className = '' }) => {
  const [orderTranscript, setOrderTranscript] = useState<string>('');
  const [orderCount, setOrderCount] = useState<number>(0);
  const { restaurant } = useRestaurant();

  const handleOrderComplete = useCallback((transcript: string) => {
    logger.info('Order completed:', transcript);
    setOrderTranscript(transcript);
    setOrderCount(prev => prev + 1);
    
    // Here you would typically:
    // 1. Parse the transcript into order items
    // 2. Add items to shopping cart
    // 3. Show confirmation or redirect to cart
  }, []);

  const handleVoiceError = useCallback((error: string) => {
    console.error('Voice error:', error);
    // Handle voice errors (show toast, retry options, etc.)
  }, []);

  const handleViewCart = useCallback(() => {
    // Navigate to cart/checkout
    logger.info('View cart clicked');
  }, []);

  const handleViewMenu = useCallback(() => {
    // Navigate to digital menu
    logger.info('View menu clicked');
  }, []);

  return (
    <div className={`min-h-screen bg-gradient-to-b from-blue-50 to-white ${className}`}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {restaurant?.name || 'Restaurant'} Kiosk
              </h1>
              <p className="text-gray-600 text-sm">Welcome! Order with your voice or browse the menu.</p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={handleViewCart}
              >
                <ShoppingCart className="w-5 h-5" />
                Cart ({orderCount})
              </button>
              
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Settings className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Voice Order Widget - Primary CTA */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Order with Your Voice
              </h2>
              <p className="text-gray-600 mb-8">
                Simply hold the microphone button and tell us what you'd like to order.
                Our AI assistant will help you build the perfect meal.
              </p>
              
              <VoiceOrderWidget
                restaurantId={restaurant?.id}
                onOrderComplete={handleOrderComplete}
                onError={handleVoiceError}
                className="max-w-sm mx-auto"
              />
            </div>
          </div>

          {/* Quick Actions Sidebar */}
          <div className="space-y-6">
            {/* Browse Menu Card */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Menu className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Browse Menu</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Prefer to browse? View our full digital menu with photos and descriptions.
              </p>
              <button
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                onClick={handleViewMenu}
              >
                View Menu
              </button>
            </div>

            {/* Help Card */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <HelpCircle className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Need Help?</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                First time using voice ordering? Here are some example phrases to try.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• "I'd like a large pepperoni pizza"</li>
                <li>• "Can I get two burgers with fries?"</li>
                <li>• "I want a chicken salad, no onions"</li>
                <li>• "Add a Diet Coke to my order"</li>
              </ul>
            </div>

            {/* Order Summary */}
            {orderTranscript && (
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                <h3 className="font-semibold text-blue-900 mb-2">Latest Order</h3>
                <p className="text-blue-700 text-sm italic">"{orderTranscript}"</p>
                <button
                  className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={handleViewCart}
                >
                  Review & Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-gray-50 border-t">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              <p>© 2025 {restaurant?.name || 'Restaurant'}. All rights reserved.</p>
            </div>
            <div className="flex items-center gap-4">
              <button className="hover:text-gray-700 transition-colors">
                Privacy Policy
              </button>
              <button className="hover:text-gray-700 transition-colors">
                Terms of Service
              </button>
              <button className="hover:text-gray-700 transition-colors">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};