/* eslint-env browser */
import { logger } from '../../../services/logger';
import { EventEmitter } from '../../../services/utils/EventEmitter';

/**
 * VoiceSessionConfig Service
 *
 * Single Responsibility: Manage OpenAI Realtime session configuration
 *
 * Responsibilities:
 * - Fetch and manage ephemeral tokens
 * - Schedule token refresh
 * - Build session configuration with AI instructions
 * - Manage menu context
 */

export type VoiceContext = 'kiosk' | 'server';

export interface WebRTCVoiceConfig {
  restaurantId: string;
  userId?: string;
  context?: VoiceContext;
  debug?: boolean;
  enableVAD?: boolean;
  muteAudioOutput?: boolean;
}

export interface RealtimeSessionConfig {
  modalities: string[];
  instructions: string;
  voice: string;
  input_audio_format: string;
  output_audio_format: string;
  input_audio_transcription: {
    model: string;
    language?: string; // Optional - gpt-4o-transcribe auto-detects language
  };
  turn_detection: any;
  temperature: number;
  max_response_output_tokens: number;
  tools?: any[];
  tool_choice?: string;
}

export interface IVoiceSessionConfig {
  // Token management
  fetchEphemeralToken(): Promise<void>;
  scheduleTokenRefresh(): void;
  clearTokenRefresh(): void;
  isTokenValid(): boolean;
  getToken(): string | null;
  getTokenExpiry(): number;

  // Session configuration
  buildSessionConfig(): RealtimeSessionConfig;
  getMenuContext(): string;
}

/**
 * VoiceSessionConfig implementation
 */
export class VoiceSessionConfig extends EventEmitter implements IVoiceSessionConfig {
  private ephemeralToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private menuContext: string = '';
  private context: VoiceContext;

  constructor(
    private config: WebRTCVoiceConfig,
    private authService: { getAuthToken: () => Promise<string>; getOptionalAuthToken?: () => Promise<string | null> }
  ) {
    super();
    this.context = config.context || 'kiosk'; // Default to kiosk for backward compatibility
  }

