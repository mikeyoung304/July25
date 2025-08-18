/**
 * OpenAI Realtime API Implementation Examples
 * Complete reference implementations for common use cases
 */

// ============================================
// 1. BASIC WEBSOCKET CONNECTION
// ============================================

class OpenAIRealtimeClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.ws = null;
    this.sessionId = null;
    this.audioQueue = [];
    this.isConnected = false;
  }

  async connect() {
    const WebSocket = require('ws');
    
    this.ws = new WebSocket('wss://api.openai.com/v1/realtime', {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    this.ws.on('open', () => {
      console.log('Connected to OpenAI Realtime API');
      this.isConnected = true;
      this.initializeSession();
    });

    this.ws.on('message', (data) => {
      const event = JSON.parse(data.toString());
      this.handleServerEvent(event);
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleError(error);
    });

    this.ws.on('close', (code, reason) => {
      console.log(`Connection closed: ${code} - ${reason}`);
      this.isConnected = false;
      this.reconnect();
    });
  }

  initializeSession() {
    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200
        },
        temperature: 0.8,
        max_response_output_tokens: 'inf'
      }
    };
    
    this.sendEvent(sessionConfig);
  }

  sendEvent(event) {
    if (this.isConnected && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(event));
    } else {
      console.error('WebSocket not connected');
    }
  }

  handleServerEvent(event) {
    switch(event.type) {
      case 'session.created':
        this.sessionId = event.session.id;
        console.log('Session created:', this.sessionId);
        break;
        
      case 'input_audio_buffer.speech_started':
        console.log('Speech detected');
        break;
        
      case 'input_audio_buffer.speech_stopped':
        console.log('Speech ended');
        break;
        
      case 'response.audio.delta':
        this.handleAudioDelta(event.delta);
        break;
        
      case 'response.text.delta':
        this.handleTextDelta(event.delta);
        break;
        
      case 'response.done':
        console.log('Response complete');
        break;
        
      case 'error':
        console.error('Server error:', event.error);
        break;
    }
  }

  handleAudioDelta(delta) {
    // Convert base64 to audio buffer
    const audioBuffer = Buffer.from(delta, 'base64');
    this.audioQueue.push(audioBuffer);
  }

  handleTextDelta(delta) {
    // Handle incremental text transcription
    process.stdout.write(delta);
  }

  async reconnect() {
    console.log('Attempting reconnection in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    this.connect();
  }

  handleError(error) {
    console.error('Error:', error);
    // Implement error recovery logic
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// ============================================
// 2. AUDIO STREAMING IMPLEMENTATION
// ============================================

class AudioStreamHandler {
  constructor(client) {
    this.client = client;
    this.audioChunkSize = 4800; // 100ms at 24kHz
    this.isStreaming = false;
  }

  // Convert audio to PCM16 format
  convertToPCM16(audioData, inputFormat = 'float32') {
    let pcm16Buffer;
    
    if (inputFormat === 'float32') {
      // Convert Float32 to Int16
      const samples = new Float32Array(audioData);
      pcm16Buffer = Buffer.alloc(samples.length * 2);
      
      for (let i = 0; i < samples.length; i++) {
        const sample = Math.max(-1, Math.min(1, samples[i]));
        const int16 = Math.floor(sample * 32767);
        pcm16Buffer.writeInt16LE(int16, i * 2);
      }
    }
    
    return pcm16Buffer;
  }

  // Stream audio chunks to the API
  streamAudio(audioBuffer) {
    const base64Audio = audioBuffer.toString('base64');
    
    const event = {
      type: 'input_audio_buffer.append',
      audio: base64Audio
    };
    
    this.client.sendEvent(event);
  }

  // Commit audio buffer for processing
  commitAudio() {
    const event = {
      type: 'input_audio_buffer.commit'
    };
    
    this.client.sendEvent(event);
  }

  // Clear audio buffer
  clearAudio() {
    const event = {
      type: 'input_audio_buffer.clear'
    };
    
    this.client.sendEvent(event);
  }

  // Start continuous audio streaming
  startStreaming(audioSource) {
    this.isStreaming = true;
    
    audioSource.on('data', (chunk) => {
      if (this.isStreaming) {
        const pcm16Chunk = this.convertToPCM16(chunk);
        this.streamAudio(pcm16Chunk);
      }
    });
    
    audioSource.on('end', () => {
      this.commitAudio();
      this.isStreaming = false;
    });
  }

  stopStreaming() {
    this.isStreaming = false;
    this.commitAudio();
  }
}

// ============================================
// 3. CONVERSATION MANAGEMENT
// ============================================

class ConversationManager {
  constructor(client) {
    this.client = client;
    this.conversationHistory = [];
  }

  // Add user message
  addUserMessage(content, role = 'user') {
    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: role,
        content: [{
          type: 'input_text',
          text: content
        }]
      }
    };
    
    this.client.sendEvent(event);
    this.conversationHistory.push({ role, content });
  }

  // Add audio input
  addAudioInput() {
    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_audio',
          audio: null // Will be filled by audio buffer
        }]
      }
    };
    
    this.client.sendEvent(event);
  }

  // Trigger response generation
  generateResponse(instructions = null) {
    const event = {
      type: 'response.create',
      response: {
        modalities: ['text', 'audio']
      }
    };
    
    if (instructions) {
      event.response.instructions = instructions;
    }
    
    this.client.sendEvent(event);
  }

  // Cancel ongoing response
  cancelResponse() {
    const event = {
      type: 'response.cancel'
    };
    
    this.client.sendEvent(event);
  }

  // Clear conversation
  clearConversation() {
    this.conversationHistory = [];
    // Note: API doesn't have a clear conversation event
    // You need to start a new session
  }
}

