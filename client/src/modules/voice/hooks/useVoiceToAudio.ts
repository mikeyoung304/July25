import { useCallback, useRef } from 'react';
import { getAudioPlaybackService } from '@/services/audio/AudioPlaybackService';
import { useToast } from '@/hooks/useToast';
import { useRestaurant } from '@/core/restaurant-hooks';
import { supabase } from '@/core/supabase';
import { getDemoToken } from '@/services/auth/demoAuth';

// Helper to resolve absolute API URLs for production (Vercel)
const API_BASE = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? 'https://july25.onrender.com' : 'http://localhost:3001');
const url = (path: string) => {
  if (import.meta.env.DEV && path.startsWith('api/')) {
    console.warn('[voice] Warning: relative API path detected:', path);
  }
  const base = API_BASE.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
};

// Helper to get auth headers
const getAuthHeaders = async (): Promise<HeadersInit> => {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: HeadersInit = {
    'X-Restaurant-ID': '11111111-1111-1111-1111-111111111111'
  };
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  } else {
    // Use demo token for kiosk mode
    try {
      const demoToken = await getDemoToken();
      headers['Authorization'] = `Bearer ${demoToken}`;
    } catch (error) {
      console.error('Failed to get demo token:', error);
      // Fallback to test-token in development
      if (import.meta.env.DEV) {
        headers['Authorization'] = 'Bearer test-token';
      }
    }
  }
  
  return headers;
};

// Dev/preview logging for debugging
if (import.meta.env.DEV || import.meta.env.MODE === 'preview') {
  console.log('[voice] API base:', API_BASE || 'http://localhost:3001', '| mode:', import.meta.env.MODE);
}

export interface VoiceToAudioOptions {
  onTranscriptReceived?: (transcript: string) => void;
  onOrderDataReceived?: (orderData: any) => void;
  onAudioResponseStart?: () => void;
  onAudioResponseEnd?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for processing voice input and playing audio responses
 * Handles the complete flow: voice → transcription → AI response → audio playback
 */

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

      // Step 2: Process voice with AI service
      
      let response: Response;
      let usedEndpoint = '';

      // Use voice-chat endpoint with audio accept header
      const authHeaders = await getAuthHeaders();
      const endpoint = url('/api/v1/ai/voice-chat');
      console.log('Calling voice endpoint:', endpoint);
      
      response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: { ...authHeaders, 'Accept': 'audio/mpeg' }
      });
      
      console.log('Voice response status:', response.status, 'type:', response.headers.get('content-type'));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Voice processing failed:', errorText);
        throw new Error(`Voice processing failed: ${response.status} - ${errorText}`);
      }
      usedEndpoint = '/api/v1/ai/voice-chat';

      // Check if response is audio or JSON error
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('audio')) {
        console.log('Received audio response from AI service');
        
        // Extract metadata from headers
        const transcript = response.headers.get('X-Transcript') 
          ? decodeURIComponent(response.headers.get('X-Transcript')!) 
          : '';
        const responseText = response.headers.get('X-Response-Text')
          ? decodeURIComponent(response.headers.get('X-Response-Text')!)
          : 'AI Response';
        const orderDataHeader = response.headers.get('X-Order-Data');
        
        // Parse order data if present
        if (orderDataHeader) {
          try {
            const orderData = JSON.parse(decodeURIComponent(orderDataHeader));
            console.log('Parsed order data from response:', orderData);
            
            // Emit order data for processing
            options.onOrderDataReceived?.(orderData);
          } catch (error) {
            console.error('Failed to parse order data from header:', error);
          }
        }
        
        // Emit transcript if we got one
        if (transcript) {
          options.onTranscriptReceived?.(transcript);
        }
        
        // Step 3: Get audio blob from response
        const audioResponseBlob = await response.blob();
        
        // Step 4: Play audio using AudioPlaybackService
        await audioService.playAudioBlob(
          audioResponseBlob,
          responseText,
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

      // Process voice for transcript only
      
      let transcriptResponse: Response;
      let usedEndpoint = '';

      // Use voice-chat endpoint with audio accept header
      const authHeaders = await getAuthHeaders();
      transcriptResponse = await fetch(url('/api/v1/ai/voice-chat'), {
        method: 'POST',
        body: formData,
        headers: { ...authHeaders, 'Accept': 'audio/mpeg, application/json' }
      });
      
      if (!transcriptResponse.ok) {
        throw new Error(`Voice transcript processing failed: ${transcriptResponse.statusText}`);
      }
      usedEndpoint = '/api/v1/ai/voice-chat';

      // Server returns MP3 audio directly - play it immediately
      const audioBuffer = await transcriptResponse.arrayBuffer();
      
      console.log('Received audio response:', audioBuffer.byteLength, 'bytes');
      
      // Convert ArrayBuffer to Blob for audio service
      // Trust the server to send valid audio
      const responseAudioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      
      // Play the MP3 response using the correct method
      await audioService.playAudioBlob(responseAudioBlob, 'Voice response', {
        onStart: () => {
          console.log('OpenAI TTS audio playback started');
          options.onAudioResponseStart?.();
        },
        onEnd: () => {
          console.log('OpenAI TTS audio playback ended');
          options.onAudioResponseEnd?.();
        },
        onError: (error) => {
          console.error('Audio playback error:', error);
          options.onError?.(error);
        }
      });

      // Return a placeholder text since OpenAI TTS doesn't return transcription separately
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


  return {
    processVoiceToAudio,
    processVoiceWithTranscript,
    isProcessing,
    audioService
  };
}