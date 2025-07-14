import { Router, Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import { logger } from '../utils/logger';
import { audioUpload } from '../middleware/fileValidation';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const aiLogger = logger.child({ module: 'ai-routes' });

/**
 * Upload menu data for AI parsing
 */
router.post('/menu', async (req: Request, res: Response) => {
  try {
    const menuData = req.body;
    
    if (!menuData.restaurant || !menuData.menu) {
      return res.status(400).json({
        error: 'Invalid menu data',
        message: 'Menu must include restaurant name and menu items'
      });
    }

    aiService.updateMenu(menuData);
    
    res.json({
      success: true,
      message: 'Menu uploaded successfully',
      itemCount: menuData.menu.length
    });
  } catch (error) {
    aiLogger.error('Menu upload error:', error);
    res.status(500).json({
      error: 'Failed to upload menu',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get current menu
 */
router.get('/menu', (_req: Request, res: Response) => {
  const menu = aiService.getMenu();
  
  if (!menu) {
    return res.status(404).json({
      error: 'No menu loaded',
      message: 'Please upload menu data first'
    });
  }
  
  res.json(menu);
});

/**
 * Transcribe audio file
 */
router.post('/transcribe', audioUpload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No audio file provided'
      });
    }

    // This endpoint is for direct file upload (not WebSocket streaming)
    // For now, return a placeholder
    res.json({
      success: true,
      text: 'Direct audio transcription not implemented. Use WebSocket streaming.',
      duration: 0
    });
  } catch (error) {
    aiLogger.error('Transcription error:', error);
    res.status(500).json({
      error: 'Transcription failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Parse order from text
 */
router.post('/parse-order', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text } = req.body;
    const restaurantId = req.restaurantId || 'default';
    
    if (!text) {
      return res.status(400).json({
        error: 'No text provided'
      });
    }

    const result = await aiService.parseOrder(text, restaurantId);
    res.json(result);
  } catch (error) {
    aiLogger.error('Order parsing error:', error);
    res.status(500).json({
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
  
  res.json({
    status: 'ok',
    hasMenu: !!menu,
    menuItems: menu?.menu?.length || 0
  });
});

export { router as aiRoutes };