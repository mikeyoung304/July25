/**
 * StreamingAudioService
 * 
 * Handles real-time audio streaming, chunk management, and playback
 * for the voice ordering system.
 */

export interface AudioChunk {
  sequenceNumber: number;
  data: ArrayBuffer;
  timestamp: number;
  duration?: number;
}

export interface StreamingSession {
  sessionId: string;
  isActive: boolean;
  startTime: number;
  chunks: Map<number, AudioChunk>;
  expectedSequence: number;
  audioContext?: AudioContext;
  audioBuffer?: AudioBuffer;
}

export interface StreamingAudioOptions {
  maxBufferSize?: number; // Maximum chunks to buffer
  chunkTimeoutMs?: number; // Timeout for missing chunks
  enableQualityAdaptation?: boolean;
  onChunkReceived?: (chunk: AudioChunk) => void;
  onBufferReady?: (buffer: AudioBuffer) => void;
  onError?: (error: Error) => void;
}

export class StreamingAudioService {
  private sessions = new Map<string, StreamingSession>();
  private audioContext: AudioContext | null = null;
  private options: Required<StreamingAudioOptions>;

  constructor(options: StreamingAudioOptions = {}) {
    this.options = {
      maxBufferSize: 20, // 10 seconds at 500ms chunks
      chunkTimeoutMs: 2000,
      enableQualityAdaptation: true,
      onChunkReceived: () => {},
      onBufferReady: () => {},
      onError: () => {},
      ...options
    };

    this.initializeAudioContext();
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Handle browser autoplay policies
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      this.options.onError(new Error('Audio playback not supported'));
    }
  }

  /**
   * Start a new streaming session
   */
  startSession(sessionId: string): StreamingSession {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} already exists`);
    }

    const session: StreamingSession = {
      sessionId,
      isActive: true,
      startTime: Date.now(),
      chunks: new Map(),
      expectedSequence: 0,
      audioContext: this.audioContext || undefined
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Add an audio chunk to the streaming session
   */
  async addAudioChunk(sessionId: string, chunk: AudioChunk): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      console.warn(`Session ${sessionId} not found or inactive`);
      return false;
    }

    // Validate chunk
    if (!this.validateChunk(chunk)) {
      console.warn('Invalid audio chunk received:', chunk);
      return false;
    }

    // Store chunk
    session.chunks.set(chunk.sequenceNumber, chunk);
    this.options.onChunkReceived(chunk);

    // Process chunks in order
    await this.processSequentialChunks(session);

    // Clean up old chunks
    this.cleanupOldChunks(session);

    return true;
  }

  /**
   * Process chunks that are in sequence
   */
  private async processSequentialChunks(session: StreamingSession): Promise<void> {
    while (session.chunks.has(session.expectedSequence)) {
      const chunk = session.chunks.get(session.expectedSequence)!;
      
      try {
        await this.processChunk(session, chunk);
        session.chunks.delete(session.expectedSequence);
        session.expectedSequence++;
      } catch (error) {
        console.error('Failed to process chunk:', error);
        this.options.onError(error as Error);
        break;
      }
    }
  }

  /**
   * Process a single audio chunk
   */
  private async processChunk(session: StreamingSession, chunk: AudioChunk): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    try {
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(chunk.data.slice(0));
      
      // If this is the first chunk, initialize session buffer
      if (!session.audioBuffer) {
        session.audioBuffer = audioBuffer;
      } else {
        // Append to existing buffer
        session.audioBuffer = this.appendAudioBuffers(session.audioBuffer, audioBuffer);
      }

      this.options.onBufferReady(session.audioBuffer);
    } catch (error) {
      console.error('Failed to decode audio chunk:', error);
      // Continue with next chunk rather than failing completely
    }
  }

  /**
   * Append two audio buffers together
   */
  private appendAudioBuffers(buffer1: AudioBuffer, buffer2: AudioBuffer): AudioBuffer {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    const channels = Math.min(buffer1.numberOfChannels, buffer2.numberOfChannels);
    const length = buffer1.length + buffer2.length;
    const sampleRate = buffer1.sampleRate;

    const newBuffer = this.audioContext.createBuffer(channels, length, sampleRate);

    for (let channel = 0; channel < channels; channel++) {
      const newChannelData = newBuffer.getChannelData(channel);
      const buffer1Data = buffer1.getChannelData(channel);
      const buffer2Data = buffer2.getChannelData(channel);

      newChannelData.set(buffer1Data);
      newChannelData.set(buffer2Data, buffer1.length);
    }

    return newBuffer;
  }

  /**
   * Play the accumulated audio buffer
   */
  async playAudioBuffer(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.audioBuffer || !this.audioContext) {
      return;
    }

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = session.audioBuffer;
      source.connect(this.audioContext.destination);
      source.start();

      // Clear the buffer after playing
      session.audioBuffer = undefined;
    } catch (error) {
      console.error('Failed to play audio buffer:', error);
      this.options.onError(error as Error);
    }
  }

  /**
   * Play streaming audio as chunks arrive (real-time playback)
   */
  async enableRealtimePlayback(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !this.audioContext) {
      return;
    }

    // Set up real-time playback with minimal latency
    this.options.onBufferReady = async (buffer: AudioBuffer) => {
      try {
        const source = this.audioContext!.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext!.destination);
        source.start();
      } catch (error) {
        console.error('Real-time playback error:', error);
      }
    };
  }

  /**
   * End a streaming session
   */
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      session.chunks.clear();
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Validate an audio chunk
   */
  private validateChunk(chunk: AudioChunk): boolean {
    return (
      typeof chunk.sequenceNumber === 'number' &&
      chunk.sequenceNumber >= 0 &&
      chunk.data instanceof ArrayBuffer &&
      chunk.data.byteLength > 0 &&
      typeof chunk.timestamp === 'number' &&
      chunk.timestamp > 0
    );
  }

  /**
   * Clean up old chunks to prevent memory leaks
   */
  private cleanupOldChunks(session: StreamingSession): void {
    if (session.chunks.size <= this.options.maxBufferSize) {
      return;
    }

    // Remove chunks older than expected sequence - buffer size
    const minSequence = Math.max(0, session.expectedSequence - this.options.maxBufferSize);
    
    for (const [sequence] of session.chunks) {
      if (sequence < minSequence) {
        session.chunks.delete(sequence);
      }
    }
  }

  /**
   * Get session statistics for monitoring
   */
  getSessionStats(sessionId: string): {
    isActive: boolean;
    chunksReceived: number;
    chunksProcessed: number;
    sessionDuration: number;
    bufferHealth: 'good' | 'warning' | 'critical';
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const now = Date.now();
    const sessionDuration = now - session.startTime;
    const chunksReceived = session.chunks.size;
    const chunksProcessed = session.expectedSequence;
    
    let bufferHealth: 'good' | 'warning' | 'critical' = 'good';
    if (chunksReceived > this.options.maxBufferSize * 0.8) {
      bufferHealth = 'warning';
    }
    if (chunksReceived > this.options.maxBufferSize * 0.95) {
      bufferHealth = 'critical';
    }

    return {
      isActive: session.isActive,
      chunksReceived,
      chunksProcessed,
      sessionDuration,
      bufferHealth
    };
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    // End all sessions
    for (const sessionId of this.sessions.keys()) {
      this.endSession(sessionId);
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

// Singleton instance for global use
export const streamingAudioService = new StreamingAudioService({
  maxBufferSize: 20,
  chunkTimeoutMs: 2000,
  enableQualityAdaptation: true,
  onError: (error) => {
    console.error('StreamingAudioService error:', error);
  }
});

export default StreamingAudioService;