import { EventEmitter } from 'events';
import { getAuthToken } from '../../../services/auth';

export interface WebRTCVoiceConfig {
  restaurantId: string;
  userId?: string;
  debug?: boolean;
  enableVAD?: boolean; // Optional: enable server VAD mode
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

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

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
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    console.log(`[RT] WebRTC Voice Client initialized - API: ${apiBase}`);
    
    if (this.config.debug) {
      console.log('[RT] Debug mode enabled, config:', config);
    }
  }

  /**
   * Connect to OpenAI Realtime API via WebRTC
   */
  async connect(): Promise<void> {
    // Prevent duplicate connections
    if (this.isConnecting || this.connectionState === 'connected') {
      console.log('[WebRTCVoice] Already connecting or connected, skipping...');
      return;
    }
    
    this.isConnecting = true;
    
    try {
      console.log('[WebRTCVoice] Starting connection...');
      this.setConnectionState('connecting');
      
      // Step 1: Get ephemeral token from our server
      console.log('[WebRTCVoice] Fetching ephemeral token...');
      await this.fetchEphemeralToken();
      
      // Step 2: Create RTCPeerConnection
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
        ],
        bundlePolicy: 'max-bundle',
      });
      
      this.setupPeerConnectionHandlers();
      
      // Step 3: Set up audio output handler
      this.audioElement = document.createElement('audio');
      this.audioElement.autoplay = true;
      this.audioElement.style.display = 'none';
      document.body.appendChild(this.audioElement);
      
      this.pc.ontrack = (event) => {
        if (this.config.debug) {
          console.log('[WebRTCVoice] Received remote audio track:', event.streams);
        }
        if (this.audioElement && event.streams[0]) {
          this.audioElement.srcObject = event.streams[0];
        }
      };
      
      // Step 4: Set up microphone and add track (creates first m-line)
      await this.setupMicrophone();
      
      // Step 5: Create data channel (creates second m-line)
      this.dc = this.pc.createDataChannel('oai-events', {
        ordered: true,
      });
      this.setupDataChannel();
      
      // Step 7: Create offer and establish connection
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      
      if (this.config.debug) {
        // Log the m-lines in the offer to debug ordering
        const mLines = offer.sdp?.match(/m=.*/g);
        console.log('[WebRTCVoice] SDP m-lines in offer:', mLines);
      }
      
      // Step 7: Send SDP to OpenAI
      const model = import.meta.env.VITE_OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2025-06-03';
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
      
      if (!sdpResponse.ok) {
        throw new Error(`OpenAI SDP exchange failed: ${sdpResponse.status}`);
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
      
      console.log('[WebRTCVoice] Setting remote description...');
      await this.pc.setRemoteDescription(answer);
      
      this.sessionActive = true;
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      
      if (this.config.debug) {
        console.log('[WebRTCVoice] WebRTC connection established');
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
        console.log(`[WebRTCVoice] Will retry connection in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
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
    const authToken = await getAuthToken();
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    
    if (this.config.debug) {
      console.log('[RT] Fetching ephemeral token from:', `${apiBase}/api/v1/realtime/session`);
    }
    
    const response = await fetch(`${apiBase}/api/v1/realtime/session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'x-restaurant-id': this.config.restaurantId,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get ephemeral token: ${response.status}`);
    }
    
    const data = await response.json();
    this.ephemeralToken = data.client_secret.value;
    this.tokenExpiresAt = data.expires_at || Date.now() + 60000;
    
    // Store menu context if provided
    if (data.menu_context) {
      this.menuContext = data.menu_context;
      console.log('[RT] Menu context loaded:', this.menuContext.split('\n').length, 'lines');
    }
    
    // Schedule token refresh 10 seconds before expiry
    this.scheduleTokenRefresh();
    
    if (this.config.debug) {
      console.log('[WebRTCVoice] Got ephemeral token, expires at:', new Date(this.tokenExpiresAt));
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
          console.log('[WebRTCVoice] Refreshing ephemeral token...');
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
        console.log('[WebRTCVoice] Audio track initial state - enabled:', audioTrack.enabled);
        audioTrack.enabled = false;
        console.log('[WebRTCVoice] Audio track after muting - enabled:', audioTrack.enabled);
        
        // Simple approach: just add the track
        this.pc.addTrack(audioTrack, this.mediaStream);
        console.log('[WebRTCVoice] Audio track added to peer connection in MUTED state');
        
        if (this.config.debug) {
          console.log('[WebRTCVoice] Microphone connected but muted - will only transmit when button held');
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
        console.log('[WebRTCVoice] Data channel opened');
      }
      
      this.dcReady = true;
      this.setConnectionState('connected');
      
      // Flush any queued messages
      if (this.messageQueue.length > 0) {
        console.log(`[WebRTCVoice] Flushing ${this.messageQueue.length} queued messages`);
        for (const msg of this.messageQueue) {
          this.dc!.send(JSON.stringify(msg));
        }
        this.messageQueue = [];
      }
      // Wait for session.created before sending session.update
    };
    
    this.dc.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleRealtimeEvent(data);
      } catch (error) {
        console.error('[WebRTCVoice] Failed to parse message:', error);
      }
    };
    
    this.dc.onerror = (error) => {
      console.error('[WebRTCVoice] Data channel error:', error);
      this.emit('error', error);
    };
    
    this.dc.onclose = () => {
      if (this.config.debug) {
        console.log('[WebRTCVoice] Data channel closed');
      }
      this.dcReady = false;
      this.handleDisconnection();
    };
  }

  /**
   * Handle events from OpenAI Realtime API
   */
  private handleRealtimeEvent(event: any): void {
    // Deduplication check
    if (event.event_id && this.seenEventIds.has(event.event_id)) {
      if (this.config.debug) {
        console.log(`[RT] Duplicate event ignored: ${event.event_id}`);
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
      console.log(`${logPrefix} ${event.type}`, event);
    }
    
    switch (event.type) {
      case 'session.created':
        console.log(`${logPrefix} Session created successfully`);
        if (this.config.debug) {
          console.log('Session details:', JSON.stringify(event.session, null, 2));
        }
        this.emit('session.created', event.session);
        // Now send session.update after session is created
        this.configureSession();
        break;
        
      case 'session.updated':
        console.log(`${logPrefix} Session configuration updated`);
        break;
        
      case 'input_audio_buffer.speech_started':
        console.log(`${logPrefix} Speech started detected`);
        if (this.turnState === 'recording') {
          this.partialTranscript = '';
          this.emit('speech.started');
        }
        break;
        
      case 'input_audio_buffer.speech_stopped':
        console.log(`${logPrefix} Speech stopped detected`);
        if (this.turnState === 'recording') {
          this.emit('speech.stopped');
        }
        break;
        
      case 'input_audio_buffer.committed':
        console.log(`${logPrefix} Audio buffer committed`);
        break;
        
      case 'input_audio_buffer.cleared':
        console.log(`${logPrefix} Audio buffer cleared`);
        break;
        
      case 'conversation.item.created':
        // Track items by role
        if (event.item?.role === 'user' && event.item?.id) {
          this.currentUserItemId = event.item.id;
          console.log(`${logPrefix} User item created: ${this.currentUserItemId}`);
          // Initialize transcript entry
          this.transcriptMap.set(event.item.id, { text: '', final: false, role: 'user' });
        } else if (event.item?.role === 'assistant' && event.item?.id) {
          console.log(`${logPrefix} Assistant item created: ${event.item.id}`);
          this.transcriptMap.set(event.item.id, { text: '', final: false, role: 'assistant' });
        }
        break;
        
      case 'conversation.item.input_audio_transcription.delta':
        // Accumulate delta to the correct user item
        if (event.item_id && event.delta) {
          const entry = this.transcriptMap.get(event.item_id);
          if (entry && entry.role === 'user') {
            entry.text += event.delta;
            console.log(`${logPrefix} User transcript delta (len=${event.delta.length})`);
            
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
            console.log(`${logPrefix} User transcript completed: "${event.transcript}"`);
            
            // State transition: waiting_user_final → waiting_response
            if (this.turnState === 'waiting_user_final' && 
                event.item_id === this.currentUserItemId) {
              console.log(`${logPrefix} Turn state: waiting_user_final → waiting_response`);
              this.turnState = 'waiting_response';
              
              // Send exactly one response.create
              this.sendEvent({
                type: 'response.create',
                response: {
                  modalities: ['text', 'audio'],
                  instructions: 'Respond about their order with appropriate follow-up questions. Use smart follow-ups: dressing for salads, bread for sandwiches, sides for entrées. Keep it under 2 sentences. English only.',
                }
              });
              console.log(`${logPrefix} Manual response.create sent`);
              
              // Detect order intent
              this.detectOrderIntent(event.transcript);
            }
          }
        }
        break;
        
      case 'response.created':
        // Track the active response
        if (event.response?.id) {
          this.activeResponseId = event.response.id;
          console.log(`${logPrefix} Response created: ${this.activeResponseId}`);
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
            console.log(`${logPrefix} Assistant transcript delta (len=${event.delta.length})`);
            
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
            console.log(`${logPrefix} Assistant transcript done: "${event.transcript}"`);
            
            this.emit('response.complete', event.transcript);
          }
        }
        break;
        
      case 'response.text.delta':
        // Text-only response (if no audio)
        if (this.turnState === 'waiting_response') {
          this.emit('response.text', event.delta);
        }
        break;
        
      case 'response.audio.delta':
        // Audio is handled via WebRTC audio track
        console.log(`${logPrefix} Audio delta received (${event.delta?.length || 0} bytes)`);
        break;
        
      case 'response.done':
        // Turn complete - transition back to idle
        console.log(`${logPrefix} Response done`);
        if (this.turnState === 'waiting_response') {
          console.log(`${logPrefix} Turn state: waiting_response → idle`);
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
        console.log(`${logPrefix} ${event.type}`);
        break;
        
      case 'error':
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
        
        
      default:
        // Log truly unhandled events
        if (this.config.debug) {
          console.log(`${logPrefix} Unhandled event type: ${event.type}`);
        }
    }
  }

  /**
   * Configure the OpenAI session with proper limits
   */
  private configureSession(): void {
    const logPrefix = `[RT] t=${this.turnId}#${String(++this.eventIndex).padStart(2, '0')}`;
    
    // Determine turn detection mode
    let turnDetection: any = null; // Default: manual PTT
    if (this.config.enableVAD) {
      turnDetection = {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 250,
        create_response: false, // Still manually trigger responses
      };
      console.log(`${logPrefix} Configuring session with VAD enabled (manual response trigger)`);
    } else {
      console.log(`${logPrefix} Configuring session with manual PTT control`);
    }
    
    // Build instructions with menu context
    let instructions = `You are Grow Restaurant's friendly, fast, and accurate customer service agent. English only.

🎯 YOUR JOB:
- Help guests choose items and take complete, correct orders
- Be concise (1-2 sentences), warm, and proactive
- Always confirm: final order, price, pickup/dine-in choice

⚠️ GOLDEN RULES:
1. Ask about allergies/dietary needs EARLY: "Any allergies or dietary preferences?"
2. Clarify required choices (dressing, side, bread) before moving on
3. Summarize clearly: item → options → quantity → price
4. If uncertain about something, say so

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
- "Let me help you with our menu. Any starters today?"`;
    
    // Add menu context if available
    if (this.menuContext) {
      instructions += this.menuContext;
    } else {
      instructions += `\n\nNote: Menu information is currently unavailable. Please ask the customer what they'd like and I'll do my best to help.`;
    }
    
    const sessionUpdate = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions,
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: turnDetection,
        temperature: 0.6, // Minimum temperature for Realtime API
        max_response_output_tokens: 500 // Sufficient for complete responses
      }
    };
    
    this.sendEvent(sessionUpdate);
    
    // Immediately clear the audio buffer to ensure no audio is being processed
    this.sendEvent({
      type: 'input_audio_buffer.clear'
    });
    
    console.log(`${logPrefix} Session configured for manual PTT control`);
  }

  /**
   * Detect order intent from transcription
   */
  private detectOrderIntent(text: string): void {
    const orderKeywords = ['order', 'like', 'want', 'get', 'have', 'please'];
    const menuItems = ['pizza', 'burger', 'salad', 'pasta', 'sandwich', 'drink', 'fries'];
    
    const hasOrderIntent = orderKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );
    
    const hasMenuItem = menuItems.some(item => 
      text.toLowerCase().includes(item)
    );
    
    if (hasOrderIntent || hasMenuItem) {
      const orderEvent: OrderEvent = {
        items: [], // Would need menu parsing logic here
        confidence: hasOrderIntent && hasMenuItem ? 0.9 : 0.6,
        timestamp: Date.now(),
      };
      this.emit('order.detected', orderEvent);
    }
  }


  /**
   * Send event to OpenAI via data channel
   */
  sendEvent(event: any): void {
    if (this.dcReady && this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(event));
      
      const logPrefix = `[RT] t=${this.turnId}#${String(++this.eventIndex).padStart(2, '0')}`;
      if (this.config.debug) {
        console.log(`${logPrefix} Sent: ${event.type}`);
      } else {
        console.log(`${logPrefix} → ${event.type}`);
      }
    } else {
      // Queue the message for later
      this.messageQueue.push(event);
      console.log(`[RT] Queued event (${event.type}) - DC not ready. Queue size: ${this.messageQueue.length}`);
    }
  }

  /**
   * Start recording (enable microphone)
   */
  startRecording(): void {
    // State machine guard: only allow from idle state
    if (this.turnState !== 'idle') {
      console.warn(`[RT] Cannot start recording in state: ${this.turnState}`);
      return;
    }
    
    if (!this.mediaStream) {
      console.error('[RT] No media stream available');
      return;
    }
    
    const logPrefix = `[RT] t=${this.turnId}#${String(++this.eventIndex).padStart(2, '0')}`;
    console.log(`${logPrefix} Turn state: idle → recording`);
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
      console.log(`${logPrefix} Microphone ENABLED - transmitting audio`);
    }
    
    this.isRecording = true;
    this.emit('recording.started');
    
    // Clear any response text in the UI
    this.emit('response.text', '');
    this.emit('transcript', { text: '', isFinal: false, confidence: 0, timestamp: Date.now() });
    
    if (this.config.debug) {
      console.log(`${logPrefix} Recording started - hold button to continue`);
    }
  }

  /**
   * Stop recording (mute microphone and commit audio buffer)
   */
  stopRecording(): void {
    // State machine guard: only allow from recording state
    if (this.turnState !== 'recording') {
      console.warn(`[RT] Cannot stop recording in state: ${this.turnState}`);
      return;
    }
    
    if (!this.mediaStream) {
      console.error('[RT] No media stream available');
      return;
    }
    
    // Debounce protection
    const now = Date.now();
    if (now - this.lastCommitTime < 250) {
      console.warn('[RT] Ignoring rapid stop - debouncing');
      return;
    }
    
    const logPrefix = `[RT] t=${this.turnId}#${String(++this.eventIndex).padStart(2, '0')}`;
    
    // IMMEDIATELY mute microphone to stop transmission
    const audioTrack = this.mediaStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = false;
      console.log(`${logPrefix} Microphone DISABLED - stopped transmitting`);
    }
    
    this.lastCommitTime = now;
    this.isRecording = false;
    
    // State transition: recording → committing
    console.log(`${logPrefix} Turn state: recording → committing`);
    this.turnState = 'committing';
    
    // Commit the audio buffer
    this.sendEvent({
      type: 'input_audio_buffer.commit'
    });
    console.log(`${logPrefix} Audio buffer committed`);
    
    // State transition: committing → waiting_user_final
    console.log(`${logPrefix} Turn state: committing → waiting_user_final`);
    this.turnState = 'waiting_user_final';
    
    this.emit('recording.stopped');
    
    // Note: response.create will be sent when transcription.completed arrives
    if (this.config.debug) {
      console.log(`${logPrefix} Waiting for user transcript to finalize...`);
    }
  }

  /**
   * Handle peer connection state changes
   */
  private setupPeerConnectionHandlers(): void {
    if (!this.pc) return;
    
    this.pc.oniceconnectionstatechange = () => {
      if (this.config.debug) {
        console.log('[WebRTCVoice] ICE connection state:', this.pc?.iceConnectionState);
      }
      
      if (this.pc?.iceConnectionState === 'failed' || this.pc?.iceConnectionState === 'disconnected') {
        this.handleDisconnection();
      }
    };
    
    this.pc.onconnectionstatechange = () => {
      if (this.config.debug) {
        console.log('[WebRTCVoice] Connection state:', this.pc?.connectionState);
      }
    };
  }

  /**
   * Set connection state and emit event
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit('connection.change', state);
    }
  }

  /**
   * Handle rate limit errors
   */
  private handleRateLimitError(): void {
    // Exponential backoff for rate limits
    const backoffDelay = Math.min(30000, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    console.log(`[WebRTCVoice] Waiting ${backoffDelay}ms before retry due to rate limit`);
    
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
    console.log('[WebRTCVoice] Handling session expiration...');
    
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
    this.setConnectionState('disconnected');
    this.sessionActive = false;
    
    // Clear accumulated transcripts to prevent memory leaks
    this.partialTranscript = '';
    this.aiPartialTranscript = '';
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnect();
    }
  }

  /**
   * Reconnect to the service
   */
  private async reconnect(): Promise<void> {
    console.log(`[WebRTCVoice] Reconnecting... attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
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
      } catch (e) {
        // Ignore errors during cleanup
      }
      this.dc = null;
    }
    
    // Close peer connection
    if (this.pc) {
      try {
        this.pc.close();
      } catch (e) {
        // Ignore errors during cleanup
      }
      this.pc = null;
    }
    
    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
      this.mediaStream = null;
    }
    
    // Remove audio element
    if (this.audioElement) {
      try {
        this.audioElement.remove();
      } catch (e) {
        // Ignore errors during cleanup
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
    
    // Clear token refresh timer
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
    
    // Use cleanup method
    this.cleanupConnection();
    
    this.setConnectionState('disconnected');
    
    if (this.config.debug) {
      console.log('[WebRTCVoice] Disconnected');
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
}