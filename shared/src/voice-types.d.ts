import { z } from 'zod';
export declare const BaseEventSchema: z.ZodObject<{
    type: z.ZodString;
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: string;
    event_id: string;
}, {
    timestamp: number;
    type: string;
    event_id: string;
}>;
export declare const ClientAudioEventSchema: z.ZodObject<{
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
} & {
    type: z.ZodLiteral<"audio">;
    audio: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: "audio";
    audio: string;
    event_id: string;
}, {
    timestamp: number;
    type: "audio";
    audio: string;
    event_id: string;
}>;
export declare const ClientStartEventSchema: z.ZodObject<{
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
} & {
    type: z.ZodLiteral<"session.start">;
    session_config: z.ZodObject<{
        restaurant_id: z.ZodString;
        audio_format: z.ZodDefault<z.ZodEnum<["pcm16", "g711_ulaw", "g711_alaw"]>>;
        sample_rate: z.ZodDefault<z.ZodNumber>;
        loopback: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        restaurant_id: string;
        audio_format: "pcm16" | "g711_ulaw" | "g711_alaw";
        sample_rate: number;
        loopback: boolean;
    }, {
        restaurant_id: string;
        audio_format?: "pcm16" | "g711_ulaw" | "g711_alaw" | undefined;
        sample_rate?: number | undefined;
        loopback?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: "session.start";
    event_id: string;
    session_config: {
        restaurant_id: string;
        audio_format: "pcm16" | "g711_ulaw" | "g711_alaw";
        sample_rate: number;
        loopback: boolean;
    };
}, {
    timestamp: number;
    type: "session.start";
    event_id: string;
    session_config: {
        restaurant_id: string;
        audio_format?: "pcm16" | "g711_ulaw" | "g711_alaw" | undefined;
        sample_rate?: number | undefined;
        loopback?: boolean | undefined;
    };
}>;
export declare const ClientStopEventSchema: z.ZodObject<{
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
} & {
    type: z.ZodLiteral<"session.stop">;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: "session.stop";
    event_id: string;
}, {
    timestamp: number;
    type: "session.stop";
    event_id: string;
}>;
export declare const ClientHeartbeatEventSchema: z.ZodObject<{
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
} & {
    type: z.ZodLiteral<"heartbeat">;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: "heartbeat";
    event_id: string;
}, {
    timestamp: number;
    type: "heartbeat";
    event_id: string;
}>;
export declare const ClientEventSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
} & {
    type: z.ZodLiteral<"audio">;
    audio: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: "audio";
    audio: string;
    event_id: string;
}, {
    timestamp: number;
    type: "audio";
    audio: string;
    event_id: string;
}>, z.ZodObject<{
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
} & {
    type: z.ZodLiteral<"session.start">;
    session_config: z.ZodObject<{
        restaurant_id: z.ZodString;
        audio_format: z.ZodDefault<z.ZodEnum<["pcm16", "g711_ulaw", "g711_alaw"]>>;
        sample_rate: z.ZodDefault<z.ZodNumber>;
        loopback: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        restaurant_id: string;
        audio_format: "pcm16" | "g711_ulaw" | "g711_alaw";
        sample_rate: number;
        loopback: boolean;
    }, {
        restaurant_id: string;
        audio_format?: "pcm16" | "g711_ulaw" | "g711_alaw" | undefined;
        sample_rate?: number | undefined;
        loopback?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: "session.start";
    event_id: string;
    session_config: {
        restaurant_id: string;
        audio_format: "pcm16" | "g711_ulaw" | "g711_alaw";
        sample_rate: number;
        loopback: boolean;
    };
}, {
    timestamp: number;
    type: "session.start";
    event_id: string;
    session_config: {
        restaurant_id: string;
        audio_format?: "pcm16" | "g711_ulaw" | "g711_alaw" | undefined;
        sample_rate?: number | undefined;
        loopback?: boolean | undefined;
    };
}>, z.ZodObject<{
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
} & {
    type: z.ZodLiteral<"session.stop">;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: "session.stop";
    event_id: string;
}, {
    timestamp: number;
    type: "session.stop";
    event_id: string;
}>, z.ZodObject<{
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
} & {
    type: z.ZodLiteral<"heartbeat">;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: "heartbeat";
    event_id: string;
}, {
    timestamp: number;
    type: "heartbeat";
    event_id: string;
}>]>;
export declare const ServerTranscriptEventSchema: z.ZodObject<{
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
} & {
    type: z.ZodLiteral<"transcript">;
    transcript: z.ZodString;
    is_final: z.ZodBoolean;
    confidence: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: "transcript";
    event_id: string;
    transcript: string;
    is_final: boolean;
    confidence?: number | undefined;
}, {
    timestamp: number;
    type: "transcript";
    event_id: string;
    transcript: string;
    is_final: boolean;
    confidence?: number | undefined;
}>;
export declare const ServerOrderEventSchema: z.ZodObject<{
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
} & {
    type: z.ZodLiteral<"order.detected">;
    order: z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            quantity: z.ZodNumber;
            price: z.ZodOptional<z.ZodNumber>;
            modifiers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            quantity: number;
            price?: number | undefined;
            modifiers?: string[] | undefined;
        }, {
            name: string;
            quantity: number;
            price?: number | undefined;
            modifiers?: string[] | undefined;
        }>, "many">;
        total: z.ZodOptional<z.ZodNumber>;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        items: {
            name: string;
            quantity: number;
            price?: number | undefined;
            modifiers?: string[] | undefined;
        }[];
        total?: number | undefined;
    }, {
        confidence: number;
        items: {
            name: string;
            quantity: number;
            price?: number | undefined;
            modifiers?: string[] | undefined;
        }[];
        total?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: "order.detected";
    event_id: string;
    order: {
        confidence: number;
        items: {
            name: string;
            quantity: number;
            price?: number | undefined;
            modifiers?: string[] | undefined;
        }[];
        total?: number | undefined;
    };
}, {
    timestamp: number;
    type: "order.detected";
    event_id: string;
    order: {
        confidence: number;
        items: {
            name: string;
            quantity: number;
            price?: number | undefined;
            modifiers?: string[] | undefined;
        }[];
        total?: number | undefined;
    };
}>;
export declare const ServerAudioEventSchema: z.ZodObject<{
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
} & {
    type: z.ZodLiteral<"audio">;
    audio: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: "audio";
    audio: string;
    event_id: string;
}, {
    timestamp: number;
    type: "audio";
    audio: string;
    event_id: string;
}>;
export declare const ServerErrorEventSchema: z.ZodObject<{
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
} & {
    type: z.ZodLiteral<"error">;
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        code: string;
        details?: any;
    }, {
        message: string;
        code: string;
        details?: any;
    }>;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    error: {
        message: string;
        code: string;
        details?: any;
    };
    type: "error";
    event_id: string;
}, {
    timestamp: number;
    error: {
        message: string;
        code: string;
        details?: any;
    };
    type: "error";
    event_id: string;
}>;
export declare const ServerSessionEventSchema: z.ZodObject<{
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
} & {
    type: z.ZodLiteral<"session.started">;
    session_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: "session.started";
    event_id: string;
    session_id: string;
}, {
    timestamp: number;
    type: "session.started";
    event_id: string;
    session_id: string;
}>;
export declare const ServerHeartbeatEventSchema: z.ZodObject<{
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
} & {
    type: z.ZodLiteral<"heartbeat">;
    session_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: "heartbeat";
    event_id: string;
    session_id: string;
}, {
    timestamp: number;
    type: "heartbeat";
    event_id: string;
    session_id: string;
}>;
export declare const ServerEventSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
} & {
    type: z.ZodLiteral<"transcript">;
    transcript: z.ZodString;
    is_final: z.ZodBoolean;
    confidence: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: "transcript";
    event_id: string;
    transcript: string;
    is_final: boolean;
    confidence?: number | undefined;
}, {
    timestamp: number;
    type: "transcript";
    event_id: string;
    transcript: string;
    is_final: boolean;
    confidence?: number | undefined;
}>, z.ZodObject<{
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
} & {
    type: z.ZodLiteral<"order.detected">;
    order: z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            quantity: z.ZodNumber;
            price: z.ZodOptional<z.ZodNumber>;
            modifiers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            quantity: number;
            price?: number | undefined;
            modifiers?: string[] | undefined;
        }, {
            name: string;
            quantity: number;
            price?: number | undefined;
            modifiers?: string[] | undefined;
        }>, "many">;
        total: z.ZodOptional<z.ZodNumber>;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        items: {
            name: string;
            quantity: number;
            price?: number | undefined;
            modifiers?: string[] | undefined;
        }[];
        total?: number | undefined;
    }, {
        confidence: number;
        items: {
            name: string;
            quantity: number;
            price?: number | undefined;
            modifiers?: string[] | undefined;
        }[];
        total?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: "order.detected";
    event_id: string;
    order: {
        confidence: number;
        items: {
            name: string;
            quantity: number;
            price?: number | undefined;
            modifiers?: string[] | undefined;
        }[];
        total?: number | undefined;
    };
}, {
    timestamp: number;
    type: "order.detected";
    event_id: string;
    order: {
        confidence: number;
        items: {
            name: string;
            quantity: number;
            price?: number | undefined;
            modifiers?: string[] | undefined;
        }[];
        total?: number | undefined;
    };
}>, z.ZodObject<{
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
} & {
    type: z.ZodLiteral<"audio">;
    audio: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: "audio";
    audio: string;
    event_id: string;
}, {
    timestamp: number;
    type: "audio";
    audio: string;
    event_id: string;
}>, z.ZodObject<{
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
} & {
    type: z.ZodLiteral<"error">;
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        code: string;
        details?: any;
    }, {
        message: string;
        code: string;
        details?: any;
    }>;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    error: {
        message: string;
        code: string;
        details?: any;
    };
    type: "error";
    event_id: string;
}, {
    timestamp: number;
    error: {
        message: string;
        code: string;
        details?: any;
    };
    type: "error";
    event_id: string;
}>, z.ZodObject<{
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
} & {
    type: z.ZodLiteral<"session.started">;
    session_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: "session.started";
    event_id: string;
    session_id: string;
}, {
    timestamp: number;
    type: "session.started";
    event_id: string;
    session_id: string;
}>, z.ZodObject<{
    event_id: z.ZodString;
    timestamp: z.ZodNumber;
} & {
    type: z.ZodLiteral<"heartbeat">;
    session_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: "heartbeat";
    event_id: string;
    session_id: string;
}, {
    timestamp: number;
    type: "heartbeat";
    event_id: string;
    session_id: string;
}>]>;
export declare const ConnectionStateSchema: z.ZodEnum<["connecting", "connected", "disconnected", "error", "reconnecting"]>;
export declare const SessionStateSchema: z.ZodObject<{
    session_id: z.ZodString;
    restaurant_id: z.ZodString;
    state: z.ZodEnum<["idle", "listening", "processing", "responding"]>;
    created_at: z.ZodNumber;
    last_activity: z.ZodNumber;
    total_audio_duration: z.ZodDefault<z.ZodNumber>;
    transcript_count: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    restaurant_id: string;
    created_at: number;
    session_id: string;
    state: "listening" | "processing" | "idle" | "responding";
    last_activity: number;
    total_audio_duration: number;
    transcript_count: number;
}, {
    restaurant_id: string;
    created_at: number;
    session_id: string;
    state: "listening" | "processing" | "idle" | "responding";
    last_activity: number;
    total_audio_duration?: number | undefined;
    transcript_count?: number | undefined;
}>;
export declare const VoiceMetricsSchema: z.ZodObject<{
    session_id: z.ZodString;
    ttfp_ms: z.ZodOptional<z.ZodNumber>;
    latency_ms: z.ZodOptional<z.ZodNumber>;
    audio_quality: z.ZodOptional<z.ZodNumber>;
    transcript_accuracy: z.ZodOptional<z.ZodNumber>;
    error_count: z.ZodDefault<z.ZodNumber>;
    reconnect_count: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    session_id: string;
    error_count: number;
    reconnect_count: number;
    ttfp_ms?: number | undefined;
    latency_ms?: number | undefined;
    audio_quality?: number | undefined;
    transcript_accuracy?: number | undefined;
}, {
    session_id: string;
    ttfp_ms?: number | undefined;
    latency_ms?: number | undefined;
    audio_quality?: number | undefined;
    transcript_accuracy?: number | undefined;
    error_count?: number | undefined;
    reconnect_count?: number | undefined;
}>;
export declare const VoiceErrorSchema: z.ZodObject<{
    code: z.ZodEnum<["INVALID_AUDIO_FORMAT", "SESSION_NOT_FOUND", "RATE_LIMIT_EXCEEDED", "OPENAI_CONNECTION_FAILED", "AUDIO_PROCESSING_FAILED", "TRANSCRIPT_FAILED", "ORDER_PARSING_FAILED", "UNKNOWN_ERROR"]>;
    message: z.ZodString;
    session_id: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    message: string;
    code: "INVALID_AUDIO_FORMAT" | "SESSION_NOT_FOUND" | "RATE_LIMIT_EXCEEDED" | "OPENAI_CONNECTION_FAILED" | "AUDIO_PROCESSING_FAILED" | "TRANSCRIPT_FAILED" | "ORDER_PARSING_FAILED" | "UNKNOWN_ERROR";
    details?: any;
    session_id?: string | undefined;
}, {
    message: string;
    code: "INVALID_AUDIO_FORMAT" | "SESSION_NOT_FOUND" | "RATE_LIMIT_EXCEEDED" | "OPENAI_CONNECTION_FAILED" | "AUDIO_PROCESSING_FAILED" | "TRANSCRIPT_FAILED" | "ORDER_PARSING_FAILED" | "UNKNOWN_ERROR";
    details?: any;
    session_id?: string | undefined;
}>;
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
//# sourceMappingURL=voice-types.d.ts.map