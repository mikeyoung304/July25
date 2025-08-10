import { useCallback, useRef } from 'react';
import { getAudioPlaybackService } from '@/services/audio/AudioPlaybackService';
import { useToast } from '@/hooks/useToast';
import { useRestaurant } from '@/core/restaurant-hooks';

export interface VoiceToAudioOptions {
  onTranscriptReceived?: (transcript: string) => void;
  onAudioResponseStart?: () => void;
  onAudioResponseEnd?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for processing voice input and playing audio responses
 * Handles the complete flow: voice → transcription → AI response → audio playback
 */
// Quick diagnostic function to check if realtime endpoint exists
const checkRealtimeEndpoint = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/v1/ai/voice-chat-realtime', {
      method: 'OPTIONS', // Use OPTIONS to check endpoint availability without sending data
      signal: AbortSignal.timeout(2000) // Quick 2-second check
    });
    console.warn(`🔍 Realtime endpoint check: ${response.status} ${response.statusText}`);
    return response.status !== 404;
  } catch (error) {
    console.warn('🔍 Realtime endpoint check failed:', error);
    return false;
  }
};

export function useVoiceToAudio(options: VoiceToAudioOptions = {}) {
  const { toast } = useToast();
  const { restaurant } = useRestaurant();
  const audioService = getAudioPlaybackService();
  const processingSemaphore = useRef(false);

  const processVoiceToAudio = useCallback(async (audioBlob: Blob): Promise<void> => {
    // Prevent concurrent processing
    if (processingSemaphore.current) {
      console.warn('Voice processing already in progress, ignoring new request');
      return;
    }

    processingSemaphore.current = true;

    try {
      // Step 1: Create form data for API call
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.webm');

      console.log('Sending voice to AI service for processing...');

      // Step 2: Race pattern - try realtime with fast timeout, fallback immediately
      const useRealtime = import.meta.env.VITE_USE_REALTIME_VOICE !== 'false'; // Default to true
      
      let response: Response;
      let usedEndpoint = '';

      if (useRealtime) {
        // Try realtime first with manual timeout, immediate fallback on any issue
        try {
          console.warn('🚀 Attempting realtime endpoint...');
          const realtimeFormData = new FormData();
          realtimeFormData.append('audio', audioBlob, 'voice.webm');
          
          // Manual timeout implementation for better browser support
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            controller.abort();
            console.warn('⏰ Realtime timeout after 8 seconds');
          }, 8000); // Temporarily increase to 8 seconds to test if endpoint works
          
          const realtimeResponse = await fetch('/api/v1/ai/voice-chat-realtime', {
            method: 'POST',
            body: realtimeFormData,
            headers: { 'Accept': 'audio/mpeg' },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (realtimeResponse.ok) {
            response = realtimeResponse;
            usedEndpoint = '/api/v1/ai/voice-chat-realtime';
            const voiceMode = response.headers.get('X-Voice-Mode') || 'realtime';
            console.warn(`✅ Realtime SUCCESS: ${usedEndpoint} (mode: ${voiceMode})`);
          } else {
            console.warn(`❌ Realtime endpoint returned status ${realtimeResponse.status}: ${realtimeResponse.statusText}`);
            throw new Error(`Realtime endpoint returned ${realtimeResponse.status}: ${realtimeResponse.statusText}`);
          }
          
        } catch (error) {
          // Immediate fallback to regular endpoint
          console.warn('❌ Realtime failed, using regular endpoint:', error.message || error);
          const regularFormData = new FormData();
          regularFormData.append('audio', audioBlob, 'voice.webm');
          
          response = await fetch('/api/v1/ai/voice-chat', {
            method: 'POST',
            body: regularFormData,
            headers: { 'Accept': 'audio/mpeg' }
          });
          
          if (!response.ok) {
            throw new Error(`Regular endpoint failed: ${response.status}`);
          }
          usedEndpoint = '/api/v1/ai/voice-chat';
          const voiceMode = response.headers.get('X-Voice-Mode') || 'regular';
          console.warn(`✅ Regular fallback SUCCESS: ${usedEndpoint} (mode: ${voiceMode})`);
        }
      } else {
        // Use regular endpoint only
        response = await fetch('/api/v1/ai/voice-chat', {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'audio/mpeg' }
        });
        
        if (!response.ok) {
          throw new Error(`Voice processing failed: ${response.status}`);
        }
        usedEndpoint = '/api/v1/ai/voice-chat';
      }

      // Check if response is audio or JSON error
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('audio')) {
        console.log('Received audio response from AI service');
        
        // Step 3: Get audio blob from response
        const audioResponseBlob = await response.blob();
        
        // Step 4: Play audio using AudioPlaybackService
        await audioService.playAudioBlob(
          audioResponseBlob,
          'AI Response', // We don't have transcript from this endpoint
          {
            onStart: () => {
              console.log('AI audio response started playing');
              options.onAudioResponseStart?.();
            },
            onEnd: () => {
              console.log('AI audio response finished playing');
              options.onAudioResponseEnd?.();
            },
            onError: (error) => {
              console.error('Audio playback error:', error);
              options.onError?.(error);
              toast.error('Failed to play audio response');
            }
          }
        );

        // Success feedback
        toast.success('Voice processed successfully');
        
      } else {
        // Response was JSON (error case)
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unexpected response format');
      }

    } catch (error) {
      console.error('Voice to audio processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Voice processing failed';
      
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
      toast.error(errorMessage);
    } finally {
      processingSemaphore.current = false;
    }
  }, [audioService, options, toast, restaurant]);

  const processVoiceWithTranscript = useCallback(async (audioBlob: Blob): Promise<string | null> => {
    // Prevent concurrent processing
    if (processingSemaphore.current) {
      console.warn('Voice processing already in progress, ignoring new request');
      return null;
    }

    processingSemaphore.current = true;

    try {
      // Step 1: Get transcription with metadata
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.webm');

      // Race pattern for transcript processing too
      const useRealtime = import.meta.env.VITE_USE_REALTIME_VOICE !== 'false'; // Default to true
      
      let transcriptResponse: Response;
      let usedEndpoint = '';

      if (useRealtime) {
        try {
          console.warn('🚀 Attempting realtime transcript endpoint...');
          const realtimeFormData = new FormData();
          realtimeFormData.append('audio', audioBlob, 'voice.webm');
          
          // Manual timeout for transcript processing
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            controller.abort();
            console.warn('⏰ Realtime transcript timeout after 8 seconds');
          }, 8000); // Temporarily increase to 8 seconds to test if endpoint works
          
          const realtimeResponse = await fetch('/api/v1/ai/voice-chat-realtime', {
            method: 'POST',
            body: realtimeFormData,
            headers: { 'Accept': 'audio/mpeg, application/json' },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (realtimeResponse.ok) {
            transcriptResponse = realtimeResponse;
            usedEndpoint = '/api/v1/ai/voice-chat-realtime';
            const voiceMode = transcriptResponse.headers.get('X-Voice-Mode') || 'realtime';
            console.warn(`✅ Realtime transcript SUCCESS: ${usedEndpoint} (mode: ${voiceMode})`);
          } else {
            console.warn(`❌ Realtime transcript endpoint returned status ${realtimeResponse.status}: ${realtimeResponse.statusText}`);
            throw new Error(`Realtime transcript endpoint returned ${realtimeResponse.status}: ${realtimeResponse.statusText}`);
          }
          
        } catch (error) {
          // Immediate fallback
          console.warn('❌ Realtime transcript failed, using regular endpoint:', error.message || error);
          const regularFormData = new FormData();
          regularFormData.append('audio', audioBlob, 'voice.webm');
          
          transcriptResponse = await fetch('/api/v1/ai/voice-chat', {
            method: 'POST',
            body: regularFormData,
            headers: { 'Accept': 'audio/mpeg, application/json' }
          });
          
          if (!transcriptResponse.ok) {
            throw new Error(`Regular transcript endpoint failed: ${transcriptResponse.statusText}`);
          }
          usedEndpoint = '/api/v1/ai/voice-chat';
          const voiceMode = transcriptResponse.headers.get('X-Voice-Mode') || 'regular';
          console.warn(`✅ Regular transcript fallback SUCCESS: ${usedEndpoint} (mode: ${voiceMode})`);
        }
      } else {
        transcriptResponse = await fetch('/api/v1/ai/voice-chat', {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'audio/mpeg, application/json' }
        });
        
        if (!transcriptResponse.ok) {
          throw new Error(`Voice transcript processing failed: ${transcriptResponse.statusText}`);
        }
        usedEndpoint = '/api/v1/ai/voice-chat';
      }

      // BuildPanel returns MP3 audio directly - play it immediately
      const audioBuffer = await transcriptResponse.arrayBuffer();
      
      console.log('Received audio response from BuildPanel:', audioBuffer.byteLength, 'bytes');
      
      // Convert ArrayBuffer to Blob for audio service
      const responseAudioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      
      // Play the MP3 response using the correct method
      await audioService.playAudioBlob(responseAudioBlob, 'Voice response', {
        onStart: () => {
          console.log('BuildPanel audio playback started');
          options.onAudioResponseStart?.();
        },
        onEnd: () => {
          console.log('BuildPanel audio playback ended');
          options.onAudioResponseEnd?.();
        },
        onError: (error) => {
          console.error('Audio playback error:', error);
          options.onError?.(error);
        }
      });

      // Return a placeholder text since BuildPanel doesn't return transcription separately
      const placeholderText = "Voice processed successfully";
      options.onTranscriptReceived?.(placeholderText);
      
      return placeholderText;

    } catch (error) {
      console.error('Voice with transcript processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Voice processing failed';
      
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
      toast.error(errorMessage);
      return null;
    } finally {
      processingSemaphore.current = false;
    }
  }, [processVoiceToAudio, options, toast]);

  const isProcessing = () => processingSemaphore.current;

  // Diagnostic function for testing realtime endpoint
  const testRealtimeEndpoint = useCallback(async () => {
    console.warn('🧪 Testing realtime endpoint availability...');
    const isAvailable = await checkRealtimeEndpoint();
    console.warn(`🧪 Realtime endpoint is_available: ${isAvailable}`);
    return isAvailable;
  }, []);

  return {
    processVoiceToAudio,
    processVoiceWithTranscript,
    isProcessing,
    audioService,
    testRealtimeEndpoint // Export for manual testing
  };
}