// ============================================
// 4. FUNCTION CALLING IMPLEMENTATION
// ============================================

class FunctionHandler {
  constructor(client) {
    this.client = client;
    this.functions = new Map();
  }

  // Register a function
  registerFunction(name, implementation, schema) {
    this.functions.set(name, {
      implementation,
      schema
    });
    
    // Update session with function
    this.updateSessionTools();
  }

  updateSessionTools() {
    const tools = Array.from(this.functions.values()).map(f => ({
      type: 'function',
      function: f.schema
    }));
    
    const event = {
      type: 'session.update',
      session: {
        tools: tools
      }
    };
    
    this.client.sendEvent(event);
  }

  // Handle function call from API
  async handleFunctionCall(functionCall) {
    const { name, arguments: args } = functionCall;
    
    if (!this.functions.has(name)) {
      throw new Error(`Function ${name} not found`);
    }
    
    const func = this.functions.get(name);
    const result = await func.implementation(JSON.parse(args));
    
    // Send function result back
    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: functionCall.call_id,
        output: JSON.stringify(result)
      }
    };
    
    this.client.sendEvent(event);
  }
}

// ============================================
// 5. COMPLETE EXAMPLE APPLICATION
// ============================================

async function main() {
  // Initialize client
  const client = new OpenAIRealtimeClient(process.env.OPENAI_API_KEY);
  await client.connect();
  
  // Initialize handlers
  const audioHandler = new AudioStreamHandler(client);
  const conversation = new ConversationManager(client);
  const functions = new FunctionHandler(client);
  
  // Register a sample function
  functions.registerFunction(
    'get_weather',
    async (args) => {
      // Mock weather function
      return {
        temperature: 72,
        conditions: 'sunny',
        location: args.location
      };
    },
    {
      name: 'get_weather',
      description: 'Get current weather',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City name'
          }
        },
        required: ['location']
      }
    }
  );
  
  // Example: Send a text message
  conversation.addUserMessage('Hello, can you help me with transcription?');
  conversation.generateResponse();
  
  // Example: Stream audio from microphone
  const mic = require('mic');
  const micInstance = mic({
    rate: '24000',
    channels: '1',
    encoding: 'signed-integer',
    bitwidth: '16'
  });
  
  const micInputStream = micInstance.getAudioStream();
  
  micInputStream.on('data', (data) => {
    audioHandler.streamAudio(data);
  });
  
  micInputStream.on('error', (err) => {
    console.error('Microphone error:', err);
  });
  
  // Start recording
  micInstance.start();
  
  // Stop after 10 seconds
  setTimeout(() => {
    micInstance.stop();
    audioHandler.commitAudio();
    conversation.generateResponse();
  }, 10000);
}

// ============================================
// 6. TRANSCRIPTION-ONLY MODE
// ============================================

class TranscriptionClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.ws = null;
    this.transcript = '';
  }

  async connect() {
    const WebSocket = require('ws');
    
    // Use transcription-specific endpoint
    this.ws = new WebSocket('wss://api.openai.com/v1/realtime?intent=transcription', {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    this.ws.on('open', () => {
      this.initializeTranscriptionSession();
    });

    this.ws.on('message', (data) => {
      const event = JSON.parse(data.toString());
      
      if (event.type === 'response.text.delta') {
        this.transcript += event.delta;
        console.log('Transcript:', this.transcript);
      }
    });
  }

  initializeTranscriptionSession() {
    const config = {
      type: 'session.update',
      session: {
        modalities: ['text'],
        input_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'gpt-4o-transcribe' // Or 'gpt-4o-mini-transcribe'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        }
      }
    };
    
    this.ws.send(JSON.stringify(config));
  }

  transcribeAudio(audioBuffer) {
    const base64Audio = audioBuffer.toString('base64');
    
    this.ws.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: base64Audio
    }));
  }

  commitTranscription() {
    this.ws.send(JSON.stringify({
      type: 'input_audio_buffer.commit'
    }));
  }
}

// ============================================
// 7. ERROR HANDLING & RECONNECTION
// ============================================

class RobustRealtimeClient extends OpenAIRealtimeClient {
  constructor(apiKey, options = {}) {
    super(apiKey);
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.reconnectAttempts = 0;
    this.reconnectMultiplier = 2;
  }

  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(this.reconnectMultiplier, this.reconnectAttempts);
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    this.reconnectAttempts++;
    await this.connect();
  }

  handleError(error) {
    // Categorize errors
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused - check API endpoint');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('Connection timeout - check network');
    } else if (error.message?.includes('401')) {
      console.error('Authentication failed - check API key');
      // Don't attempt reconnection for auth errors
      return;
    } else if (error.message?.includes('429')) {
      console.error('Rate limit exceeded - backing off');
      this.reconnectDelay *= 2;
    }
    
    this.reconnect();
  }

  // Reset reconnection counter on successful connection
  handleServerEvent(event) {
    super.handleServerEvent(event);
    
    if (event.type === 'session.created') {
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
    }
  }
}

// Export for use in other modules
module.exports = {
  OpenAIRealtimeClient,
  AudioStreamHandler,
  ConversationManager,
  FunctionHandler,
  TranscriptionClient,
  RobustRealtimeClient
};

// Run example if executed directly
if (require.main === module) {
  main().catch(console.error);
}