  /**
   * Fetch ephemeral token from backend
   * Also retrieves menu context if available
   * Supports both authenticated and anonymous (kiosk demo) access
   */
  async fetchEphemeralToken(): Promise<void> {
    // Try optional auth first (for kiosk demos), fall back to required auth
    const authToken = this.authService.getOptionalAuthToken
      ? await this.authService.getOptionalAuthToken()
      : await this.authService.getAuthToken();

    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

    if (this.config.debug) {
      logger.info('[VoiceSessionConfig] Fetching ephemeral token from:', `${apiBase}/api/v1/realtime/session`);
      logger.info('[VoiceSessionConfig] Auth mode:', authToken ? 'authenticated' : 'anonymous');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-restaurant-id': this.config.restaurantId,
    };

    // Only add Authorization header if we have a token
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${apiBase}/api/v1/realtime/session`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get ephemeral token: ${response.status}`);
    }

    const data = await response.json();

    // Validate response structure
    if (this.config.debug) {
      logger.info('[VoiceSessionConfig] Response structure:', {
        keys: Object.keys(data),
        hasClientSecret: !!data.client_secret,
        hasExpiresAt: !!data.expires_at,
        hasMenuContext: !!data.menu_context,
        menuContextType: typeof data.menu_context,
        menuContextLength: data.menu_context?.length || 0
      });
    }

    // Check for required fields
    if (!data.client_secret?.value) {
      throw new Error('Backend response missing client_secret.value');
    }

    this.ephemeralToken = data.client_secret.value;
    this.tokenExpiresAt = data.expires_at || Date.now() + 60000;

    // CRITICAL: Validate menu context exists
    if (!data.menu_context || data.menu_context.trim().length === 0) {
      logger.error('❌ [VoiceSessionConfig] CRITICAL ERROR - Backend response details:', {
        responseKeys: Object.keys(data),
        menuContext: data.menu_context,
        menuContextType: typeof data.menu_context,
        restaurantId: this.config.restaurantId,
        context: this.context
      });
      throw new Error(
        'CRITICAL: Backend returned no menu context - voice ordering unavailable. ' +
        'The AI cannot take orders without menu information.'
      );
    }

    // Store menu context
    this.menuContext = data.menu_context;
    logger.info('✅ [VoiceSessionConfig] Menu context loaded:', {
      lines: this.menuContext.split('\n').length,
      length: this.menuContext.length,
      preview: this.menuContext.substring(0, 200)
    });

    // Schedule token refresh 10 seconds before expiry
    this.scheduleTokenRefresh();

    if (this.config.debug) {
      logger.info('[VoiceSessionConfig] Got ephemeral token, expires at:', new Date(this.tokenExpiresAt));
    }
  }

  /**
   * Schedule token refresh before expiry
   * Refreshes token 10 seconds before it expires
   */
  scheduleTokenRefresh(): void {
    // Clear any existing timer
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    // Calculate when to refresh (10 seconds before expiry)
    const refreshTime = this.tokenExpiresAt - Date.now() - 10000;

    if (refreshTime > 0) {
      this.tokenRefreshTimer = setTimeout(async () => {
        if (this.config.debug) {
          logger.info('[VoiceSessionConfig] Refreshing ephemeral token...');
        }
        try {
          await this.fetchEphemeralToken();
          // Note: We can't update an active WebRTC session token
          // This is for the next connection
        } catch (error) {
          logger.error('[VoiceSessionConfig] Token refresh failed:', error);
          this.emit('token.refresh.failed', { error }); // ✅ Notify UI
        }
      }, refreshTime);
    }
  }

  /**
   * Clear token refresh timer
   * Call this when disconnecting
   */
  clearTokenRefresh(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  /**
   * Check if current token is still valid
   */
  isTokenValid(): boolean {
    return this.ephemeralToken !== null && Date.now() < this.tokenExpiresAt;
  }

  /**
   * Get current ephemeral token
   */
  getToken(): string | null {
    return this.ephemeralToken;
  }

  /**
   * Get token expiry timestamp
   */
  getTokenExpiry(): number {
    return this.tokenExpiresAt;
  }

  /**
   * Get menu context string
   */
  getMenuContext(): string {
    return this.menuContext;
  }

  /**
   * Build session configuration for OpenAI Realtime API
   * Returns a pure configuration object (no side effects)
   */
  buildSessionConfig(): RealtimeSessionConfig {
    logger.info('🔨 [VoiceSessionConfig] Building session config...', {
      context: this.context,
      hasMenuContext: this.menuContext.length > 0,
      menuContextLength: this.menuContext.length
    });

    // Determine turn detection mode
    let turnDetection: any = null; // Default: manual PTT
    if (this.config.enableVAD) {
      turnDetection = {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 1500, // Increased from 250ms - allow longer pauses
        create_response: false, // Still manually trigger responses
      };
    }

    // Use context-specific instruction and tool builders
    const instructions = this.context === 'server'
      ? this.buildServerInstructions()
      : this.buildKioskInstructions();

    const tools = this.context === 'server'
      ? this.buildServerTools()
      : this.buildKioskTools();

    logger.info('📋 [VoiceSessionConfig] Config built:', {
      instructionsLength: instructions.length,
      toolsCount: tools.length,
      toolNames: tools.map((t: any) => t.name),
      hasMenuInInstructions: instructions.includes('📋 FULL MENU')
    });

    // Server context uses shorter max tokens for efficiency
    const maxTokens = this.context === 'server' ? 200 : 500;

    const sessionConfig: RealtimeSessionConfig = {
      modalities: ['text', 'audio'],
      instructions,
      voice: 'alloy',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'gpt-4o-transcribe', // FIXED 2025-01-18: OpenAI deprecated whisper-1 for Realtime API
        language: 'en' // Force English transcription (prevent Spanish auto-detection)
      },
      turn_detection: turnDetection,
      temperature: 0.6, // Minimum temperature for Realtime API
      max_response_output_tokens: maxTokens
    };

    // Only add tools if they exist and are non-empty
    if (tools && tools.length > 0) {
      sessionConfig.tools = tools;
      sessionConfig.tool_choice = 'auto'; // Enable automatic function calling
      logger.info('✅ [VoiceSessionConfig] Tools added to session config');
    } else {
      logger.error('❌ [VoiceSessionConfig] NO TOOLS to add to session config!');
    }

    const configSize = JSON.stringify(sessionConfig).length;
    logger.info('📦 [VoiceSessionConfig] Final config size:', {
      bytes: configSize,
      kb: (configSize / 1024).toFixed(2),
      tooLarge: configSize > 50000
    });

    return sessionConfig;
  }

  /**
   * Build kiosk-specific AI instructions
   * Customer-facing, friendly, educational tone
   */
  private buildKioskInstructions(): string {
    let instructions = `[SYSTEM: Output language = en-US. Do not use Spanish (es) unless explicitly requested.]

You are an English-speaking customer service agent at Grow Restaurant in the United States.

LANGUAGE POLICY:
- Respond in English by default
- Only use Spanish if customer explicitly requests it with phrases like "¿Habla español?" or "Spanish please"
- When unsure, always use English

🎯 YOUR JOB:
- Help guests choose items and take complete, correct orders
- Be concise (1-2 sentences), warm, and proactive
- Always confirm: final order, price, pickup/dine-in choice
- Use the add_to_order function when customer orders items
- Use confirm_order function when customer wants to checkout

⚠️ GOLDEN RULES:
1. IMMEDIATELY call add_to_order when customer mentions menu items - don't ask first
2. Add items with basic defaults (e.g., Greek dressing for salad, wheat bread for sandwich)
3. AFTER adding, ask follow-up questions to customize: "Added Greek Salad! What dressing?"
4. Summarize what was added: item → quantity → price
5. If uncertain about an item name, ask for clarification before adding

🎤 TRANSCRIPTION HELP (common misheard items):
- "Soul Bowl" (NOT "sobo" or "solo") - Southern comfort food bowl
- "Peach Arugula" (NOT "peach a ruler") - Salad with arugula
- "Jalapeño Pimento" (NOT "holla pino") - Spicy cheese bites
- "Succotash" (NOT "suck a toss") - Vegan vegetable dish
- If you hear something unclear, confirm: "Did you say Soul Bowl?"

📋 SMART FOLLOW-UPS BY CATEGORY:

SALADS → Ask:
- Dressing? (Vidalia Onion, Balsamic, Greek, Ranch, Honey Mustard, Poppy Seed, Lemon Vinaigrette)
- Cheese if applicable? (feta, blue, cheddar)
- Add protein? (+$4 chicken, +$6 salmon)

SANDWICHES → Ask:
- Bread? (white, wheat, or flatbread)
- Side? (potato salad, fruit cup, cucumber salad, side salad, peanut noodles)
- Toasted?

BOWLS:
- Fajita Keto → "Add rice for +$1?"
- Greek → "Dairy (feta/tzatziki) okay?"
- Soul → "Pork sausage okay?"

VEGAN → Confirm no dairy/egg/honey, warn about peanuts in noodles

ENTRÉES → Ask:
- Choose 2 sides (potato salad, fruit cup, cucumber salad, side salad, peanut noodles)
- Cornbread okay?

💬 EXAMPLE RESPONSES:
- "Great choice! Feta or blue cheese? Add prosciutto for +$4?"
- "White, wheat, or flatbread? Which side would you like?"
- "Any allergies I should know about?"
- "That's a Greek Salad with chicken, balsamic dressing. $16 total. Dine-in or to-go?"

🚫 REDIRECT NON-FOOD TOPICS:
- "I can only help with food orders. What would you like to order?"
- "Let me help you with our menu. Any starters today?"`;

    // Add menu context if available
    // FIX 2025-11-22: Added explicit instruction to tell AI to USE the menu
    if (this.menuContext) {
      instructions += `\n\n⚠️ CRITICAL: You have access to our COMPLETE MENU below. ONLY suggest items from this menu. DO NOT invent or suggest items not listed.`;
      instructions += this.menuContext;
    } else {
      instructions += `\n\nNote: Menu information is currently unavailable. Please ask the customer what they'd like and I'll do my best to help.`;
    }

    return instructions;
  }

  /**
   * Build server-specific AI instructions
   * Professional, concise, staff-oriented tone
   */
  private buildServerInstructions(): string {
    let instructions = `You are Grow Restaurant's staff ordering assistant. Fast, accurate, professional.

🎯 CORE FUNCTION:
- Take rapid-fire orders from trained staff
- Add items immediately when mentioned
- Minimal confirmations (staff will catch errors)
- Support multi-item batches: "3 Greek, 2 Soul Bowl, 1 sandwich"

⚡ SPEED RULES:
1. NEVER explain menu items (staff knows the menu)
2. Add items with standard defaults, ask modifiers ONLY if staff pauses
3. Confirmations: item count + total ONLY
4. Response length: 5-10 words max
5. Skip pleasantries ("Got it", "Added", "Done")

🎤 TRANSCRIPTION SHORTCUTS:
- "Soul Bowl" / "sobo" / "solo" → Soul Bowl
- "Peach" → Peach Arugula Salad
- "Greek" → Greek Salad
- "Jalapeño" / "pimento" → Jalapeño Pimento Bites
- "Succotash" → Succotash Bowl

⚠️ CRITICAL CHECKS:
- Allergies mentioned? → Capture in specialInstructions
- "Rush" or "ASAP"? → Set rushOrder: true
- Staff says "next seat" → call confirm_seat_order with action: 'next_seat'
- Staff says "done" or "that's it" → call confirm_seat_order with action: 'submit'

📋 SMART DEFAULTS BY CATEGORY:
SALADS → Greek dressing (change if staff specifies)
SANDWICHES → Wheat bread, potato salad (change if staff specifies)
BOWLS → Standard prep (staff will specify modifications)
ENTREES → Standard 2 sides (staff will specify which)

💬 EXAMPLE EXCHANGES:
Staff: "3 Greek salads, one with chicken, one no feta"
AI: "Added. 3 Greek. $42."

Staff: "Soul bowl, allergy to pork"
AI: "Soul Bowl, noted pork allergy. $14."

Staff: "2 sandwiches, both white bread, fruit side"
AI: "2 sandwiches. $24."

Staff: "That's it"
AI: "Submitting 6 items, $80 total."`;

    // Add menu context if available
    if (this.menuContext) {
      instructions += this.menuContext;
    } else {
      instructions += `\n\nNote: Menu information is currently unavailable.`;
    }

    return instructions;
  }

  /**
   * Build kiosk-specific function tools
   */
  private buildKioskTools(): any[] {
    return [
      {
        type: 'function',
        name: 'add_to_order',
        description: 'Add items to the customer\'s order when they request specific menu items',
        parameters: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              description: 'Array of items to add to the order',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'The menu item name (e.g., "Soul Bowl", "Greek Salad")'
                  },
                  quantity: {
                    type: 'integer',
                    minimum: 1,
                    default: 1,
                    description: 'Number of this item'
                  },
                  modifications: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Modifications like "no onions", "extra cheese", "add chicken"'
                  },
                  specialInstructions: {
                    type: 'string',
                    description: 'Any special preparation instructions'
                  }
                },
                required: ['name', 'quantity'],
                additionalProperties: false
              }
            }
          },
          required: ['items'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'confirm_order',
        description: 'Confirm the order and proceed with checkout when customer is ready',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['checkout', 'review', 'cancel'],
              description: 'Action to take with the order'
            }
          },
          required: ['action'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'remove_from_order',
        description: 'Remove items from the order when customer changes their mind',
        parameters: {
          type: 'object',
          properties: {
            itemName: {
              type: 'string',
              description: 'Name of the item to remove'
            },
            quantity: {
              type: 'integer',
              description: 'Number to remove (optional, removes all if not specified)'
            }
          },
          required: ['itemName'],
          additionalProperties: false
        }
      }
    ];
  }

  /**
   * Build server-specific function tools
   * Includes enhanced fields for staff workflow (allergyNotes, rushOrder)
   */
  private buildServerTools(): any[] {
    return [
      {
        type: 'function',
        name: 'add_to_order',
        description: 'Add items to seat order (staff context - assume menu knowledge)',
        parameters: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              description: 'Array of items to add to the seat order',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'The menu item name'
                  },
                  quantity: {
                    type: 'integer',
                    minimum: 1,
                    default: 1,
                    description: 'Number of this item'
                  },
                  modifications: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Modifications like "no onions", "extra cheese"'
                  },
                  specialInstructions: {
                    type: 'string',
                    description: 'Special preparation instructions'
                  },
                  allergyNotes: {
                    type: 'string',
                    description: 'Customer allergy information (e.g., "allergic to pork")'
                  },
                  rushOrder: {
                    type: 'boolean',
                    description: 'Flag if staff says "rush" or "ASAP"'
                  }
                },
                required: ['name', 'quantity'],
                additionalProperties: false
              }
            }
          },
          required: ['items'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'confirm_seat_order',
        description: 'Confirm order for current seat (staff workflow)',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['submit', 'review', 'next_seat', 'finish_table'],
              description: 'Action to take: submit (finish seat), review (check items), next_seat (move to next), finish_table (complete table)'
            }
          },
          required: ['action'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'remove_from_order',
        description: 'Remove items from seat order',
        parameters: {
          type: 'object',
          properties: {
            itemName: {
              type: 'string',
              description: 'Name of the item to remove'
            },
            quantity: {
              type: 'integer',
              description: 'Number to remove (optional, removes all if not specified)'
            }
          },
          required: ['itemName'],
          additionalProperties: false
        }
      }
    ];
  }
}
