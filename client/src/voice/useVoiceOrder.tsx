/**
 * React hook for voice ordering functionality
 * Integrates audio pipeline and WebSocket transport
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { logger } from '@/services/logger'
import { AudioPipeline, DEFAULT_AUDIO_CONFIG, AudioConfig } from './audio-pipeline';
import { VoiceTransport, ConnectionState, TranscriptData, ResponseData, DEFAULT_CONFIG, VoiceTransportConfig } from './ws-transport';

export interface VoiceOrderState {
  isRecording: boolean;
  connectionState: ConnectionState;
  currentTranscript: string;
  finalTranscripts: string[];
  currentResponse: string;
  isPlayingResponse: boolean;
  error: string | null;
  permissionGranted: boolean;
}

export interface VoiceOrderConfig {
  audio?: Partial<AudioConfig>;
  transport?: Partial<VoiceTransportConfig>;
  autoplayUnlockRequired?: boolean;
}

export interface UseVoiceOrderReturn extends VoiceOrderState {
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
  clearTranscripts: () => void;
  requestPermissions: () => Promise<boolean>;
  connect: () => void;
  disconnect: () => void;
  unlockAutoplay: () => Promise<boolean>;
}

/**
 * Custom hook for voice ordering with audio pipeline and WebSocket transport
 */
