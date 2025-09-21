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
  model?: string;
  context?: {
    restaurantId?: string;
    userId?: string;
    [key: string]: any;
  };
}

export interface ChatResponse {
  message: string;
  metadata?: {
    model?: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    error?: boolean;
    degraded?: boolean;
    [key: string]: any;
  };
}

export interface ChatAgent {
  respond(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  complete(prompt: string, options?: ChatOptions): Promise<string>;
}

// Legacy interface for backward compatibility
export interface ChatResult {
  message: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface Chat {
  completeMessages?(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult>;
  completeText(prompt: string, options?: ChatOptions): Promise<string>;
  respond(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
}