import { Router, Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import { ai, checkAIHealth } from '../ai';
import { logger } from '../utils/logger';
import { audioUpload } from '../middleware/fileValidation';
import { AuthenticatedRequest, authenticate, requireRole, requireScope } from '../middleware/auth';
import { aiServiceLimiter, transcriptionLimiter } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validation';
import { menuUploadSchema, parseOrderSchema } from '../validation/ai.validation';
import { trackAIMetrics } from '../middleware/metrics';
import { MenuService } from '../services/menu.service';
import { env } from '../config/env';

const router = Router();

const aiLogger = logger.child({ module: 'ai-routes' });

/**
 * Upload menu data for AI parsing
 * Requires admin role to prevent unauthorized menu modifications
 */
router.post('/menu', aiServiceLimiter, authenticate, requireRole(['admin', 'manager']), validateRequest(menuUploadSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || env.DEFAULT_RESTAURANT_ID;

    // Load menu from local database for AI processing
    await aiService.syncMenuFromDatabase(restaurantId);
    
    aiLogger.info('Menu loaded for AI processing', { 
      restaurantId: req.restaurantId, 
      userId: req.user?.id
    });
    
    res.set('Cache-Control', 'no-store');
    return res.json({
      success: true,
      message: 'Menu loaded for AI processing successfully',
      restaurantId
    });
  } catch (error) {
    aiLogger.error('Menu sync error:', error);
    res.set('Cache-Control', 'no-store');
    
    if ((error as any)?.status === 503) {
      res.set('x-ai-degraded', 'true');
      return res.status(503).json({
        error: 'provider_unavailable'
      });
    }
    
    return res.status(500).json({
      error: 'Failed to load menu for AI processing',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get current menu
 * Requires authentication to access restaurant-specific menu
 */
router.get('/menu', aiServiceLimiter, authenticate, (req: AuthenticatedRequest, res: Response) => {
  const menu = aiService.getMenu();
  
  res.set('Cache-Control', 'no-store');
  
  // Filter menu by restaurant context
  if (menu && req.restaurantId && menu.restaurantId !== req.restaurantId) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Menu belongs to different restaurant'
    });
  }
  
  if (!menu) {
    return res.status(404).json({
      error: 'No menu loaded',
      message: 'Please upload menu data first'
    });
  }
  
  return res.json(menu);
});

/**
 * Process voice audio through OpenAI
 * Returns MP3 audio response for direct playback
 */
router.post('/transcribe', transcriptionLimiter, trackAIMetrics('transcribe'), audioUpload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.set('Cache-Control', 'no-store');
      return res.status(400).json({
        error: 'Audio file is required'
      });
    }

    const restaurantId = req.headers['x-restaurant-id'] as string || env.DEFAULT_RESTAURANT_ID;

    aiLogger.info('Voice processing requested', {
      restaurantId,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });
    
    // Process voice through OpenAI adapters
    const audioBuffer = await aiService.processVoiceAudio(
      req.file.buffer,
      req.file.mimetype,
      restaurantId
    );
    
    // Return MP3 audio response
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length.toString(),
      'Cache-Control': 'no-store'
    });
    
    return res.send(audioBuffer);
  } catch (error) {
    aiLogger.error('Voice processing error:', error);
    res.set('Cache-Control', 'no-store');
    
    if ((error as any)?.status === 503) {
      res.set('x-ai-degraded', 'true');
      return res.status(503).json({
        error: 'provider_unavailable'
      });
    }
    
    return res.status(500).json({
      error: 'Failed to process voice message',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Process voice audio with metadata
 * Returns transcription and response data along with audio
 */
router.post('/transcribe-with-metadata', transcriptionLimiter, trackAIMetrics('transcribe-with-metadata'), audioUpload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.set('Cache-Control', 'no-store');
      return res.status(400).json({
        error: 'Audio file is required'
      });
    }

    // Use AI service for metadata response (if available)
    const restaurantId = req.headers['x-restaurant-id'] as string || env.DEFAULT_RESTAURANT_ID;

    aiLogger.info('Voice processing with metadata requested', {
      restaurantId,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });
    const result = await aiService.transcribeAudioFile(req.file.buffer, req.file.mimetype, restaurantId);
    
    if (!result.success) {
      res.set('Cache-Control', 'no-store');
      return res.status(400).json({
        success: false,
        error: result.error || 'Transcription failed'
      });
    }
    
    res.set('Cache-Control', 'no-store');
    return res.json({
      success: true,
      text: result.text,
      transcript: result.text, // Include both for compatibility
      duration: result.duration,
      restaurantId
    });
  } catch (error) {
    aiLogger.error('Voice processing with metadata error:', error);
    res.set('Cache-Control', 'no-store');
    
    if ((error as any)?.status === 503) {
      res.set('x-ai-degraded', 'true');
      return res.status(503).json({
        error: 'provider_unavailable'
      });
    }
    
    return res.status(500).json({
      error: 'Transcription failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Parse order from text using OpenAI
 * Requires authentication to ensure restaurant context
 */
router.post('/parse-order', aiServiceLimiter, trackAIMetrics('parse-order'), authenticate, validateRequest(parseOrderSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text } = req.body; // Already validated by middleware
    const restaurantId = req.restaurantId || env.DEFAULT_RESTAURANT_ID;

    aiLogger.info('Order parsing requested via OpenAI', {
      restaurantId,
      userId: req.user?.id,
      textLength: text.length
    });
    
    const result = await aiService.parseOrder(text, restaurantId);
    res.set('Cache-Control', 'no-store');
    return res.json({
      ...result,
      restaurantId,
      parsedBy: req.user?.id
    });
  } catch (error) {
    aiLogger.error('OpenAI order parsing error:', error);
    res.set('Cache-Control', 'no-store');
    
    if ((error as any)?.status === 503) {
      res.set('x-ai-degraded', 'true');
      return res.status(503).json({
        error: 'provider_unavailable'
      });
    }
    
    if ((error as any)?.status === 422) {
      return res.status(422).json({
        error: (error as any).error || 'unknown_item',
        suggestions: (error as any).suggestions || []
      });
    }
    
    return res.status(500).json({
      error: 'Failed to parse order via OpenAI',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check for AI service
 */
/**
 * Process voice audio and return response
 * Combines transcription and chat in one endpoint
 */
router.post('/voice-chat', aiServiceLimiter, trackAIMetrics('voice-chat'), authenticate, requireRole(['admin', 'manager', 'user', 'customer']), requireScope(['ai.voice:chat']), audioUpload.single('audio'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      res.set('Cache-Control', 'no-store');
      return res.status(400).json({
        error: 'Audio file is required'
      });
    }

    const restaurantId = req.restaurantId || env.DEFAULT_RESTAURANT_ID;

    aiLogger.info('Voice chat request via OpenAI', {
      restaurantId,
      userId: req.user?.id,
      fileSize: req.file.size
    });

    // Step 1: Load menu items for context
    const menuItems = await MenuService.getItems(restaurantId);
    
    // Create a menu summary for the AI
    const menuSummary = menuItems.map(item => 
      `- ${item.name}${item.description ? `: ${item.description}` : ''} ($${item.price})`
    ).join('\n');
    
    aiLogger.info('Loaded menu for AI context', {
      restaurantId,
      itemCount: menuItems.length
    });

    // Step 2: Transcribe the audio
    aiLogger.info('Starting transcription', {
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    const transcriptionResult = await ai.transcriber.transcribe(req.file.buffer, {
      model: req.file.mimetype
    });

    if (!transcriptionResult.text) {
      aiLogger.warn('Empty transcription result');
      res.set('Cache-Control', 'no-store');
      return res.status(400).json({
        error: 'No transcription available',
        transcript: ''
      });
    }

    aiLogger.info('Transcription completed', {
      text: transcriptionResult.text.substring(0, 100) + '...'
    });

    // Step 3: Generate chat response with menu context
    const systemMessage = `You're a quick, friendly order-taker at Grow Fresh Local Food. Sound natural - like you're actually there.

MENU:
${menuSummary}

YOUR STYLE:
- Super quick responses (1-2 sentences max)
- Use contractions: "I'll" not "I will", "We've got" not "We have"
- Confirm orders: item + price, then total
- If they ask what you have: mention 2-3 popular items, not everything
- Item not on menu? Suggest closest match: "No pizza, but our Italian sandwich is amazing!"
- Add personality sparingly: "Great choice!" or "Coming right up!"

EXAMPLES:
Customer: "What do you have?"
You: "We've got awesome sandwiches, fresh salads, and hearty bowls. What sounds good?"

Customer: "I want a BLT"
You: "One BLT sandwich at $12. Anything else?"

Customer: "That's all"
You: "Perfect! That's $12 total."

Remember: Quick, natural, helpful. Like a real person who's good at their job.`;

    const chatResponse = await ai.chat.respond([
      { role: 'system', content: systemMessage },
      { role: 'user', content: transcriptionResult.text }
    ], {
      context: {
        restaurantId,
        ...(req.user?.id && { userId: req.user.id })
      }
    });

    aiLogger.info('Chat response generated', {
      responseLength: chatResponse.message.length
    });

    // Step 3: Try to parse order if it seems like an order request
    let orderData = null;
    const orderKeywords = ['order', 'want', 'get', 'have', 'buy', 'purchase'];
    const seemsLikeOrder = orderKeywords.some(keyword => 
      transcriptionResult.text.toLowerCase().includes(keyword)
    );

    if (seemsLikeOrder) {
      try {
        const parsedOrder = await aiService.parseOrder(transcriptionResult.text, restaurantId);
        if (parsedOrder.success) {
          orderData = parsedOrder;
        }
      } catch (error) {
        // Order parsing failed, but that's OK - just continue without order data
        aiLogger.debug('Order parsing failed in voice chat, continuing without order data:', error);
      }
    }

    // Step 4: Check if client wants audio response
    const acceptHeader = req.headers.accept || '';
    const wantsAudio = acceptHeader.includes('audio/mpeg');

    if (wantsAudio) {
      // Generate audio response using TTS
      try {
        const ttsResult = await ai.tts.synthesize(chatResponse.message, {
          voice: 'nova'
        });

        aiLogger.info('TTS audio generated', {
          audioSize: ttsResult.audio.length,
          mimeType: ttsResult.mimeType
        });

        // Include order data and transcript in headers for client processing
        const headers: any = {
          'Content-Type': ttsResult.mimeType,
          'Content-Length': ttsResult.audio.length.toString(),
          'Cache-Control': 'no-store',
          'X-Transcript': encodeURIComponent(transcriptionResult.text),
          'X-Response-Text': encodeURIComponent(chatResponse.message)
        };

        // If order was parsed, include it in headers
        if (orderData) {
          headers['X-Order-Data'] = encodeURIComponent(JSON.stringify(orderData));
        }

        res.set(headers);
        
        return res.send(ttsResult.audio);
      } catch (error) {
        aiLogger.error('TTS generation failed, falling back to JSON:', error);
        // Fall through to JSON response if TTS fails
      }
    }

    // Default JSON response
    res.set('Cache-Control', 'no-store');
    return res.json({
      success: true,
      transcript: transcriptionResult.text,
      response: chatResponse.message,
      orderData,
      restaurantId
    });
  } catch (error) {
    aiLogger.error('Voice chat error:', error);
    res.set('Cache-Control', 'no-store');
    
    if ((error as any)?.status === 503) {
      res.set('x-ai-degraded', 'true');
      return res.status(503).json({
        error: 'provider_unavailable'
      });
    }
    
    return res.status(500).json({
      error: 'Voice chat failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Chat with AI assistant using OpenAI
 * Requires authentication for restaurant context
 */
router.post('/chat', aiServiceLimiter, trackAIMetrics('chat'), authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message } = req.body;
    const restaurantId = req.restaurantId || env.DEFAULT_RESTAURANT_ID;
    
    if (!message || typeof message !== 'string') {
      res.set('Cache-Control', 'no-store');
      return res.status(400).json({
        error: 'Message is required'
      });
    }

    aiLogger.info('Chat request via OpenAI', {
      restaurantId,
      userId: req.user?.id,
      messageLength: message.length
    });

    // Load menu for context
    const menuItems = await MenuService.getItems(restaurantId);
    const menuSummary = menuItems.map(item => 
      `- ${item.name}${item.description ? `: ${item.description}` : ''} ($${item.price})`
    ).join('\n');

    // Create system message with menu
    const systemMessage = `You're a quick, friendly order-taker at Grow Fresh Local Food. Sound natural - like you're actually there.

MENU:
${menuSummary}

YOUR STYLE:
- Super quick responses (1-2 sentences max)
- Use contractions: "I'll" not "I will", "We've got" not "We have"
- Confirm orders: item + price, then total
- If they ask what you have: mention 2-3 popular items, not everything
- Item not on menu? Suggest closest match: "No pizza, but our Italian sandwich is amazing!"
- Add personality sparingly: "Great choice!" or "Coming right up!"

EXAMPLES:
Customer: "What do you have?"
You: "We've got awesome sandwiches, fresh salads, and hearty bowls. What sounds good?"

Customer: "I want a BLT"
You: "One BLT sandwich at $12. Anything else?"

Customer: "That's all"
You: "Perfect! That's $12 total."

Remember: Quick, natural, helpful. Like a real person who's good at their job.`;

    // Use ai.chat directly with menu context instead of aiService
    const response = await ai.chat.respond([
      { role: 'system', content: systemMessage },
      { role: 'user', content: message }
    ], {
      context: {
        restaurantId,
        ...(req.user?.id && { userId: req.user.id })
      }
    });
    
    res.set('Cache-Control', 'no-store');
    return res.json({
      success: true,
      message: response.message,
      restaurantId
    });
  } catch (error) {
    aiLogger.error('OpenAI chat error:', error);
    res.set('Cache-Control', 'no-store');
    
    if ((error as any)?.status === 503) {
      res.set('x-ai-degraded', 'true');
      return res.status(503).json({
        error: 'provider_unavailable'
      });
    }
    
    return res.status(500).json({
      error: 'Chat request failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/health', trackAIMetrics('provider-health'), async (_req: Request, res: Response) => {
  try {
    const aiHealthCheck = await checkAIHealth();
    
    // Log internal details but don't expose them
    aiLogger.debug('AI health check', {
      provider: aiHealthCheck.provider,
      status: aiHealthCheck.status,
      details: aiHealthCheck.details
    });
    
    res.set('Cache-Control', 'no-store');
    
    if (aiHealthCheck.status === 'healthy' || aiHealthCheck.status === 'degraded') {
      return res.status(200).json({ ok: true });
    } else {
      return res.status(503).json({ error: 'provider_unavailable' });
    }
  } catch (error) {
    aiLogger.error('Health check failed:', error);
    res.set('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'provider_unavailable' });
  }
});

/**
 * TEST ENDPOINT: Simple TTS test
 * Send text, get audio back - no auth required for testing
 */
router.post('/test-tts', async (req: Request, res: Response) => {
  try {
    const { text = "Hello, this is a test of text to speech." } = req.body;
    
    aiLogger.info('Test TTS requested', { text });
    
    const ttsResult = await ai.tts.synthesize(text, {
      voice: 'nova'
    });
    
    aiLogger.info('Test TTS completed', {
      audioSize: ttsResult.audio.length,
      mimeType: ttsResult.mimeType
    });
    
    res.set({
      'Content-Type': ttsResult.mimeType,
      'Content-Length': ttsResult.audio.length.toString(),
      'Cache-Control': 'no-store'
    });
    
    return res.send(ttsResult.audio);
  } catch (error) {
    aiLogger.error('Test TTS failed:', error);
    // ALWAYS show the actual error for debugging
    return res.status(500).json({
      error: 'TTS test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5) // First 5 lines of stack
      } : String(error)
    });
  }
});

/**
 * TEST ENDPOINT: Simple transcription test
 * Upload audio, get text back - no auth required for testing
 */
router.post('/test-transcribe', audioUpload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file required' });
    }
    
    aiLogger.info('Test transcribe requested', {
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });
    
    const result = await ai.transcriber.transcribe(req.file.buffer, {
      model: req.file.mimetype
    });
    
    aiLogger.info('Test transcribe completed', {
      text: result.text
    });
    
    return res.json({
      success: true,
      text: result.text,
      duration: result.duration
    });
  } catch (error) {
    aiLogger.error('Test transcribe failed:', error);
    // ALWAYS show the actual error for debugging
    return res.status(500).json({
      error: 'Transcription test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5) // First 5 lines of stack
      } : String(error)
    });
  }
});

export { router as aiRoutes };