export function useVoiceOrder(config: VoiceOrderConfig = {}): UseVoiceOrderReturn {
  // State
  const [state, setState] = useState<VoiceOrderState>({
    isRecording: false,
    connectionState: 'disconnected',
    currentTranscript: '',
    finalTranscripts: [],
    currentResponse: '',
    isPlayingResponse: false,
    error: null,
    permissionGranted: false,
  });

  // Refs for managing instances
  const pipelineRef = useRef<AudioPipeline | null>(null);
  const transportRef = useRef<VoiceTransport | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const autoplayUnlockedRef = useRef<boolean>(false);

  // Configuration
  const audioConfig = { ...DEFAULT_AUDIO_CONFIG, ...config.audio };
  const transportConfig = { ...DEFAULT_CONFIG, ...config.transport };

  // Update state helper
  const updateState = useCallback((updates: Partial<VoiceOrderState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Initialize transport
  useEffect(() => {
    const transport = new VoiceTransport(transportConfig);
    transportRef.current = transport;

    // Set up transport event listeners
    transport.on('connectionChange', (connectionState) => {
      updateState({ connectionState });
    });

    transport.on('transcript', (data: TranscriptData) => {
      if (data.isFinal) {
        updateState({
          currentTranscript: '',
          finalTranscripts: prev => [...prev.finalTranscripts, data.text],
        });
      } else {
        updateState({ currentTranscript: data.text });
      }
    });

    transport.on('response', async (data: ResponseData) => {
      updateState({ currentResponse: data.text });
      
      // Handle TTS audio playback
      if (data.audioData || data.audioUrl) {
        await playResponseAudio(data.audioData || data.audioUrl!);
      }
    });

    transport.on('error', (error) => {
      updateState({ error: error.message });
      console.error('Voice transport error:', error);
    });

    transport.on('heartbeat', () => {
      // Keep connection alive
      logger.debug('Heartbeat received');
    });

    return () => {
      transport.destroy();
    };
  }, [transportConfig, updateState]);

  // Initialize audio pipeline
  useEffect(() => {
    const pipeline = new AudioPipeline(audioConfig);
    pipelineRef.current = pipeline;

    return () => {
      pipeline.destroy();
    };
  }, [audioConfig]);

  // Initialize audio element for TTS playback
  useEffect(() => {
    audioElementRef.current = new Audio();
    audioElementRef.current.preload = 'none';
    
    const audioElement = audioElementRef.current;
    
    audioElement.addEventListener('loadstart', () => {
      updateState({ isPlayingResponse: true });
    });
    
    audioElement.addEventListener('ended', () => {
      updateState({ isPlayingResponse: false });
    });
    
    audioElement.addEventListener('error', () => {
      updateState({ isPlayingResponse: false, error: 'Audio playback failed' });
    });

    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [updateState]);

  // Request microphone permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Test permissions by creating a stream then stopping it
      stream.getTracks().forEach(track => track.stop());
      updateState({ permissionGranted: true, error: null });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Permission denied';
      updateState({ permissionGranted: false, error: errorMessage });
      return false;
    }
  }, [updateState]);

  // Unlock autoplay for TTS audio
  const unlockAutoplay = useCallback(async (): Promise<boolean> => {
    if (autoplayUnlockedRef.current) {
      return true;
    }

    try {
      if (audioElementRef.current) {
        // Play a silent audio to unlock autoplay
        const silentAudio = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
        audioElementRef.current.src = silentAudio;
        await audioElementRef.current.play();
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
        autoplayUnlockedRef.current = true;
        return true;
      }
    } catch (error) {
      console.warn('Failed to unlock autoplay:', error);
    }
    
    return false;
  }, []);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    transportRef.current?.connect();
  }, []);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    if (state.isRecording) {
      stopRecording();
    }
    transportRef.current?.disconnect();
  }, [state.isRecording]);

  // Start recording
  const startRecording = useCallback(async (): Promise<boolean> => {
    if (state.isRecording || !pipelineRef.current || !transportRef.current) {
      return false;
    }

    try {
      // Clear any previous errors
      updateState({ error: null });

      // Ensure we have permissions
      if (!state.permissionGranted) {
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
          return false;
        }
      }

      // Ensure we're connected
      if (!transportRef.current.isConnected()) {
        connect();
        // Wait a bit for connection
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!transportRef.current?.isConnected()) {
          updateState({ error: 'Failed to connect to voice service' });
          return false;
        }
      }

      // Initialize and start pipeline
      await pipelineRef.current.initialize();
      
      pipelineRef.current.start((encodedFrame: string, hasVoice: boolean) => {
        if (transportRef.current?.isConnected()) {
          transportRef.current.sendAudio(encodedFrame, hasVoice);
        }
      });

      updateState({ 
        isRecording: true,
        currentTranscript: '',
        error: null 
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      updateState({ error: errorMessage });
      return false;
    }
  }, [state.isRecording, state.permissionGranted, requestPermissions, connect, updateState]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!state.isRecording || !pipelineRef.current) {
      return;
    }

    pipelineRef.current.stop();
    updateState({ isRecording: false });
  }, [state.isRecording, updateState]);

  // Clear transcripts
  const clearTranscripts = useCallback(() => {
    updateState({
      currentTranscript: '',
      finalTranscripts: [],
      currentResponse: '',
      error: null,
    });
  }, [updateState]);

  // Play response audio (TTS)
  const playResponseAudio = useCallback(async (audioSource: string): Promise<void> => {
    if (!audioElementRef.current) {
      return;
    }

    try {
      // Ensure autoplay is unlocked
      if (config.autoplayUnlockRequired && !autoplayUnlockedRef.current) {
        console.warn('Autoplay not unlocked, skipping audio playback');
        return;
      }

      const audioElement = audioElementRef.current;
      
      // Pause current TTS if barge-in occurs (user starts speaking)
      if (state.isRecording && state.isPlayingResponse) {
        audioElement.pause();
        updateState({ isPlayingResponse: false });
        return;
      }

      // Set audio source (base64 data or URL)
      if (audioSource.startsWith('data:') || audioSource.startsWith('http')) {
        audioElement.src = audioSource;
      } else {
        // Assume it's base64 audio data
        audioElement.src = `data:audio/wav;base64,${audioSource}`;
      }

      await audioElement.play();
    } catch (error) {
      console.error('Failed to play response audio:', error);
      updateState({ isPlayingResponse: false, error: 'Audio playback failed' });
    }
  }, [config.autoplayUnlockRequired, state.isRecording, state.isPlayingResponse, updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.isRecording) {
        pipelineRef.current?.stop();
      }
      transportRef.current?.destroy();
      pipelineRef.current?.destroy();
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }
    };
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    clearTranscripts,
    requestPermissions,
    connect,
    disconnect,
    unlockAutoplay,
  };
}