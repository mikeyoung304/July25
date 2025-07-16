import { Router, Request, Response } from 'express';
import { aiService } from '../services/ai.service';
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
    const menuData = req.body; // Already validated by middleware

    // Add restaurant context from authenticated request
    const menuWithContext = {
      ...menuData,
      restaurantId: req.restaurantId,
      uploadedBy: req.user?.id,
      uploadedAt: new Date().toISOString()
    };
    
    aiService.updateMenu(menuWithContext);
    
    aiLogger.info('Menu uploaded', { 
      restaurantId: req.restaurantId, 
      userId: req.user?.id,
      itemCount: menuData.menu.length 
    });
    
    return res.json({
      success: true,
      message: 'Menu uploaded successfully',
      itemCount: menuData.menu.length
    });
  } catch (error) {
    aiLogger.error('Menu upload error:', error);
    return res.status(500).json({
      error: 'Failed to upload menu',
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
      fileSize: req.file.size
    });
    
    // This endpoint is for direct file upload (not WebSocket streaming)
    // For now, return a placeholder
    return res.json({
      success: true,
      text: 'Direct audio transcription not implemented. Use WebSocket streaming.',
      duration: 0,
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
 * Parse order from text
 * Requires authentication to ensure restaurant context
 */
router.post('/parse-order', aiServiceLimiter, authenticate, validateRequest(parseOrderSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text } = req.body; // Already validated by middleware
    const restaurantId = req.restaurantId!;

    aiLogger.info('Order parsing requested', {
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
    aiLogger.error('Order parsing error:', error);
    return res.status(500).json({
      error: 'Failed to parse order',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check for AI service
 */
router.get('/health', (_req: Request, res: Response) => {
  const menu = aiService.getMenu();
  
  return res.json({
    status: 'ok',
    hasMenu: !!menu,
    menuItems: menu?.menu?.length || 0
  });
});

export { router as aiRoutes };