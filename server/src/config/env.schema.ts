import { z } from 'zod';

/**
 * Environment Variable Validation Schema
 *
 * Implements ADR-009 fail-fast philosophy for compliance-critical variables.
 * Variables are organized by validation tiers:
 * - TIER 1: Always required (database, core config)
 * - TIER 2: Production-required (payments, auth secrets)
 * - TIER 3: Optional (can run with degraded functionality)
 */

// Custom transformers for common patterns
const portSchema = z.string().regex(/^\d+$/, 'Port must be numeric').transform(Number);
const booleanSchema = z.enum(['true', 'false', '1', '0'])
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
    { message: 'Must be a valid Supabase URL (https://PROJECT_REF.supabase.co)' }
  );

// Secret length validator (minimum 32 characters for security)
const secretSchema = z.string().min(32, 'Secret must be at least 32 characters for security');

// Square environment validator
const squareEnvironmentSchema = z.enum(['sandbox', 'production'])
  .default('sandbox')
  .transform(val => val.toLowerCase() as 'sandbox' | 'production');

/**
 * Complete environment schema with all tiers
 */
export const envSchema = z.object({
  // ============================================================================
  // TIER 1: Always Required (All Environments)
  // ============================================================================
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: portSchema.default('3001'),

  // Database & Supabase (CRITICAL for operation)
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL URL'),
  SUPABASE_URL: supabaseUrlSchema,
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY is required'),
  SUPABASE_JWT_SECRET: z.string().min(1, 'SUPABASE_JWT_SECRET is required'),

  // Restaurant Configuration (CRITICAL for multi-tenancy)
  DEFAULT_RESTAURANT_ID: restaurantIdSchema,

  // ============================================================================
  // TIER 2: Production-Critical (Required in production, optional in dev)
  // ============================================================================

  // Authentication Secrets
  KIOSK_JWT_SECRET: z.string().min(32, 'KIOSK_JWT_SECRET must be at least 32 characters').optional(),
  PIN_PEPPER: secretSchema.optional(),
  DEVICE_FINGERPRINT_SALT: secretSchema.optional(),
  STATION_TOKEN_SECRET: secretSchema.optional(),
  WEBHOOK_SECRET: secretSchema.optional(),

  // CORS Configuration
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL')
    .default('http://localhost:5173'),
  ALLOWED_ORIGINS: z.string()
    .default('http://localhost:5173')
    .transform((val: string) => val.split(',').map(origin => origin.trim())),

  // Payment Processing (Square)
  SQUARE_ACCESS_TOKEN: z.string().optional(),
  SQUARE_LOCATION_ID: z.string().optional(),
  SQUARE_ENVIRONMENT: squareEnvironmentSchema,
  SQUARE_APP_ID: z.string().optional(),

  // ============================================================================
  // TIER 3: Optional (Degraded functionality allowed)
  // ============================================================================

  // AI Configuration (Optional - degrades to no voice ordering)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_REALTIME_MODEL: z.string()
    .default('gpt-4o-realtime-preview-2025-06-03'),
  AI_DEGRADED_MODE: booleanSchema.default(false),

  // Monitoring (Optional)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.string()
    .regex(/^0(\.\d+)?$|^1(\.0+)?$/, 'Must be between 0 and 1')
    .transform(Number)
    .optional(),
});

// Export the inferred type
export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 * Implements fail-fast per ADR-009
 */
export function parseEnv(env: NodeJS.ProcessEnv = process.env): Env {
  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = [
        '❌ ENVIRONMENT VALIDATION FAILED',
        '',
        'The following environment variables have issues:',
        ...error.errors.map(err => {
          const path = err.path.join('.');
          const message = err.message;
          return `  - ${path}: ${message}`;
        }),
        '',
        'Per ADR-009 fail-fast policy, the server cannot start with invalid configuration.',
        'Please check your .env file and ensure all required variables are set correctly.',
        '',
        'See .env.example for reference.',
      ].join('\n');

      throw new Error(errorMessage);
    }
    throw error;
  }
}

/**
 * Safe parse for non-critical contexts (e.g., build scripts)
 */
export function safeParseEnv(env: NodeJS.ProcessEnv = process.env): {
  success: boolean;
  data?: Env;
  error?: z.ZodError;
} {
  const result = envSchema.safeParse(env);
  return result;
}