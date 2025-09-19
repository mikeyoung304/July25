/**
 * Voice Menu Integration Hook
 * Connects MenuContextManager with WebRTC Voice Client
 * Created: September 15, 2025
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRestaurant } from '@/core';
import { useUnifiedCart } from '@/contexts/cart.hooks';
import { menuContextManager } from '../services/MenuContextManager';
import { WebRTCVoiceClient } from '../services/WebRTCVoiceClient';
import { generateSessionConfig } from '../config/fall-menu-agent';

interface VoiceMenuState {
  isReady: boolean;
  isLoading: boolean;
  error: Error | null;
  currentSlot: string | null;
  pendingItem: any | null;
}

type UpdateSessionCapable = {
  updateSession: (payload: Record<string, unknown>) => Promise<unknown>;
};

const hasUpdateSession = (
  client: WebRTCVoiceClient | null,
): client is WebRTCVoiceClient & UpdateSessionCapable => {
  return !!client && typeof (client as { updateSession?: unknown }).updateSession === 'function';
};

export function useVoiceMenuIntegration(voiceClient: WebRTCVoiceClient | null) {
  const { restaurant } = useRestaurant();
  const { addToCart } = useUnifiedCart();
  const [state, setState] = useState<VoiceMenuState>({
    isReady: false,
    isLoading: true,
    error: null,
    currentSlot: null,
    pendingItem: null
  });

  const menuLoadedRef = useRef(false);
  const sessionUpdatedRef = useRef(false);

  /**
   * Load menu data on mount
   */
  useEffect(() => {
    if (!restaurant?.id || menuLoadedRef.current) return;

    const loadMenu = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        await menuContextManager.loadMenu(restaurant.id);
        menuLoadedRef.current = true;

        setState(prev => ({ ...prev, isReady: true, isLoading: false }));
        console.log('[VoiceMenuIntegration] Menu loaded successfully');
      } catch (error) {
        console.error('[VoiceMenuIntegration] Failed to load menu:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error as Error
        }));
      }
    };

    loadMenu();
  }, [restaurant?.id]);

  /**
   * Update voice client session with menu context
   */
  const updateSessionSafe = useCallback(
    async (patch: Record<string, unknown>) => {
      if (hasUpdateSession(voiceClient)) {
        await voiceClient.updateSession(patch);
        return;
      }

      try {
        await fetch('/api/v1/ai/session/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
      } catch {
        // Silently swallow offline retries to keep kiosk resilient
      }
    },
    [voiceClient],
  );

  useEffect(() => {
    if (!state.isReady || sessionUpdatedRef.current) return;

    const updateSession = async () => {
      try {
        const menuContext = menuContextManager.getMenuContext();
        const sessionConfig = generateSessionConfig(menuContext);

        // Update the voice client session with menu data
        await updateSessionSafe({
          instructions: sessionConfig.instructions,
          tools: sessionConfig.tools
        });

        sessionUpdatedRef.current = true;
        console.log('[VoiceMenuIntegration] Voice session updated with menu');
      } catch (error) {
        console.error('[VoiceMenuIntegration] Failed to update session:', error);
      }
    };

    updateSession();
  }, [state.isReady, updateSessionSafe]);

  /**
   * Handle voice transcript processing
   */
  const processTranscript = useCallback((transcript: string) => {
    if (!state.isReady) return null;

    // Check if responding to a slot question
    if (state.currentSlot) {
      const response = menuContextManager.handleSlotResponse(transcript);

      if (response.action === 'confirm') {
        // Slot filled, check for more missing slots
        setState(prev => ({ ...prev, currentSlot: null }));
      }

      return response;
    }

    // Process as new order item
    const result = menuContextManager.processOrderUtterance(transcript);

    if (result.action === 'ask') {
      // Store the missing slot
      setState(prev => ({
        ...prev,
        currentSlot: result.missingSlot?.slot || null,
        pendingItem: result.item
      }));
    } else if (result.action === 'confirm' && result.item) {
      // Add to cart
      const cartItem = transformToCartItem(result.item);
      const { id: _id, ...cartPayload } = cartItem;
      addToCart(cartPayload);

      // Clear pending state
      setState(prev => ({
        ...prev,
        currentSlot: null,
        pendingItem: null
      }));
    }

    return result;
  }, [state.isReady, state.currentSlot, addToCart]);

  /**
   * Transform order item to cart format
   */
  const transformToCartItem = (orderItem: any) => {
    const { menuItem, filledSlots, modifications, quantity } = orderItem;

    return {
      id: menuItem.id,
      menuItemId: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: quantity || 1,
      modifiers: [
        // Add filled slots as modifiers
        ...Object.entries(filledSlots).map(([key, value]) => ({
          name: `${key}: ${value}`,
          price: 0
        })),
        // Add modifications
        ...modifications.map((mod: string) => ({
          name: mod,
          price: 0
        }))
      ]
    };
  };

  /**
   * Handle function calls from voice agent
   */
  const handleFunctionCall = useCallback((functionName: string, args: any) => {
    switch (functionName) {
      case 'add_to_order':
        // Transform and add to cart
        const cartItem = {
          id: args.item_id,
          menuItemId: args.item_id,
          name: args.item_name,
          price: args.price,
          quantity: args.quantity,
          modifiers: args.modifications?.map((mod: string) => ({
            name: mod,
            price: 0
          })) || []
        };
        const { id: _id, ...cartPayload } = cartItem;
        addToCart(cartPayload);
        return { success: true };

      case 'get_order_total':
        const summary = menuContextManager.getOrderSummary();
        return { summary };

      case 'clear_order':
        menuContextManager.clearOrder();
        return { success: true };

      default:
        return { error: 'Unknown function' };
    }
  }, [addToCart]);

  /**
   * Get current menu context
   */
  const getMenuContext = useCallback(() => {
    if (!state.isReady) return null;
    return menuContextManager.getMenuContext();
  }, [state.isReady]);

  /**
   * Reset integration state
   */
  const reset = useCallback(() => {
    menuContextManager.clearOrder();
    setState({
      isReady: menuLoadedRef.current,
      isLoading: false,
      error: null,
      currentSlot: null,
      pendingItem: null
    });
  }, []);

  return {
    ...state,
    processTranscript,
    handleFunctionCall,
    getMenuContext,
    reset
  };
}
