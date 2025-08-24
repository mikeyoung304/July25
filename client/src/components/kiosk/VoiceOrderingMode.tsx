import React, { useState, useCallback, useEffect } from 'react';
import { VoiceControlWebRTC } from '@/modules/voice/components/VoiceControlWebRTC';
import { OrderParser, ParsedOrderItem } from '@/modules/orders/services/OrderParser';
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems';
import { useKioskCart } from './KioskCartProvider';
import { useKioskOrderSubmission } from '@/hooks/kiosk/useKioskOrderSubmission';
import { Card } from '@/components/ui/card';
import { ActionButton } from '@/components/ui/ActionButton';
import { BrandHeader } from '@/components/layout/BrandHeader';
import { ShoppingCart, Mic, MicOff, Volume2, Trash2 } from 'lucide-react';

interface VoiceOrderingModeProps {
  onBack: () => void;
  onCheckout: () => void;
}

export const VoiceOrderingMode: React.FC<VoiceOrderingModeProps> = ({
  onBack,
  onCheckout
}) => {
  const { cart, addItem, removeFromCart, clearCart } = useKioskCart();
  const { items: menuItems, loading } = useMenuItems();
  const { submitOrderAndNavigate, isSubmitting } = useKioskOrderSubmission();
  const [orderParser, setOrderParser] = useState<OrderParser | null>(null);
  const [isListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [recentlyAdded, setRecentlyAdded] = useState<string[]>([]);

  useEffect(() => {
    if (menuItems.length > 0) {
      setOrderParser(new OrderParser(menuItems));
    }
  }, [menuItems]);

  const processParsedItems = useCallback((parsedItems: ParsedOrderItem[]) => {
    const newItems: string[] = [];
    parsedItems.forEach(parsed => {
      if (parsed.menuItem && parsed.action === 'add') {
        const modifications = parsed.modifications ? parsed.modifications.map(mod => mod.name) : [];
        addItem(parsed.menuItem, parsed.quantity, modifications);
        newItems.push(parsed.menuItem.name);
      }
    });
    
    if (newItems.length > 0) {
      setRecentlyAdded(newItems);
      setTimeout(() => setRecentlyAdded([]), 3000);
    }
  }, [addItem]);

  const handleVoiceTranscript = useCallback((textOrEvent: string | { text: string; isFinal: boolean }) => {
    const text = typeof textOrEvent === 'string' ? textOrEvent : textOrEvent.text;
    const isFinal = typeof textOrEvent === 'string' ? true : textOrEvent.isFinal;
    
    setLastTranscript(text);
    
    if (isFinal && orderParser && text.trim()) {
      const parsedItems = orderParser.parseUserTranscript(text);
      
      if (parsedItems.length > 0) {
        processParsedItems(parsedItems);
      }
    }
  }, [orderParser, processParsedItems]);

  const handleOrderData = useCallback((orderData: any) => {
    console.log('[VoiceOrderingMode] Received order data:', orderData);
    
    // Handle function call format from WebRTC: { items: [{ name, quantity, modifications }] }
    if (orderData?.items?.length > 0) {
      const addedItems: string[] = [];
      
      orderData.items.forEach((item: any) => {
        // Enhanced fuzzy matching for menu items
        const menuItem = menuItems.find(m => {
          const itemNameLower = item.name.toLowerCase();
          const menuNameLower = m.name.toLowerCase();
          
          // Exact match
          if (menuNameLower === itemNameLower) return true;
          
          // Contains match
          if (menuNameLower.includes(itemNameLower) || itemNameLower.includes(menuNameLower)) return true;
          
          // Handle common variations
          const variations: Record<string, string[]> = {
            'soul bowl': ['soul', 'bowl', 'sobo', 'solo bowl'],
            'greek salad': ['greek', 'greek salad'],
            'peach arugula': ['peach', 'arugula', 'peach salad'],
            'jalapeño pimento': ['jalapeno', 'pimento', 'cheese bites'],
            'succotash': ['succotash', 'suck a toss'],
          };
          
          for (const [menuKey, aliases] of Object.entries(variations)) {
            if (menuNameLower.includes(menuKey) && aliases.some(alias => itemNameLower.includes(alias))) {
              return true;
            }
          }
          
          return false;
        });
        
        if (menuItem) {
          // Handle modifications from function call
          const modifications = item.modifications || item.modifiers || [];
          
          console.log(`[VoiceOrderingMode] Adding ${item.quantity}x ${menuItem.name} with modifications:`, modifications);
          
          addItem(
            menuItem,
            item.quantity || 1,
            modifications,
            item.specialInstructions
          );
          
          addedItems.push(`${item.quantity || 1}x ${menuItem.name}`);
        } else {
          console.warn(`[VoiceOrderingMode] Could not find menu item for: ${item.name}`);
        }
      });
      
      // Update recently added items for visual feedback
      if (addedItems.length > 0) {
        setRecentlyAdded(addedItems);
        setTimeout(() => setRecentlyAdded([]), 5000); // Show for 5 seconds
      }
    }
    
    // Handle order confirmation events
    else if (orderData?.action) {
      console.log('[VoiceOrderingMode] Order action:', orderData.action);
      
      if (orderData.action === 'checkout' && cart.items.length > 0) {
        // Auto-trigger checkout
        onCheckout();
      } else if (orderData.action === 'review') {
        // Could show order summary or read it back
        console.log('Order review requested, current cart:', cart.items);
      }
    }
    
    // Handle legacy format if it exists
    else if (orderData?.success && orderData?.items?.length > 0) {
      orderData.items.forEach((item: any) => {
        const menuItem = menuItems.find(m => m.id === item.menuItemId);
        if (menuItem) {
          const modifications = item.modifications ? item.modifications.map((mod: any) => mod.name || mod) : [];
          addItem(
            menuItem,
            item.quantity || 1,
            modifications
          );
        }
      });
    }
  }, [menuItems, addItem, cart.items, onCheckout]);

  const handleQuickOrder = useCallback(async () => {
    const result = await submitOrderAndNavigate(cart.items);
    if (result.success) {
      clearCart();
    }
  }, [cart.items, submitOrderAndNavigate, clearCart]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <Card className="p-12 text-center max-w-lg">
          <div className="animate-spin h-12 w-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-6"></div>
          <p className="text-xl text-gray-600">Loading menu...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <BrandHeader 
        pageTitle="Voice Ordering"
        pageDescription="Speak your order naturally - AI will understand"
      />
      
      {/* Quick Actions Bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <ActionButton
            onClick={onBack}
            variant="ghost"
            size="large"
            className="text-gray-600 hover:text-gray-900"
          >
            ← Change Order Method
          </ActionButton>
          
          {cart.itemCount > 0 && (
            <ActionButton
              onClick={onCheckout}
              size="large"
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Checkout ({cart.itemCount} items • ${cart.total.toFixed(2)})
            </ActionButton>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Voice Control Section */}
          <div className="space-y-8">
            {/* Main Voice Control */}
            <Card className="p-12 text-center bg-white/90 backdrop-blur-sm border-2 border-orange-200 hover:border-orange-300 transition-colors">
              <VoiceControlWebRTC
                onTranscript={handleVoiceTranscript}
                onOrderDetected={handleOrderData}
                debug={false}
              />
              <div className="mt-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
                  {isListening ? (
                    <>
                      <Mic className="w-8 h-8 mr-3 text-orange-600 animate-pulse" />
                      Listening...
                    </>
                  ) : (
                    <>
                      <MicOff className="w-8 h-8 mr-3 text-gray-400" />
                      Press and Hold to Speak
                    </>
                  )}
                </h2>
                <p className="text-xl text-gray-600">
                  {isListening 
                    ? "I'm listening to your order..."
                    : "Hold the microphone button and tell me what you'd like to order"
                  }
                </p>
              </div>
            </Card>

            {/* Live Transcript */}
            {lastTranscript && (
              <Card className="p-6 bg-blue-50 border-2 border-blue-200">
                <div className="flex items-start space-x-4">
                  <Volume2 className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">You said:</h3>
                    <p className="text-blue-800 text-lg italic">"{lastTranscript}"</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Recently Added Items Alert */}
            {recentlyAdded.length > 0 && (
              <Card className="p-6 bg-green-50 border-2 border-green-200 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-900">Added to your order:</h3>
                    <p className="text-green-800 text-lg">
                      {recentlyAdded.join(', ')}
                    </p>
                  </div>
                </div>
              </Card>
            )}

          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card className="p-8 bg-white/90 backdrop-blur-sm border-2 border-gray-200 sticky top-40">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Your Order</h2>
                {cart.itemCount > 0 && (
                  <span className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-lg font-semibold">
                    {cart.itemCount} items
                  </span>
                )}
              </div>

              {cart.items.length > 0 ? (
                <div className="space-y-4">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-semibold text-gray-900">
                            {item.quantity}×
                          </span>
                          <span className="text-lg font-medium text-gray-900">
                            {item.menuItem.name}
                          </span>
                        </div>
                        {item.modifications && item.modifications.length > 0 && (
                          <p className="text-sm text-gray-600 mt-1 ml-8">
                            {item.modifications.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-lg font-bold text-gray-900">
                          ${(item.menuItem.price * item.quantity).toFixed(2)}
                        </span>
                        <ActionButton
                          onClick={() => removeFromCart(item.id)}
                          variant="ghost"
                          size="small"
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          aria-label={`Remove ${item.menuItem.name} from cart`}
                        >
                          <Trash2 className="w-5 h-5" />
                        </ActionButton>
                      </div>
                    </div>
                  ))}

                  {/* Order Total */}
                  <div className="border-t border-gray-200 pt-6 mt-6">
                    <div className="space-y-2 text-lg">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal:</span>
                        <span>${cart.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Tax:</span>
                        <span>${cart.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xl font-bold text-gray-900 border-t pt-2">
                        <span>Total:</span>
                        <span>${cart.total.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mt-6">
                      <ActionButton
                        onClick={onCheckout}
                        disabled={isSubmitting}
                        size="large"
                        className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white py-6 text-xl font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <ShoppingCart className="w-6 h-6 mr-3" />
                        Checkout & Pay Now
                      </ActionButton>
                      
                      <ActionButton
                        onClick={handleQuickOrder}
                        disabled={isSubmitting}
                        variant="outline"
                        size="large"
                        className="w-full border-2 border-gray-300 hover:border-gray-400 text-gray-700 py-4 text-lg font-medium rounded-xl transition-all duration-300"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-transparent rounded-full mr-3"></div>
                            Submitting Order...
                          </>
                        ) : (
                          <>
                            Submit Order (Pay at Counter)
                          </>
                        )}
                      </ActionButton>
                      
                      <p className="text-sm text-gray-500 text-center mt-2">
                        Pay now for table service, or submit to pay at counter
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingCart className="w-12 h-12 text-gray-400" />
                  </div>
                  <p className="text-xl text-gray-500 mb-2">No items yet</p>
                  <p className="text-gray-400">
                    Use voice commands to add items to your order
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};