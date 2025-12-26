/**
 * AI Services Module
 * Provides unified access to AI capabilities using OpenAI
 */

import OpenAI from 'openai';
import { Transcriber } from './core/transcriber';
import { TTS } from './core/tts';
import { Chat } from './core/chat';
import { OrderNLP } from './core/order-nlp';

// Import OpenAI adapters
import { OpenAITranscriber } from './adapters/openai/openai-transcriber';
import { OpenAITextToSpeech } from './adapters/openai/openai-tts';
import { OpenAIChatAgent } from './adapters/openai/openai-chat';
import { OpenAIOrderNLP } from './adapters/openai/openai-order-nlp';

// Import services
import { OrderMatchingService } from '../services/OrderMatchingService';
import { MenuService } from '../services/menu.service';
import { logger } from '../utils/logger';
import { getErrorMessage } from '@rebuild/shared';

// Export interfaces
export * from './core/transcriber';
export * from './core/tts';
export * from './core/chat';
export * from './core/order-nlp';

const aiLogger = logger.child({ service: 'AI-Container' });

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;
let transcriber: Transcriber;
let tts: TTS;
let chat: Chat;
let orderNLP: OrderNLP;

try {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for AI features');
  }
  
  openaiClient = new OpenAI({ apiKey });
  
  // Create OrderMatchingService with MenuService dependency
  const orderMatchingService = new OrderMatchingService(async (restaurantId: string) => {
    const menu = await MenuService.getItems(restaurantId);
    return menu.map(item => ({
      id: item.id,
      name: item.name,
      aliases: item.aliases
    }));
  });

  // Create service instances with OpenAI adapters
  transcriber = new OpenAITranscriber();
  tts = new OpenAITextToSpeech();
  const chatAgent = new OpenAIChatAgent();
  chat = chatAgent; // Use the same instance for both interfaces
  orderNLP = new OpenAIOrderNLP(openaiClient, orderMatchingService);
  
  aiLogger.info('AI services initialized with OpenAI adapters');
} catch (error) {
  aiLogger.error('Failed to initialize OpenAI adapters, falling back to stubs:', error);
  
  // Fallback to stubs if OpenAI initialization fails
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TranscriberStub } = require('./stubs/transcriber.stub');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TTSStub } = require('./stubs/tts.stub');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ChatStub } = require('./stubs/chat.stub');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { OrderNLPStub } = require('./stubs/order-nlp.stub');
  
  transcriber = new TranscriberStub();
  tts = new TTSStub();
  chat = new ChatStub();
  orderNLP = new OrderNLPStub();
}

// Export AI services object
export const ai = {
  transcriber,
  tts,
  chat,
  orderNLP
};

// Export individual services for direct import
export { transcriber, tts, chat, orderNLP };

// Export health check function
export const checkAIHealth = async (): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  provider: 'openai' | 'stubs';
  details: any;
}> => {
  if (!openaiClient) {
    return {
      status: 'degraded',
      provider: 'stubs',
      details: { message: 'Using stub implementations - OpenAI not available' }
    };
  }

  try {
    // Quick health check with OpenAI
    await openaiClient.models.list();
    return {
      status: 'healthy',
      provider: 'openai',
      details: { message: 'OpenAI API accessible' }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      provider: 'openai',
      details: {
        message: 'OpenAI API not accessible',
        error: getErrorMessage(error)
      }
    };
  }
};