import { z } from 'zod';

/**
 * Client-side Environment Variable Validation Schema
 *
 * Only validates VITE_ prefixed variables that are exposed to the browser.
 * Per CL004: Never expose server secrets with VITE_ prefix.
 */

// Custom transformers
const booleanSchema = z.enum(['true', 'false', '1', '0', 'true', 'false'])
  .transform(val => val === 'true' || val === '1')
  .or(z.boolean());

// UUID or Slug validator for restaurant ID (ADR-008)
const restaurantIdSchema = z.string().refine(
  (val) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return uuidRegex.test(val) || slugRegex.test(val);
  },
  { message: 'Must be a valid UUID or slug format' }
);

// Supabase URL validator
const supabaseUrlSchema = z.string()
  .url('Must be a valid URL')
  .refine(
    (val) => /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(val),
    { message: 'Must be a valid Supabase URL' }
  );

// Environment type
const environmentSchema = z.enum(['development', 'test', 'production']);

/**
 * Client environment schema
 * All variables must have VITE_ prefix per Vite requirements
 */
export const clientEnvSchema = z.object({
  // ============================================================================
  // REQUIRED: Core Configuration
  // ============================================================================
  VITE_API_BASE_URL: z.string()
    .url('VITE_API_BASE_URL must be a valid URL'),

  VITE_SUPABASE_URL: supabaseUrlSchema,

  VITE_SUPABASE_ANON_KEY: z.string()
    .min(1, 'VITE_SUPABASE_ANON_KEY is required'),

  VITE_DEFAULT_RESTAURANT_ID: restaurantIdSchema,

  VITE_ENVIRONMENT: environmentSchema
    .default('development'),

  // ============================================================================
  // FEATURE FLAGS
  // ============================================================================

  // Voice Ordering (Critical for functionality)
  VITE_USE_REALTIME_VOICE: booleanSchema
    .default(false)
    .describe('Enable WebRTC voice ordering'),

  VITE_DEBUG_VOICE: booleanSchema
    .default(false)
    .describe('Enable voice debugging logs'),

  // Demo Panel (SECURITY: Must be false in production)
  VITE_DEMO_PANEL: booleanSchema
    .default(false)
    .refine(
      (val) => {
        const isProduction = import.meta.env.VITE_ENVIRONMENT === 'production';
        if (isProduction && val) {
          console.error('🚨 SECURITY WARNING: VITE_DEMO_PANEL is enabled in production!');
        }
        return true; // Don't fail, just warn
      }
    ),

  // Development Features
  VITE_USE_MOCK_DATA: booleanSchema
    .default(false)
    .describe('Use mock data instead of real API'),

  VITE_ENABLE_PERF: booleanSchema
    .default(false)
    .describe('Enable performance monitoring'),

  // ============================================================================
  // PAYMENT CONFIGURATION (Stripe)
  // ============================================================================
  VITE_STRIPE_PUBLISHABLE_KEY: z.string()
    .optional()
    .refine(
      (val) => !val || val.startsWith('pk_test_') || val.startsWith('pk_live_'),
      { message: 'VITE_STRIPE_PUBLISHABLE_KEY must start with pk_test_ or pk_live_' }
    )
    .describe('Stripe publishable key for client-side'),

  // ============================================================================
  // OPTIONAL: AI Configuration
  // ============================================================================
  VITE_OPENAI_REALTIME_MODEL: z.string()
    .default('gpt-4o-realtime-preview-2025-06-03')
    .describe('OpenAI model for voice ordering'),
});

// Export the inferred type
export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Parse and validate client environment variables
 * Uses import.meta.env for Vite environment variables
 */
export function parseClientEnv(): ClientEnv {
  try {
    return clientEnvSchema.parse(import.meta.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = [
        '❌ CLIENT ENVIRONMENT VALIDATION FAILED',
        '',
        'The following environment variables have issues:',
        ...error.errors.map(err => {
          const path = err.path.join('.');
          const message = err.message;
          return `  - ${path}: ${message}`;
        }),
        '',
        'Please check your environment configuration.',
        'For local development: Update .env file in project root',
        'For production: Update Vercel dashboard environment variables',
        '',
        'See .env.example for reference.',
      ].join('\n');

      // In development, throw to stop the app
      // In production, log but continue (to avoid breaking deployed app)
      if (import.meta.env.DEV) {
        throw new Error(errorMessage);
      } else {
        console.error(errorMessage);
        // Return a partial environment with defaults
        return clientEnvSchema.partial().parse(import.meta.env) as ClientEnv;
      }
    }
    throw error;
  }
}

/**
 * Safe parse for build-time validation
 */
export function safeParseClientEnv(): {
  success: boolean;
  data?: ClientEnv;
  error?: z.ZodError;
} {
  return clientEnvSchema.safeParse(import.meta.env);
}

/**
 * Validated client environment
 * Singleton instance validated at import time
 */
export const clientEnv = parseClientEnv();