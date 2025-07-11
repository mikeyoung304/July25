import React, { useState, useCallback, useEffect } from 'react';
import { Trash2, ShoppingCart } from 'lucide-react';
import { VoiceOrderProvider, useVoiceOrder } from '@/modules/voice/contexts/VoiceOrderContext';
import VoiceControl from '@/modules/voice/components/VoiceControl';
import { OrderParser, ParsedOrderItem } from '@/modules/orders/services/OrderParser';
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ConversationEntry {
  id: string;
  speaker: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

const KioskPageContent: React.FC = () => {
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isFirstPress, setIsFirstPress] = useState(true);
  const { items, addItem, removeItem, updateQuantity, total, itemCount } = useVoiceOrder();
  const { menuItems, loading } = useMenuItems();
  const [orderParser, setOrderParser] = useState<OrderParser | null>(null);

  useEffect(() => {
    if (menuItems.length > 0) {
      setOrderParser(new OrderParser(menuItems));
    }
  }, [menuItems]);

  const handleFirstPress = useCallback(() => {
    setIsFirstPress(false);
    const greeting: ConversationEntry = {
      id: Date.now().toString(),
      speaker: 'ai',
      text: "Welcome to Grow! What can I get started for you today?",
      timestamp: new Date(),
    };
    setConversation([greeting]);
  }, []);

  const processParsedItems = useCallback((parsedItems: ParsedOrderItem[]) => {
    parsedItems.forEach(parsed => {
      if (parsed.menuItem) {
        switch (parsed.action) {
          case 'add':
            addItem(parsed.menuItem, parsed.quantity, parsed.modifications);
            break;
          case 'remove':
            // Find and remove the item
            const itemToRemove = items.find(item => 
              item.menuItem.id === parsed.menuItem?.id
            );
            if (itemToRemove) {
              removeItem(itemToRemove.id);
            }
            break;
          case 'update':
            // Update quantity or modifications
            const itemToUpdate = items.find(item => 
              item.menuItem.id === parsed.menuItem?.id
            );
            if (itemToUpdate) {
              updateQuantity(itemToUpdate.id, parsed.quantity);
            }
            break;
        }
      }
    });
  }, [addItem, removeItem, updateQuantity, items]);

  const processVoiceOrder = useCallback(async (transcript: string) => {
    console.log('Processing voice order:', transcript);
    
    try {
      // Send to AI Gateway
      const response = await fetch('http://localhost:3002/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: transcript,
          context: {
            role: 'restaurant_order_taker',
            menu: menuItems,
            currentOrder: items,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const aiResponse = data.response;
      
      // Add AI response to conversation
      const aiEntry: ConversationEntry = {
        id: Date.now().toString(),
        speaker: 'ai',
        text: aiResponse,
        timestamp: new Date(),
      };
      setConversation(prev => [...prev, aiEntry]);
      
      // Parse AI response for order items
      if (orderParser) {
        const parsedItems = orderParser.parseAIResponse(aiResponse);
        if (processParsedItems) {
          processParsedItems(parsedItems);
        }
      }
    } catch (error) {
      console.error('Error processing voice order:', error);
      
      // Show error to user
      const errorEntry: ConversationEntry = {
        id: Date.now().toString(),
        speaker: 'ai',
        text: "I'm sorry, I'm having trouble processing your order right now. Please try again or ask for assistance.",
        timestamp: new Date(),
      };
      setConversation(prev => [...prev, errorEntry]);
    }
  }, [menuItems, items, orderParser, processParsedItems]);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (!isFinal) {
      setCurrentTranscript(text);
    } else {
      // Add user's message to conversation
      const userEntry: ConversationEntry = {
        id: Date.now().toString(),
        speaker: 'user',
        text,
        timestamp: new Date(),
      };
      setConversation(prev => [...prev, userEntry]);
      setCurrentTranscript('');
      
      // Send to AI for processing
      processVoiceOrder(text);
    }
  }, [processVoiceOrder]);

  const handleRemoveItem = useCallback((itemId: string) => {
    removeItem(itemId);
  }, [removeItem]);

  const handleConfirmOrder = useCallback(() => {
    // TODO: Send order to backend
    console.log('Order confirmed:', items);
  }, [items]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading menu...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Conversation Panel */}
      <Card className="flex-1 m-4 flex flex-col">
        <CardHeader>
          <CardTitle className="text-2xl">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {conversation.map((entry) => (
              <div key={entry.id} className="space-y-1">
                <div className="text-sm text-gray-500">
                  {entry.speaker === 'ai' ? 'AI Assistant' : 'You'}
                </div>
                <div className={`text-base ${entry.speaker === 'ai' ? 'text-blue-600' : 'text-gray-900'}`}>
                  {entry.text}
                </div>
              </div>
            ))}
            {currentTranscript && (
              <div className="space-y-1">
                <div className="text-sm text-gray-500">
                  You (speaking...)
                </div>
                <div className="text-base text-gray-400 italic">
                  {currentTranscript}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-center pt-4">
            <VoiceControl
              onTranscript={handleTranscript}
              isFirstPress={isFirstPress}
              onFirstPress={handleFirstPress}
            />
          </div>
        </CardContent>
      </Card>

      {/* Order Panel */}
      <Card className="flex-1 m-4 flex flex-col">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            Your Order {itemCount > 0 && `(${itemCount} items)`}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-2">
            {items.map((item) => (
              <div key={item.id} className="border-b pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">
                      {item.quantity > 1 && `${item.quantity}x `}
                      {item.menuItem.name}
                    </h3>
                    {item.modifications.length > 0 && (
                      <p className="text-sm text-gray-600">
                        {item.modifications.map(mod => mod.name).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold">
                      ${item.subtotal.toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {items.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No items yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Hold the button below and tell me what you'd like to order!
                </p>
              </div>
            )}
          </div>

          <div className="border-t pt-4 mt-auto">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xl font-semibold">Total:</span>
              <span className="text-2xl font-bold text-primary">
                ${total.toFixed(2)}
              </span>
            </div>
            <Button
              className="w-full"
              size="lg"
              disabled={items.length === 0}
              onClick={handleConfirmOrder}
            >
              CONFIRM ORDER
            </Button>
          </div>
        </CardContent>
      </Card>
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

export default KioskPage;