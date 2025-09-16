import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { normalizeSessionConfig, SessionConfig, PROVIDER_LIMITS } from '../voice/sessionLimits';
import { RestaurantService } from '../services/restaurant.service';
import { voiceMetrics, measureTimeAsync } from '../../../shared/utils/voice-metrics';

export interface VoiceSessionRequest extends Request {
  voiceSessionConfig?: Required<SessionConfig>;
}

const voiceLogger = logger.child({ module: 'voice-session-normalizer' });

/**
 * Middleware to normalize voice session configuration
 * Applies fallback chain: restaurant settings → environment variables → defaults
 * All values are still validated through the normalizer
 */
export async function normalizeVoiceSession(
  req: VoiceSessionRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const startTime = Date.now();
  let sessionId: string | undefined;

  try {
    // Extract mode from request body, default to 'customer'
    const mode: 'employee' | 'customer' = req.body?.mode === 'employee' ? 'employee' : 'customer';

    // Get restaurant ID from the request (should be set by auth middleware)
    const restaurantId = (req as any).restaurantId;

    // Generate session ID for tracking
    sessionId = voiceMetrics.generateSessionId();

    // Fetch restaurant voice settings if restaurant ID is available
    let restaurantVoiceSettings: SessionConfig = {};
    if (restaurantId) {
      try {
        const settings = await RestaurantService.getVoiceSettings(restaurantId, mode);
        if (settings) {
          restaurantVoiceSettings = settings;
          voiceLogger.debug('Restaurant voice settings loaded', {
            restaurantId,
            mode,
            settings
          });
        } else {
          voiceLogger.debug('No restaurant voice settings found', {
            restaurantId,
            mode
          });
        }
      } catch (error) {
        voiceLogger.warn('Failed to load restaurant voice settings', {
          restaurantId,
          mode,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Continue without restaurant settings
      }
    }

    // Build session config from request body
    const inputConfig: SessionConfig = {
      temperature: req.body?.temperature,
      topP: req.body?.topP,
      presencePenalty: req.body?.presencePenalty,
      frequencyPenalty: req.body?.frequencyPenalty,
      max_response_output_tokens: req.body?.max_response_output_tokens
    };

    // Apply environment variable overrides (still subject to clamping)
    const envOverrides: SessionConfig = {};

    if (process.env.VOICE_TEMPERATURE) {
      const temp = parseFloat(process.env.VOICE_TEMPERATURE);
      if (!isNaN(temp)) {
        envOverrides.temperature = temp;
        voiceLogger.debug('Environment override for temperature', {
          original: inputConfig.temperature,
          override: temp
        });
      }
    }

    if (process.env.VOICE_TOP_P) {
      const topP = parseFloat(process.env.VOICE_TOP_P);
      if (!isNaN(topP)) {
        envOverrides.topP = topP;
        voiceLogger.debug('Environment override for topP', {
          original: inputConfig.topP,
          override: topP
        });
      }
    }

    if (process.env.VOICE_PRESENCE_PENALTY) {
      const penalty = parseFloat(process.env.VOICE_PRESENCE_PENALTY);
      if (!isNaN(penalty)) {
        envOverrides.presencePenalty = penalty;
        voiceLogger.debug('Environment override for presencePenalty', {
          original: inputConfig.presencePenalty,
          override: penalty
        });
      }
    }

    if (process.env.VOICE_FREQUENCY_PENALTY) {
      const penalty = parseFloat(process.env.VOICE_FREQUENCY_PENALTY);
      if (!isNaN(penalty)) {
        envOverrides.frequencyPenalty = penalty;
        voiceLogger.debug('Environment override for frequencyPenalty', {
          original: inputConfig.frequencyPenalty,
          override: penalty
        });
      }
    }

    if (process.env.VOICE_MAX_TOKENS) {
      const maxTokens = parseInt(process.env.VOICE_MAX_TOKENS, 10);
      if (!isNaN(maxTokens)) {
        envOverrides.max_response_output_tokens = maxTokens;
        voiceLogger.debug('Environment override for max_response_output_tokens', {
          original: inputConfig.max_response_output_tokens,
          override: maxTokens
        });
      }
    }

    // Apply fallback chain: input → restaurant settings → environment → defaults
    // The normalizer will handle final defaults and clamping
    const mergedConfig: SessionConfig = {
      ...restaurantVoiceSettings,  // Restaurant settings as base
      ...envOverrides,             // Environment overrides
      ...inputConfig               // Request input takes highest priority
    };

    // Log the fallback chain for debugging
    voiceLogger.debug('Voice config fallback chain applied', {
      mode,
      restaurantId,
      inputConfig,
      restaurantSettings: restaurantVoiceSettings,
      envOverrides,
      mergedConfig
    });

    // Normalize the session config
    const normalizedConfig = normalizeSessionConfig(mergedConfig, mode);

    // Log normalization events with structured logging
    const originalValues = {
      temperature: mergedConfig.temperature,
      topP: mergedConfig.topP,
      presencePenalty: mergedConfig.presencePenalty,
      frequencyPenalty: mergedConfig.frequencyPenalty,
      max_response_output_tokens: mergedConfig.max_response_output_tokens
    };

    // Track source of final values for logging
    const configSources = {
      temperature: inputConfig.temperature !== undefined ? 'request' :
                  envOverrides.temperature !== undefined ? 'environment' :
                  restaurantVoiceSettings.temperature !== undefined ? 'restaurant' : 'default',
      topP: inputConfig.topP !== undefined ? 'request' :
            envOverrides.topP !== undefined ? 'environment' :
            restaurantVoiceSettings.topP !== undefined ? 'restaurant' : 'default',
      presencePenalty: inputConfig.presencePenalty !== undefined ? 'request' :
                      envOverrides.presencePenalty !== undefined ? 'environment' :
                      restaurantVoiceSettings.presencePenalty !== undefined ? 'restaurant' : 'default',
      frequencyPenalty: inputConfig.frequencyPenalty !== undefined ? 'request' :
                       envOverrides.frequencyPenalty !== undefined ? 'environment' :
                       restaurantVoiceSettings.frequencyPenalty !== undefined ? 'restaurant' : 'default',
      max_response_output_tokens: inputConfig.max_response_output_tokens !== undefined ? 'request' :
                                 envOverrides.max_response_output_tokens !== undefined ? 'environment' :
                                 restaurantVoiceSettings.max_response_output_tokens !== undefined ? 'restaurant' : 'default'
    };

    const changed: Record<string, { from: number | undefined, to: number, reason: string }> = {};

    // Track what was normalized and why
    if (originalValues.temperature !== normalizedConfig.temperature) {
      const wasUndefined = originalValues.temperature === undefined;
      const wasOutOfBounds = !wasUndefined && (
        originalValues.temperature! < PROVIDER_LIMITS.temperature.min ||
        originalValues.temperature! > PROVIDER_LIMITS.temperature.max
      );

      changed.temperature = {
        from: originalValues.temperature,
        to: normalizedConfig.temperature,
        reason: wasUndefined ? 'default_applied' : wasOutOfBounds ? 'clamped_to_limits' : 'normalized'
      };
    }

    if (originalValues.topP !== normalizedConfig.topP) {
      changed.topP = {
        from: originalValues.topP,
        to: normalizedConfig.topP,
        reason: originalValues.topP === undefined ? 'default_applied' : 'clamped_to_limits'
      };
    }

    if (originalValues.presencePenalty !== normalizedConfig.presencePenalty) {
      changed.presencePenalty = {
        from: originalValues.presencePenalty,
        to: normalizedConfig.presencePenalty,
        reason: originalValues.presencePenalty === undefined ? 'default_applied' : 'clamped_to_limits'
      };
    }

    if (originalValues.frequencyPenalty !== normalizedConfig.frequencyPenalty) {
      changed.frequencyPenalty = {
        from: originalValues.frequencyPenalty,
        to: normalizedConfig.frequencyPenalty,
        reason: originalValues.frequencyPenalty === undefined ? 'default_applied' : 'clamped_to_limits'
      };
    }

    if (originalValues.max_response_output_tokens !== normalizedConfig.max_response_output_tokens) {
      changed.max_response_output_tokens = {
        from: originalValues.max_response_output_tokens,
        to: normalizedConfig.max_response_output_tokens,
        reason: originalValues.max_response_output_tokens === undefined ? 'default_applied' : 'clamped_to_limits'
      };
    }

    // Log normalization events
    if (Object.keys(changed).length > 0) {
      voiceLogger.info('Voice session config normalized', {
        mode,
        userId: (req as any).user?.id,
        restaurantId: (req as any).restaurantId,
        configSources,
        changes: changed,
        finalConfig: normalizedConfig
      });
    } else {
      voiceLogger.debug('Voice session config already within limits', {
        mode,
        userId: (req as any).user?.id,
        restaurantId: (req as any).restaurantId,
        configSources,
        config: normalizedConfig
      });
    }

    // Attach normalized config to request
    req.voiceSessionConfig = normalizedConfig;

    // Emit session normalization metrics
    if (sessionId) {
      voiceMetrics.sessionNormalized({
        sessionId,
        restaurantId: restaurantId || 'unknown',
        mode,
        configSource: configSources,
        changes: changed,
        normalizationTimeMs: Date.now() - startTime
      });
    }

    next();
  } catch (error) {
    voiceLogger.error('Error normalizing voice session config', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: (req as any).user?.id,
      restaurantId: (req as any).restaurantId
    });

    // Fallback to default config for the mode
    const mode: 'employee' | 'customer' = req.body?.mode === 'employee' ? 'employee' : 'customer';
    req.voiceSessionConfig = normalizeSessionConfig({}, mode);

    // Emit error metrics if we have a session ID
    if (sessionId) {
      voiceMetrics.sessionNormalized({
        sessionId,
        restaurantId: (req as any).restaurantId || 'unknown',
        mode,
        configSource: {
          temperature: 'default',
          maxTokens: 'default'
        },
        changes: {},
        normalizationTimeMs: Date.now() - startTime
      });
    }

    next();
  }
}