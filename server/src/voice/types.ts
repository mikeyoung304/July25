import { z } from 'zod';

// Re-export types from shared module for server-side use
export {
  BaseEvent,
  ClientAudioEvent,
  ClientStartEvent,
  ClientStopEvent,
  ClientHeartbeatEvent,
  ServerTranscriptEvent,
  ServerOrderEvent,
  ServerAudioEvent,
  ServerErrorEvent,
  ServerSessionEvent,
  ServerHeartbeatEvent,
  ConnectionState,
  SessionState,
  VoiceMetrics,
  ClientEventSchema,
  ServerEventSchema,
  SessionStateSchema,
  VoiceMetricsSchema,
  VoiceErrorSchema,
} from '@rebuild/shared/src/voice-types';

// Server-specific types and schemas
export const VoiceSessionConfigSchema = z.object({
  session_id: z.string(),
  restaurant_id: z.string(),
  user_id: z.string().optional(),
  loopback: z.boolean().default(false),
  max_duration_ms: z.number().default(300000), // 5 minutes
  audio_format: z.enum(['pcm16', 'g711_ulaw', 'g711_alaw']).default('pcm16'),
  sample_rate: z.number().default(24000),
  enable_vad: z.boolean().default(true),
  vad_threshold: z.number().min(0).max(1).default(0.5),
});

export const OpenAIConfigSchema = z.object({
  model: z.string().default('gpt-4o-realtime-preview-2024-10-01'),
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('alloy'),
  temperature: z.number().min(0).max(2).default(0.8),
  max_tokens: z.number().positive().default(4096),
  instructions: z.string().optional(),
  tools: z.array(z.any()).default([]),
  tool_choice: z.enum(['auto', 'none']).default('auto'),
});

export const VoiceServerHealthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  service: z.literal('voice-websocket'),
  active_sessions: z.number().min(0),
  uptime_ms: z.number().min(0),
  memory_usage: z.object({
    used: z.number(),
    total: z.number(),
    percentage: z.number(),
  }).optional(),
  openai_status: z.enum(['connected', 'disconnected', 'error']).optional(),
  last_error: z.string().optional(),
  timestamp: z.string(),
});

export const AudioChunkSchema = z.object({
  data: z.string(), // base64 encoded
  timestamp: z.number(),
  format: z.enum(['pcm16', 'g711_ulaw', 'g711_alaw']),
  sample_rate: z.number(),
  channels: z.number().default(1),
  duration_ms: z.number().optional(),
});

export const TranscriptResultSchema = z.object({
  text: z.string(),
  confidence: z.number().min(0).max(1),
  is_final: z.boolean(),
  language: z.string().optional(),
  speaker_id: z.string().optional(),
  start_time_ms: z.number().optional(),
  end_time_ms: z.number().optional(),
});

export const OrderDetectionResultSchema = z.object({
  items: z.array(z.object({
    menu_item_id: z.string().optional(),
    name: z.string(),
    quantity: z.number().positive(),
    price: z.number().positive().optional(),
    modifiers: z.array(z.string()).default([]),
    notes: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
  })),
  total_amount: z.number().positive().optional(),
  currency: z.string().default('USD'),
  confidence: z.number().min(0).max(1),
  intent: z.enum(['order', 'modify', 'cancel', 'inquiry']).default('order'),
  requires_confirmation: z.boolean().default(true),
});

export const VoiceSessionMetricsSchema = z.object({
  session_id: z.string(),
  restaurant_id: z.string(),
  start_time: z.number(),
  end_time: z.number().optional(),
  duration_ms: z.number().optional(),
  audio_stats: z.object({
    total_chunks: z.number().min(0),
    total_duration_ms: z.number().min(0),
    average_chunk_size: z.number().min(0),
    peak_amplitude: z.number().optional(),
  }).optional(),
  transcript_stats: z.object({
    total_words: z.number().min(0),
    average_confidence: z.number().min(0).max(1),
    language_detected: z.string().optional(),
  }).optional(),
  performance_metrics: z.object({
    ttfp_ms: z.number().optional(), // Time to first packet
    avg_latency_ms: z.number().optional(),
    max_latency_ms: z.number().optional(),
    audio_processing_time_ms: z.number().optional(),
    transcript_processing_time_ms: z.number().optional(),
  }).optional(),
  error_metrics: z.object({
    total_errors: z.number().min(0),
    connection_errors: z.number().min(0),
    transcription_errors: z.number().min(0),
    audio_errors: z.number().min(0),
    last_error: z.string().optional(),
  }).optional(),
  quality_metrics: z.object({
    audio_quality_score: z.number().min(0).max(1).optional(),
    transcript_accuracy_score: z.number().min(0).max(1).optional(),
    user_satisfaction_score: z.number().min(0).max(5).optional(),
  }).optional(),
});

// Export TypeScript types
export type VoiceSessionConfig = z.infer<typeof VoiceSessionConfigSchema>;
export type OpenAIConfig = z.infer<typeof OpenAIConfigSchema>;
export type VoiceServerHealth = z.infer<typeof VoiceServerHealthSchema>;
export type AudioChunk = z.infer<typeof AudioChunkSchema>;
export type TranscriptResult = z.infer<typeof TranscriptResultSchema>;
export type OrderDetectionResult = z.infer<typeof OrderDetectionResultSchema>;
export type VoiceSessionMetrics = z.infer<typeof VoiceSessionMetricsSchema>;

// Define missing types
export type AudioFormat = 'pcm16' | 'g711_ulaw' | 'g711_alaw';

export interface ClientEvent {
  type: string;
  data?: unknown;
}

export interface ServerEvent {
  type: string;
  data?: unknown;
}

export interface VoiceError {
  code: string;
  message: string;
  details?: unknown;
}

// Utility types for WebSocket message handling
export type VoiceWebSocketMessage = 
  | { type: 'client_event'; data: ClientEvent }
  | { type: 'server_event'; data: ServerEvent }
  | { type: 'error'; data: VoiceError };

export type VoiceConnectionState = {
  session_id: string;
  restaurant_id: string;
  connected_at: number;
  last_activity: number;
  is_authenticated: boolean;
  capabilities: string[];
};

// Error handling types
export type VoiceServiceError = {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
  session_id?: string;
  stack?: string;
};

// Configuration validation helpers
export const validateVoiceConfig = (config: any): VoiceSessionConfig => {
  return VoiceSessionConfigSchema.parse(config);
};

export const validateOpenAIConfig = (config: any): OpenAIConfig => {
  return OpenAIConfigSchema.parse(config);
};

export const validateAudioChunk = (chunk: any): AudioChunk => {
  return AudioChunkSchema.parse(chunk);
};