import React, { useState, useCallback, useEffect } from 'react';
import { VoiceOrderProvider } from '@/modules/voice/contexts/VoiceOrderContext';
import { useVoiceOrder } from '@/modules/voice/hooks/useVoiceOrder';
import { VoiceControlWebRTC } from '@/modules/voice/components/VoiceControlWebRTC';
import { OrderParser, ParsedOrderItem } from '@/modules/orders/services/OrderParser';
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems';
import { ActionButton } from '@/components/ui/ActionButton';
import { BackToDashboard } from '@/components/navigation/BackToDashboard';


const DriveThruPageContent: React.FC = () => {
  const [currentTranscript, setCurrentTranscript] = useState('');
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


  const handleTranscript = useCallback((textOrEvent: string | { text: string; isFinal: boolean }) => {
    const text = typeof textOrEvent === 'string' ? textOrEvent : textOrEvent.text;
    const isFinal = typeof textOrEvent === 'string' ? true : textOrEvent.isFinal;
    
    if (!isFinal) {
      setCurrentTranscript(text);
    } else {
      setCurrentTranscript('');
      
      if (orderParser) {
        const parsedItems = orderParser.parseUserTranscript(text);
        if (parsedItems.length > 0) {
          processParsedItems(parsedItems);
        }
      }
    }
  }, [orderParser, processParsedItems]);
  
  const handleOrderDetected = useCallback((order: any) => {
    // Order detection is handled through transcript processing
  }, []);

  const handleConfirmOrder = useCallback(() => {
    // TODO: Navigate to checkout or confirmation
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Drive-Thru</h1>
          <p className="text-gray-600">{itemCount} items • ${total.toFixed(2)}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Voice Control */}
          <div className="bg-white border border-gray-200 rounded p-6 text-center">
            <VoiceControlWebRTC
              onTranscript={handleTranscript}
              onOrderDetected={handleOrderDetected}
              debug={false}
            />
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Voice Ordering</h3>
              <p className="text-gray-600">Press and hold to speak your order</p>
              {currentTranscript && (
                <p className="mt-2 text-sm text-gray-500 italic">
                  "{currentTranscript}..."
                </p>
              )}
            </div>
          </div>

          {/* Current Order */}
          <div className="bg-white border border-gray-200 rounded p-6">
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
                          {item.modifications.map(mod => mod.name).join(', ')}
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
                  Confirm Order
                </ActionButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DriveThruPage: React.FC = () => {
  return (
    <VoiceOrderProvider>
      <DriveThruPageContent />
    </VoiceOrderProvider>
  );
};

export default DriveThruPage