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
import { voiceRoutes } from '../voice/voice-routes';

const router = Router();

const aiLogger = logger.child({ module: 'ai-routes' });

/**
 * Upload menu data for AI parsing
 * Requires admin role to prevent unauthorized menu modifications
 */
router.post('/menu', aiServiceLimiter, authenticate, requireRole(['admin', 'manager']), validateRequest(menuUploadSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || 'default';

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

    const restaurantId = req.headers['x-restaurant-id'] as string || 'default';
    
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
    const restaurantId = req.headers['x-restaurant-id'] as string || 'default';
    
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
    const restaurantId = req.restaurantId || 'default';

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
router.post('/voice-chat', aiServiceLimiter, trackAIMetrics('voice-chat'), authenticate, requireRole(['admin', 'manager', 'user', 'kiosk_demo']), requireScope(['ai.voice:chat']), audioUpload.single('audio'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      res.set('Cache-Control', 'no-store');
      return res.status(400).json({
        error: 'Audio file is required'
      });
    }

    const restaurantId = req.restaurantId || 'default';
    
    aiLogger.info('Voice chat request via OpenAI', {
      restaurantId,
      userId: req.user?.id,
      fileSize: req.file.size
    });

    // Step 1: Transcribe the audio
    const transcriptionResult = await ai.transcriber.transcribe(req.file.buffer, {
      model: req.file.mimetype
    });

    if (!transcriptionResult.text) {
      res.set('Cache-Control', 'no-store');
      return res.status(400).json({
        error: 'No transcription available',
        transcript: ''
      });
    }

    // Step 2: Generate chat response
    const chatResponse = await ai.chat.respond([
      { role: 'user', content: transcriptionResult.text }
    ], {
      context: { restaurantId, userId: req.user?.id }
    });

    // Step 3: Check if client wants audio response
    const acceptHeader = req.headers.accept || '';
    const wantsAudio = acceptHeader.includes('audio/mpeg');

    if (wantsAudio) {
      // Generate audio response using TTS
      try {
        const audioBuffer = await ai.textToSpeech.generateSpeech(chatResponse.message, {
          voice: 'alloy',
          format: 'mp3'
        });

        res.set({
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.length.toString(),
          'Cache-Control': 'no-store'
        });
        
        return res.send(audioBuffer);
      } catch (error) {
        aiLogger.error('TTS generation failed, falling back to JSON:', error);
        // Fall through to JSON response if TTS fails
      }
    }

    // Default JSON response
    // Step 4: Try to parse order if it seems like an order request
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
    const restaurantId = req.restaurantId || 'default';
    
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

    const response = await aiService.chat(message, restaurantId, req.user?.id);
    
    res.set('Cache-Control', 'no-store');
    return res.json({
      success: true,
      message: response,
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

// Mount voice routes
router.use('/voice', voiceRoutes);

export { router as aiRoutes };