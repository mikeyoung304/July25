/* eslint-env browser */
import { EventEmitter } from '../../../services/utils/EventEmitter';
import { getAuthToken } from '../../../services/auth';
import { logger } from '../../../services/monitoring/logger';
import { getAgentConfigForMode, mergeMenuIntoConfig } from '../config/voice-agent-modes';
import { safeParseEvent } from './RealtimeGuards';
import { normalizeSessionConfig } from './SessionConfigNormalizer';

export interface WebRTCVoiceConfig {
  restaurantId: string;
  userId?: string;
  debug?: boolean;
  enableVAD?: boolean; // Optional: enable server VAD mode
  mode?: 'employee' | 'customer'; // Authentication-based mode
  enableAudioOutput?: boolean; // Enable/disable voice output
  visualFeedbackOnly?: boolean; // Visual confirmations only (for employees)
}

export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
  confidence?: number;
  timestamp: number;
}

export interface OrderEvent {
  items: Array<{
    name: string;
    quantity: number;
    modifiers?: string[];
  }>;
  confidence: number;
  timestamp: number;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

export type ErrorType =
  | 'permission_denied'
  | 'device_error'
  | 'network_error'
  | 'auth_error'
  | 'rate_limit'
  | 'server_error'
  | 'unknown';

export interface VoiceError extends Error {
  type: ErrorType;
  code?: string;
  retryable: boolean;
  userFriendlyMessage: string;
}

export type TurnState = 
  | 'idle'
  | 'recording'
  | 'committing'
  | 'waiting_user_final'
  | 'waiting_response';

/**
 * WebRTC client for OpenAI Realtime API
 * Provides low-latency voice transcription and responses
 */
export class WebRTCVoiceClient extends EventEmitter {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaStream: MediaStream | null = null;
  private config: WebRTCVoiceConfig;
  private connectionState: ConnectionState = 'disconnected';
  private ephemeralToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private partialTranscript = '';
  private aiPartialTranscript = '';
  private reconnectDelay = 1000;
  private isRecording = false;
  private sessionActive = false;
  private isConnecting = false;
  private activeResponseId: string | null = null;
  private messageQueue: any[] = [];
  private dcReady = false;
  private lastCommitTime = 0;
  
  // Turn state machine
  private turnState: TurnState = 'idle';
  private currentUserItemId: string | null = null;
  private seenEventIds = new Set<string>();
  private turnId = 0;
  private eventIndex = 0;
  
  // Transcript management
  private transcriptMap = new Map<string, { text: string; final: boolean; role: 'user' | 'assistant' }>();
  
  // Menu context
  private menuContext = '';

  constructor(config: WebRTCVoiceConfig) {
    super();
    this.config = config;
    
    // Log API base once at initialization
    // const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'; // Not currently used
    // Debug: `[RT] WebRTC Voice Client initialized - API: ${apiBase}`
    
    if (this.config.debug) {
      // Debug: '[RT] Debug mode enabled, config:', config
    }
  }

  /**
   * Connect to OpenAI Realtime API via WebRTC
   */
  async connect(): Promise<void> {
    // Prevent duplicate connections
    if (this.isConnecting || this.connectionState === 'connected') {
      logger.info('[WebRTCVoice] Already connecting or connected, skipping...');
      return;
    }
    
    this.isConnecting = true;
    
    try {
      logger.info('[WebRTCVoice] Starting connection...');
      this.setConnectionState('connecting');
      
      // Step 1: Get ephemeral token from our server
      logger.info('[WebRTCVoice] Step 1: Fetching ephemeral token...');
      await this.fetchEphemeralToken();
      logger.info('[WebRTCVoice] Step 1: Token received');
      
      // Step 2: Create RTCPeerConnection
      logger.info('[WebRTCVoice] Step 2: Creating RTCPeerConnection...');
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
        ],
        bundlePolicy: 'max-bundle',
      });
      
      this.setupPeerConnectionHandlers();
      
      // Step 3: Set up audio output handler (skip for employee mode)
      const shouldEnableAudio = this.config.enableAudioOutput !== false &&
                                this.config.mode !== 'employee';

      if (shouldEnableAudio) {
        logger.info('[WebRTCVoice] Step 3: Setting up audio output...');
        this.audioElement = document.createElement('audio');
        this.audioElement.autoplay = true;
        this.audioElement.style.display = 'none';
        document.body.appendChild(this.audioElement);

        this.pc.ontrack = (event) => {
          logger.info('[WebRTCVoice] Received remote audio track:', { streams: event.streams.length });
          if (this.audioElement && event.streams[0]) {
            this.audioElement.srcObject = event.streams[0];
          }
        };
      } else {
        logger.info('[WebRTCVoice] Step 3: Skipping audio output (employee mode or disabled)');
        this.pc.ontrack = (event) => {
          logger.info('[WebRTCVoice] Ignoring remote audio track (audio output disabled)');
        };
      }
      
      // Step 4: Set up microphone and add track (creates first m-line)
      logger.info('[WebRTCVoice] Step 4: Setting up microphone...');
      await this.setupMicrophone();
      logger.info('[WebRTCVoice] Step 4: Microphone setup complete');
      
      // Step 5: Create data channel (creates second m-line)
      logger.info('[WebRTCVoice] Step 5: Creating data channel...');
      this.dc = this.pc.createDataChannel('oai-events', {
        ordered: true,
      });
      this.setupDataChannel();
      
      // Step 6: Create offer and establish connection
      logger.info('[WebRTCVoice] Step 6: Creating offer...');
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      logger.info('[WebRTCVoice] Step 6: Local description set');
      
      if (this.config.debug) {
        // Log the m-lines in the offer to debug ordering
        const mLines = offer.sdp?.match(/m=.*/g);
        // Debug: '[WebRTCVoice] SDP m-lines in offer:', mLines
      }
      
