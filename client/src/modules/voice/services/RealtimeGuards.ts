/**
 * RealtimeGuards - Safe parsing and validation for WebRTC/OpenAI Realtime events
 * Prevents execution of untrusted code from the wire
 */

// Whitelist of allowed event types from OpenAI Realtime API
export const ALLOWED_TYPES = new Set([
  'session.created',
  'session.updated',
  'response.created',
  'response.done',
  'response.completed',
  'response.text.delta',
  'response.output_text.delta',
  'response.function_call.arguments.delta',
  'response.function_call.completed',
  'response.transcript.delta',
  'response.audio.delta',
  'response.audio.done',
  'response.audio_transcript.delta',
  'response.audio_transcript.done',
  'input_audio_buffer.speech_started',
  'input_audio_buffer.speech_stopped',
  'input_audio_buffer.committed',
  'input_audio_buffer.cleared',
  'conversation.item.created',
  'conversation.item.input_audio_transcription.completed',
  'conversation.item.input_audio_transcription.failed',
  'error',
  'rate_limits.updated'
]);

/**
 * Safely parse an event from various input formats
 * Never executes code from the wire - only JSON parsing
 */
export async function safeParseEvent(raw: any): Promise<any | null> {
  try {
    let msg: any = raw;

    // Handle different input formats
    if (raw instanceof Blob) {
      const text = await raw.text();
      msg = JSON.parse(text);
    } else if (raw instanceof ArrayBuffer) {
      const text = new TextDecoder().decode(raw);
      msg = JSON.parse(text);
    } else if (typeof raw === 'string') {
      msg = JSON.parse(raw);
    } else if (typeof raw === 'object' && raw !== null) {
      // Already parsed object
      msg = raw;
    } else {
      console.warn('[RealtimeGuards] Unsupported event format:', typeof raw);
      return null;
    }

    // Validate event type against whitelist
    if (!msg?.type) {
      console.warn('[RealtimeGuards] Event missing type field:', msg);
      return null;
    }

    if (!ALLOWED_TYPES.has(msg.type)) {
      console.warn('[RealtimeGuards] Dropping unsupported event type:', msg.type);
      return null;
    }

    return msg;
  } catch (error) {
    // Never throw - degrade gracefully
    console.warn('[RealtimeGuards] Failed to parse event:', error);
    return null;
  }
}

/**
 * Validate that an event is safe to process
 * Returns true if the event passes all safety checks
 */
export function isEventSafe(event: any): boolean {
  if (!event || typeof event !== 'object') {
    return false;
  }

  if (!event.type || typeof event.type !== 'string') {
    return false;
  }

  if (!ALLOWED_TYPES.has(event.type)) {
    return false;
  }

  // Additional safety checks can be added here
  // e.g., checking for suspicious patterns in event data

  return true;
}

/**
 * Sanitize event data by removing potentially dangerous fields
 * This is an extra layer of protection
 */
export function sanitizeEvent(event: any): any {
  if (!event || typeof event !== 'object') {
    return null;
  }

  // Create a shallow copy to avoid mutating the original
  const sanitized = { ...event };

  // Remove any fields that could contain executable code
  const dangerousKeys = ['eval', 'Function', 'require', '__proto__', 'constructor'];

  for (const key of dangerousKeys) {
    delete sanitized[key];
  }

  // Recursively sanitize nested objects (with depth limit to prevent DoS)
  const maxDepth = 10;

  function sanitizeNested(obj: any, depth: number = 0): any {
    if (depth > maxDepth) {
      return '[MAX_DEPTH_EXCEEDED]';
    }

    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeNested(item, depth + 1));
    }

    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (!dangerousKeys.includes(key)) {
          result[key] = sanitizeNested(value, depth + 1);
        }
      }
      return result;
    }

    return obj;
  }

  return sanitizeNested(sanitized);
}