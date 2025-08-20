import { logger } from '@/services/logger'

/**
 * AudioPlaybackService - Handles TTS audio playback from AI responses
 * Manages audio queue, playback state, and error handling
 */

export interface AudioPlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  // eslint-disable-next-line no-undef
  currentAudio: HTMLAudioElement | null;
  queue: AudioQueueItem[];
  volume: number;
}

export interface AudioQueueItem {
  id: string;
  audioUrl: string;
  text: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

class AudioPlaybackService {
  private state: AudioPlaybackState = {
    isPlaying: false,
    isPaused: false,
    currentAudio: null,
    queue: [],
    volume: 0.8
  };
  
  private listeners: Set<(state: AudioPlaybackState) => void> = new Set();

  /**
   * Add audio to playback queue
   */
  enqueue(item: AudioQueueItem): void {
    this.state.queue.push(item);
    this.notifyListeners();
    
    // Auto-play if nothing is currently playing
    if (!this.state.isPlaying && !this.state.isPaused) {
      this.playNext();
    }
  }

  /**
   * Play audio from blob data (direct from API response)
   */
  async playAudioBlob(audioBlob: Blob, text: string, callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
  }): Promise<void> {
    try {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioItem: AudioQueueItem = {
        id: `audio-${Date.now()}`,
        audioUrl,
        text,
        ...callbacks
      };
      
      this.enqueue(audioItem);
    } catch (error) {
      console.error('Error creating audio from blob:', error);
      callbacks?.onError?.(error instanceof Error ? error : new Error('Failed to create audio'));
    }
  }

  /**
   * Play next item in queue
   */
  private async playNext(): Promise<void> {
    if (this.state.queue.length === 0) {
      this.state.isPlaying = false;
      this.state.currentAudio = null;
      this.notifyListeners();
      return;
    }

    const item = this.state.queue.shift()!;
    
    try {
      const audio = new Audio(item.audioUrl);
      audio.volume = this.state.volume;
      
      this.state.currentAudio = audio;
      this.state.isPlaying = true;
      this.state.isPaused = false;
      this.notifyListeners();

      // Set up event listeners
      audio.onplay = () => {
        logger.info('Audio playback started:', item.text);
        item.onStart?.();
      };

      audio.onended = () => {
        logger.info('Audio playback ended:', item.text);
        item.onEnd?.();
        
        // Clean up object URL to prevent memory leaks
        URL.revokeObjectURL(item.audioUrl);
        
        // Play next item
        this.playNext();
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        const error = new Error(`Audio playback failed: ${audio.error?.message || 'Unknown error'}`);
        item.onError?.(error);
        
        // Clean up and continue
        URL.revokeObjectURL(item.audioUrl);
        this.playNext();
      };

      // Start playback
      await audio.play();
      
    } catch (error) {
      console.error('Error playing audio:', error);
      item.onError?.(error instanceof Error ? error : new Error('Audio playback failed'));
      
      // Clean up and continue
      URL.revokeObjectURL(item.audioUrl);
      this.playNext();
    }
  }

  /**
   * Pause current playback
   */
  pause(): void {
    if (this.state.currentAudio && this.state.isPlaying) {
      this.state.currentAudio.pause();
      this.state.isPaused = true;
      this.state.isPlaying = false;
      this.notifyListeners();
    }
  }

  /**
   * Resume paused playback
   */
  resume(): void {
    if (this.state.currentAudio && this.state.isPaused) {
      this.state.currentAudio.play();
      this.state.isPaused = false;
      this.state.isPlaying = true;
      this.notifyListeners();
    }
  }

  /**
   * Stop current playback and clear queue
   */
  stop(): void {
    if (this.state.currentAudio) {
      this.state.currentAudio.pause();
      this.state.currentAudio.currentTime = 0;
    }
    
    // Clean up all queued items
    this.state.queue.forEach(item => {
      URL.revokeObjectURL(item.audioUrl);
    });
    
    this.state = {
      ...this.state,
      isPlaying: false,
      isPaused: false,
      currentAudio: null,
      queue: []
    };
    
    this.notifyListeners();
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume));
    if (this.state.currentAudio) {
      this.state.currentAudio.volume = this.state.volume;
    }
    this.notifyListeners();
  }

  /**
   * Get current state
   */
  getState(): AudioPlaybackState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: AudioPlaybackState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    this.listeners.clear();
  }
}

// Singleton instance
let audioServiceInstance: AudioPlaybackService | null = null;

export const getAudioPlaybackService = (): AudioPlaybackService => {
  if (!audioServiceInstance) {
    audioServiceInstance = new AudioPlaybackService();
  }
  return audioServiceInstance;
};

export default getAudioPlaybackService();