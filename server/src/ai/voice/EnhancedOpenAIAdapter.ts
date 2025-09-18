import { WebSocket } from 'ws';
import { logger } from '../../utils/logger';
import { OpenAIAdapter } from '../../voice/openai-adapter';
import { AudioFormat, VoiceSessionConfig } from '../../voice/types';
import { menuFunctionTools } from '../functions/realtime-menu-tools';

/**
 * Enhanced OpenAI Adapter with Twilio support, audio conversion, and function calling
 */
export class EnhancedOpenAIAdapter extends OpenAIAdapter {
  private twilioWS?: WebSocket | undefined;
  private streamSid?: string | undefined;
  private isSpeaking = false;
  private audioFormat: AudioFormat = 'pcm16';
  private functionTools = menuFunctionTools;
  private debugMode = process.env['VOICE_DEBUG'] === 'true';
  private metrics = {
    audioChunksReceived: 0,
    audioChunksSent: 0,
    functionsCallled: 0,
    bargeInEvents: 0,
    errors: 0,
    startTime: Date.now(),
    tokensUsed: { input: 0, output: 0 }
  };

  constructor(
    sessionId: string,
    restaurantId: string,
    config?: Partial<VoiceSessionConfig>
  ) {
    super(sessionId, restaurantId);
    if (config?.audio_format) {
      this.audioFormat = config.audio_format;
    }
  }

  /**
   * Set Twilio WebSocket for phone integration
   */
  setTwilioConnection(ws: WebSocket, streamSid: string): void {
    this.twilioWS = ws;
    this.streamSid = streamSid;
    this.audioFormat = 'g711_ulaw'; // Phone always uses G.711
    
    logger.info('[EnhancedAdapter] Twilio connection established', {
      sessionId: this.sessionId,
      streamSid,
      audioFormat: this.audioFormat
    });
  }

