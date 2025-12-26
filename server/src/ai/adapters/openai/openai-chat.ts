import OpenAI from 'openai';
import { ChatAgent, ChatMessage, ChatOptions, ChatResponse, Chat, ChatResult } from '../../core/chat';
import { withRetry } from './utils';
import { logger } from '../../../utils/logger';
import { getErrorMessage } from '@rebuild/shared';

const chatLogger = logger.child({ service: 'OpenAIChat' });

export class OpenAIChatAgent implements ChatAgent, Chat {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for AI features');
    }
    
    this.client = new OpenAI({ apiKey });
  }

  async respond(
    messages: ChatMessage[], 
    options?: ChatOptions
  ): Promise<ChatResponse> {
    const requestId = `chat-${Date.now()}`;
    const restaurantId = options?.context?.restaurantId;
    
    try {
      chatLogger.info('Starting chat completion', {
        requestId,
        restaurantId,
        messageCount: messages.length
      });

      // Minimal system prompt - don't stuff the whole menu
      const systemPrompt = `You are a helpful restaurant assistant. Be concise and friendly.
${restaurantId ? `Restaurant ID: ${restaurantId}` : ''}
If asked about menu items, you can reference general categories but specific items should be looked up separately.`;

      const openAIMessages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      ];

      const result = await withRetry(async () => {
        const response = await this.client.chat.completions.create({
          model: options?.model || 'gpt-4o-mini',
          messages: openAIMessages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 500
        });

        return response;
      });

      const reply = result.choices[0]?.message?.content || '';

      chatLogger.info('Chat completion successful', {
        requestId,
        restaurantId,
        replyLength: reply.length
      });

      const metadata: any = {
        model: result.model
      };
      
      if (result.usage) {
        metadata.usage = {
          promptTokens: result.usage.prompt_tokens,
          completionTokens: result.usage.completion_tokens,
          totalTokens: result.usage.total_tokens
        };
      }
      
      return {
        message: reply,
        metadata
      };
    } catch (error) {
      chatLogger.error('Chat completion failed', {
        requestId,
        restaurantId,
        error: getErrorMessage(error)
      });
      
      // Return degraded response
      return {
        message: "I'm having trouble responding right now. Please try again.",
        metadata: {
          error: true,
          degraded: true
        }
      };
    }
  }

  async complete(prompt: string, options?: ChatOptions): Promise<string> {
    const response = await this.respond(
      [{ role: 'user', content: prompt }],
      options
    );
    return response.message;
  }

  // Legacy Chat interface methods
  async completeText(prompt: string, options?: ChatOptions): Promise<string> {
    return this.complete(prompt, options);
  }

  async completeMessages(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> {
    const response = await this.respond(messages, options);
    const result: ChatResult = {
      message: response.message
    };
    
    if (response.metadata?.usage) {
      result.usage = response.metadata.usage;
    }
    
    return result;
  }
}