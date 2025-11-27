import { Router, Response, Request } from 'express';
import { AuthenticatedRequest, optionalAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
// Native fetch used (Node.js 18+)
import { MenuService } from '../services/menu.service';
import { env } from '../config/env';
import { supabase } from '../config/database';
import { PromptConfigService } from '@rebuild/shared';
import { aiServiceLimiter } from '../middleware/rateLimiter';

const router = Router();
const realtimeLogger = logger.child({ module: 'realtime-routes' });

/**
 * REMOVED - Phase 1: Unification
 *
 * These helper functions have been moved to shared/src/voice/PromptConfigService.ts
 * to eliminate the "split-brain" problem where prompts were duplicated between
 * client and server.
 *
 * Now using: PromptConfigService.buildInstructions() and PromptConfigService.buildTools()
 */

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

// Timeout for OpenAI API calls (45 seconds)
// Increased from 30s to 45s to accommodate P95 latency scenarios
// OpenAI session creation can take longer under load; this timeout ensures
// we don't prematurely fail legitimate requests in high-latency conditions
const OPENAI_API_TIMEOUT_MS = 45000;

/**
 * Create ephemeral token for WebRTC real-time voice connection
 * This token expires after 1 minute and should only be used by the requesting client
 * Supports both authenticated and anonymous (kiosk demo) usage
 *
 * Rate limited via aiServiceLimiter to prevent cost attacks
 */
router.post('/session', aiServiceLimiter, optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
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
    //
    // PHASE 1 REFACTOR: Now using shared PromptConfigService instead of local functions
    const instructions = PromptConfigService.buildInstructions('kiosk', menuContext);
    const tools = PromptConfigService.buildTools('kiosk');

    realtimeLogger.info('Using shared PromptConfigService', {
      version: PromptConfigService.getVersion(),
      instructionsLength: instructions.length,
      toolsCount: tools.length
    });

    // Determine turn detection mode based on context
    // Kiosk context uses VAD for natural conversation flow (tap to start, auto-stop on silence)
    // Server context uses manual PTT mode (hold to talk)
    const context = req.body?.context as string | undefined;
    const isKioskContext = context === 'kiosk';

    const turnDetection = isKioskContext
      ? {
          type: 'server_vad',
          threshold: 0.6,                // Higher threshold for noisy restaurant environment
          prefix_padding_ms: 400,        // Capture lead-in audio for better recognition
          silence_duration_ms: 1500,     // 1.5s silence = end of speech
          create_response: true,         // Auto-trigger AI response when speech ends
        }
      : null; // Manual PTT mode for server context

    realtimeLogger.info('Configuring turn detection', {
      context,
      isKioskContext,
      turnDetectionType: isKioskContext ? 'server_vad' : 'manual'
    });

    // Request ephemeral token from OpenAI with full session configuration
    // Use AbortController for timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENAI_API_TIMEOUT_MS);

    let response;
    try {
      response = await fetch('https://api.openai.com/v1/realtime/sessions', {
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
          turn_detection: turnDetection,
          temperature: 0.6,
          max_response_output_tokens: 500
        }),
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Handle timeout specifically
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        realtimeLogger.error('OpenAI API request timed out', {
          timeoutMs: OPENAI_API_TIMEOUT_MS,
          restaurantId
        });
        return res.status(504).json({
          error: 'Voice service temporarily unavailable',
          code: 'OPENAI_TIMEOUT',
          details: 'Request to OpenAI timed out. Please try again.'
        });
      }

      // Re-throw other fetch errors
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

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