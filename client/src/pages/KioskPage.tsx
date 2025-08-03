import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Trash2, ShoppingCart, Volume2, VolumeX, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { VoiceOrderProvider } from '@/modules/voice/contexts/VoiceOrderContext';
import { useVoiceOrder } from '@/modules/voice/hooks/useVoiceOrder';
import VoiceControlWithAudio from '@/modules/voice/components/VoiceControlWithAudio';
import { OrderParser, ParsedOrderItem } from '@/modules/orders/services/OrderParser';
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageTitle, SectionTitle, Body, BodySmall, Price } from '@/components/ui/Typography';
import { spacing } from '@/lib/typography';
import { getAudioPlaybackService } from '@/services/audio/AudioPlaybackService';

interface ConversationEntry {
  id: string;
  speaker: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

const KioskPageContent: React.FC = () => {
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const conversationIdCounter = useRef(0);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isFirstPress, setIsFirstPress] = useState(true);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.8);
  const { items, addItem, removeItem, updateQuantity, total, itemCount } = useVoiceOrder();
  const { items: menuItems, loading } = useMenuItems();
  const [orderParser, setOrderParser] = useState<OrderParser | null>(null);
  const audioService = getAudioPlaybackService();

  useEffect(() => {
    if (menuItems.length > 0) {
      setOrderParser(new OrderParser(menuItems));
    }
  }, [menuItems]);

  // Subscribe to audio service state changes
  useEffect(() => {
    const unsubscribe = audioService.subscribe((state) => {
      setIsAudioPlaying(state.isPlaying);
    });
    
    // Set initial volume
    audioService.setVolume(audioVolume);
    
    return unsubscribe;
  }, [audioService, audioVolume]);

  const handleFirstPress = useCallback(() => {
    setIsFirstPress(false);
    const greeting: ConversationEntry = {
      id: `ai-${++conversationIdCounter.current}`,
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
            // Find and remove the item
            const itemToRemove = items.find(item => 
              item.menuItem.id === parsed.menuItem?.id
            );
            if (itemToRemove) {
              removeItem(itemToRemove.id);
            }
            break;
          }
          case 'update': {
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
      }
    });
  }, [addItem, removeItem, updateQuantity, items]);

  // Handle transcript from voice (for display only - audio processing is handled by VoiceControlWithAudio)
  const handleVoiceTranscript = useCallback((transcript: string, isFinal: boolean) => {
    console.log('Voice transcript received:', transcript, 'final:', isFinal);
    
    if (isFinal) {
      // Add user's message to conversation
      const userEntry: ConversationEntry = {
        id: `user-${++conversationIdCounter.current}`,
        speaker: 'user',
        text: transcript,
        timestamp: new Date(),
      };
      setConversation(prev => [...prev, userEntry]);
      setCurrentTranscript('');
    } else {
      // Show interim transcript
      setCurrentTranscript(transcript);
    }
  }, []);

  // Handle when AI audio starts playing
  const handleAudioStart = useCallback(() => {
    console.log('AI audio playback started');
    // Note: We don't have the AI response text here since audio comes directly from backend
    // The conversation will show a placeholder while audio plays
    const aiEntry: ConversationEntry = {
      id: `ai-${++conversationIdCounter.current}`,
      speaker: 'ai',
      text: '🔊 Playing audio response...',
      timestamp: new Date(),
    };
    setConversation(prev => [...prev, aiEntry]);
  }, []);

  // Handle when AI audio finishes
  const handleAudioEnd = useCallback(() => {
    console.log('AI audio playback ended');
    // Update the last AI message to indicate completion
    setConversation(prev => {
      const updated = [...prev];
      const lastEntry = updated[updated.length - 1];
      if (lastEntry && lastEntry.speaker === 'ai' && lastEntry.text.includes('🔊')) {
        lastEntry.text = '✅ Audio response completed';
      }
      return updated;
    });
  }, []);

  // Volume control handlers
  const handleVolumeChange = useCallback((newVolume: number) => {
    setAudioVolume(newVolume);
    audioService.setVolume(newVolume);
  }, [audioService]);

  const toggleMute = useCallback(() => {
    if (audioVolume > 0) {
      handleVolumeChange(0);
    } else {
      handleVolumeChange(0.8);
    }
  }, [audioVolume, handleVolumeChange]);

  const handleRemoveItem = useCallback((itemId: string) => {
    removeItem(itemId);
  }, [removeItem]);

  const handleConfirmOrder = useCallback(() => {
    // TODO: Send order to backend
    console.warn('Order confirmed:', items);
  }, [items]);

  if (loading) {
    return (
      <div className="min-h-screen bg-macon-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <SectionTitle>Loading menu...</SectionTitle>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-macon-background">
      <div className="relative overflow-hidden py-4">
        <div className="max-w-6xl mx-auto px-4">
          {/* Minimal Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center mb-6"
          >
            <SectionTitle className="text-neutral-800 mb-1">Welcome to Grow</SectionTitle>
            <BodySmall className="text-neutral-500">
              Hold the button and speak your order
            </BodySmall>
          </motion.div>

          {/* Voice Interface - Centered */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-center mb-8"
          >
            <VoiceControlWithAudio
              onTranscript={handleVoiceTranscript}
              onAudioStart={handleAudioStart}
              onAudioEnd={handleAudioEnd}
              isFirstPress={isFirstPress}
              onFirstPress={handleFirstPress}
            />
          </motion.div>

          {/* Conversation & Order - Side by Side */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Conversation Panel - Simplified */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <Card className="p-4 h-[400px] flex flex-col">
                {/* Minimal Header with Volume Control */}
                <div className="flex items-center justify-between mb-4">
                  <Body className="font-medium text-neutral-700">Conversation</Body>
                  
                  {/* Volume control - simplified */}
                  <div className="flex items-center gap-2">
                    {isAudioPlaying && (
                      <div className="flex items-center gap-1 text-secondary text-sm">
                        <Volume2 className="w-4 h-4 animate-pulse" />
                        <span>Speaking</span>
                      </div>
                    )}
                    <button
                      onClick={toggleMute}
                      className="p-1.5 hover:bg-neutral-100 rounded-md transition-colors"
                      title={audioVolume > 0 ? 'Mute' : 'Unmute'}
                    >
                      {audioVolume > 0 ? (
                        <Volume2 className="w-4 h-4 text-neutral-600" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-neutral-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Conversation Messages - Compact */}
                <div className="flex-1 overflow-y-auto space-y-3">
                  {conversation.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-3 rounded-lg text-sm ${
                        entry.speaker === 'ai' 
                          ? 'bg-secondary/8 text-secondary-dark' 
                          : 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      <div className={`text-xs mb-1 ${
                        entry.speaker === 'ai' ? 'text-secondary' : 'text-neutral-500'
                      }`}>
                        {entry.speaker === 'ai' ? 'Assistant' : 'You'}
                      </div>
                      <div>{entry.text}</div>
                    </motion.div>
                  ))}
                  {currentTranscript && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3 rounded-lg bg-neutral-100 border-l-2 border-accent text-sm"
                    >
                      <div className="text-xs text-accent mb-1">You (speaking...)</div>
                      <div className="text-neutral-600 italic">{currentTranscript}</div>
                    </motion.div>
                  )}
                  
                  {/* Initial Empty State */}
                  {conversation.length === 0 && !currentTranscript && (
                    <div className="flex-1 flex items-center justify-center text-center">
                      <div>
                        <MessageCircle className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                        <BodySmall className="text-neutral-400">
                          Your conversation will appear here
                        </BodySmall>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Order Panel - Streamlined */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <Card className="p-4 h-[400px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <Body className="font-medium text-neutral-700">
                    Your Order {itemCount > 0 && `(${itemCount})`}
                  </Body>
                </div>

                {/* Order Items */}
                <div className="flex-1 overflow-y-auto space-y-2">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <Body className="font-medium text-neutral-800 text-sm">
                          {item.quantity > 1 && `${item.quantity}x `}
                          {item.menuItem.name}
                        </Body>
                        {item.modifications.length > 0 && (
                          <BodySmall className="text-neutral-500 text-xs">
                            {item.modifications.map(mod => mod.name).join(', ')}
                          </BodySmall>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Price className="text-sm font-semibold">
                          ${item.subtotal.toFixed(2)}
                        </Price>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveItem(item.id)}
                          className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Empty State */}
                  {items.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-center">
                      <div>
                        <ShoppingCart className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                        <BodySmall className="text-neutral-400">
                          No items yet
                        </BodySmall>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total & Checkout */}
                <div className="border-t border-neutral-200 pt-4 mt-4">
                  <div className="flex justify-between items-center mb-3">
                    <Body className="font-semibold text-neutral-700">Total</Body>
                    <Price className="text-xl font-bold">
                      ${total.toFixed(2)}
                    </Price>
                  </div>
                  <Button
                    className="w-full"
                    disabled={items.length === 0}
                    onClick={handleConfirmOrder}
                  >
                    CONFIRM ORDER
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
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

export default KioskPage;