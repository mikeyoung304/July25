/**
 * Client-side Audio Pipeline for Voice Ordering
 * Handles microphone capture, resampling, framing, VAD, and Base64 encoding
 */

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
  frameSize: number; // in milliseconds (20-40ms)
  vadThreshold: number; // amplitude threshold for voice activity detection
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 16000, // 16kHz for capture
  channels: 1,
  bitDepth: 16,
  frameSize: 25, // 25ms frames
  vadThreshold: 0.01, // 1% amplitude threshold
};

/**
 * Captures audio from microphone in PCM16 format at 16kHz
 */
export class AudioCapture {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private onAudioDataCallback: ((audioData: Float32Array) => void) | null = null;

  async initialize(): Promise<void> {
    console.log('[AudioCapture] Requesting microphone permission...');
    
    // Request microphone permission
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: DEFAULT_AUDIO_CONFIG.sampleRate,
        channelCount: DEFAULT_AUDIO_CONFIG.channels,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    });
    
    console.log('[AudioCapture] Microphone permission granted, stream:', {
      active: this.mediaStream.active,
      tracks: this.mediaStream.getTracks().length
    });

    // Create audio context
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: DEFAULT_AUDIO_CONFIG.sampleRate,
    });
    
    console.log('[AudioCapture] Audio context created:', {
      sampleRate: this.audioContext.sampleRate,
      state: this.audioContext.state
    });

    // Create source node
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Create processor node (deprecated but still widely supported)
    const bufferSize = Math.floor(DEFAULT_AUDIO_CONFIG.sampleRate * DEFAULT_AUDIO_CONFIG.frameSize / 1000);
    this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    this.processorNode.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer.getChannelData(0);
      if (this.onAudioDataCallback) {
        // Log audio data periodically (every 100th frame to avoid spam)
        if (Math.random() < 0.01) {
          const rms = Math.sqrt(inputBuffer.reduce((sum, val) => sum + val * val, 0) / inputBuffer.length);
          console.log('[AudioCapture] Processing audio frame:', {
            bufferLength: inputBuffer.length,
            rmsLevel: rms.toFixed(4),
            hasSound: rms > 0.001
          });
        }
        this.onAudioDataCallback(new Float32Array(inputBuffer));
      }
    };

    // Connect nodes
    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);
  }

  start(onAudioData: (audioData: Float32Array) => void): void {
    this.onAudioDataCallback = onAudioData;
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  stop(): void {
    this.onAudioDataCallback = null;
    if (this.audioContext?.state === 'running') {
      this.audioContext.suspend();
    }
  }

  destroy(): void {
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }
}

/**
 * Resamples audio from 16kHz to 24kHz for OpenAI compatibility
 */
export class AudioResampler {
  private inputSampleRate: number;
  private outputSampleRate: number;
  private ratio: number;
  private buffer: Float32Array = new Float32Array(0);

  constructor(inputSampleRate: number = 16000, outputSampleRate: number = 24000) {
    this.inputSampleRate = inputSampleRate;
    this.outputSampleRate = outputSampleRate;
    this.ratio = outputSampleRate / inputSampleRate;
  }

  resample(inputData: Float32Array): Float32Array {
    if (this.ratio === 1) {
      return inputData; // No resampling needed
    }

    const outputLength = Math.ceil(inputData.length * this.ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const inputIndex = i / this.ratio;
      const inputIndexFloor = Math.floor(inputIndex);
      const inputIndexCeil = Math.min(inputIndexFloor + 1, inputData.length - 1);
      const fraction = inputIndex - inputIndexFloor;

      // Linear interpolation
      output[i] = inputData[inputIndexFloor] * (1 - fraction) + inputData[inputIndexCeil] * fraction;
    }

    return output;
  }
}

/**
 * Frames audio data into 20-40ms chunks
 */
export class AudioFramer {
  private frameSize: number;
  private buffer: Float32Array = new Float32Array(0);

  constructor(sampleRate: number, frameSizeMs: number = 25) {
    this.frameSize = Math.floor(sampleRate * frameSizeMs / 1000);
  }

