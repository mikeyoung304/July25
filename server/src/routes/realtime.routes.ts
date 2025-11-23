import { Router, Response, Request } from 'express';
import { AuthenticatedRequest, optionalAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import fetch from 'node-fetch';
import { MenuService } from '../services/menu.service';
import { env } from '../config/env';
import { supabase } from '../config/database';

const router = Router();
const realtimeLogger = logger.child({ module: 'realtime-routes' });

/**
 * Build kiosk-specific AI instructions
 * CRITICAL: This mirrors the frontend VoiceSessionConfig.buildKioskInstructions()
 * Must be kept in sync with client/src/modules/voice/services/VoiceSessionConfig.ts
 */
function buildKioskInstructions(menuContext: string): string {
  let instructions = `CRITICAL SYSTEM DIRECTIVE: YOU MUST SPEAK ONLY IN ENGLISH.
DO NOT use Spanish, French, or any other language unless the customer EXPLICITLY requests it in that language.
This is a requirement for US operations. Always respond in English (en-US).

You are an English-speaking customer service agent at Grow Restaurant in the United States.

🎤 GREETING (FOR DEPLOYMENT VERIFICATION):
When a customer first connects or says hello, greet them with a warm Jamaican accent:
"Welcome to Grow Restaurant, mon! Ready to order some delicious food today?"
After the initial greeting, speak in standard American English for the rest of the conversation.

LANGUAGE ENFORCEMENT:
- ALWAYS respond in English - this is mandatory
- ONLY switch to Spanish if customer says "¿Habla español?" or "Spanish please"
- If you detect Spanish speech, politely respond in English: "I'm speaking English today. How can I help you?"
- When in doubt, use English

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
  if (menuContext) {
    instructions += `\n\n🔴 CRITICAL SYSTEM KNOWLEDGE - THIS IS YOUR MENU:\n`;
    instructions += `You work at Grow Restaurant. The menu below is YOUR menu - you KNOW these items.\n`;
    instructions += `When customers ask "what's on the menu" or "what do you have", list categories and popular items.\n`;
    instructions += `NEVER say "I don't know the menu" or ask "what menu" - YOU ARE THE MENU EXPERT.\n`;
    instructions += menuContext;
    instructions += `\n\n⚠️ REMINDER: Only recommend items from the menu above. If a customer asks for something not listed, say "We don't have that, but we have [similar item]."`;
  } else {
    instructions += `\n\nNote: Menu information is currently unavailable. Please ask the customer what they'd like and I'll do my best to help.`;
  }

  return instructions;
}

/**
 * Build kiosk-specific function tools
 * CRITICAL: This mirrors the frontend VoiceSessionConfig.buildKioskTools()
 * Must be kept in sync with client/src/modules/voice/services/VoiceSessionConfig.ts
 */
function buildKioskTools(): any[] {
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
 * Resolves restaurant ID from slug or UUID format
 * Maps common slugs to their UUID equivalents, validates UUID format
 *
 * @param input - Restaurant slug (e.g., "grow") or UUID
 * @returns UUID format restaurant ID
 */
function resolveRestaurantId(input: string | undefined): string {
  // Handle undefined or empty input
  if (!input || input === 'default') {
    return env.DEFAULT_RESTAURANT_ID;
  }

  // Check if already in UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(input)) {
    return input;
  }

  // Map common slugs to UUIDs
  const slugToUuidMap: Record<string, string> = {
    'grow': '11111111-1111-1111-1111-111111111111'
  };

  // Check slug mapping
  const normalizedInput = input.toLowerCase();
  if (slugToUuidMap[normalizedInput]) {
    return slugToUuidMap[normalizedInput]!;
  }

  // Fallback to default restaurant ID from environment
  return env.DEFAULT_RESTAURANT_ID;
}

/**
 * Helper function for structured menu load failure logging
 * Includes all diagnostic context for debugging production issues
 */
function logMenuLoadFailure(error: Error, context: {
  restaurantId: string;
  userId?: string;
  attemptedOperation: string;
}) {
  realtimeLogger.error('Menu load failure detected', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context: {
      restaurantId: context.restaurantId,
      userId: context.userId || 'anonymous',
      operation: context.attemptedOperation,
      timestamp: new Date().toISOString()
    },
    diagnostics: {
      // Cache status would be checked here if we had access to the cache
      // Database connection status inferred from error type
      dbConnectionLikely: !error.message.includes('connect') && !error.message.includes('timeout'),
      errorType: error.constructor.name
    }
  });
}

/**
 * Menu health check endpoint
 * Tests menu loading capability for a specific restaurant
 * Supports both UUID and slug format for restaurant identification
 * Returns menu statistics or error details for monitoring/alerting
 *
 * GET /api/v1/realtime/menu-check/:restaurantId
 */
router.get('/menu-check/:restaurantId', async (req: Request, res: Response) => {
  try {
    let restaurantId = req.params['restaurantId'];

    // Resolve slug to UUID if needed
    const isUUID = restaurantId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantId);

    if (!isUUID) {
      // Treat as slug and resolve to UUID
      realtimeLogger.debug('Resolving restaurant slug for health check', { slug: restaurantId });

      const { data: restaurant, error } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', restaurantId)
        .single();

      if (error || !restaurant) {
        realtimeLogger.warn('Restaurant slug not found', { slug: restaurantId, error: error?.message });
        return res.status(404).json({
          status: 'unhealthy',
          error: 'Restaurant not found',
          details: `No restaurant found with slug: ${restaurantId}`,
          timestamp: new Date().toISOString()
        });
      }

      restaurantId = restaurant.id;
      realtimeLogger.debug('Resolved restaurant slug', { slug: req.params['restaurantId'], uuid: restaurantId });
    }

    // Ensure restaurantId is defined
    if (!restaurantId) {
      return res.status(400).json({
        status: 'unhealthy',
        error: 'Restaurant ID required',
        timestamp: new Date().toISOString()
      });
    }

    // Attempt to load menu data (uses cache if available)
    const [menuItems, categories] = await Promise.all([
      MenuService.getItems(restaurantId),
      MenuService.getCategories(restaurantId)
    ]);

    // Calculate statistics
    const availableItems = menuItems.filter(item => item.available !== false);
    const categoriesWithItems = new Set(
      menuItems
        .filter(item => item.categoryId)
        .map(item => item.categoryId)
    ).size;

    const health = {
      status: 'healthy',
      restaurant_id: restaurantId,
      item_count: menuItems.length,
      available_item_count: availableItems.length,
      category_count: categories.length,
      categories_with_items: categoriesWithItems,
      timestamp: new Date().toISOString()
    };

    realtimeLogger.info('Menu health check passed', health);

    return res.status(200).json(health);

  } catch (error) {
    const err = error as Error;

    realtimeLogger.error('Menu health check failed', {
      error: {
        message: err.message,
        stack: err.stack,
        name: err.name
      },
      restaurantId: req.params['restaurantId'],
      timestamp: new Date().toISOString()
    });

    return res.status(503).json({
      status: 'unhealthy',
      error: 'Failed to load menu data',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Create ephemeral token for WebRTC real-time voice connection
 * This token expires after 1 minute and should only be used by the requesting client
 * Supports both authenticated and anonymous (kiosk demo) usage
 */
router.post('/session', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawRestaurantId = (req.restaurantId || req.headers['x-restaurant-id'] || undefined) as string | undefined;
    const restaurantId = resolveRestaurantId(rawRestaurantId);

    // Validate resolved restaurant ID (should always be valid UUID from resolver)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!restaurantId || !uuidRegex.test(restaurantId)) {
      realtimeLogger.error('Invalid restaurant ID after resolution', {
        rawInput: rawRestaurantId,
        resolved: restaurantId
      });
      return res.status(400).json({
        error: 'Invalid restaurant identifier',
        details: 'Restaurant ID must be provided as either UUID or valid slug'
      });
    }

    realtimeLogger.info('Creating ephemeral token for real-time session', {
      userId: req.user?.id,
      restaurantId,
      rawRestaurantId: rawRestaurantId !== restaurantId ? rawRestaurantId : undefined
    });

    // Load menu context for the restaurant
    let menuContext = '';
    try {
      // CRITICAL FIX: Fetch categories first to map category IDs to names
      const [menuData, categories] = await Promise.all([
        MenuService.getItems(restaurantId as string),
        MenuService.getCategories(restaurantId as string)
      ]);

      // Create category ID → name lookup map
      const categoryMap = new Map(
        categories.map(cat => [cat.id, cat.name])
      );

      if (menuData && menuData.length > 0) {
        // Format menu items for AI context WITH human-readable category names
        const menuItems = menuData.map(item => ({
          name: item.name,
          price: item.price,
          category: item.categoryId ? (categoryMap.get(item.categoryId) || 'Other') : 'Other',
          description: item.description || '',
          available: item.available !== false
        })).filter(item => item.available);

        // Group by category (keep full item objects)
        const menuByCategory = menuItems.reduce((acc, item) => {
          if (!acc[item.category]) acc[item.category] = [];
          acc[item.category]!.push(item);
          return acc;
        }, {} as Record<string, typeof menuItems>);
        
        // Create menu context string with clear formatting and allergen info
        menuContext = `\n\n📋 FULL MENU (Summer Lunch Menu - prices may vary):\n`;
        menuContext += `=====================================\n`;
        
        // Add special dietary notes (currently unused but kept for future reference)
        // const allergenNotes: Record<string, string> = {
        //   'Peanut Noodles': '⚠️ Contains peanuts',
        //   'Jalapeño Pimento': '🌶️ Mild heat',
        //   'Greek': '🧀 Contains dairy (feta, tzatziki)',
        //   'Soul Bowl': '🥓 Contains pork',
        //   'Vegan': '🌱 100% plant-based',
        // };
        
        for (const [category, items] of Object.entries(menuByCategory)) {
          menuContext += `\n${category.toUpperCase()}:\n`;
          items.forEach(item => {
            menuContext += `  • ${item.name} - $${item.price.toFixed(2)}`;
            
            // Add special notes
            if (item.name.includes('Salad') && category === 'Salads') {
              menuContext += ` [Ask: dressing? add protein?]`;
            } else if (item.name.includes('Sandwich')) {
              menuContext += ` [Ask: bread type? side?]`;
            } else if (item.name.includes('Bowl')) {
              menuContext += ` [Check dietary needs]`;
            } else if (category === 'Entrees') {
              menuContext += ` [Includes 2 sides + cornbread]`;
            }
            
            // Add description if available
            if (item.description) {
              menuContext += `\n    ${item.description.substring(0, 60)}`;
            }
            menuContext += '\n';
          });
        }
        
        menuContext += `\n🔍 ALLERGEN INFO:\n`;
        menuContext += `• Nuts: peanut noodles\n`;
        menuContext += `• Dairy: feta, mozzarella, cheddar, tzatziki, sour cream\n`;
        menuContext += `• Gluten: bread, flatbread, naan, couscous\n`;
        menuContext += `• Pork: bacon, sausage, prosciutto\n`;
        
        menuContext += `\n✅ REQUIRED FOLLOW-UPS:\n`;
        menuContext += `• Salads → dressing choice\n`;
        menuContext += `• Sandwiches → bread + side choice\n`;
        menuContext += `• Entrées → 2 side choices\n`;
        menuContext += `• All orders → dine-in or to-go?`;

        // CRITICAL: Limit menu context size to prevent OpenAI session.update rejection
        const MAX_MENU_CONTEXT_LENGTH = 5000; // Conservative limit (5KB)
        if (menuContext.length > MAX_MENU_CONTEXT_LENGTH) {
          realtimeLogger.warn('Menu context too large, truncating', {
            restaurantId,
            originalLength: menuContext.length,
            truncatedLength: MAX_MENU_CONTEXT_LENGTH,
            itemCount: menuItems.length
          });
          menuContext = menuContext.substring(0, MAX_MENU_CONTEXT_LENGTH) +
            '\n\n[Menu truncated - complete menu available on screen]';
        }

        realtimeLogger.info('Loaded menu for voice context', {
          restaurantId,
          itemCount: menuItems.length,
          categories: Object.keys(menuByCategory),
          menuContextLength: menuContext.length
        });
      } else {
        // CRITICAL FIX: Menu data is empty - fail fast
        // This handles cases where MenuService returns empty array instead of throwing
        const userId = req.user?.id;
        logMenuLoadFailure(new Error('No menu items found for restaurant'), {
          restaurantId: restaurantId,
          ...(userId && { userId }),
          attemptedOperation: 'load_menu_for_voice_session'
        });

        realtimeLogger.error('Menu data empty - cannot proceed with voice session', {
          restaurantId,
          itemCount: menuData?.length || 0,
          categoryCount: categories?.length || 0
        });

        return res.status(503).json({
          error: 'Menu temporarily unavailable',
          code: 'MENU_LOAD_FAILED',
          details: 'No menu items found for this restaurant. Voice ordering requires menu data.'
        });
      }
    } catch (error: any) {
      // CRITICAL FIX: Fail fast instead of continuing with empty menu
      // Enhanced error logging with full diagnostic context
      const userId = req.user?.id;
      logMenuLoadFailure(error, {
        restaurantId: restaurantId,
        ...(userId && { userId }),
        attemptedOperation: 'load_menu_for_voice_session'
      });

      realtimeLogger.error('Failed to load menu context - cannot proceed', {
        error: error.message || 'Unknown error',
        stack: error.stack,
        restaurantId
      });

      // Return 503 Service Unavailable instead of continuing with empty menu
      return res.status(503).json({
        error: 'Menu temporarily unavailable',
        code: 'MENU_LOAD_FAILED',
        details: error.message || 'Unable to load restaurant menu data'
      });
    }

    // Validate OpenAI API key before making request
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      realtimeLogger.error('OPENAI_API_KEY is not configured');
      return res.status(500).json({
        error: 'Voice ordering service is not configured',
        details: 'OPENAI_API_KEY environment variable is missing'
      });
    }

    // Detect malformed API keys (e.g., containing literal newlines from Vercel CLI)
    if (apiKey.includes('\n') || apiKey.includes('\\n') || apiKey.includes('\r')) {
      realtimeLogger.error('OPENAI_API_KEY contains invalid characters (newlines)', {
        keyLength: apiKey.length,
        hasNewline: apiKey.includes('\n'),
        hasLiteralNewline: apiKey.includes('\\n'),
        hasCarriageReturn: apiKey.includes('\r')
      });
      return res.status(500).json({
        error: 'Voice ordering service is misconfigured',
        details: 'OPENAI_API_KEY contains invalid characters. This may be caused by Vercel CLI adding newlines. Fix: Use "echo -n" when setting environment variables.'
      });
    }

    // Build instructions with menu context
    // CRITICAL FIX 2025-11-23: OpenAI ephemeral tokens with instructions take precedence over client session.update
    // We MUST include instructions when creating the token, not rely on client session.update
    const instructions = buildKioskInstructions(menuContext);
    const tools = buildKioskTools();

    // Request ephemeral token from OpenAI with full session configuration
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.OPENAI_REALTIME_MODEL,
        // CRITICAL: Configure session here - client session.update is ignored by OpenAI!
        modalities: ['text', 'audio'],
        instructions,
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'gpt-4o-transcribe',
          language: 'en'
        },
        tools,
        tool_choice: 'auto',
        turn_detection: null, // Manual PTT mode
        temperature: 0.6,
        max_response_output_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      realtimeLogger.error('OpenAI ephemeral token creation failed', {
        status: response.status,
        error: errorText
      });
      
      return res.status(response.status).json({
        error: 'Failed to create real-time session',
        details: errorText
      });
    }

    const data = await response.json() as Record<string, any>;

    // Add restaurant and menu context to the response
    // Use OpenAI's actual expires_at if provided, otherwise default to 60 seconds
    const sessionData = {
      ...data,
      restaurant_id: restaurantId,
      menu_context: menuContext, // Pass menu context to client
      // CRITICAL: Use OpenAI's actual token expiry, don't overwrite it
      expires_at: data['expires_at'] || (Date.now() + 60000),
    };

    realtimeLogger.info('Ephemeral token created successfully', {
      sessionId: data['id'],
      restaurantId
    });
    
    // Don't cache ephemeral tokens
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    
    return res.json(sessionData);
  } catch (error) {
    const err = error as Error;

    // Enhanced structured error logging for session creation failures
    realtimeLogger.error('Error creating ephemeral token', {
      error: {
        message: err.message,
        stack: err.stack,
        name: err.name
      },
      context: {
        restaurantId: req.restaurantId || req.headers['x-restaurant-id'] || env.DEFAULT_RESTAURANT_ID,
        userId: req.user?.id || 'anonymous',
        timestamp: new Date().toISOString()
      },
      diagnostics: {
        openaiKeyConfigured: !!env.OPENAI_API_KEY,
        modelConfigured: !!env.OPENAI_REALTIME_MODEL,
        errorType: err.constructor.name
      }
    });

    return res.status(500).json({
      error: 'Failed to create real-time session',
      message: err.message || 'Unknown error'
    });
  }
});

/**
 * Health check for real-time service
 */
router.get('/health', (_req, res: Response) => {
  const apiKey = env.OPENAI_API_KEY;
  const apiKeyPresent = !!apiKey;
  const apiKeyValid = apiKeyPresent && !apiKey.includes('\n') && !apiKey.includes('\\n') && !apiKey.includes('\r');
  const modelConfigured = !!env.OPENAI_REALTIME_MODEL;

  const health = {
    status: apiKeyPresent && apiKeyValid && modelConfigured ? 'healthy' : 'unhealthy',
    checks: {
      api_key: apiKeyPresent,
      api_key_valid: apiKeyValid,
      model_configured: modelConfigured,
      model: env.OPENAI_REALTIME_MODEL || 'not-configured'
    },
    timestamp: new Date().toISOString()
  };

  // Log unhealthy state with details
  if (health.status === 'unhealthy') {
    realtimeLogger.warn('Realtime service health check failed', {
      apiKeyPresent,
      apiKeyValid,
      modelConfigured,
      apiKeyContainsNewline: apiKeyPresent && !apiKeyValid
    });
  }

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

export const realtimeRoutes = router;