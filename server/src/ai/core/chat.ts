/**
 * Chat interface for conversational AI
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ChatResult {
  message: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface Chat {
  complete(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult>;
  completeText(prompt: string, options?: ChatOptions): Promise<string>;
}