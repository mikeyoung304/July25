"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceErrorSchema = exports.VoiceMetricsSchema = exports.SessionStateSchema = exports.ConnectionStateSchema = exports.ServerEventSchema = exports.ServerHeartbeatEventSchema = exports.ServerSessionEventSchema = exports.ServerErrorEventSchema = exports.ServerAudioEventSchema = exports.ServerOrderEventSchema = exports.ServerTranscriptEventSchema = exports.ClientEventSchema = exports.ClientHeartbeatEventSchema = exports.ClientStopEventSchema = exports.ClientStartEventSchema = exports.ClientAudioEventSchema = exports.BaseEventSchema = void 0;
const zod_1 = require("zod");
// Base event schema
exports.BaseEventSchema = zod_1.z.object({
    type: zod_1.z.string(),
    event_id: zod_1.z.string(),
    timestamp: zod_1.z.number(),
});
// Client to server events
exports.ClientAudioEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('audio'),
    audio: zod_1.z.string(), // base64 encoded audio data
});
exports.ClientStartEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('session.start'),
    session_config: zod_1.z.object({
        restaurant_id: zod_1.z.string(),
        audio_format: zod_1.z.enum(['pcm16', 'g711_ulaw', 'g711_alaw']).default('pcm16'),
        sample_rate: zod_1.z.number().default(24000),
        loopback: zod_1.z.boolean().default(false), // For testing
    }),
});
exports.ClientStopEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('session.stop'),
});
exports.ClientHeartbeatEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('heartbeat'),
});
exports.ClientEventSchema = zod_1.z.discriminatedUnion('type', [
    exports.ClientAudioEventSchema,
    exports.ClientStartEventSchema,
    exports.ClientStopEventSchema,
    exports.ClientHeartbeatEventSchema,
]);
// Server to client events
exports.ServerTranscriptEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('transcript'),
    transcript: zod_1.z.string(),
    is_final: zod_1.z.boolean(),
    confidence: zod_1.z.number().optional(),
});
exports.ServerOrderEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('order.detected'),
    order: zod_1.z.object({
        items: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            quantity: zod_1.z.number(),
            price: zod_1.z.number().optional(),
            modifiers: zod_1.z.array(zod_1.z.string()).optional(),
        })),
        total: zod_1.z.number().optional(),
        confidence: zod_1.z.number(),
    }),
});
exports.ServerAudioEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('audio'),
    audio: zod_1.z.string(), // base64 encoded audio response
});
exports.ServerErrorEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('error'),
    error: zod_1.z.object({
        code: zod_1.z.string(),
        message: zod_1.z.string(),
        details: zod_1.z.any().optional(),
    }),
});
exports.ServerSessionEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('session.started'),
    session_id: zod_1.z.string(),
});
exports.ServerHeartbeatEventSchema = exports.BaseEventSchema.extend({
    type: zod_1.z.literal('heartbeat'),
    session_id: zod_1.z.string(),
});
exports.ServerEventSchema = zod_1.z.discriminatedUnion('type', [
    exports.ServerTranscriptEventSchema,
    exports.ServerOrderEventSchema,
    exports.ServerAudioEventSchema,
    exports.ServerErrorEventSchema,
    exports.ServerSessionEventSchema,
    exports.ServerHeartbeatEventSchema,
]);
// WebSocket connection states
exports.ConnectionStateSchema = zod_1.z.enum([
    'connecting',
    'connected',
    'disconnected',
    'error',
    'reconnecting',
]);
// Session state
exports.SessionStateSchema = zod_1.z.object({
    session_id: zod_1.z.string(),
    restaurant_id: zod_1.z.string(),
    state: zod_1.z.enum(['idle', 'listening', 'processing', 'responding']),
    created_at: zod_1.z.number(),
    last_activity: zod_1.z.number(),
    total_audio_duration: zod_1.z.number().default(0),
    transcript_count: zod_1.z.number().default(0),
});
// Metrics types
exports.VoiceMetricsSchema = zod_1.z.object({
    session_id: zod_1.z.string(),
    ttfp_ms: zod_1.z.number().optional(), // Time to first packet
    latency_ms: zod_1.z.number().optional(), // Round trip latency
    audio_quality: zod_1.z.number().optional(), // 0-1 score
    transcript_accuracy: zod_1.z.number().optional(), // 0-1 score
    error_count: zod_1.z.number().default(0),
    reconnect_count: zod_1.z.number().default(0),
});
// Error types
exports.VoiceErrorSchema = zod_1.z.object({
    code: zod_1.z.enum([
        'INVALID_AUDIO_FORMAT',
        'SESSION_NOT_FOUND',
        'RATE_LIMIT_EXCEEDED',
        'OPENAI_CONNECTION_FAILED',
        'AUDIO_PROCESSING_FAILED',
        'TRANSCRIPT_FAILED',
        'ORDER_PARSING_FAILED',
        'UNKNOWN_ERROR',
    ]),
    message: zod_1.z.string(),
    session_id: zod_1.z.string().optional(),
    details: zod_1.z.any().optional(),
});
