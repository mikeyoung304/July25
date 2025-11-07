import { Router, Response } from 'express';
import { AuthenticatedRequest, optionalAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import fetch from 'node-fetch';
import { MenuService } from '../services/menu.service';
import { env } from '../config/env';

const router = Router();
const realtimeLogger = logger.child({ module: 'realtime-routes' });

/**
 * Create ephemeral token for WebRTC real-time voice connection
 * This token expires after 1 minute and should only be used by the requesting client
 * Supports both authenticated and anonymous (kiosk demo) usage
 */
router.post('/session', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || req.headers['x-restaurant-id'] || 'default';
    
    realtimeLogger.info('Creating ephemeral token for real-time session', {
      userId: req.user?.id,
      restaurantId
    });

    // Load menu context for the restaurant
    let menuContext = '';
    try {
      const menuData = await MenuService.getItems(restaurantId as string);
      if (menuData && menuData.length > 0) {
        // Format menu items for AI context
        const menuItems = menuData.map(item => ({
          name: item.name,
          price: item.price,
          category: item.categoryId || 'Other',
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
        
        realtimeLogger.info('Loaded menu for voice context', {
          restaurantId,
          itemCount: menuItems.length,
          categories: Object.keys(menuByCategory)
        });
      }
    } catch (error: any) {
      realtimeLogger.warn('Failed to load menu context', { 
        error: error.message || 'Unknown error',
        stack: error.stack,
        restaurantId 
      });
      // Continue without menu context
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

    // Request ephemeral token from OpenAI
    // IMPORTANT: Only specify model, let client configure everything else
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.OPENAI_REALTIME_MODEL
        // DO NOT configure session parameters here - client will configure after connection
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
    const sessionData = {
      ...data,
      restaurant_id: restaurantId,
      menu_context: menuContext, // Pass menu context to client
      expires_at: Date.now() + 60000, // Token expires in 1 minute
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
    realtimeLogger.error('Error creating ephemeral token:', error);
    return res.status(500).json({
      error: 'Failed to create real-time session',
      message: error instanceof Error ? error.message : 'Unknown error'
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