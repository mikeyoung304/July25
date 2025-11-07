/* eslint-env browser */

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

export interface WebRTCVoiceConfig {
  restaurantId: string;
  userId?: string;
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
    language: string;
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
export class VoiceSessionConfig implements IVoiceSessionConfig {
  private ephemeralToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private menuContext: string = '';

  constructor(
    private config: WebRTCVoiceConfig,
    private authService: { getAuthToken: () => Promise<string>; getOptionalAuthToken?: () => Promise<string | null> }
  ) {}

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
      console.log('[VoiceSessionConfig] Fetching ephemeral token from:', `${apiBase}/api/v1/realtime/session`);
      console.log('[VoiceSessionConfig] Auth mode:', authToken ? 'authenticated' : 'anonymous');
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
    this.ephemeralToken = data.client_secret.value;
    this.tokenExpiresAt = data.expires_at || Date.now() + 60000;

    // Store menu context if provided
    if (data.menu_context) {
      this.menuContext = data.menu_context;
      if (this.config.debug) {
        console.log('[VoiceSessionConfig] Menu context loaded:', this.menuContext.split('\n').length, 'lines');
      }
    }

    // Schedule token refresh 10 seconds before expiry
    this.scheduleTokenRefresh();

    if (this.config.debug) {
      console.log('[VoiceSessionConfig] Got ephemeral token, expires at:', new Date(this.tokenExpiresAt));
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
          console.log('[VoiceSessionConfig] Refreshing ephemeral token...');
        }
        try {
          await this.fetchEphemeralToken();
          // Note: We can't update an active WebRTC session token
          // This is for the next connection
        } catch (error) {
          console.error('[VoiceSessionConfig] Token refresh failed:', error);
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
    // Determine turn detection mode
    let turnDetection: any = null; // Default: manual PTT
    if (this.config.enableVAD) {
      turnDetection = {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 250,
        create_response: false, // Still manually trigger responses
      };
    }

    // Build instructions with menu context
    let instructions = `You are Grow Restaurant's friendly, fast, and accurate customer service agent. You MUST speak in English only. Never respond in any other language.

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
- "Let me help you with our menu. Any starters today?"

⚠️ LANGUAGE REQUIREMENT:
- You MUST speak English ONLY
- If you hear Spanish or any other language, respond in English: "I can help you in English. What would you like to order?"
- Never respond in Spanish, French, Chinese, or any language other than English
- All responses, greetings, and confirmations MUST be in English`;

    // Add menu context if available
    if (this.menuContext) {
      instructions += this.menuContext;
    } else {
      instructions += `\n\nNote: Menu information is currently unavailable. Please ask the customer what they'd like and I'll do my best to help.`;
    }

    // Define tools/functions for structured order extraction
    const tools = [
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

    const sessionConfig: RealtimeSessionConfig = {
      modalities: ['text', 'audio'],
      instructions,
      voice: 'alloy',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'whisper-1',
        language: 'en'  // Force English transcription
      },
      turn_detection: turnDetection,
      temperature: 0.6, // Minimum temperature for Realtime API
      max_response_output_tokens: 500 // Sufficient for complete responses
    };

    // Only add tools if they exist and are non-empty
    if (tools && tools.length > 0) {
      sessionConfig.tools = tools;
      sessionConfig.tool_choice = 'auto'; // Enable automatic function calling
    }

    return sessionConfig;
  }
}
