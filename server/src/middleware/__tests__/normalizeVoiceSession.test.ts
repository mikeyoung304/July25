import { normalizeVoiceSession, VoiceSessionRequest } from '../normalizeVoiceSession';
import { RestaurantService } from '../../services/restaurant.service';
import { Request, Response, NextFunction } from 'express';
import { PROVIDER_LIMITS } from '../../voice/sessionLimits';
import { vi } from 'vitest';

// Mock the restaurant service
vi.mock('../../services/restaurant.service');
const mockRestaurantService = vi.mocked(RestaurantService, true);

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    child: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    })
  }
}));

describe('normalizeVoiceSession middleware', () => {
  let req: Partial<VoiceSessionRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      body: {},
      restaurantId: 'test-restaurant'
    };
    res = {};
    next = vi.fn();

    // Clear mocks
    vi.clearAllMocks();

    // Clear environment variables
    delete process.env.VOICE_TEMPERATURE;
    delete process.env.VOICE_TOP_P;
    delete process.env.VOICE_PRESENCE_PENALTY;
    delete process.env.VOICE_FREQUENCY_PENALTY;
    delete process.env.VOICE_MAX_TOKENS;
  });

  describe('fallback chain priority', () => {
    it('should prioritize request parameters over all other sources', async () => {
      // Setup restaurant settings
      mockRestaurantService.getVoiceSettings.mockResolvedValue({
        temperature: 0.8,
        topP: 0.9
      });

      // Setup environment overrides
      process.env.VOICE_TEMPERATURE = '0.7';
      process.env.VOICE_TOP_P = '0.8';

      // Setup request parameters (highest priority)
      req.body = {
        mode: 'customer',
        temperature: 0.75,
        topP: 0.85
      };

      await normalizeVoiceSession(req as VoiceSessionRequest, res as Response, next);

      expect(req.voiceSessionConfig?.temperature).toBe(0.75); // Request value
      expect(req.voiceSessionConfig?.topP).toBe(0.85); // Request value
      expect(next).toHaveBeenCalled();
    });

    it('should fall back to environment variables when request params are missing', async () => {
      // Setup restaurant settings
      mockRestaurantService.getVoiceSettings.mockResolvedValue({
        temperature: 0.8,
        topP: 0.9
      });

      // Setup environment overrides
      process.env.VOICE_TEMPERATURE = '0.7';
      process.env.VOICE_TOP_P = '0.8';

      req.body = { mode: 'customer' };

      await normalizeVoiceSession(req as VoiceSessionRequest, res as Response, next);

      expect(req.voiceSessionConfig?.temperature).toBe(0.7); // Environment value
      expect(req.voiceSessionConfig?.topP).toBe(0.8); // Environment value
      expect(next).toHaveBeenCalled();
    });

    it('should fall back to restaurant settings when env and request are missing', async () => {
      // Setup restaurant settings
      mockRestaurantService.getVoiceSettings.mockResolvedValue({
        temperature: 0.8,
        topP: 0.9,
        presencePenalty: 0.1
      });

      req.body = { mode: 'customer' };

      await normalizeVoiceSession(req as VoiceSessionRequest, res as Response, next);

      expect(req.voiceSessionConfig?.temperature).toBe(0.8); // Restaurant value
      expect(req.voiceSessionConfig?.topP).toBe(0.9); // Restaurant value
      expect(req.voiceSessionConfig?.presencePenalty).toBe(0.1); // Restaurant value
      expect(next).toHaveBeenCalled();
    });

    it('should fall back to mode defaults when no other sources provide values', async () => {
      // No restaurant settings
      mockRestaurantService.getVoiceSettings.mockResolvedValue(null);

      req.body = { mode: 'customer' };

      await normalizeVoiceSession(req as VoiceSessionRequest, res as Response, next);

      expect(req.voiceSessionConfig?.temperature).toBe(PROVIDER_LIMITS.temperature.customerDefault);
      expect(req.voiceSessionConfig?.max_response_output_tokens).toBe(PROVIDER_LIMITS.maxTokens.customerDefault);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('mode-specific settings', () => {
    it('should fetch employee settings for employee mode', async () => {
      mockRestaurantService.getVoiceSettings.mockResolvedValue({
        temperature: 0.65,
        max_response_output_tokens: 30
      });

      req.body = { mode: 'employee' };

      await normalizeVoiceSession(req as VoiceSessionRequest, res as Response, next);

      expect(mockRestaurantService.getVoiceSettings).toHaveBeenCalledWith('test-restaurant', 'employee');
      expect(req.voiceSessionConfig?.temperature).toBe(0.65);
      expect(req.voiceSessionConfig?.max_response_output_tokens).toBe(30);
    });

    it('should fetch customer settings for customer mode', async () => {
      mockRestaurantService.getVoiceSettings.mockResolvedValue({
        temperature: 0.9,
        max_response_output_tokens: 600
      });

      req.body = { mode: 'customer' };

      await normalizeVoiceSession(req as VoiceSessionRequest, res as Response, next);

      expect(mockRestaurantService.getVoiceSettings).toHaveBeenCalledWith('test-restaurant', 'customer');
      expect(req.voiceSessionConfig?.temperature).toBe(0.9);
      expect(req.voiceSessionConfig?.max_response_output_tokens).toBe(600);
    });
  });

  describe('error handling', () => {
    it('should continue with defaults when restaurant service fails', async () => {
      mockRestaurantService.getVoiceSettings.mockRejectedValue(new Error('Database error'));

      req.body = { mode: 'customer' };

      await normalizeVoiceSession(req as VoiceSessionRequest, res as Response, next);

      expect(req.voiceSessionConfig?.temperature).toBe(PROVIDER_LIMITS.temperature.customerDefault);
      expect(next).toHaveBeenCalled();
    });

    it('should handle missing restaurant ID gracefully', async () => {
      req.restaurantId = undefined;
      req.body = { mode: 'customer' };

      await normalizeVoiceSession(req as VoiceSessionRequest, res as Response, next);

      expect(mockRestaurantService.getVoiceSettings).not.toHaveBeenCalled();
      expect(req.voiceSessionConfig?.temperature).toBe(PROVIDER_LIMITS.temperature.customerDefault);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('value normalization', () => {
    it('should clamp values that exceed provider limits', async () => {
      mockRestaurantService.getVoiceSettings.mockResolvedValue({
        temperature: 3.0, // Exceeds max of 2.0
        topP: -0.5,       // Below min of 0.0
        max_response_output_tokens: 10000 // Exceeds max of 4096
      });

      req.body = { mode: 'customer' };

      await normalizeVoiceSession(req as VoiceSessionRequest, res as Response, next);

      expect(req.voiceSessionConfig?.temperature).toBe(PROVIDER_LIMITS.temperature.max);
      expect(req.voiceSessionConfig?.topP).toBe(PROVIDER_LIMITS.topP.min);
      expect(req.voiceSessionConfig?.max_response_output_tokens).toBe(PROVIDER_LIMITS.maxTokens.max);
    });

    it('should enforce minimum temperature for Realtime API', async () => {
      mockRestaurantService.getVoiceSettings.mockResolvedValue({
        temperature: 0.3 // Below Realtime API minimum of 0.6
      });

      req.body = { mode: 'customer' };

      await normalizeVoiceSession(req as VoiceSessionRequest, res as Response, next);

      expect(req.voiceSessionConfig?.temperature).toBe(PROVIDER_LIMITS.temperature.min); // 0.6
    });
  });
});
