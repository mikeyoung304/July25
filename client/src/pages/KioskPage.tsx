import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Trash2, ShoppingCart, Volume2, VolumeX, MessageCircle, Mic, Package, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { VoiceOrderProvider } from '@/modules/voice/contexts/VoiceOrderContext';
import { useVoiceOrder } from '@/modules/voice/hooks/useVoiceOrder';
import VoiceControlWithAudio from '@/modules/voice/components/VoiceControlWithAudio';
import { OrderParser, ParsedOrderItem } from '@/modules/orders/services/OrderParser';
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageTitle, SectionTitle, Body, BodySmall, Price } from '@/components/ui/Typography';
import { PageLayout, PageContent, GridLayout } from '@/components/ui/PageLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { NavigationCard, ActionCard } from '@/components/ui/NavigationCard';
import { ActionButton } from '@/components/ui/ActionButton';
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
  const [activeView, setActiveView] = useState<'order' | 'conversation' | 'cart'>('order');
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
    setActiveView('conversation');
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
      
      // Parse the order and add items
      if (orderParser) {
        const parsed = orderParser.parseUserTranscript(transcript);
        if (parsed.length > 0) {
          processParsedItems(parsed);
        }
      }
    } else {
      // Update current transcript for live display
      setCurrentTranscript(transcript);
    }
  }, [orderParser, processParsedItems]);

  const handleAudioStart = useCallback((text: string) => {
    // Add AI response to conversation
    const aiEntry: ConversationEntry = {
      id: `ai-${++conversationIdCounter.current}`,
      speaker: 'ai',
      text: text,
      timestamp: new Date(),
    };
    setConversation(prev => [...prev, aiEntry]);
  }, []);

  const handleAudioEnd = useCallback(() => {
    // Audio playback completed
    console.log('Audio playback ended');
  }, []);

  const handleVolumeChange = useCallback((volume: number) => {
    setAudioVolume(volume);
    audioService.setVolume(volume);
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
      <PageLayout centered>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <SectionTitle>Loading menu...</SectionTitle>
        </motion.div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader 
        title="Self-Service Kiosk"
        subtitle="Order with voice or touch"
        showBack={true}
        backPath="/"
        actions={
          <div className="flex items-center gap-2">
            {isAudioPlaying && (
              <div className="flex items-center gap-1 text-secondary text-sm">
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span>Speaking</span>
              </div>
            )}
            <ActionButton
              size="small"
              variant="ghost"
              onClick={toggleMute}
              icon={audioVolume > 0 ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            >
              {audioVolume > 0 ? 'Mute' : 'Unmute'}
            </ActionButton>
          </div>
        }
      />

      <PageContent maxWidth="6xl">
        {/* Main Action Cards */}
        <div className={spacing.page.section}>
          <GridLayout columns={3} gap="large">
            <ActionCard
              title="Start Voice Order"
              description="Speak to order"
              icon={<Mic className="h-12 w-12" />}
              color="#4ECDC4"
              onClick={() => setActiveView('conversation')}
              disabled={false}
            />
            
            <ActionCard
              title="View Cart"
              description={`${itemCount} items`}
              icon={<ShoppingCart className="h-12 w-12" />}
              color="#FF6B35"
              onClick={() => setActiveView('cart')}
              disabled={itemCount === 0}
            />
            
            <ActionCard
              title="Checkout"
              description={`Total: $${total.toFixed(2)}`}
              icon={<CreditCard className="h-12 w-12" />}
              color="#7B68EE"
              onClick={handleConfirmOrder}
              disabled={itemCount === 0}
            />
          </GridLayout>
        </div>

        {/* Dynamic Content Area */}
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={spacing.page.section}
        >
          {activeView === 'order' && (
            <Card className="p-12 text-center">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <VoiceControlWithAudio
                  onTranscript={handleVoiceTranscript}
                  onAudioStart={handleAudioStart}
                  onAudioEnd={handleAudioEnd}
                  isFirstPress={isFirstPress}
                  onFirstPress={handleFirstPress}
                />
                <div className="mt-8">
                  <SectionTitle className="text-neutral-700 mb-2">Tap and Hold to Order</SectionTitle>
                  <Body className="text-neutral-500">
                    Press the microphone button and speak your order
                  </Body>
                </div>
              </motion.div>
            </Card>
          )}

          {activeView === 'conversation' && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Voice Control Card */}
              <Card className="p-8 flex flex-col items-center justify-center">
                <VoiceControlWithAudio
                  onTranscript={handleVoiceTranscript}
                  onAudioStart={handleAudioStart}
                  onAudioEnd={handleAudioEnd}
                  isFirstPress={isFirstPress}
                  onFirstPress={handleFirstPress}
                />
                <SectionTitle className="text-neutral-700 mt-6">Continue Speaking</SectionTitle>
                <Body className="text-neutral-500 text-center mt-2">
                  Add more items or say "that's all"
                </Body>
              </Card>

              {/* Conversation History Card */}
              <Card className="p-6 h-[500px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <SectionTitle as="h3">Conversation</SectionTitle>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3">
                  {conversation.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-xl ${
                        entry.speaker === 'ai' 
                          ? 'bg-secondary/10 text-secondary-dark' 
                          : 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      <div className={`text-xs font-semibold mb-1 ${
                        entry.speaker === 'ai' ? 'text-secondary' : 'text-neutral-500'
                      }`}>
                        {entry.speaker === 'ai' ? 'Assistant' : 'You'}
                      </div>
                      <div className="text-sm">{entry.text}</div>
                    </motion.div>
                  ))}
                  {currentTranscript && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 rounded-xl bg-accent/10 border-2 border-accent"
                    >
                      <div className="text-xs font-semibold text-accent mb-1">You (speaking...)</div>
                      <div className="text-sm text-neutral-600 italic">{currentTranscript}</div>
                    </motion.div>
                  )}
                  
                  {conversation.length === 0 && !currentTranscript && (
                    <div className="flex-1 flex items-center justify-center text-center">
                      <div>
                        <MessageCircle className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                        <Body className="text-neutral-400">
                          Your conversation will appear here
                        </Body>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeView === 'cart' && (
            <Card className="p-8">
              <div className="flex items-center justify-between mb-6">
                <SectionTitle as="h2">Your Order</SectionTitle>
                <Badge className="bg-primary text-white px-4 py-2">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </Badge>
              </div>

              <div className="space-y-4 mb-8">
                {items.length > 0 ? (
                  items.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold text-neutral-700">
                            {item.quantity}x
                          </span>
                          <div>
                            <Body className="font-medium">{item.menuItem.name}</Body>
                            {item.modifications && item.modifications.length > 0 && (
                              <BodySmall className="text-neutral-500">
                                {item.modifications.join(', ')}
                              </BodySmall>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Price>${(item.menuItem.price * item.quantity).toFixed(2)}</Price>
                        <ActionButton
                          size="small"
                          variant="ghost"
                          color="#EF4444"
                          onClick={() => handleRemoveItem(item.id)}
                          icon={<Trash2 className="w-4 h-4" />}
                        />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                    <Body className="text-neutral-400">Your cart is empty</Body>
                    <Body className="text-neutral-400 mt-2">Add items by speaking your order</Body>
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div className="border-t pt-6">
                  <div className="flex justify-between items-center mb-6">
                    <SectionTitle as="h3">Total</SectionTitle>
                    <Price className="text-2xl font-bold text-primary">
                      ${total.toFixed(2)}
                    </Price>
                  </div>
                  
                  <GridLayout columns={2} gap="medium">
                    <ActionButton
                      size="large"
                      variant="outline"
                      color="#2A4B5C"
                      onClick={() => setActiveView('conversation')}
                      icon={<Mic className="h-6 w-6" />}
                      fullWidth
                    >
                      Add More Items
                    </ActionButton>
                    <ActionButton
                      size="large"
                      color="#4CAF50"
                      onClick={handleConfirmOrder}
                      icon={<CreditCard className="h-6 w-6" />}
                      fullWidth
                    >
                      Checkout
                    </ActionButton>
                  </GridLayout>
                </div>
              )}
            </Card>
          )}
        </motion.div>

        {/* Quick Action Footer */}
        <div className={spacing.page.section}>
          <GridLayout columns={4} gap="medium">
            <ActionCard
              title="Popular Items"
              icon={<Package className="h-8 w-8" />}
              color="#88B0A4"
              compact
              onClick={() => console.log('Show popular items')}
            />
            <ActionCard
              title="Dietary Options"
              icon={<Package className="h-8 w-8" />}
              color="#F4A460"
              compact
              onClick={() => console.log('Show dietary options')}
            />
            <ActionCard
              title="Combos"
              icon={<Package className="h-8 w-8" />}
              color="#9333EA"
              compact
              onClick={() => console.log('Show combos')}
            />
            <ActionCard
              title="Help"
              icon={<MessageCircle className="h-8 w-8" />}
              color="#64748B"
              compact
              onClick={() => console.log('Show help')}
            />
          </GridLayout>
        </div>
      </PageContent>
    </PageLayout>
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