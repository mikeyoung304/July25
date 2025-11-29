/**
 * Voice ordering configuration constants (Server-side)
 * Centralized to ensure consistency and maintainability
 *
 * All timeouts are in milliseconds (MS suffix)
 * All sizes are in bytes/characters unless otherwise noted
 */
export const VOICE_CONFIG = {
  // OpenAI API timeouts
  /**
   * Timeout for OpenAI API calls (ephemeral token creation)
   * Increased from 30s to 45s to accommodate P95 latency scenarios
   * OpenAI session creation can take longer under load
   */
  OPENAI_API_TIMEOUT_MS: 45000,

  // Menu context limits
  /**
   * Maximum menu context length sent to OpenAI Realtime API
   * Conservative limit to prevent session.update rejection
   * 5KB keeps us well under OpenAI's limits
   */
  MAX_MENU_CONTEXT_LENGTH: 5000,

  // Voice Activity Detection (VAD) configuration
  /**
   * Sensitivity threshold for VAD (0.0 to 1.0)
   * Higher threshold = less sensitive, better for noisy environments
   */
  VAD_THRESHOLD: 0.6,

  /**
   * Audio padding before speech starts (milliseconds)
   * Captures lead-in audio for better speech recognition
   */
  VAD_PREFIX_PADDING_MS: 400,

  /**
   * Silence duration to trigger end of speech (milliseconds)
   * 1.5s of silence = user finished speaking
   */
  VAD_SILENCE_DURATION_MS: 1500,

  // Session management
  /**
   * Ephemeral token expiration time (milliseconds)
   * Default fallback if OpenAI doesn't provide expires_at
   */
  SESSION_EXPIRE_MS: 60000,

  /**
   * Maximum output tokens per AI response
   * Keeps responses concise for voice interaction
   */
  MAX_RESPONSE_OUTPUT_TOKENS: 500,
} as const;

// Type for configuration (useful for mocking in tests)
export type VoiceConfig = typeof VOICE_CONFIG;
