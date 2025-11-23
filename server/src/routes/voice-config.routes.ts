/**
 * Voice Configuration Routes
 * API endpoints for managing voice ordering configuration
 * Created: 2025-11-23 (Phase 4: Cleanup)
 */

import { Router } from 'express';
import { VoiceConfigService } from '../services/voice-config.service';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { BadRequest, NotFound } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import type {
  CreateVoiceModifierRuleDTO,
  UpdateVoiceModifierRuleDTO,
} from '@rebuild/shared';

const router = Router();
const routeLogger = logger.child({ route: 'voice-config' });

// ============================================================================
// VOICE MENU CONFIGURATION
// ============================================================================

/**
 * GET /api/v1/voice-config/menu
 * Get complete voice menu configuration (items with aliases, tax rate, modifier rules)
 */
router.get('/menu', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    routeLogger.info('Fetching voice menu configuration', { restaurantId });

    const config = await VoiceConfigService.getMenuConfiguration(restaurantId);
    res.json(config);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// MODIFIER RULES CRUD
// ============================================================================

/**
 * GET /api/v1/voice-config/modifier-rules
 * Get all voice modifier rules for a restaurant
 */
router.get('/modifier-rules', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const { active_only } = req.query;

    routeLogger.info('Fetching voice modifier rules', {
      restaurantId,
      activeOnly: active_only === 'true',
    });

    const rules = await VoiceConfigService.getModifierRules(
      restaurantId,
      active_only === 'true'
    );

    res.json(rules);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/voice-config/modifier-rules/:id
 * Get a specific voice modifier rule
 */
router.get('/modifier-rules/:id', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;

    if (!id) {
      throw BadRequest('Rule ID is required');
    }

    const rule = await VoiceConfigService.getModifierRule(restaurantId, id);

    if (!rule) {
      throw NotFound('Modifier rule not found');
    }

    res.json(rule);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/voice-config/modifier-rules
 * Create a new voice modifier rule
 */
router.post('/modifier-rules', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw BadRequest('Authentication required');
    }

    const restaurantId = req.restaurantId!;
    const ruleData: CreateVoiceModifierRuleDTO = {
      ...req.body,
      restaurant_id: restaurantId, // Ensure tenant isolation
    };

    routeLogger.info('Creating voice modifier rule', {
      restaurantId,
      userId: req.user.id,
      actionType: ruleData.action_type,
    });

    // Validation
    if (!ruleData.trigger_phrases || ruleData.trigger_phrases.length === 0) {
      throw BadRequest('At least one trigger phrase is required');
    }

    if (!ruleData.action_type || !ruleData.target_name) {
      throw BadRequest('action_type and target_name are required');
    }

    const rule = await VoiceConfigService.createModifierRule(ruleData);

    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/voice-config/modifier-rules/:id
 * Update an existing voice modifier rule
 */
router.patch('/modifier-rules/:id', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw BadRequest('Authentication required');
    }

    const restaurantId = req.restaurantId!;
    const { id } = req.params;
    const updates: UpdateVoiceModifierRuleDTO = req.body;

    if (!id) {
      throw BadRequest('Rule ID is required');
    }

    routeLogger.info('Updating voice modifier rule', {
      restaurantId,
      userId: req.user.id,
      ruleId: id,
    });

    const rule = await VoiceConfigService.updateModifierRule(restaurantId, id, updates);

    if (!rule) {
      throw NotFound('Modifier rule not found');
    }

    res.json(rule);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/voice-config/modifier-rules/:id
 * Delete a voice modifier rule
 */
router.delete('/modifier-rules/:id', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw BadRequest('Authentication required');
    }

    const restaurantId = req.restaurantId!;
    const { id } = req.params;

    if (!id) {
      throw BadRequest('Rule ID is required');
    }

    routeLogger.info('Deleting voice modifier rule', {
      restaurantId,
      userId: req.user.id,
      ruleId: id,
    });

    const success = await VoiceConfigService.deleteModifierRule(restaurantId, id);

    if (!success) {
      throw NotFound('Modifier rule not found');
    }

    res.json({
      success: true,
      message: 'Modifier rule deleted',
      deleted_id: id,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * POST /api/v1/voice-config/cache/clear
 * Clear voice configuration cache (requires auth)
 */
router.post('/cache/clear', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw BadRequest('Authentication required');
    }

    const restaurantId = req.restaurantId!;
    routeLogger.info('Clearing voice config cache', { restaurantId, userId: req.user.id });

    VoiceConfigService.clearCache(restaurantId);

    res.json({
      success: true,
      message: 'Voice configuration cache cleared',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export { router as voiceConfigRoutes };
