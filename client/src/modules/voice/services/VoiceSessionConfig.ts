/* eslint-env browser */
import { logger } from '../../../services/logger';
import { EventEmitter } from '../../../services/utils/EventEmitter';
import { PromptConfigService, type VoiceContext } from '@rebuild/shared';

/**
 * VoiceSessionConfig Service
 *
 * Single Responsibility: Manage OpenAI Realtime session configuration
 *
 * Responsibilities:
 * - Fetch and manage ephemeral tokens
 * - Schedule token refresh
 * - Build session configuration with AI instructions (delegates to PromptConfigService)
 * - Manage menu context
 *
 * Modified: 2025-01-23 - Refactored to use shared PromptConfigService (Phase 1: Unification)
 */

export type { VoiceContext };

export interface WebRTCVoiceConfig {
  restaurantId: string;
  userId?: string;
  context?: VoiceContext;
  debug?: boolean;
  enableVAD?: boolean;
  muteAudioOutput?: boolean;
}

export interface RealtimeSessionConfig {
  modalities: string[];
  instructions: string;
  voice: string;
  input_audio_format: string;
  output_audio_format: string;
  input_audio_transcription: {
    model: string;
    language?: string; // Optional - gpt-4o-transcribe auto-detects language
  };
  turn_detection: any;
  temperature: number;
  max_response_output_tokens: number;
  tools?: any[];
  tool_choice?: string;
}

export interface IVoiceSessionConfig {
  // Token management
  fetchEphemeralToken(): Promise<void>;
  scheduleTokenRefresh(): void;
  clearTokenRefresh(): void;
  isTokenValid(): boolean;
  getToken(): string | null;
  getTokenExpiry(): number;

  // Session configuration
  buildSessionConfig(): RealtimeSessionConfig;
  getMenuContext(): string;
}

/**
 * VoiceSessionConfig implementation
 */
export class VoiceSessionConfig extends EventEmitter implements IVoiceSessionConfig {
  private ephemeralToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private menuContext: string = '';
  private context: VoiceContext;

  constructor(
    private config: WebRTCVoiceConfig,
    private authService: { getAuthToken: () => Promise<string>; getOptionalAuthToken?: () => Promise<string | null> }
  ) {
    super();
    this.context = config.context || 'kiosk'; // Default to kiosk for backward compatibility
  }

