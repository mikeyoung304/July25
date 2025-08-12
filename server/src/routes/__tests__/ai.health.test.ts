import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { aiRoutes } from '../ai.routes';

// Mock the AI module
vi.mock('../../ai', () => ({
  checkAIHealth: vi.fn(),
  ai: {
    transcriber: { transcribe: vi.fn() },
    chat: { respond: vi.fn() },
    tts: { synthesize: vi.fn() },
    orderNlp: { parse: vi.fn() }
  }
}));

// Mock the aiService
vi.mock('../../services/ai.service', () => ({
  aiService: {
    getMenu: vi.fn(),
    syncMenuFromDatabase: vi.fn(),
    processVoiceAudio: vi.fn(),
    transcribeAudioFile: vi.fn(),
    parseOrder: vi.fn(),
    chat: vi.fn()
  }
}));

// Mock the logger
vi.mock('../../utils/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn()
    })
  }
}));

// Mock middleware
vi.mock('../../middleware/auth', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
  AuthenticatedRequest: {}
}));

vi.mock('../../middleware/rateLimiter', () => ({
  aiServiceLimiter: (_req: any, _res: any, next: any) => next(),
  transcriptionLimiter: (_req: any, _res: any, next: any) => next()
}));

vi.mock('../../middleware/validation', () => ({
  validateRequest: () => (_req: any, _res: any, next: any) => next()
}));

vi.mock('../../middleware/metrics', () => ({
  trackAIMetrics: () => (_req: any, _res: any, next: any) => next()
}));

vi.mock('../../middleware/fileValidation', () => ({
  audioUpload: {
    single: () => (_req: any, _res: any, next: any) => next()
  }
}));

describe('AI Provider Health Endpoint', () => {
  let app: express.Application;
  let checkAIHealth: any;

  beforeEach(() => {
    app = express();
    app.use('/api/v1/ai', aiRoutes);
    
    // Access the mocked function directly
    const { checkAIHealth: mockedCheckAIHealth } = require('../../ai');
    checkAIHealth = mockedCheckAIHealth;
    vi.clearAllMocks();
  });

  it('should return { ok: true } with 200 when provider is healthy', async () => {
    checkAIHealth.mockResolvedValue({
      provider: 'openai',
      status: 'healthy',
      details: { message: 'OpenAI API accessible' }
    });

    const response = await request(app)
      .get('/api/v1/ai/health')
      .expect(200);

    expect(response.body).toEqual({ ok: true });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('should return { ok: true } with 200 when provider is degraded', async () => {
    checkAIHealth.mockResolvedValue({
      provider: 'stubs',
      status: 'degraded',
      details: { message: 'Using stub implementations' }
    });

    const response = await request(app)
      .get('/api/v1/ai/health')
      .expect(200);

    expect(response.body).toEqual({ ok: true });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('should return { error: "provider_unavailable" } with 503 when provider is unavailable', async () => {
    checkAIHealth.mockResolvedValue({
      provider: 'openai',
      status: 'error',
      details: { message: 'Connection failed' }
    });

    const response = await request(app)
      .get('/api/v1/ai/health')
      .expect(503);

    expect(response.body).toEqual({ error: 'provider_unavailable' });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('should return { error: "provider_unavailable" } with 503 when health check throws', async () => {
    checkAIHealth.mockRejectedValue(new Error('Health check failed'));

    const response = await request(app)
      .get('/api/v1/ai/health')
      .expect(503);

    expect(response.body).toEqual({ error: 'provider_unavailable' });
    expect(response.headers['cache-control']).toBe('no-store');
  });
});