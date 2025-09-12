import { z } from 'zod';

// Base event schema
export const BaseEventSchema = z.object({
  type: z.string(),
  event_id: z.string(),
  timestamp: z.number(),
});

// Client to server events
export const ClientAudioEventSchema = BaseEventSchema.extend({
  type: z.literal('audio'),
  audio: z.string(), // base64 encoded audio data
});

export const ClientStartEventSchema = BaseEventSchema.extend({
  type: z.literal('session.start'),
  session_config: z.object({
    restaurant_id: z.string(),
    audio_format: z.enum(['pcm16', 'g711_ulaw', 'g711_alaw']).default('pcm16'),
    sample_rate: z.number().default(24000),
    loopback: z.boolean().default(false), // For testing
  }),
});

export const ClientStopEventSchema = BaseEventSchema.extend({
  type: z.literal('session.stop'),
});

export const ClientHeartbeatEventSchema = BaseEventSchema.extend({
  type: z.literal('heartbeat'),
});

export const ClientEventSchema = z.discriminatedUnion('type', [
  ClientAudioEventSchema,
  ClientStartEventSchema,
  ClientStopEventSchema,
  ClientHeartbeatEventSchema,
]);

// Server to client events
export const ServerTranscriptEventSchema = BaseEventSchema.extend({
  type: z.literal('transcript'),
  transcript: z.string(),
  is_final: z.boolean(),
  confidence: z.number().optional(),
});

export const ServerOrderEventSchema = BaseEventSchema.extend({
  type: z.literal('order.detected'),
  order: z.object({
    items: z.array(z.object({
      name: z.string(),
      quantity: z.number(),
      price: z.number().optional(),
      modifiers: z.array(z.string()).optional(),
    })),
    total: z.number().optional(),
    confidence: z.number(),
  }),
});

export const ServerAudioEventSchema = BaseEventSchema.extend({
  type: z.literal('audio'),
  audio: z.string(), // base64 encoded audio response
});

export const ServerErrorEventSchema = BaseEventSchema.extend({
  type: z.literal('error'),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
});

export const ServerSessionEventSchema = BaseEventSchema.extend({
  type: z.literal('session.started'),
  session_id: z.string(),
});

export const ServerHeartbeatEventSchema = BaseEventSchema.extend({
  type: z.literal('heartbeat'),
  session_id: z.string(),
});

export const ServerEventSchema = z.discriminatedUnion('type', [
  ServerTranscriptEventSchema,
  ServerOrderEventSchema,
  ServerAudioEventSchema,
  ServerErrorEventSchema,
  ServerSessionEventSchema,
  ServerHeartbeatEventSchema,
]);

// WebSocket connection states
export const ConnectionStateSchema = z.enum([
  'connecting',
  'connected',
  'disconnected',
  'error',
  'reconnecting',
]);

// Session state
export const SessionStateSchema = z.object({
  session_id: z.string(),
  restaurant_id: z.string(),
  state: z.enum(['idle', 'listening', 'processing', 'responding']),
  created_at: z.number(),
  last_activity: z.number(),
  total_audio_duration: z.number().default(0),
  transcript_count: z.number().default(0),
});

// Metrics types
export const VoiceMetricsSchema = z.object({
  session_id: z.string(),
  ttfp_ms: z.number().optional(), // Time to first packet
  latency_ms: z.number().optional(), // Round trip latency
  audio_quality: z.number().optional(), // 0-1 score
  transcript_accuracy: z.number().optional(), // 0-1 score
  error_count: z.number().default(0),
  reconnect_count: z.number().default(0),
});

// Error types
export const VoiceErrorSchema = z.object({
  code: z.enum([
    'INVALID_AUDIO_FORMAT',
    'SESSION_NOT_FOUND',
    'RATE_LIMIT_EXCEEDED',
    'OPENAI_CONNECTION_FAILED',
    'AUDIO_PROCESSING_FAILED',
    'TRANSCRIPT_FAILED',
    'ORDER_PARSING_FAILED',
    'UNKNOWN_ERROR',
  ]),
  message: z.string(),
  session_id: z.string().optional(),
  details: z.any().optional(),
});

// Export TypeScript types
export type BaseEvent = z.infer<typeof BaseEventSchema>;
export type ClientEvent = z.infer<typeof ClientEventSchema>;
export type ServerEvent = z.infer<typeof ServerEventSchema>;
export type ClientAudioEvent = z.infer<typeof ClientAudioEventSchema>;
export type ClientStartEvent = z.infer<typeof ClientStartEventSchema>;
export type ClientStopEvent = z.infer<typeof ClientStopEventSchema>;
export type ClientHeartbeatEvent = z.infer<typeof ClientHeartbeatEventSchema>;
export type ServerTranscriptEvent = z.infer<typeof ServerTranscriptEventSchema>;
export type ServerOrderEvent = z.infer<typeof ServerOrderEventSchema>;
export type ServerAudioEvent = z.infer<typeof ServerAudioEventSchema>;
export type ServerErrorEvent = z.infer<typeof ServerErrorEventSchema>;
export type ServerSessionEvent = z.infer<typeof ServerSessionEventSchema>;
export type ServerHeartbeatEvent = z.infer<typeof ServerHeartbeatEventSchema>;
export type ConnectionState = z.infer<typeof ConnectionStateSchema>;
export type SessionState = z.infer<typeof SessionStateSchema>;
export type VoiceMetrics = z.infer<typeof VoiceMetricsSchema>;
export type VoiceError = z.infer<typeof VoiceErrorSchema>;