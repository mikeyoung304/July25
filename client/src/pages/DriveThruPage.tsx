import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ShoppingCart, Headphones, User } from 'lucide-react';
import { VoiceOrderProvider } from '@/modules/voice/contexts/VoiceOrderContext';
import { useVoiceOrder } from '@/modules/voice/hooks/useVoiceOrder';
import VoiceControl from '@/modules/voice/components/VoiceControl';
import { OrderParser, ParsedOrderItem } from '@/modules/orders/services/OrderParser';
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems';
import { Button } from '@/components/ui/button';

interface ConversationEntry {
  id: string;
  speaker: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

const DriveThruPageContent: React.FC = () => {
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isFirstPress, setIsFirstPress] = useState(true);
  const { items, addItem, removeItem, updateQuantity, total, itemCount } = useVoiceOrder();
  const { items: menuItems, loading } = useMenuItems();
  const [orderParser, setOrderParser] = useState<OrderParser | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (menuItems.length > 0) {
      setOrderParser(new OrderParser(menuItems));
    }
  }, [menuItems]);

  useEffect(() => {
    // Auto-scroll to bottom of conversation
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, currentTranscript]);

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
          case 'remove': {
            const itemToRemove = items.find(item => 
              item.menuItem.id === parsed.menuItem?.id
            );
            if (itemToRemove) {
              removeItem(itemToRemove.id);
            }
            break;
          }
          case 'update': {
            const itemToUpdate = items.find(item => 
              item.menuItem.id === parsed.menuItem?.id
            );
            if (itemToUpdate) {
              updateQuantity(itemToUpdate.id, parsed.quantity);
            }
            break;
          }
        }
      }
    });
  }, [addItem, removeItem, updateQuantity, items]);

  const processVoiceOrder = useCallback(async (transcript: string) => {
    console.warn('Processing drive-thru order:', transcript);
    
    try {
      const response = await fetch('http://localhost:3001/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: transcript,
          context: {
            role: 'drive_thru_order_taker',
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
      
      const aiEntry: ConversationEntry = {
        id: Date.now().toString(),
        speaker: 'ai',
        text: aiResponse,
        timestamp: new Date(),
      };
      setConversation(prev => [...prev, aiEntry]);
      
      if (orderParser) {
        const parsedItems = orderParser.parseAIResponse(aiResponse);
        processParsedItems(parsedItems);
      }
    } catch (error) {
      console.error('Error processing drive-thru order:', error);
      
      // Show error to user
      const errorEntry: ConversationEntry = {
        id: Date.now().toString(),
        speaker: 'ai',
        text: "I apologize, but I'm having trouble with your order. Please drive to the window for assistance.",
        timestamp: new Date(),
      };
      setConversation(prev => [...prev, errorEntry]);
    }
  }, [menuItems, items, orderParser, processParsedItems]);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (!isFinal) {
      setCurrentTranscript(text);
    } else {
      const userEntry: ConversationEntry = {
        id: Date.now().toString(),
        speaker: 'user',
        text,
        timestamp: new Date(),
      };
      setConversation(prev => [...prev, userEntry]);
      setCurrentTranscript('');
      
      processVoiceOrder(text);
    }
  }, [processVoiceOrder]);

  const handleConfirmOrder = useCallback(() => {
    console.warn('Order confirmed:', items);
    // Add confirmation message
    const confirmEntry: ConversationEntry = {
      id: Date.now().toString(),
      speaker: 'ai',
      text: `Perfect! Your total is $${total.toFixed(2)}. Please drive to the next window.`,
      timestamp: new Date(),
    };
    setConversation(prev => [...prev, confirmEntry]);
  }, [items, total]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-2xl">Loading menu...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-neutral-900 text-white p-6">
      <div className="max-w-6xl mx-auto h-full flex flex-col">
        <h1 className="text-4xl font-bold text-center mb-8 text-primary-50">DRIVE-THRU ORDER</h1>

        {/* Conversation Section */}
        <div className="flex-1 bg-neutral-800 rounded-xl p-6 mb-6 overflow-hidden shadow-elevation-2">
          <div className="h-full overflow-y-auto space-y-4">
            {conversation.map((entry) => (
              <div key={entry.id} className="mb-4 flex items-start gap-3">
                {entry.speaker === 'ai' ? (
                  <Headphones className="w-6 h-6 text-info-400 flex-shrink-0 mt-1" />
                ) : (
                  <User className="w-6 h-6 text-white flex-shrink-0 mt-1" />
                )}
                <p className={`${entry.speaker === 'ai' ? 'text-info-400' : 'text-white'} font-semibold text-lg`}>
                  {entry.text}
                </p>
              </div>
            ))}
            {currentTranscript && (
              <div className="mb-4 flex items-start gap-3">
                <User className="w-6 h-6 text-neutral-400 flex-shrink-0 mt-1" />
                <p className="text-neutral-400 italic text-lg">
                  {currentTranscript}...
                </p>
              </div>
            )}
            <div ref={conversationEndRef} />
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-center mb-4">
            <ShoppingCart className="w-10 h-10 mr-3" />
            <h2 className="text-3xl font-bold">YOUR ORDER ({itemCount} items)</h2>
          </div>
          
          <div className="max-h-32 overflow-y-auto mb-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-1">
                <span className="text-xl">
                  {item.quantity > 1 && `${item.quantity}x `}
                  {item.menuItem.name}
                  {item.modifications.length > 0 && (
                    <span className="text-gray-400 text-lg">
                      {' - ' + item.modifications.map(mod => mod.name).join(', ')}
                    </span>
                  )}
                </span>
                <span className="text-xl">${item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <p className="text-5xl font-bold text-yellow-400">
              TOTAL: ${total.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-6">
          <div className="transform scale-150">
            <VoiceControl
              onTranscript={handleTranscript}
              isFirstPress={isFirstPress}
              onFirstPress={handleFirstPress}
            />
          </div>
          
          <Button
            size="lg"
            disabled={items.length === 0}
            onClick={handleConfirmOrder}
            className="text-2xl px-12 py-8 bg-green-600 hover:bg-green-700 disabled:bg-gray-600"
          >
            CONFIRM & PAY AT WINDOW
          </Button>
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

export default DriveThruPage;