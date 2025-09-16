export type SessionConfig = {
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  max_response_output_tokens?: number;
};

/**
 * Provider limits for OpenAI Realtime API
 * Based on observed behavior and error messages
 * OpenAI Realtime API has stricter limits than regular chat API
 */
export const PROVIDER_LIMITS = {
  // OpenAI Realtime API requires temperature >= 0.6 (different from chat API which allows 0.0)
  temperature: {
    min: 0.6,  // Realtime API minimum (stricter than chat)
    max: 2.0,
    employeeDefault: 0.7,  // Consistent, professional responses
    customerDefault: 0.85  // More natural conversation
  },
  topP: {
    min: 0.0,
    max: 1.0
  },
  presencePenalty: {
    min: -2.0,
    max: 2.0
  },
  frequencyPenalty: {
    min: -2.0,
    max: 2.0
  },
  maxTokens: {
    min: 1,
    max: 4096,
    employeeDefault: 50,   // Brief acknowledgments
    customerDefault: 500   // Full conversational responses
  }
};

export function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function normalizeSessionConfig(
  input: SessionConfig,
  mode: 'employee' | 'customer'
): Required<SessionConfig> {
  const tMin = PROVIDER_LIMITS.temperature.min;
  const tMax = PROVIDER_LIMITS.temperature.max;
  const tDef = mode === 'employee'
    ? PROVIDER_LIMITS.temperature.employeeDefault
    : PROVIDER_LIMITS.temperature.customerDefault;

  const temperature = clamp(input.temperature ?? tDef, tMin, tMax);

  // Clamp other fields if provided; use sane defaults otherwise
  const topP = clamp(
    input.topP ?? 1.0,
    PROVIDER_LIMITS.topP.min,
    PROVIDER_LIMITS.topP.max
  );

  const presencePenalty = clamp(
    input.presencePenalty ?? 0,
    PROVIDER_LIMITS.presencePenalty.min,
    PROVIDER_LIMITS.presencePenalty.max
  );

  const frequencyPenalty = clamp(
    input.frequencyPenalty ?? 0,
    PROVIDER_LIMITS.frequencyPenalty.min,
    PROVIDER_LIMITS.frequencyPenalty.max
  );

  const maxTokensDef = mode === 'employee'
    ? PROVIDER_LIMITS.maxTokens.employeeDefault
    : PROVIDER_LIMITS.maxTokens.customerDefault;

  const max_response_output_tokens = clamp(
    input.max_response_output_tokens ?? maxTokensDef,
    PROVIDER_LIMITS.maxTokens.min,
    PROVIDER_LIMITS.maxTokens.max
  );

  return {
    temperature,
    topP,
    presencePenalty,
    frequencyPenalty,
    max_response_output_tokens
  };
}