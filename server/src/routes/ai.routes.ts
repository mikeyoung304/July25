import { Router, Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import { getBuildPanelService } from '../services/buildpanel.service';
import { logger } from '../utils/logger';
import { audioUpload } from '../middleware/fileValidation';
import { AuthenticatedRequest, authenticate, requireRole } from '../middleware/auth';
import { aiServiceLimiter, transcriptionLimiter } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validation';
import { menuUploadSchema, parseOrderSchema } from '../validation/ai.validation';

const router = Router();

const aiLogger = logger.child({ module: 'ai-routes' });

/**
 * Upload menu data for AI parsing
 * Requires admin role to prevent unauthorized menu modifications
 */
router.post('/menu', aiServiceLimiter, authenticate, requireRole(['admin', 'manager']), validateRequest(menuUploadSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || 'default';

    // Sync menu from BuildPanel instead of uploading
    await aiService.syncMenuFromBuildPanel(restaurantId);
    
    aiLogger.info('Menu synced from BuildPanel', { 
      restaurantId: req.restaurantId, 
      userId: req.user?.id
    });
    
    return res.json({
      success: true,
      message: 'Menu synced from BuildPanel successfully',
      restaurantId
    });
  } catch (error) {
    aiLogger.error('Menu sync error:', error);
    return res.status(500).json({
      error: 'Failed to sync menu from BuildPanel',
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
 * Transcribe audio file
 * Requires authentication to prevent abuse of transcription service
 */
router.post('/transcribe', transcriptionLimiter, authenticate, audioUpload.single('audio'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No audio file provided'
      });
    }

    aiLogger.info('Audio transcription requested', {
      restaurantId: req.restaurantId,
      userId: req.user?.id,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });
    
    // Use the AI service to transcribe the audio with restaurant context
    const restaurantId = req.restaurantId || 'default';
    const result = await aiService.transcribeAudioFile(req.file.buffer, req.file.mimetype, restaurantId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Transcription failed'
      });
    }
    
    return res.json({
      success: true,
      text: result.text,
      transcript: result.text, // Include both for compatibility
      duration: result.duration,
      restaurantId: req.restaurantId
    });
  } catch (error) {
    aiLogger.error('Transcription error:', error);
    return res.status(500).json({
      error: 'Transcription failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Parse order from text using BuildPanel
 * Requires authentication to ensure restaurant context
 */
router.post('/parse-order', aiServiceLimiter, authenticate, validateRequest(parseOrderSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text } = req.body; // Already validated by middleware
    const restaurantId = req.restaurantId || 'default';

    aiLogger.info('Order parsing requested via BuildPanel', {
      restaurantId,
      userId: req.user?.id,
      textLength: text.length
    });
    
    const result = await aiService.parseOrder(text, restaurantId);
    return res.json({
      ...result,
      restaurantId,
      parsedBy: req.user?.id
    });
  } catch (error) {
    aiLogger.error('BuildPanel order parsing error:', error);
    return res.status(500).json({
      error: 'Failed to parse order via BuildPanel',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check for AI service
 */
/**
 * Chat with AI assistant using BuildPanel
 * Requires authentication for restaurant context
 */
router.post('/chat', aiServiceLimiter, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message } = req.body;
    const restaurantId = req.restaurantId || 'default';
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required'
      });
    }

    aiLogger.info('Chat request via BuildPanel', {
      restaurantId,
      userId: req.user?.id,
      messageLength: message.length
    });

    const response = await aiService.chat(message, restaurantId, req.user?.id);
    
    return res.json({
      success: true,
      message: response,
      restaurantId
    });
  } catch (error) {
    aiLogger.error('BuildPanel chat error:', error);
    return res.status(500).json({
      error: 'Chat request failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/health', async (_req: Request, res: Response) => {
  const menu = aiService.getMenu();
  const buildPanelHealthy = await getBuildPanelService().healthCheck();
  
  return res.json({
    status: 'ok',
    hasMenu: !!menu,
    menuItems: menu?.menu?.length || 0,
    buildPanelStatus: buildPanelHealthy ? 'connected' : 'disconnected'
  });
});

export { router as aiRoutes };