  /**
   * Override initialization to include function tools
   */
  protected override async initializeSession(): Promise<void> {
    const tools = Object.entries(this.functionTools).map(([name, config]) => ({
      type: 'function' as const,
      function: {
        name,
        description: config.description,
        parameters: config.parameters
      }
    }));

    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: this.getSystemPrompt(),
        voice: process.env['VOICE_PERSONALITY'] || 'alloy',
        input_audio_format: this.audioFormat,
        output_audio_format: this.audioFormat,
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: this.twilioWS ? 300 : 500 // Faster for phone
        },
        tools,
        tool_choice: 'auto',
        temperature: 0.4, // Lower for more consistent responses
        max_response_output_tokens: 2048
      }
    };

    this.sendToOpenAI(sessionConfig);
    
    if (this.debugMode) {
      logger.debug('[EnhancedAdapter] Session initialized', {
        sessionId: this.sessionId,
        tools: tools.map(t => t.function.name),
        audioFormat: this.audioFormat
      });
    }
  }

  /**
   * Get optimized system prompt for restaurant ordering
   */
  private getSystemPrompt(): string {
    // Check if running in server mode (for restaurant staff)
    const isServerMode = process.env['VOICE_MODE'] === 'server';
    
    if (isServerMode) {
      return `You are a restaurant order assistant for SERVERS taking tableside orders.
      
CRITICAL: This is for restaurant staff, NOT customers.
- Simply CONFIRM orders - do NOT ask questions
- Just acknowledge what was ordered: "Adding [item]" or "[Item] added"
- Do NOT suggest alternatives or ask about proteins/sides
- Do NOT greet or ask "how can I help"
- Keep responses to 3-5 words maximum
- Example: "One Greek salad" → "Greek salad added"
- Example: "Two burgers" → "Two burgers added"

IMPORTANT:
- Never ask clarifying questions
- Never suggest other items
- Just confirm what was said`;
    }
    
    // Customer-facing mode (kiosk, drive-thru, etc.)
    return `You are a friendly, efficient restaurant voice assistant.
    
GUIDELINES:
- Be concise and natural in conversation
- Confirm orders clearly
- Handle interruptions gracefully
- Only offer items that exist in our menu
- Ask clarifying questions when needed
- Suggest popular items or deals when appropriate

CONVERSATION FLOW:
1. Greet warmly and ask how you can help
2. Listen for menu items and quantities
3. Confirm each item added
4. Ask if they want anything else
5. Confirm the complete order
6. Provide total and estimated time

HANDLING NON-EXISTENT ITEMS:
- When a customer orders something not on our menu
- ALWAYS use find_menu_items function with suggest_alternatives: true to verify and get suggestions
- If item not found, the function will return suggestions from our actual menu
- Respond naturally: "I'm sorry, we don't have [item] on our menu, but I can suggest [actual menu items returned]"
- Let the customer know what categories we do have (appetizers, entrees, desserts, beverages)
- The suggestions will be real items from this restaurant's menu, not generic suggestions

IMPORTANT:
- If interrupted, stop speaking immediately and listen
- Keep responses under 2 sentences when possible
- ALWAYS use the menu functions to verify items exist before confirming
- Never make up menu items or prices
- If find_menu_items returns empty results, the item doesn't exist - inform the customer politely`;
  }

  /**
   * Convert audio format between PCM16 and G.711 μ-law
   */
  private convertAudioFormat(
    data: string,
    from: AudioFormat,
    to: AudioFormat
  ): string {
    if (from === to) return data;

    const buffer = Buffer.from(data, 'base64');
    
    if (from === 'g711_ulaw' && to === 'pcm16') {
      // G.711 μ-law to PCM16 conversion
      const pcm16Buffer = Buffer.alloc(buffer.length * 2);
      for (let i = 0; i < buffer.length; i++) {
        const ulaw = buffer[i] ?? 0;
        const pcm16 = this.ulawToPcm16(ulaw);
        pcm16Buffer.writeInt16LE(pcm16, i * 2);
      }
      return pcm16Buffer.toString('base64');
    }
    
    if (from === 'pcm16' && to === 'g711_ulaw') {
      // PCM16 to G.711 μ-law conversion
      const ulawBuffer = Buffer.alloc(buffer.length / 2);
      for (let i = 0; i < buffer.length; i += 2) {
        const pcm16 = buffer.readInt16LE(i);
        const ulaw = this.pcm16ToUlaw(pcm16);
        ulawBuffer[i / 2] = ulaw;
      }
      return ulawBuffer.toString('base64');
    }

    logger.warn('[EnhancedAdapter] Unsupported audio format conversion', {
      from, to
    });
    return data;
  }

  /**
   * μ-law to PCM16 conversion
   */
  private ulawToPcm16(ulaw: number): number {
    const BIAS = 0x84;
    const CLIP = 32635;
    
    const processedUlaw = ~ulaw;
    const sign = (processedUlaw & 0x80) ? -1 : 1;
    const exponent = (processedUlaw >> 4) & 0x07;
    const mantissa = processedUlaw & 0x0F;
    
    let sample = mantissa << ((exponent ?? 0) + 3);
    sample += BIAS << ((exponent ?? 0) + 2);
    sample *= sign;
    
    return Math.max(-CLIP, Math.min(CLIP, sample));
  }

  /**
   * PCM16 to μ-law conversion
   */
  private pcm16ToUlaw(pcm16: number): number {
    const BIAS = 0x84;
    const CLIP = 32635;
    const exp_lut = [0,0,1,1,2,2,2,2,3,3,3,3,3,3,3,3,
                     4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,
                     5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
                     5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
                     6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
                     6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
                     6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
                     6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
                     7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                     7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                     7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                     7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                     7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                     7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                     7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                     7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7];
    
    const sign = (pcm16 < 0) ? 0x80 : 0;
    if (sign) pcm16 = -pcm16;
    
    pcm16 = Math.min(pcm16, CLIP);
    pcm16 += BIAS;
    
    const exponent = exp_lut[(pcm16 >> 7) & 0xFF] ?? 0;
    const mantissa = (pcm16 >> ((exponent ?? 0) + 3)) & 0x0F;
    
    return ~(sign | ((exponent ?? 0) << 4) | mantissa);
  }

  /**
   * Handle barge-in (user interruption)
   */
  private handleBargeIn(): void {
    this.metrics.bargeInEvents++;
    
    logger.info('[EnhancedAdapter] Barge-in detected', {
      sessionId: this.sessionId,
      wasSpeaking: this.isSpeaking
    });

    // Cancel current OpenAI response
    this.sendToOpenAI({ type: 'response.cancel' });
    
    // Clear audio buffers
    this.responseBuffer = [];
    this.audioChunkCount = 0;
    
    // Clear Twilio audio buffer if connected
    if (this.twilioWS && this.streamSid) {
      this.sendToTwilio({ 
        event: 'clear', 
        streamSid: this.streamSid 
      });
    }
    
    this.isSpeaking = false;
  }

  /**
   * Send audio to Twilio
   */
  private sendToTwilio(data: any): void {
    if (this.twilioWS?.readyState === WebSocket.OPEN) {
      this.twilioWS.send(JSON.stringify(data));
    }
  }

  /**
   * Override audio sending to handle format conversion
   */
  override async sendAudio(audioData: string, _sampleRate?: number): Promise<void> {
    this.metrics.audioChunksReceived++;
    
    // Convert to PCM16 if coming from Twilio (G.711)
    let processedAudio = audioData;
    if (this.audioFormat === 'g711_ulaw') {
      processedAudio = this.convertAudioFormat(audioData, 'g711_ulaw', 'pcm16');
    }
    
    // Handle barge-in if we're speaking
    if (this.isSpeaking) {
      this.handleBargeIn();
    }
    
    // Send to OpenAI
    await super.sendAudio(processedAudio, 24000); // OpenAI expects 24kHz
  }

  /**
   * Override message handling to add function calling
   */
  protected override handleOpenAIMessage(data: any): void {
    try {
      const dataStr = Buffer.isBuffer(data) ? data.toString() : String(data);
      const event = JSON.parse(dataStr);
      
      // Track token usage
      if (event.usage) {
        this.metrics.tokensUsed.input += event.usage.input_tokens || 0;
        this.metrics.tokensUsed.output += event.usage.output_tokens || 0;
      }
      
      switch (event.type) {
        case 'response.function_call_arguments.done':
          this.handleFunctionCall(event);
          break;
          
        case 'response.audio.delta':
          this.handleAudioResponse(event);
          break;
          
        case 'response.audio.done':
          this.isSpeaking = false;
          this.flushAudioBuffer();
          break;
          
        case 'response.done':
          this.isSpeaking = false;
          break;
          
        case 'error':
          this.metrics.errors++;
          logger.error('[EnhancedAdapter] OpenAI error', event);
          break;
          
        default:
          super.handleOpenAIMessage(data);
      }
    } catch (error) {
      this.metrics.errors++;
      logger.error('[EnhancedAdapter] Error handling message', error);
    }
  }

  /**
   * Handle function calls from OpenAI
   */
  private async handleFunctionCall(event: any): Promise<void> {
    const { name, arguments: args, call_id } = event;
    this.metrics.functionsCallled++;
    
    logger.info('[EnhancedAdapter] Function call', {
      sessionId: this.sessionId,
      function: name,
      args
    });
    
    try {
      const tool = this.functionTools[name as keyof typeof this.functionTools];
      if (!tool) {
        throw new Error(`Unknown function: ${name}`);
      }
      
      const parsedArgs = JSON.parse(args);
      const result = await tool.handler(parsedArgs, {
        sessionId: this.sessionId,
        restaurantId: this.restaurantId
      });
      
      // Send result back to OpenAI
      this.sendToOpenAI({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id,
          output: JSON.stringify(result)
        }
      });
      
      // Continue the response
      this.sendToOpenAI({
        type: 'response.create'
      });
      
    } catch (error) {
      logger.error('[EnhancedAdapter] Function call failed', {
        function: name,
        error
      });
      
      this.sendToOpenAI({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id,
          output: JSON.stringify({ 
            error: 'Function call failed',
            message: (error as Error).message 
          })
        }
      });
    }
  }

  /**
   * Handle audio response from OpenAI
   */
  private handleAudioResponse(event: any): void {
    this.isSpeaking = true;
    this.metrics.audioChunksSent++;
    
    if (event.delta) {
      // Convert audio format if needed for Twilio
      let audioData = event.delta;
      if (this.twilioWS && this.audioFormat === 'g711_ulaw') {
        audioData = this.convertAudioFormat(event.delta, 'pcm16', 'g711_ulaw');
        
        // Send to Twilio
        this.sendToTwilio({
          event: 'media',
          streamSid: this.streamSid,
          media: {
            payload: audioData
          }
        });
      } else {
        // Add to buffer for web clients
        this.responseBuffer.push(event.delta);
      }
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): any {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime,
      connectionState: this.getConnectionState(),
      audioFormat: this.audioFormat,
      hasTwilio: !!this.twilioWS
    };
  }

  /**
   * Enhanced disconnect with cleanup
   */
  override async disconnect(): Promise<void> {
    // Log final metrics
    logger.info('[EnhancedAdapter] Session metrics', {
      sessionId: this.sessionId,
      metrics: this.getMetrics()
    });
    
    // Clean up Twilio connection
    if (this.twilioWS) {
      this.twilioWS = undefined;
      this.streamSid = undefined;
    }
    
    await super.disconnect();
  }
}