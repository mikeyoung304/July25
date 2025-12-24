/**
 * useVoiceCommerce Hook
 *
 * PHASE 3: Standardization - Extracts shared voice commerce logic from:
 * - VoiceOrderingMode.tsx (kiosk mode)
 * - VoiceOrderModal.tsx (server mode)
 *
 * Responsibilities:
 * - Voice control state management (connection, session, recording)
 * - Transcript handling and display
 * - Order data processing with fuzzy menu matching
 * - Recently added items feedback
 * - Processing state indicators
 * - WebRTC props generation
 *
 * Version: 1.0.0
 * Created: 2025-01-23 (Phase 3: Standardization)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/services/logger';
import type { VoiceMenuConfiguration } from '@rebuild/shared';
import { VoiceConfigService, voiceConfigService } from '@/services/voice/VoiceConfigService';

/**
 * Minimal menu item interface for voice commerce
 * Supports both snake_case (DB) and camelCase (API) menu item types
 */
export interface VoiceMenuItem {
  id: string;
  name: string;
  price: number;
  aliases?: string[];
}

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Menu item matching variations for fuzzy matching
 * Helps voice transcription match to actual menu items
 */
export interface MenuVariations {
  [menuItemName: string]: string[];
}

/**
 * Default menu variations dictionary
 * Can be overridden via options
 */
export const DEFAULT_MENU_VARIATIONS: MenuVariations = {
  'soul bowl': ['soul', 'bowl', 'sobo', 'solo bowl', 'soul ball'],
  'greek salad': ['greek', 'greek salad', 'geek salad'],
  'peach arugula': ['peach', 'arugula', 'peach salad', 'arugula salad'],
  'jalapeño pimento': ['jalapeno', 'pimento', 'cheese bites', 'jalapeño'],
  'succotash': ['succotash', 'suck a toss', 'sock a tash'],
};

/**
 * Voice commerce context
 */
export type VoiceCommerceContext = 'kiosk' | 'server';

/**
 * Connection state for WebRTC voice
 */
export type VoiceConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Parsed order item from voice input
 */
export interface ParsedOrderItem {
  name: string;
  quantity?: number;
  modifications?: string[];
  modifiers?: string[];
  specialInstructions?: string;
}

/**
 * Order confirmation action from voice
 */
export interface OrderConfirmationData {
  action: 'checkout' | 'review' | 'cancel' | 'submit';
}

/**
 * Legacy order format support
 */
export interface LegacyOrderData {
  success: boolean;
  items: Array<{
    menuItemId: string;
    quantity: number;
    modifiers?: string[];
  }>;
}

/**
 * Voice order data (union of all formats)
 */
export type VoiceOrderData =
  | { items: ParsedOrderItem[] }
  | OrderConfirmationData
  | LegacyOrderData;

/**
 * Transcript event
 */
export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
  confidence?: number;
  timestamp?: number;
}

/**
 * Hook configuration options
 */
export interface UseVoiceCommerceOptions {
  /**
   * Menu items for fuzzy matching
   * Accepts any menu item type with id, name, price properties
   */
  menuItems: VoiceMenuItem[];

  /**
   * Callback when item should be added to cart
   */
  onAddItem: (
    menuItem: VoiceMenuItem,
    quantity: number,
    modifications: string[],
    specialInstructions?: string
  ) => void;

  /**
   * Optional: Callback when checkout requested via voice
   */
  onCheckout?: () => void;

  /**
   * Context: kiosk or server mode
   * @default 'kiosk'
   */
  context?: VoiceCommerceContext;

  /**
   * Enable checkout guard to block orders during checkout
   * @default false
   */
  checkoutGuard?: boolean;

  /**
   * Custom menu variations for fuzzy matching
   * Merges with default variations (unless useDynamicConfig is true)
   */
  menuVariations?: MenuVariations;

  /**
   * Fetch menu configuration dynamically from API
   * When true, fetches aliases from database instead of using hardcoded defaults
   * @default false
   */
  useDynamicConfig?: boolean;

  /**
   * Restaurant ID for fetching dynamic configuration
   * If not provided, uses default from environment
   */
  restaurantId?: string;

  /**
   * Duration (ms) to show "recently added" feedback
   * @default 5000
   */
  recentlyAddedDuration?: number;

  /**
   * Toast notification service
   */
  toast?: {
    error: (message: string) => void;
  };

