/**
 * Stub implementation of Chat for development/testing
 */

import { Chat, ChatMessage, ChatOptions, ChatResult } from '../core/chat';

export class ChatStub implements Chat {
  async complete(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> {
    // Stub implementation - returns mock response
    return {
      message: "I'll help you place that order. You've ordered a large pepperoni pizza.",
      usage: {
        promptTokens: 50,
        completionTokens: 20,
        totalTokens: 70
      }
    };
  }

  async completeText(prompt: string, options?: ChatOptions): Promise<string> {
    return "Your order has been confirmed. It will be ready in 20 minutes.";
  }
}