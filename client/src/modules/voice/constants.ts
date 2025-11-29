/**
 * Voice ordering configuration constants
 * Centralized to ensure consistency and maintainability
 *
 * All timeouts are in milliseconds (MS suffix)
 * All sizes are in bytes unless otherwise noted
 */
export const VOICE_CONFIG = {
  // Connection timeouts
  /**
   * Maximum time to wait for WebRTC connection establishment
   * Includes time for ICE gathering, STUN/TURN checks, and peer connection setup
   */
  CONNECTION_TIMEOUT_MS: 15000,

  /**
   * Initial delay before first reconnection attempt
   */
  RETRY_DELAY_MS: 1000,

  /**
   * Maximum delay between reconnection attempts
   */
  MAX_RETRY_DELAY_MS: 5000,

  /**
   * Maximum number of reconnection attempts before giving up
   */
  MAX_RECONNECT_ATTEMPTS: 3,

  /**
   * Time to wait before checking WebRTC stats after enabling microphone
   */
  STATS_CHECK_DELAY_MS: 2000,

  // Transcript validation
  /**
   * Maximum allowed transcript length in characters
   * Prevents DoS attacks via extremely long transcripts
   */
  MAX_TRANSCRIPT_LENGTH: 10000,

  // Event deduplication
  /**
   * Maximum number of event IDs to track for deduplication
   * Prevents unbounded memory growth
   */
  MAX_SEEN_EVENT_IDS: 1000,

  // Message queue limits
  /**
   * Maximum payload size for OpenAI Realtime API events
   * OpenAI likely rejects payloads larger than this
   */
  MAX_EVENT_PAYLOAD_SIZE: 50000,

  // LRU Cache settings
  /**
   * Maximum number of conversation items to keep in transcript cache
   */
  MAX_TRANSCRIPT_CACHE_SIZE: 50,
} as const;

// Type for configuration (useful for mocking in tests)
export type VoiceConfig = typeof VOICE_CONFIG;
