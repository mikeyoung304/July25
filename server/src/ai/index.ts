/**
 * AI Services Module
 * Provides unified access to AI capabilities
 */

import { Transcriber } from './core/transcriber';
import { TTS } from './core/tts';
import { Chat } from './core/chat';
import { OrderNLP } from './core/order-nlp';

// Import stubs for now - replace with real implementations later
import { TranscriberStub } from './stubs/transcriber.stub';
import { TTSStub } from './stubs/tts.stub';
import { ChatStub } from './stubs/chat.stub';
import { OrderNLPStub } from './stubs/order-nlp.stub';

// Export interfaces
export * from './core/transcriber';
export * from './core/tts';
export * from './core/chat';
export * from './core/order-nlp';

// Create service instances
const transcriber: Transcriber = new TranscriberStub();
const tts: TTS = new TTSStub();
const chat: Chat = new ChatStub();
const orderNLP: OrderNLP = new OrderNLPStub();

// Export AI services object
export const ai = {
  transcriber,
  tts,
  chat,
  orderNLP
};

// Export individual services for direct import
export { transcriber, tts, chat, orderNLP };