      // Step 7: Send SDP to OpenAI
      logger.info('[WebRTCVoice] Step 7: Sending SDP to OpenAI...');
      const model = import.meta.env.VITE_OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2025-06-03';
      logger.info('[WebRTCVoice] Using model:', { model });
      logger.info('[WebRTCVoice] Token exists:', { hasToken: !!this.ephemeralToken });
      
      const sdpResponse = await fetch(
        `https://api.openai.com/v1/realtime?model=${model}`,
        {
          method: 'POST',
          body: offer.sdp,
          headers: {
            'Authorization': `Bearer ${this.ephemeralToken}`,
            'Content-Type': 'application/sdp',
          },
        }
      );
      
      logger.info('[WebRTCVoice] Step 7: OpenAI response status:', { status: sdpResponse.status });
      
      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error('[WebRTCVoice] OpenAI SDP exchange failed:', sdpResponse.status, errorText);
        
        if (sdpResponse.status === 401) {
          throw new Error('AUTH_FAILED:OpenAI authentication failed. Token may be expired.');
        } else if (sdpResponse.status === 429) {
          throw new Error('RATE_LIMIT:Rate limited. Please wait a moment before trying again.');
        } else if (sdpResponse.status >= 500) {
          throw new Error('SERVER_ERROR:Voice service temporarily unavailable. Please try again.');
        } else {
          throw new Error(`NETWORK_ERROR:Voice service unavailable (${sdpResponse.status}). Please try again.`);
        }
      }
      
      // Step 8: Set remote description
      const answerSdp = await sdpResponse.text();
      
      // Check if pc still exists and is in correct state
      if (!this.pc) {
        throw new Error('PeerConnection was closed during SDP exchange');
      }
      
      // Check if we're in the correct state to set remote description
      if (this.pc.signalingState !== 'have-local-offer') {
        console.error('[WebRTCVoice] Wrong signaling state for setting answer:', this.pc.signalingState);
        throw new Error(`Cannot set remote answer in state: ${this.pc.signalingState}`);
      }
      
      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: answerSdp,
      };
      
      // Debug: '[WebRTCVoice] Setting remote description...'
      await this.pc.setRemoteDescription(answer);
      
      this.sessionActive = true;
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      
      if (this.config.debug) {
        // Debug: '[WebRTCVoice] WebRTC connection established'
      }
      
    } catch (error) {
      console.error('[WebRTCVoice] Connection failed:', error);
      this.isConnecting = false;
      this.setConnectionState('error');
      this.emit('error', error);
      
      // Clean up failed connection
      this.cleanupConnection();
      
      // Attempt reconnection with proper delay
      this.reconnectAttempts++;
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(5000, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
        // Debug: `[WebRTCVoice] Will retry connection in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
        setTimeout(() => {
          if (this.connectionState !== 'connected') {
            this.reconnect();
          }
        }, delay);
      } else {
        console.error('[WebRTCVoice] Max reconnection attempts reached. Please refresh the page.');
      }
    }
  }

  /**
   * Fetch ephemeral token from our backend
   */
  private async fetchEphemeralToken(): Promise<void> {
    // Get auth token - this will throw if no auth is available
    let authToken: string;
    try {
      logger.info('[WebRTCVoice] Attempting to get auth token...');
      authToken = await getAuthToken();
      if (!authToken) {
        console.error('[WebRTCVoice] Auth token is null/undefined');
        throw new Error('No authentication token available. Please log in first.');
      }
      logger.info('[WebRTCVoice] Auth token obtained successfully');
    } catch (error) {
      console.error('[WebRTCVoice] Failed to get auth token:', error);
      // Re-throw with a user-friendly message
      throw new Error('Authentication required. Please log in to use voice ordering.');
    }
    
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    
    if (this.config.debug) {
      // Debug: '[RT] Fetching ephemeral token from:', `${apiBase}/api/v1/realtime/session`
    }
    
    logger.info('[WebRTCVoice] Requesting ephemeral token from:', { endpoint: `${apiBase}/api/v1/realtime/session` });
    const response = await fetch(`${apiBase}/api/v1/realtime/session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'x-restaurant-id': this.config.restaurantId,
      },
      body: JSON.stringify({
        mode: this.config.mode || 'customer' // Pass mode to backend
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WebRTCVoice] Ephemeral token request failed:', response.status, errorText);
      
      if (response.status === 401) {
        throw new Error('AUTH_FAILED:Authentication failed. Please log in again.');
      } else if (response.status === 403) {
        throw new Error('AUTH_FAILED:Permission denied. Voice ordering may not be available for your role.');
      } else if (response.status === 429) {
        throw new Error('RATE_LIMIT:Too many requests. Please wait a moment before trying again.');
      } else if (response.status >= 500) {
        throw new Error('SERVER_ERROR:Voice service temporarily unavailable. Please try again.');
      } else {
        throw new Error(`NETWORK_ERROR:Failed to get voice session: ${response.status} - ${errorText}`);
      }
    }
    
    const data = await response.json();
    this.ephemeralToken = data.client_secret.value;
    this.tokenExpiresAt = data.expires_at || Date.now() + 60000;
    
    logger.info('[WebRTCVoice] Ephemeral token received successfully');
    
    // Store menu context if provided
    if (data.menu_context) {
      this.menuContext = data.menu_context;
      logger.info('[WebRTCVoice] Menu context loaded:', { lines: this.menuContext.split('\n').length });
    }
    
    // Schedule token refresh 10 seconds before expiry
    this.scheduleTokenRefresh();
    
    if (this.config.debug) {
      // Debug: '[WebRTCVoice] Got ephemeral token, expires at:', new Date(this.tokenExpiresAt)
    }
  }

  /**
   * Schedule token refresh before expiry
   */
  private scheduleTokenRefresh(): void {
    // Clear any existing timer
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }
    
    // Calculate when to refresh (10 seconds before expiry)
    const refreshTime = this.tokenExpiresAt - Date.now() - 10000;
    
    if (refreshTime > 0) {
      this.tokenRefreshTimer = setTimeout(async () => {
        if (this.sessionActive) {
          // Debug: '[WebRTCVoice] Refreshing ephemeral token...'
          try {
            await this.fetchEphemeralToken();
            // Note: We can't update an active WebRTC session token
            // This is for the next connection
          } catch (error) {
            console.error('[WebRTCVoice] Token refresh failed:', error);
          }
        }
      }, refreshTime);
    }
  }

  /**
   * Set up microphone input
   */
  private async setupMicrophone(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Don't specify sample rate - let browser negotiate
        },
      });
      
      const audioTrack = this.mediaStream.getAudioTracks()[0];
      if (this.pc && audioTrack) {
        // CRITICAL: Ensure track is MUTED before adding to connection
        // Debug: '[WebRTCVoice] Audio track initial state - enabled:', audioTrack.enabled
        audioTrack.enabled = false;
        // Debug: '[WebRTCVoice] Audio track after muting - enabled:', audioTrack.enabled
        
        // Simple approach: just add the track
        this.pc.addTrack(audioTrack, this.mediaStream);
        // Debug: '[WebRTCVoice] Audio track added to peer connection in MUTED state'
        
        if (this.config.debug) {
          // Debug: '[WebRTCVoice] Microphone connected but muted - will only transmit when button held'
        }
      }
    } catch (error) {
      console.error('[WebRTCVoice] Microphone setup failed:', error);
      throw new Error('Microphone access denied or unavailable');
    }
  }

  /**
   * Set up data channel for bidirectional event communication
   */
  private setupDataChannel(): void {
    if (!this.dc) return;
    
    this.dc.onopen = () => {
      if (this.config.debug) {
        // Debug: '[WebRTCVoice] Data channel opened'
      }
      
      this.dcReady = true;
      this.setConnectionState('connected');
      
      // Flush any queued messages
      if (this.messageQueue.length > 0) {
        // Debug: `[WebRTCVoice] Flushing ${this.messageQueue.length} queued messages`
        for (const msg of this.messageQueue) {
          this.dc!.send(JSON.stringify(msg));
        }
        this.messageQueue = [];
      }
      // Wait for session.created before sending session.update
    };
    
    this.dc.onmessage = async (event) => {
      if (this.config.debug) {
        console.log('[WebRTC] DataChannel message received:', {
          dataType: typeof event.data,
          dataLength: event.data?.length
        });
      }

      // Use safe parsing to prevent code execution
      const parsedEvent = await safeParseEvent(event.data);

      if (parsedEvent) {
        this.handleRealtimeEvent(parsedEvent);
      } else if (this.config.debug) {
        console.warn('[WebRTC] Failed to parse or validate event');
      }
    };
    
    this.dc.onerror = (error) => {
      console.error('[WebRTCVoice] Data channel error:', error);
      this.emit('error', error);
    };
    
    this.dc.onclose = () => {
      if (this.config.debug) {
        // Debug: '[WebRTCVoice] Data channel closed'
      }
      this.dcReady = false;
      this.handleDisconnection();
    };
  }

  /**
   * Handle events from OpenAI Realtime API
   */
  private handleRealtimeEvent(event: any): void {
    // Debug logging for raw event payload
    console.error('[DEBUG] handleRealtimeEvent called with:', {
      type: event?.type,
      hasEventId: !!event?.event_id,
      eventKeys: event ? Object.keys(event) : [],
      eventTypeOf: typeof event,
      fullEvent: event
    });

    // Deduplication check
    if (event.event_id && this.seenEventIds.has(event.event_id)) {
      if (this.config.debug) {
        // Debug: `[RT] Duplicate event ignored: ${event.event_id}`
      }
      return;
    }
    if (event.event_id) {
      this.seenEventIds.add(event.event_id);
      // Keep set size bounded
      if (this.seenEventIds.size > 1000) {
        const firstId = this.seenEventIds.values().next().value;
        this.seenEventIds.delete(firstId);
      }
    }
    
    // Instrumentation
    this.eventIndex++;
    const logPrefix = `[RT] t=${this.turnId}#${String(this.eventIndex).padStart(2, '0')}`;
    
    if (this.config.debug) {
      // Debug: `${logPrefix} ${event.type}`, event
    }
    
    switch (event.type) {
      case 'session.created':
        // Debug: `${logPrefix} Session created successfully`
        if (this.config.debug) {
          // Debug: 'Session details:', JSON.stringify(event.session, null, 2)
        }
        this.emit('session.created', event.session);
        // Now send session.update after session is created
        this.configureSession();
        break;
        
      case 'session.updated':
        // Debug: `${logPrefix} Session configuration updated`
        break;
        
      case 'input_audio_buffer.speech_started':
        // Debug: `${logPrefix} Speech started detected`
        if (this.turnState === 'recording') {
          this.partialTranscript = '';
          this.emit('speech.started');
        }
        break;
        
      case 'input_audio_buffer.speech_stopped':
        // Debug: `${logPrefix} Speech stopped detected`
        if (this.turnState === 'recording') {
          this.emit('speech.stopped');
        }
        break;
        
      case 'input_audio_buffer.committed':
        // Debug: `${logPrefix} Audio buffer committed`
        break;
        
      case 'input_audio_buffer.cleared':
        // Debug: `${logPrefix} Audio buffer cleared`
        break;
        
      case 'conversation.item.created':
        // Track items by role
        if (event.item?.role === 'user' && event.item?.id) {
          this.currentUserItemId = event.item.id;
          // Debug: `${logPrefix} User item created: ${this.currentUserItemId}`
          // Initialize transcript entry
          this.transcriptMap.set(event.item.id, { text: '', final: false, role: 'user' });
        } else if (event.item?.role === 'assistant' && event.item?.id) {
          // Debug: `${logPrefix} Assistant item created: ${event.item.id}`
          this.transcriptMap.set(event.item.id, { text: '', final: false, role: 'assistant' });
        }
        break;
        
      case 'conversation.item.input_audio_transcription.delta':
        // Accumulate delta to the correct user item
        if (event.item_id && event.delta) {
          const entry = this.transcriptMap.get(event.item_id);
          if (entry && entry.role === 'user') {
            entry.text += event.delta;
            // Debug: `${logPrefix} User transcript delta (len=${event.delta.length})`
            
            // Emit partial transcript
            const partialTranscript: TranscriptEvent = {
              text: entry.text,
              isFinal: false,
              confidence: 0.9,
              timestamp: Date.now(),
            };
            this.emit('transcript', partialTranscript);
          }
        }
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        // Finalize the user transcript
        if (event.item_id && event.transcript) {
          const entry = this.transcriptMap.get(event.item_id);
          if (entry && entry.role === 'user') {
            entry.text = event.transcript; // Use full transcript, not accumulation
            entry.final = true;
            
            const finalTranscript: TranscriptEvent = {
              text: event.transcript,
              isFinal: true,
              confidence: 0.95,
              timestamp: Date.now(),
            };
            this.emit('transcript', finalTranscript);
            // Debug: `${logPrefix} User transcript completed: "${event.transcript}"`
            
            // State transition: waiting_user_final → waiting_response
            if (this.turnState === 'waiting_user_final' && 
                event.item_id === this.currentUserItemId) {
              // Debug: `${logPrefix} Turn state: waiting_user_final → waiting_response`
              this.turnState = 'waiting_response';
              
              // Send exactly one response.create
              this.sendEvent({
                type: 'response.create',
                response: {
                  modalities: ['text', 'audio'],
                  instructions: 'You MUST respond in English only. Respond about their order with appropriate follow-up questions. Use smart follow-ups: dressing for salads, bread for sandwiches, sides for entrées. Keep it under 2 sentences. Speak English only, never Spanish or any other language.',
                }
              });
              // Debug: `${logPrefix} Manual response.create sent`
              
              // Note: Order detection now happens via function calling
              // The AI will call add_to_order function when items are detected
            }
          }
        }
        break;
        
      case 'response.created':
        // Track the active response
        if (event.response?.id) {
          this.activeResponseId = event.response.id;
          // Debug: `${logPrefix} Response created: ${this.activeResponseId}`
          // Initialize assistant transcript entry
          if (event.response.output && event.response.output.length > 0) {
            const itemId = event.response.output[0].id;
            if (itemId) {
              this.transcriptMap.set(itemId, { text: '', final: false, role: 'assistant' });
            }
          }
        }
        break;
        
      case 'response.audio_transcript.delta':
        // Accumulate assistant transcript delta
        if (event.delta && this.turnState === 'waiting_response') {
          // Find the assistant item for this response
          const assistantItems = Array.from(this.transcriptMap.entries())
            .filter(([_, entry]) => entry.role === 'assistant' && !entry.final);
          
          if (assistantItems.length > 0) {
            const [itemId, entry] = assistantItems[assistantItems.length - 1];
            entry.text += event.delta;
            // Debug: `${logPrefix} Assistant transcript delta (len=${event.delta.length})`
            
            // Emit partial response
            this.emit('response.text', entry.text);
          }
        }
        break;
        
      case 'response.audio_transcript.done':
        // Finalize assistant transcript
        if (event.transcript) {
          const assistantItems = Array.from(this.transcriptMap.entries())
            .filter(([_, entry]) => entry.role === 'assistant' && !entry.final);
          
          if (assistantItems.length > 0) {
            const [itemId, entry] = assistantItems[assistantItems.length - 1];
            entry.text = event.transcript;
            entry.final = true;
            // Debug: `${logPrefix} Assistant transcript done: "${event.transcript}"`
            
            this.emit('response.complete', event.transcript);
          }
        }
        break;
        
      case 'response.text.delta':
        // Text-only response (if no audio)
        if (this.turnState === 'waiting_response') {
          // For employee mode, emit visual feedback events
          if (this.config.mode === 'employee' || this.config.visualFeedbackOnly) {
            this.emit('visual-feedback', {
              text: event.delta,
              isFinal: false,
              type: 'response'
            });
          }
          this.emit('response.text', event.delta);
        }
        break;
        
      case 'response.audio.delta':
        // Audio is handled via WebRTC audio track
        // Debug: `${logPrefix} Audio delta received (${event.delta?.length || 0} bytes)`
        break;
        
      case 'response.done':
        // Turn complete - transition back to idle
        // Debug: `${logPrefix} Response done`
        if (this.turnState === 'waiting_response') {
          // Debug: `${logPrefix} Turn state: waiting_response → idle`
          this.turnState = 'idle';
          this.currentUserItemId = null;
          this.activeResponseId = null;
          // Increment turn ID for next turn
          this.turnId++;
          this.eventIndex = 0;
        }
        this.emit('response.complete', event.response);
        break;
        
      case 'response.output_item.added':
      case 'response.output_item.done':
      case 'response.content_part.added':
      case 'response.content_part.done':
      case 'rate_limits.updated':
        // Known benign events - log but don't warn
        // Debug: `${logPrefix} ${event.type}`
        break;
        
      case 'response.function_call_arguments.start':
        // Function call started
        // Debug: `${logPrefix} Function call started: ${event.name}`
        break;
        
      case 'response.function_call_arguments.delta':
        // Function call arguments being streamed
        // Debug: `${logPrefix} Function call delta for: ${event.name}`
        break;
        
      case 'response.function_call_arguments.done':
        // Function call complete - parse and emit structured events
        // Debug: `${logPrefix} Function call complete: ${event.name}`, event.arguments
        
        try {
          const args = JSON.parse(event.arguments);
          
          if (event.name === 'add_to_order') {
            // Validate and filter items with names
            const validItems = (args.items || []).filter((item: any) => {
              if (!item?.name) {
                console.warn(`${logPrefix} Skipping item without name:`, item);
                return false;
              }
              return true;
            });
            
            // Emit structured order event with items
            const orderEvent: OrderEvent = {
              items: validItems,
              confidence: 0.95,
              timestamp: Date.now(),
            };
            
            // Debug: `${logPrefix} Emitting order.detected with ${orderEvent.items.length} items`
            this.emit('order.detected', orderEvent);
            
            // Also emit for legacy compatibility
            if (orderEvent.items.length > 0) {
              this.emit('order.items.added', {
                items: orderEvent.items,
                timestamp: Date.now()
              });
            }
          } else if (event.name === 'confirm_order') {
            // Emit order confirmation event
            // Debug: `${logPrefix} Emitting order.confirmation: ${args.action}`
            this.emit('order.confirmation', {
              action: args.action,
              timestamp: Date.now()
            });
          } else if (event.name === 'remove_from_order') {
            // Emit item removal event
            // Debug: `${logPrefix} Emitting order.item.removed: ${args.itemName}`
            this.emit('order.item.removed', {
              itemName: args.itemName,
              quantity: args.quantity,
              timestamp: Date.now()
            });
          }
        } catch (error) {
          console.error(`${logPrefix} Failed to parse function call arguments:`, error);
          console.error('Raw arguments:', event.arguments);
        }
        break;
        
      case 'error': {
        console.error('[WebRTCVoice] API error:', JSON.stringify(event.error, null, 2));
        console.error('[WebRTCVoice] Full error event:', JSON.stringify(event, null, 2));
        const errorMessage = event.error?.message || event.error?.error?.message || 'OpenAI API error';
        const error = new Error(errorMessage);
        this.emit('error', error);
        
        // Handle specific error types
        if (event.error?.code === 'rate_limit_exceeded') {
          console.warn('[WebRTCVoice] Rate limit exceeded, will retry after delay');
          this.handleRateLimitError();
        } else if (event.error?.code === 'session_expired') {
          console.warn('[WebRTCVoice] Session expired, reconnecting...');
          this.handleSessionExpired();
        }
        break;
      }
        
        
      default:
        // Log truly unhandled events
        if (this.config.debug) {
          // Debug: `${logPrefix} Unhandled event type: ${event.type}`
        }
    }
  }

  /**
   * Configure the OpenAI session with proper limits
   */
  private configureSession(): void {
    const logPrefix = `[RT] t=${this.turnId}#${String(++this.eventIndex).padStart(2, '0')}`;

    // Get configuration for current mode using imported functions
    const agentConfig = getAgentConfigForMode(this.config.mode || 'customer');

    // Merge menu context if available
    const configWithMenu = this.menuContext
      ? mergeMenuIntoConfig(agentConfig, this.menuContext)
      : agentConfig;

    // Use mode-specific turn detection or fallback to VAD setting
    let turnDetection: any = configWithMenu.turn_detection;
    if (!turnDetection && this.config.enableVAD) {
      turnDetection = {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 250,
        create_response: false, // Still manually trigger responses
      };
      // Debug: `${logPrefix} Configuring session with VAD enabled (manual response trigger)`
    } else if (!turnDetection) {
      // Debug: `${logPrefix} Configuring session with manual PTT control`
    }

    // Use mode-specific instructions or build default
    let instructions = configWithMenu.instructions || `You are Grow Restaurant's friendly, fast, and accurate customer service agent. You MUST speak in English only. Never respond in any other language.

🎯 YOUR JOB:
- Help guests choose items and take complete, correct orders
- Be concise (1-2 sentences), warm, and proactive
- Always confirm: final order, price, pickup/dine-in choice
- Use the add_to_order function when customer orders items
- Use confirm_order function when customer wants to checkout

⚠️ GOLDEN RULES:
1. Ask about allergies/dietary needs EARLY: "Any allergies or dietary preferences?"
2. Clarify required choices (dressing, side, bread) before moving on
3. Summarize clearly: item → options → quantity → price
4. If uncertain about something, say so
5. ALWAYS use the add_to_order function to add items, don't just acknowledge

🎤 TRANSCRIPTION HELP (common misheard items):
- "Soul Bowl" (NOT "sobo" or "solo") - Southern comfort food bowl
- "Peach Arugula" (NOT "peach a ruler") - Salad with arugula
- "Jalapeño Pimento" (NOT "holla pino") - Spicy cheese bites
- "Succotash" (NOT "suck a toss") - Vegan vegetable dish
- If you hear something unclear, confirm: "Did you say Soul Bowl?"

📋 SMART FOLLOW-UPS BY CATEGORY:

SALADS → Ask: 
- Dressing? (Vidalia Onion, Balsamic, Greek, Ranch, Honey Mustard, Poppy Seed, Lemon Vinaigrette)
- Cheese if applicable? (feta, blue, cheddar)
- Add protein? (+$4 chicken, +$6 salmon)

SANDWICHES → Ask:
- Bread? (white, wheat, or flatbread)
- Side? (potato salad, fruit cup, cucumber salad, side salad, peanut noodles)
- Toasted?

BOWLS:
- Fajita Keto → "Add rice for +$1?"
- Greek → "Dairy (feta/tzatziki) okay?"
- Soul → "Pork sausage okay?"

VEGAN → Confirm no dairy/egg/honey, warn about peanuts in noodles

ENTRÉES → Ask:
- Choose 2 sides (potato salad, fruit cup, cucumber salad, side salad, peanut noodles)
- Cornbread okay?

💬 EXAMPLE RESPONSES:
- "Great choice! Feta or blue cheese? Add prosciutto for +$4?"
- "White, wheat, or flatbread? Which side would you like?"
- "Any allergies I should know about?"
- "That's a Greek Salad with chicken, balsamic dressing. $16 total. Dine-in or to-go?"

🚫 REDIRECT NON-FOOD TOPICS:
- "I can only help with food orders. What would you like to order?"
- "Let me help you with our menu. Any starters today?"

⚠️ LANGUAGE REQUIREMENT:
- You MUST speak English ONLY
- If you hear Spanish or any other language, respond in English: "I can help you in English. What would you like to order?"
- Never respond in Spanish, French, Chinese, or any language other than English
- All responses, greetings, and confirmations MUST be in English`;
    
    // Add menu context if available
    if (this.menuContext) {
      instructions += this.menuContext;
    } else {
      instructions += `\n\nNote: Menu information is currently unavailable. Please ask the customer what they'd like and I'll do my best to help.`;
    }
    
    // Define tools/functions for structured order extraction
    const tools = [
      {
        type: 'function',
        name: 'add_to_order',
        description: 'Add items to the customer\'s order when they request specific menu items',
        parameters: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              description: 'Array of items to add to the order',
              items: {
                type: 'object',
                properties: {
                  name: { 
                    type: 'string',
                    description: 'The menu item name (e.g., "Soul Bowl", "Greek Salad")'
                  },
                  quantity: { 
                    type: 'integer',
                    minimum: 1,
                    default: 1,
                    description: 'Number of this item'
                  },
                  modifications: { 
                    type: 'array', 
                    items: { type: 'string' },
                    description: 'Modifications like "no onions", "extra cheese", "add chicken"'
                  },
                  specialInstructions: {
                    type: 'string',
                    description: 'Any special preparation instructions'
                  }
                },
                required: ['name', 'quantity'],
                additionalProperties: false
              }
            }
          },
          required: ['items'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'confirm_order',
        description: 'Confirm the order and proceed with checkout when customer is ready',
        parameters: {
          type: 'object',
          properties: {
            action: { 
              type: 'string',
              enum: ['checkout', 'review', 'cancel'],
              description: 'Action to take with the order'
            }
          },
          required: ['action'],
          additionalProperties: false
        }
      },
      {
        type: 'function',
        name: 'remove_from_order',
        description: 'Remove items from the order when customer changes their mind',
        parameters: {
          type: 'object',
          properties: {
            itemName: {
              type: 'string',
              description: 'Name of the item to remove'
            },
            quantity: {
              type: 'integer',
              description: 'Number to remove (optional, removes all if not specified)'
            }
          },
          required: ['itemName'],
          additionalProperties: false
        }
      }
    ];
    
    // Normalize session configuration to ensure provider limits are respected
    const currentMode = this.config.mode || 'customer';
    const normalizedConfig = normalizeSessionConfig({
      temperature: configWithMenu.temperature,
      max_response_output_tokens: configWithMenu.max_response_output_tokens
    }, currentMode);

    // Use mode-specific configuration with normalized values
    const sessionConfig: any = {
      modalities: configWithMenu.modalities || ['text', 'audio'],
      instructions,
      voice: configWithMenu.voice || 'alloy',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'whisper-1',
        language: 'en'  // Force English transcription
      },
      turn_detection: turnDetection,
      temperature: normalizedConfig.temperature,
      max_response_output_tokens: normalizedConfig.max_response_output_tokens
    };
    
    // Only add tools if they exist and are non-empty
    if (tools && tools.length > 0) {
      sessionConfig.tools = tools;
    }
    
    const sessionUpdate = {
      type: 'session.update',
      session: sessionConfig
    };
    
    this.sendEvent(sessionUpdate);
    
    // Immediately clear the audio buffer to ensure no audio is being processed
    this.sendEvent({
      type: 'input_audio_buffer.clear'
    });
    
    // Debug: `${logPrefix} Session configured (tools temporarily disabled to fix connection)`
  }

  /**
   * Legacy order detection - now handled by function calling
   * Kept for backward compatibility but no longer used
   * @deprecated Use function calling instead
   */
  private detectOrderIntent(_text: string): void {
    // Order detection is now handled via OpenAI function calling
    // The AI will automatically call add_to_order when it detects menu items
    // This provides much more accurate extraction with proper quantities and modifications
    // Debug: '[RT] detectOrderIntent called but using function calling instead'
  }


  /**
   * Send event to OpenAI via data channel
   */
  sendEvent(event: any): void {
    if (this.dcReady && this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(event));
      
      const logPrefix = `[RT] t=${this.turnId}#${String(++this.eventIndex).padStart(2, '0')}`;
      if (this.config.debug) {
        // Debug: `${logPrefix} Sent: ${event.type}`
      } else {
        // Debug: `${logPrefix} → ${event.type}`
      }
    } else {
      // Queue the message for later
      this.messageQueue.push(event);
      // Debug: `[RT] Queued event (${event.type}) - DC not ready. Queue size: ${this.messageQueue.length}`
    }
  }

  /**
   * Start recording (enable microphone)
   */
  startRecording(): void {
    // State machine guard: only allow from idle state
    if (this.turnState !== 'idle') {
      logger.warn(`[RT] Cannot start recording in state: ${this.turnState}`);
      return;
    }
    
    if (!this.mediaStream) {
      console.error('[RT] No media stream available');
      return;
    }
    
    const logPrefix = `[RT] t=${this.turnId}#${String(++this.eventIndex).padStart(2, '0')}`;
    // Debug: `${logPrefix} Turn state: idle → recording`
    this.turnState = 'recording';
    
    // Clear transcript map for new turn
    this.transcriptMap.clear();
    this.currentUserItemId = null;
    this.activeResponseId = null;
    
    // Clear any partial transcripts
    this.partialTranscript = '';
    this.aiPartialTranscript = '';
    
    // Clear audio buffer before starting
    this.sendEvent({
      type: 'input_audio_buffer.clear'
    });
    
    // Enable microphone to start transmitting
    const audioTrack = this.mediaStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = true;
      // Debug: `${logPrefix} Microphone ENABLED - transmitting audio`
    }
    
    this.isRecording = true;
    this.emit('recording.started');
    
    // Clear any response text in the UI
    this.emit('response.text', '');
    this.emit('transcript', { text: '', isFinal: false, confidence: 0, timestamp: Date.now() });
    
    if (this.config.debug) {
      // Debug: `${logPrefix} Recording started - hold button to continue`
    }
  }

  /**
   * Stop recording (mute microphone and commit audio buffer)
   */
  stopRecording(): void {
    // State machine guard: only allow from recording state
    if (this.turnState !== 'recording') {
      logger.warn(`[RT] Cannot stop recording in state: ${this.turnState}`);
      return;
    }
    
    if (!this.mediaStream) {
      console.error('[RT] No media stream available');
      return;
    }
    
    // Debounce protection
    const now = Date.now();
    if (now - this.lastCommitTime < 250) {
      logger.warn('[RT] Ignoring rapid stop - debouncing');
      return;
    }
    
    const logPrefix = `[RT] t=${this.turnId}#${String(++this.eventIndex).padStart(2, '0')}`;
    
    // IMMEDIATELY mute microphone to stop transmission
    const audioTrack = this.mediaStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = false;
      // Debug: `${logPrefix} Microphone DISABLED - stopped transmitting`
    }
    
    this.lastCommitTime = now;
    this.isRecording = false;
    
    // State transition: recording → committing
    // Debug: `${logPrefix} Turn state: recording → committing`
    this.turnState = 'committing';
    
    // Commit the audio buffer
    this.sendEvent({
      type: 'input_audio_buffer.commit'
    });
    // Debug: `${logPrefix} Audio buffer committed`
    
    // State transition: committing → waiting_user_final
    // Debug: `${logPrefix} Turn state: committing → waiting_user_final`
    this.turnState = 'waiting_user_final';
    
    this.emit('recording.stopped');
    
    // Note: response.create will be sent when transcription.completed arrives
    if (this.config.debug) {
      // Debug: `${logPrefix} Waiting for user transcript to finalize...`
    }
  }

  /**
   * Handle peer connection state changes
   */
  private setupPeerConnectionHandlers(): void {
    if (!this.pc) return;
    
    this.pc.oniceconnectionstatechange = () => {
      if (this.config.debug) {
        // Debug: '[WebRTCVoice] ICE connection state:', this.pc?.iceConnectionState
      }
      
      if (this.pc?.iceConnectionState === 'failed' || this.pc?.iceConnectionState === 'disconnected') {
        this.handleDisconnection();
      }
    };
    
    this.pc.onconnectionstatechange = () => {
      if (this.config.debug) {
        // Debug: '[WebRTCVoice] Connection state:', this.pc?.connectionState
      }
    };
  }

  /**
   * Set connection state and emit event
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      // Only emit if there are listeners to avoid "no handlers" warnings
      if (this.listenerCount('connection.change') > 0) {
        this.emit('connection.change', state);
      }
    }
  }

  /**
   * Handle rate limit errors
   */
  private handleRateLimitError(): void {
    // Exponential backoff for rate limits
    const backoffDelay = Math.min(30000, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    // Debug: `[WebRTCVoice] Waiting ${backoffDelay}ms before retry due to rate limit`
    
    setTimeout(() => {
      if (this.sessionActive) {
        this.reconnect();
      }
    }, backoffDelay);
  }

  /**
   * Handle session expiration
   */
  private async handleSessionExpired(): Promise<void> {
    // Debug: '[WebRTCVoice] Handling session expiration...'
    
    // Clear current session
    this.sessionActive = false;
    this.ephemeralToken = null;
    
    // Try to reconnect with new token
    try {
      await this.reconnect();
    } catch (error) {
      console.error('[WebRTCVoice] Failed to recover from session expiration:', error);
      this.emit('error', error);
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(): void {
    this.sessionActive = false;

    // Clear accumulated transcripts to prevent memory leaks
    this.partialTranscript = '';
    this.aiPartialTranscript = '';

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.setConnectionState('reconnecting');
      this.scheduleReconnection();
    } else {
      this.setConnectionState('disconnected');
      this.emit('voice.session.fail', {
        reason: 'connection_lost',
        lastError: this.lastError,
        attempts: this.reconnectAttempts
      });
    }
  }

  /**
   * Reconnect to the service
   */
  private async reconnect(): Promise<void> {
    // Debug: `[WebRTCVoice] Reconnecting... attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
    
    // Clean up existing connection
    this.disconnect();
    
    // Check if token is still valid
    if (this.tokenExpiresAt < Date.now() + 5000) {
      this.ephemeralToken = null; // Force new token
    }
    
    // Reconnect (don't increment here as it's already incremented in the error handler)
    await this.connect();
  }

  /**
   * Clean up connection resources without changing state
   */
  private cleanupConnection(): void {
    // Close data channel
    if (this.dc) {
      try {
        this.dc.close();
      } catch (_e) {
        // Ignore errors during cleanup
      }
      this.dc = null;
    }
    
    // Close peer connection and clean up event handlers
    if (this.pc) {
      try {
        // Remove all event handlers to prevent memory leaks
        this.pc.onicecandidate = null;
        this.pc.oniceconnectionstatechange = null;
        this.pc.onconnectionstatechange = null;
        this.pc.onsignalingstatechange = null;
        this.pc.ontrack = null;
        this.pc.ondatachannel = null;
        
        // Close the connection
        if (this.pc.signalingState !== 'closed') {
          this.pc.close();
        }
      } catch (e) {
        logger.warn('[WebRTCVoice] Error cleaning up peer connection:', { error: e });
      }
      this.pc = null;
    }
    
    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (_e) {
          // Ignore errors during cleanup
        }
      });
      this.mediaStream = null;
    }
    
    // Clean up audio element properly to prevent memory leaks
    if (this.audioElement) {
      try {
        // Stop any playing audio
        this.audioElement.pause();
        
        // Clear the source to release media resources
        this.audioElement.srcObject = null;
        this.audioElement.src = '';
        
        // Remove all event listeners
        this.audioElement.onloadedmetadata = null;
        this.audioElement.onplay = null;
        this.audioElement.onpause = null;
        this.audioElement.onerror = null;
        
        // Remove from DOM
        if (this.audioElement.parentNode) {
          this.audioElement.parentNode.removeChild(this.audioElement);
        }
      } catch (e) {
        logger.warn('[WebRTCVoice] Error cleaning up audio element:', { error: e });
      }
      this.audioElement = null;
    }
  }

  /**
   * Disconnect and clean up
   */
  disconnect(): void {
    this.sessionActive = false;
    this.isRecording = false;
    this.isConnecting = false;
    this.activeResponseId = null;
    this.dcReady = false;
    this.messageQueue = [];

    // Clear timers
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Clean up device monitoring
    this.cleanupDeviceMonitoring();

    // Use cleanup method
    this.cleanupConnection();

    this.setConnectionState('disconnected');

    if (this.config.debug) {
      // Debug: '[WebRTCVoice] Disconnected'
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if currently recording
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get last error information
   */
  getLastError(): VoiceError | null {
    return this.lastError;
  }

  /**
   * Get connectivity details for debugging
   */
  getConnectivityDetails(): any {
    return {
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      lastError: this.lastError,
      deviceCount: this.deviceList.length,
      sessionActive: this.sessionActive,
      dcReady: this.dcReady,
      queueSize: this.messageQueue.length,
      isRecording: this.isRecording,
      hasMediaStream: !!this.mediaStream
    };
  }

  /**
   * Refresh device list (for when user plugs/unplugs devices)
   */
  async refreshDevices(): Promise<void> {
    try {
      await this.updateDeviceList();
      this.emit('devices.refreshed', this.deviceList);
    } catch (error) {
      console.error('[WebRTCVoice] Failed to refresh devices:', error);
      this.emit('error', this.categorizeError(error as Error));
    }
  }

  /**
   * Setup device change monitoring
   */
  private setupDeviceChangeMonitoring(): void {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      this.deviceChangeHandler = async () => {
        logger.info('[WebRTCVoice] Media devices changed');
        try {
          await this.updateDeviceList();
          this.emit('devices.changed', this.deviceList);
        } catch (error) {
          console.warn('[WebRTCVoice] Failed to update device list on change:', error);
        }
      };

      navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeHandler);
    }
  }

  /**
   * Cleanup device monitoring
   */
  private cleanupDeviceMonitoring(): void {
    if (this.deviceChangeHandler && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeHandler);
      this.deviceChangeHandler = null;
    }
  }

  /**
   * Update device list
   */
  private async updateDeviceList(): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        this.deviceList = devices.filter(device => device.kind === 'audioinput');
      } catch (error) {
        console.warn('[WebRTCVoice] Failed to enumerate devices:', error);
        this.deviceList = [];
      }
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnection(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;

    // Exponential backoff: 200ms, 500ms, 1s, 2s, 5s (capped)
    const backoffDelays = [200, 500, 1000, 2000, 5000];
    const delay = backoffDelays[Math.min(this.reconnectAttempts - 1, backoffDelays.length - 1)];

    logger.info(`[WebRTCVoice] Scheduling reconnection in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.emit('voice.session.reconnect', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      delayMs: delay,
      reason: this.lastError?.type || 'unknown'
    });

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        // Error will be handled by connect() method
        console.error('[WebRTCVoice] Reconnection attempt failed:', error);
      }
    }, delay);
  }

  /**
   * Create a properly formatted VoiceError
   */
  private createVoiceError(type: ErrorType, message: string, retryable: boolean, userFriendlyMessage: string, code?: string): VoiceError {
    const voiceError = new Error(message) as VoiceError;
    voiceError.type = type;
    voiceError.retryable = retryable;
    voiceError.userFriendlyMessage = userFriendlyMessage;
    voiceError.name = 'VoiceError';
    if (code) voiceError.code = code;
    return voiceError;
  }

  /**
   * Categorize errors for better user experience
   */
  private categorizeError(error: Error): VoiceError {
    const message = error.message.toLowerCase();

    // Check for prefixed error types
    if (error.message.includes(':')) {
      const [prefix, userMessage] = error.message.split(':', 2);
      switch (prefix) {
        case 'AUTH_FAILED':
          return this.createVoiceError('auth_error', error.message, false, userMessage.trim());
        case 'RATE_LIMIT':
          return this.createVoiceError('rate_limit', error.message, true, userMessage.trim());
        case 'SERVER_ERROR':
          return this.createVoiceError('server_error', error.message, true, userMessage.trim());
        case 'NETWORK_ERROR':
          return this.createVoiceError('network_error', error.message, true, userMessage.trim());
      }
    }

    // Legacy error categorization
    if (message.includes('permission') || message.includes('denied')) {
      return this.createVoiceError('permission_denied', error.message, false, 'Microphone access was denied. Please enable microphone permissions and try again.');
    }

    if (message.includes('notfound') || message.includes('device')) {
      return this.createVoiceError('device_error', error.message, false, 'No microphone found. Please connect a microphone and try again.');
    }

    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return this.createVoiceError('network_error', error.message, true, 'Network connection failed. Please check your internet connection and try again.');
    }

    if (message.includes('auth') || message.includes('unauthorized') || message.includes('token')) {
      return this.createVoiceError('auth_error', error.message, false, 'Authentication failed. Please log in again.');
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return this.createVoiceError('rate_limit', error.message, true, 'Too many requests. Please wait a moment and try again.');
    }

    // Default case
    return this.createVoiceError('unknown', error.message, true, 'Something went wrong. Please try again.');
  }

  /**
   * Categorize microphone-specific errors
   */
  private categorizeMicrophoneError(error: Error): VoiceError {
    const errorName = (error as any).name || '';

    if (errorName === 'NotAllowedError') {
      return this.createVoiceError('permission_denied', error.message, false, 'Microphone access was denied. Please enable microphone permissions in your browser settings and refresh the page.');
    }

    if (errorName === 'NotFoundError') {
      return this.createVoiceError('device_error', error.message, false, 'No microphone was found. Please connect a microphone and try again.');
    }

    if (errorName === 'NotReadableError') {
      return this.createVoiceError('device_error', error.message, true, 'Microphone is being used by another application. Please close other applications and try again.');
    }

    if (errorName === 'OverconstrainedError') {
      return this.createVoiceError('device_error', error.message, true, 'Microphone does not meet the required specifications. Please try a different microphone.');
    }

    // Fallback for unknown microphone errors
    return this.createVoiceError('device_error', error.message, false, 'Failed to access microphone. Please check your microphone and try again.');
  }
}