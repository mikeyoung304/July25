import React, { useState, useCallback, useEffect } from 'react';
import { VoiceOrderProvider } from '@/modules/voice/contexts/VoiceOrderContext';
import { useVoiceOrder } from '@/modules/voice/hooks/useVoiceOrder';
import { VoiceControlWebRTC } from '@/modules/voice/components/VoiceControlWebRTC';
import { OrderParser, ParsedOrderItem } from '@/modules/orders/services/OrderParser';
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems';
import { Card } from '@/components/ui/card';
import { ActionButton } from '@/components/ui/ActionButton';
import { BackToDashboard } from '@/components/navigation/BackToDashboard';


const KioskPageContent: React.FC = () => {
  const { items, addItem, total, itemCount } = useVoiceOrder();
  const { items: menuItems, loading } = useMenuItems();
  const [orderParser, setOrderParser] = useState<OrderParser | null>(null);

  useEffect(() => {
    if (menuItems.length > 0) {
      setOrderParser(new OrderParser(menuItems));
    }
  }, [menuItems]);


  const processParsedItems = useCallback((parsedItems: ParsedOrderItem[]) => {
    parsedItems.forEach(parsed => {
      if (parsed.menuItem && parsed.action === 'add') {
        addItem(parsed.menuItem, parsed.quantity, parsed.modifications);
      }
    });
  }, [addItem]);

  const handleVoiceTranscript = useCallback((textOrEvent: string | { text: string; isFinal: boolean }) => {
    const text = typeof textOrEvent === 'string' ? textOrEvent : textOrEvent.text;
    const isFinal = typeof textOrEvent === 'string' ? true : textOrEvent.isFinal;
    
    if (isFinal && orderParser) {
      const parsedItems = orderParser.parseOrder(text);
      if (parsedItems.length > 0) {
        processParsedItems(parsedItems);
      }
    }
  }, [orderParser, processParsedItems]);

  const handleOrderData = useCallback((orderData: any) => {
    if (orderData?.success && orderData?.items?.length > 0) {
      orderData.items.forEach((item: any) => {
        const menuItem = menuItems.find(m => m.id === item.menuItemId);
        if (menuItem) {
          addItem(
            menuItem,
            item.quantity || 1,
            item.modifications || []
          );
        }
      });
    }
  }, [menuItems, addItem]);


  const handleConfirmOrder = useCallback(() => {
    // TODO: Navigate to checkout
    window.location.href = '/checkout';
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <p className="text-gray-600">Loading menu...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <BackToDashboard />
        </div>
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Voice Kiosk</h1>
          <p className="text-gray-600">{itemCount} items • ${total.toFixed(2)}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Voice Control */}
          <Card className="p-8 text-center bg-white border border-gray-200">
            <VoiceControlWebRTC
              onTranscript={handleVoiceTranscript}
              onOrderDetected={handleOrderData}
              debug={false}
            />
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Voice Ordering</h3>
              <p className="text-gray-600">Press and hold to speak your order</p>
            </div>
          </Card>

          {/* Current Order */}
          <Card className="p-6 bg-white border border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Current Order</h3>
            </div>

            {items.length > 0 ? (
              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2">
                    <div>
                      <span className="font-medium text-gray-900">
                        {item.quantity}x {item.menuItem.name}
                      </span>
                      {item.modifications && item.modifications.length > 0 && (
                        <p className="text-sm text-gray-600">
                          {item.modifications.join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="font-semibold text-gray-900">
                      ${(item.menuItem.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No items yet</p>
                <p className="text-sm text-gray-400 mt-1">Use voice to add items</p>
              </div>
            )}

            {items.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-gray-900">
                    ${total.toFixed(2)}
                  </span>
                </div>
                <ActionButton
                  size="small"
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                  onClick={handleConfirmOrder}
                >
                  Checkout
                </ActionButton>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

const KioskPage: React.FC = () => {
  return (
    <VoiceOrderProvider>
      <KioskPageContent />
    </VoiceOrderProvider>
  );
};

export default KioskPage