  addData(data: Float32Array): Float32Array[] {
    // Append new data to buffer
    const newBuffer = new Float32Array(this.buffer.length + data.length);
    newBuffer.set(this.buffer);
    newBuffer.set(data, this.buffer.length);
    this.buffer = newBuffer;

    // Extract complete frames
    const frames: Float32Array[] = [];
    while (this.buffer.length >= this.frameSize) {
      const frame = this.buffer.slice(0, this.frameSize);
      frames.push(frame);
      this.buffer = this.buffer.slice(this.frameSize);
    }

    return frames;
  }

  flush(): Float32Array | null {
    if (this.buffer.length > 0) {
      const frame = this.buffer;
      this.buffer = new Float32Array(0);
      return frame;
    }
    return null;
  }
}

/**
 * Simple Voice Activity Detection based on amplitude
 */
export class SimpleVAD {
  private threshold: number;
  private windowSize: number;
  private energyWindow: number[] = [];

  constructor(threshold: number = 0.01, windowSize: number = 10) {
    this.threshold = threshold;
    this.windowSize = windowSize;
  }

  detectVoice(audioFrame: Float32Array): boolean {
    // Calculate RMS energy
    let sum = 0;
    for (let i = 0; i < audioFrame.length; i++) {
      sum += audioFrame[i] * audioFrame[i];
    }
    const rms = Math.sqrt(sum / audioFrame.length);

    // Add to sliding window
    this.energyWindow.push(rms);
    if (this.energyWindow.length > this.windowSize) {
      this.energyWindow.shift();
    }

    // Calculate average energy over window
    const avgEnergy = this.energyWindow.reduce((a, b) => a + b, 0) / this.energyWindow.length;

    return avgEnergy > this.threshold;
  }

  reset(): void {
    this.energyWindow = [];
  }
}

/**
 * Converts Float32Array to PCM16 and encodes as Base64
 */
export class AudioEncoder {
  static float32ToPCM16(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, sample * 0x7FFF, true); // little-endian
    }
    
    return buffer;
  }

  static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  static encodeFrame(audioFrame: Float32Array): string {
    const pcm16Buffer = this.float32ToPCM16(audioFrame);
    return this.arrayBufferToBase64(pcm16Buffer);
  }
}

/**
 * Main audio pipeline that coordinates all components
 */
export class AudioPipeline {
  private capture: AudioCapture;
  private resampler: AudioResampler;
  private framer: AudioFramer;
  private vad: SimpleVAD;
  private isActive: boolean = false;
  private onFrameCallback: ((encodedFrame: string, hasVoice: boolean) => void) | null = null;

  constructor(config: AudioConfig = DEFAULT_AUDIO_CONFIG) {
    this.capture = new AudioCapture();
    this.resampler = new AudioResampler(config.sampleRate, 24000); // Resample to 24kHz for OpenAI
    this.framer = new AudioFramer(24000, config.frameSize); // Frame at 24kHz
    this.vad = new SimpleVAD(config.vadThreshold);
  }

  async initialize(): Promise<void> {
    await this.capture.initialize();
  }

  start(onFrame: (encodedFrame: string, hasVoice: boolean) => void): void {
    this.onFrameCallback = onFrame;
    this.isActive = true;
    this.vad.reset();

    this.capture.start((audioData: Float32Array) => {
      if (!this.isActive) return;

      // Resample from 16kHz to 24kHz
      const resampledData = this.resampler.resample(audioData);

      // Frame the audio
      const frames = this.framer.addData(resampledData);

      // Process each frame
      frames.forEach(frame => {
        const hasVoice = this.vad.detectVoice(frame);
        const encodedFrame = AudioEncoder.encodeFrame(frame);
        this.onFrameCallback?.(encodedFrame, hasVoice);
      });
    });
  }

  stop(): void {
    this.isActive = false;
    this.capture.stop();
    
    // Process any remaining buffered audio
    const remainingFrame = this.framer.flush();
    if (remainingFrame && this.onFrameCallback) {
      const hasVoice = this.vad.detectVoice(remainingFrame);
      const encodedFrame = AudioEncoder.encodeFrame(remainingFrame);
      this.onFrameCallback(encodedFrame, hasVoice);
    }
  }

  destroy(): void {
    this.stop();
    this.capture.destroy();
    this.onFrameCallback = null;
  }

  getIsActive(): boolean {
    return this.isActive;
  }
}