  /**
   * Debug mode for verbose logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Hook return value
 */
export interface UseVoiceCommerceReturn {
  // Connection state
  voiceConnectionState: VoiceConnectionState;
  isSessionReady: boolean;
  isListening: boolean;

  // Transcript
  currentTranscript: string;

  // Processing
  isProcessing: boolean;

  // Feedback
  recentlyAdded: string[];
  voiceFeedback: string;

  // Handlers
  handleVoiceTranscript: (event: string | TranscriptEvent) => void;
  handleOrderData: (orderData: VoiceOrderData) => void;

  // WebRTC props (spread onto VoiceControlWebRTC component)
  voiceControlProps: {
    onTranscript: (event: string | TranscriptEvent) => void;
    onOrderDetected: (orderData: VoiceOrderData) => void;
    onRecordingStateChange: (isListening: boolean) => void;
    onConnectionStateChange: (state: VoiceConnectionState) => void;
    onSessionReadyChange: (ready: boolean) => void;
  };

  // Checkout state (if checkoutGuard enabled)
  isCheckingOut: boolean;
  setIsCheckingOut: (value: boolean) => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * useVoiceCommerce
 *
 * Manages voice commerce interactions including:
 * - WebRTC connection state
 * - Voice transcripts
 * - Order data processing with fuzzy matching
 * - Visual feedback (recently added items, voice feedback)
 */
export function useVoiceCommerce(options: UseVoiceCommerceOptions): UseVoiceCommerceReturn {
  const {
    menuItems,
    onAddItem,
    onCheckout,
    context = 'kiosk',
    checkoutGuard = false,
    menuVariations = {},
    useDynamicConfig = false,
    restaurantId,
    recentlyAddedDuration = 5000,
    toast,
    debug = false,
  } = options;

  // ============================================================================
  // STATE
  // ============================================================================

  // Connection state
  const [voiceConnectionState, setVoiceConnectionState] = useState<VoiceConnectionState>('disconnected');
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Transcript
  const [currentTranscript, setCurrentTranscript] = useState('');

  // Processing
  const [isProcessing, setIsProcessing] = useState(false);

  // Feedback
  const [recentlyAdded, setRecentlyAdded] = useState<string[]>([]);

  // Dynamic configuration
  const [voiceConfig, setVoiceConfig] = useState<VoiceMenuConfiguration | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<Error | null>(null);

  // ============================================================================
  // DYNAMIC CONFIGURATION LOADING
  // ============================================================================

  /**
   * Fetch voice configuration from API (Phase 4: Cleanup)
   */
  useEffect(() => {
    if (!useDynamicConfig) return;

    const loadConfiguration = async () => {
      setConfigLoading(true);
      setConfigError(null);

      try {
        const service = restaurantId
          ? new VoiceConfigService(restaurantId)
          : voiceConfigService;

        const config = await service.getMenuConfiguration();
        setVoiceConfig(config);

        if (debug) {
          logger.info('[useVoiceCommerce] Dynamic configuration loaded', {
            itemCount: config.menu_items.length,
            ruleCount: config.modifier_rules.length,
            taxRate: config.tax_rate,
          });
        }
      } catch (error) {
        const err = error as Error;
        setConfigError(err);
        logger.error('[useVoiceCommerce] Failed to load dynamic configuration', { error: err });

        if (toast) {
          toast.error('Failed to load voice configuration. Using defaults.');
        }
      } finally {
        setConfigLoading(false);
      }
    };

    loadConfiguration();
  }, [useDynamicConfig, restaurantId, debug, toast]);

  // Build menu variations from dynamic config or use defaults
  const allVariations: MenuVariations = useDynamicConfig && voiceConfig
    ? voiceConfig.menu_items.reduce((acc, item) => {
        if (item.aliases && item.aliases.length > 0) {
          acc[item.name.toLowerCase()] = item.aliases;
        }
        return acc;
      }, {} as MenuVariations)
    : { ...DEFAULT_MENU_VARIATIONS, ...menuVariations };

  const [voiceFeedback, setVoiceFeedback] = useState('');

  // Checkout guard
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Refs for timeout cleanup
  const recentlyAddedTimeouts = useRef<NodeJS.Timeout[]>([]);
  const voiceFeedbackTimeout = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // FUZZY MENU MATCHING
  // ============================================================================

  /**
   * Find menu item by name with fuzzy matching
   * Supports:
   * - Exact match
   * - Contains match (bidirectional)
   * - Common variations dictionary
   */
  const findMenuItemByName = useCallback(
    (voiceName: string): VoiceMenuItem | null => {
      if (!voiceName) return null;

      const lowerVoiceName = voiceName.toLowerCase().trim();

      // 1. Exact match
      let match = menuItems.find((item) => item.name.toLowerCase() === lowerVoiceName);
      if (match) {
        if (debug) {
          logger.info('[useVoiceCommerce] Exact match:', { voiceName, menuItem: match.name });
        }
        return match;
      }

      // 2. Contains match (bidirectional)
      match = menuItems.find(
        (item) =>
          item.name.toLowerCase().includes(lowerVoiceName) ||
          lowerVoiceName.includes(item.name.toLowerCase())
      );
      if (match) {
        if (debug) {
          logger.info('[useVoiceCommerce] Contains match:', { voiceName, menuItem: match.name });
        }
        return match;
      }

      // 3. Variations dictionary match
      for (const [menuItemName, variations] of Object.entries(allVariations)) {
        const menuItem = menuItems.find((item) => item.name.toLowerCase() === menuItemName.toLowerCase());

        if (
          menuItem &&
          variations.some((variation) => lowerVoiceName.includes(variation.toLowerCase()))
        ) {
          if (debug) {
            logger.info('[useVoiceCommerce] Variation match:', {
              voiceName,
              menuItem: menuItem.name,
              matchedVariation: variations.find((v) => lowerVoiceName.includes(v.toLowerCase())),
            });
          }
          return menuItem;
        }
      }

      if (debug) {
        logger.warn('[useVoiceCommerce] No match found for:', voiceName);
      }
      return null;
    },
    [menuItems, allVariations, debug]
  );

  // ============================================================================
  // RECENTLY ADDED FEEDBACK
  // ============================================================================

  /**
   * Add item to "recently added" feedback list with auto-clear
   */
  const addToRecentlyAdded = useCallback(
    (itemName: string) => {
      setRecentlyAdded((prev) => [...prev, itemName]);

      // Auto-clear after duration
      const timeout = setTimeout(() => {
        setRecentlyAdded((prev) => prev.filter((name) => name !== itemName));
      }, recentlyAddedDuration);

      recentlyAddedTimeouts.current.push(timeout);
    },
    [recentlyAddedDuration]
  );

  /**
   * Set voice feedback with auto-clear
   */
  const setVoiceFeedbackWithTimeout = useCallback((message: string, duration: number = 5000) => {
    setVoiceFeedback(message);

    // Clear existing timeout
    if (voiceFeedbackTimeout.current) {
      clearTimeout(voiceFeedbackTimeout.current);
    }

    // Auto-clear after duration
    voiceFeedbackTimeout.current = setTimeout(() => {
      setVoiceFeedback('');
    }, duration);
  }, []);

  // ============================================================================
  // TRANSCRIPT HANDLER
  // ============================================================================

  const handleVoiceTranscript = useCallback(
    (textOrEvent: string | TranscriptEvent) => {
      const text = typeof textOrEvent === 'string' ? textOrEvent : textOrEvent.text;

      setCurrentTranscript(text);

      if (debug) {
        logger.info('[useVoiceCommerce] Transcript:', text);
      }
    },
    [debug]
  );

  // ============================================================================
  // ORDER DATA HANDLER
  // ============================================================================

  const handleOrderData = useCallback(
    (orderData: VoiceOrderData) => {
      if (debug) {
        logger.info('[useVoiceCommerce] Order data received:', orderData);
      }

      // Checkout guard: block voice orders during checkout
      if (checkoutGuard && isCheckingOut) {
        logger.warn('[useVoiceCommerce] Blocked order - checkout in progress');
        toast?.error('Please complete checkout first');
        return;
      }

      setIsProcessing(true);

      try {
        // ====================================================================
        // Format 1: Function call format { items: [...] }
        // ====================================================================
        if ('items' in orderData && Array.isArray(orderData.items)) {
          const { items } = orderData;

          if (debug) {
            logger.info('[useVoiceCommerce] Processing function call format:', items);
          }

          let addedCount = 0;
          const unmatchedItems: string[] = [];

          for (const item of items) {
            // Type guard: ParsedOrderItem has 'name', LegacyOrderData items have 'menuItemId'
            const itemName = 'name' in item ? item.name : undefined;
            const itemMenuItemId = 'menuItemId' in item ? item.menuItemId : undefined;

            // Try to find menu item by name or menuItemId
            const menuItem = itemName
              ? findMenuItemByName(itemName)
              : menuItems.find(m => m.id === itemMenuItemId);

            if (menuItem) {
              const quantity = item.quantity || 1;
              const modifications = ('modifications' in item ? item.modifications : undefined)
                || item.modifiers
                || [];
              const specialInstructions = 'specialInstructions' in item ? item.specialInstructions : undefined;

              // Add to cart
              onAddItem(menuItem, quantity, modifications, specialInstructions);

              // Visual feedback
              addToRecentlyAdded(menuItem.name);
              addedCount++;

              if (debug) {
                logger.info('[useVoiceCommerce] Added item:', {
                  menuItem: menuItem.name,
                  quantity,
                  modifications,
                });
              }
            } else {
              // Push the item identifier we tried to match
              unmatchedItems.push(itemName || itemMenuItemId || 'unknown item');
            }
          }

          // Success feedback
          if (addedCount > 0) {
            setVoiceFeedbackWithTimeout(
              `Added ${addedCount} ${addedCount === 1 ? 'item' : 'items'} to your order`
            );
          }

          // Warning for unmatched items
          if (unmatchedItems.length > 0) {
            const message = `Could not find: ${unmatchedItems.join(', ')}`;
            logger.warn('[useVoiceCommerce]', message);
            toast?.error(message);
          }
        }

        // ====================================================================
        // Format 2: Order confirmation { action: 'checkout' | 'review' | ... }
        // ====================================================================
        else if ('action' in orderData) {
          const { action } = orderData;

          if (debug) {
            logger.info('[useVoiceCommerce] Order confirmation action:', action);
          }

          if (action === 'checkout' || action === 'submit') {
            if (onCheckout) {
              setVoiceFeedbackWithTimeout('Proceeding to checkout...');
              onCheckout();
            } else {
              logger.warn('[useVoiceCommerce] No onCheckout handler provided');
            }
          } else if (action === 'review') {
            setVoiceFeedbackWithTimeout('Reviewing your order...');
          } else if (action === 'cancel') {
            setVoiceFeedbackWithTimeout('Order cancelled');
          }
        }

        // ====================================================================
        // Format 3: Legacy format { success: true, items: [...] }
        // ====================================================================
        else if ('success' in orderData && orderData.success && 'items' in orderData) {
          if (debug) {
            logger.info('[useVoiceCommerce] Processing legacy format');
          }

          let addedCount = 0;

          for (const item of orderData.items) {
            const menuItem = menuItems.find((m) => m.id === item.menuItemId);

            if (menuItem) {
              const quantity = item.quantity || 1;
              const modifications = item.modifiers || [];

              onAddItem(menuItem, quantity, modifications);
              addToRecentlyAdded(menuItem.name);
              addedCount++;
            }
          }

          if (addedCount > 0) {
            setVoiceFeedbackWithTimeout(`Added ${addedCount} items to your order`);
          }
        } else {
          logger.warn('[useVoiceCommerce] Unknown order data format:', orderData);
        }
      } catch (error) {
        logger.error('[useVoiceCommerce] Error processing order data:', error);
        toast?.error('Failed to process voice order');
      } finally {
        setIsProcessing(false);
      }
    },
    [
      checkoutGuard,
      isCheckingOut,
      findMenuItemByName,
      onAddItem,
      onCheckout,
      menuItems,
      addToRecentlyAdded,
      setVoiceFeedbackWithTimeout,
      toast,
      debug,
    ]
  );

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      // Clear all recently added timeouts
      recentlyAddedTimeouts.current.forEach(clearTimeout);
      recentlyAddedTimeouts.current = [];

      // Clear voice feedback timeout
      if (voiceFeedbackTimeout.current) {
        clearTimeout(voiceFeedbackTimeout.current);
      }
    };
  }, []);

  // ============================================================================
  // VOICE CONTROL PROPS
  // ============================================================================

  const voiceControlProps = {
    onTranscript: handleVoiceTranscript,
    onOrderDetected: handleOrderData,
    onRecordingStateChange: setIsListening,
    onConnectionStateChange: setVoiceConnectionState,
    onSessionReadyChange: setIsSessionReady,
  };

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    voiceConnectionState,
    isSessionReady,
    isListening,
    currentTranscript,
    isProcessing,
    recentlyAdded,
    voiceFeedback,

    // Handlers
    handleVoiceTranscript,
    handleOrderData,

    // Props
    voiceControlProps,

    // Checkout guard
    isCheckingOut,
    setIsCheckingOut,
  };
}