  /**
   * Fetch ephemeral token from backend
   * Also retrieves menu context if available
   * Supports both authenticated and anonymous (kiosk demo) access
   */
  async fetchEphemeralToken(): Promise<void> {
    // Try to get auth token, but allow proceeding without it for kiosk mode
    let authToken: string | null = null;

    try {
      authToken = this.authService.getOptionalAuthToken
        ? await this.authService.getOptionalAuthToken()
        : await this.authService.getAuthToken();
    } catch (error) {
      // If getting auth token throws, check context
      if (this.context !== 'kiosk') {
        // Server mode: authentication required
        logger.error('[VoiceSessionConfig] Authentication required for server context');
        throw new Error('Authentication required for voice ordering');
      }
      // Kiosk mode: proceed with null token (caught error)
      authToken = null;
    }

    // Check if we got a null token (getOptionalAuthToken returns null without throwing)
    if (!authToken) {
      if (this.context === 'kiosk') {
        // Kiosk mode: allow anonymous access with just restaurant ID
        logger.info('[VoiceSessionConfig] Kiosk mode: proceeding without authentication');
      } else {
        // Server mode: authentication required
        logger.error('[VoiceSessionConfig] Server mode requires authentication but none available');
        throw new Error('Authentication required for voice ordering');
      }
    }

    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

    if (this.config.debug) {
      logger.info('[VoiceSessionConfig] Fetching ephemeral token from:', `${apiBase}/api/v1/realtime/session`);
      logger.info('[VoiceSessionConfig] Auth mode:', authToken ? 'authenticated' : 'anonymous (kiosk)');
      logger.info('[VoiceSessionConfig] Context:', this.context);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-restaurant-id': this.config.restaurantId,
    };

    // Only add Authorization header if we have a token
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${apiBase}/api/v1/realtime/session`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get ephemeral token: ${response.status}`);
    }

    const data = await response.json();

    // Validate response structure
    if (this.config.debug) {
      logger.info('[VoiceSessionConfig] Response structure:', {
        keys: Object.keys(data),
        hasClientSecret: !!data.client_secret,
        hasExpiresAt: !!data.expires_at,
        hasMenuContext: !!data.menu_context,
        menuContextType: typeof data.menu_context,
        menuContextLength: data.menu_context?.length || 0
      });
    }

    // Check for required fields
    if (!data.client_secret?.value) {
      throw new Error('Backend response missing client_secret.value');
    }

    this.ephemeralToken = data.client_secret.value;
    this.tokenExpiresAt = data.expires_at || Date.now() + 60000;

    // CRITICAL: Validate menu context exists
    if (!data.menu_context || data.menu_context.trim().length === 0) {
      logger.error('❌ [VoiceSessionConfig] CRITICAL ERROR - Backend response details:', {
        responseKeys: Object.keys(data),
        menuContext: data.menu_context,
        menuContextType: typeof data.menu_context,
        restaurantId: this.config.restaurantId,
        context: this.context
      });
      throw new Error(
        'CRITICAL: Backend returned no menu context - voice ordering unavailable. ' +
        'The AI cannot take orders without menu information.'
      );
    }

    // Store menu context
    this.menuContext = data.menu_context;
    logger.info('✅ [VoiceSessionConfig] Menu context loaded:', {
      lines: this.menuContext.split('\n').length,
      length: this.menuContext.length,
      preview: this.menuContext.substring(0, 200)
    });

    // Schedule token refresh 10 seconds before expiry
    this.scheduleTokenRefresh();

    if (this.config.debug) {
      logger.info('[VoiceSessionConfig] Got ephemeral token, expires at:', new Date(this.tokenExpiresAt));
    }
  }

  /**
   * Schedule token refresh before expiry
   * Refreshes token 10 seconds before it expires
   */
  scheduleTokenRefresh(): void {
    // Clear any existing timer
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    // Calculate when to refresh (10 seconds before expiry)
    const refreshTime = this.tokenExpiresAt - Date.now() - 10000;

    if (refreshTime > 0) {
      this.tokenRefreshTimer = setTimeout(async () => {
        if (this.config.debug) {
          logger.info('[VoiceSessionConfig] Refreshing ephemeral token...');
        }
        try {
          await this.fetchEphemeralToken();
          // Note: We can't update an active WebRTC session token
          // This is for the next connection
        } catch (error) {
          logger.error('[VoiceSessionConfig] Token refresh failed:', error);
          this.emit('token.refresh.failed', { error }); // ✅ Notify UI
        }
      }, refreshTime);
    }
  }

  /**
   * Clear token refresh timer
   * Call this when disconnecting
   */
  clearTokenRefresh(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  /**
   * Check if current token is still valid
   */
  isTokenValid(): boolean {
    return this.ephemeralToken !== null && Date.now() < this.tokenExpiresAt;
  }

  /**
   * Get current ephemeral token
   */
  getToken(): string | null {
    return this.ephemeralToken;
  }

  /**
   * Get token expiry timestamp
   */
  getTokenExpiry(): number {
    return this.tokenExpiresAt;
  }

  /**
   * Get menu context string
   */
  getMenuContext(): string {
    return this.menuContext;
  }

  /**
   * Build session configuration for OpenAI Realtime API
   * Returns a pure configuration object (no side effects)
   *
   * PHASE 1 REFACTOR: Now delegates to PromptConfigService for instructions and tools
   */
  buildSessionConfig(): RealtimeSessionConfig {
    logger.info('🔨 [VoiceSessionConfig] Building session config...', {
      context: this.context,
      hasMenuContext: this.menuContext.length > 0,
      menuContextLength: this.menuContext.length,
      promptVersion: PromptConfigService.getVersion()
    });

    // Determine turn detection mode
    // Enable VAD by default for kiosk context (natural conversation flow)
    // or if explicitly enabled via config
    const shouldEnableVAD = this.context === 'kiosk' || this.config.enableVAD === true;
    let turnDetection: any = null; // Default: manual PTT

    if (shouldEnableVAD) {
      turnDetection = {
        type: 'server_vad',
        threshold: 0.6,                // Higher threshold for noisy restaurant environment
        prefix_padding_ms: 400,        // Capture lead-in audio for better recognition
        silence_duration_ms: 1500,     // 1.5s silence = end of speech (responsive but not too eager)
        create_response: true,         // Auto-trigger AI response when speech ends (no tap to stop needed)
      };
      logger.info('[VoiceSessionConfig] VAD enabled for kiosk mode with auto-response');
    }

    // PHASE 1: Delegate to shared PromptConfigService
    const instructions = PromptConfigService.buildInstructions(this.context, this.menuContext);
    const tools = PromptConfigService.buildTools(this.context);

    logger.info('📋 [VoiceSessionConfig] Config built from shared service:', {
      instructionsLength: instructions.length,
      toolsCount: tools.length,
      toolNames: tools.map((t: any) => t.name),
      hasMenuInInstructions: instructions.includes('📋 FULL MENU')
    });

    // Server context uses shorter max tokens for efficiency
    const maxTokens = this.context === 'server' ? 200 : 500;

    const sessionConfig: RealtimeSessionConfig = {
      modalities: ['text', 'audio'],
      instructions,
      voice: 'alloy',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'gpt-4o-transcribe', // FIXED 2025-01-18: OpenAI deprecated whisper-1 for Realtime API
        language: 'en' // Force English transcription (prevent Spanish auto-detection)
      },
      turn_detection: turnDetection,
      temperature: 0.6, // Minimum temperature for Realtime API
      max_response_output_tokens: maxTokens
    };

    // Only add tools if they exist and are non-empty
    if (tools && tools.length > 0) {
      sessionConfig.tools = tools;
      sessionConfig.tool_choice = 'auto'; // Enable automatic function calling
      logger.info('✅ [VoiceSessionConfig] Tools added to session config');
    } else {
      logger.error('❌ [VoiceSessionConfig] NO TOOLS to add to session config!');
    }

    const configSize = JSON.stringify(sessionConfig).length;
    logger.info('📦 [VoiceSessionConfig] Final config size:', {
      bytes: configSize,
      kb: (configSize / 1024).toFixed(2),
      tooLarge: configSize > 50000
    });

    return sessionConfig;
  }

  /**
   * REMOVED - Phase 1: Unification
   *
   * These methods have been moved to shared/src/voice/PromptConfigService.ts
   * to eliminate duplication between client and server.
   *
   * Use PromptConfigService.buildInstructions() and PromptConfigService.buildTools() instead.
   */
}
