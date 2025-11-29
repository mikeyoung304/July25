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

// UUID validator for restaurant ID
// Currently only accepts UUIDs (not slugs) per test expectations
const restaurantIdSchema = z.string().refine(
  (val) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(val);
  },
  { message: 'DEFAULT_RESTAURANT_ID must be a valid UUID format' }
);

// Stripe key validators
const stripeSecretKeySchema = z.string()
  .optional()
  .refine(
    (val) => !val || val.startsWith('sk_test_') || val.startsWith('sk_live_'),
    { message: 'STRIPE_SECRET_KEY must start with sk_test_ or sk_live_' }
  );

const stripePublishableKeySchema = z.string()
  .optional()
  .refine(
    (val) => !val || val.startsWith('pk_test_') || val.startsWith('pk_live_'),
    { message: 'STRIPE_PUBLISHABLE_KEY must start with pk_test_ or pk_live_' }
  );

/**
 * Base environment schema with all tiers
 */
const baseEnvSchema = z.object({
  // ============================================================================
  // TIER 1: Always Required (All Environments)
  // ============================================================================
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: portSchema.default('3001'),

  // Database & Supabase (CRITICAL for operation)
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL URL'),
  SUPABASE_URL: z.string().min(1, 'SUPABASE_URL is required in all environments').url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required in all environments'),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY is required in all environments'),
  SUPABASE_JWT_SECRET: z.string().min(1, 'SUPABASE_JWT_SECRET is required'),

  // Restaurant Configuration (CRITICAL for multi-tenancy)
  DEFAULT_RESTAURANT_ID: restaurantIdSchema,

  // ============================================================================
  // TIER 2: Production-Critical (Required in production, optional in dev)
  // ============================================================================

  // Authentication Secrets
  // Optional - validated in production by superRefine, but allowed any length in development
  KIOSK_JWT_SECRET: z.string().optional(),
  PIN_PEPPER: z.string().optional(),
  DEVICE_FINGERPRINT_SALT: z.string().optional(),
  STATION_TOKEN_SECRET: z.string().optional(),
  WEBHOOK_SECRET: z.string().optional(),

  // CORS Configuration
  FRONTEND_URL: z.string()
    .refine((val) => val.startsWith('http://') || val.startsWith('https://'), {
      message: 'FRONTEND_URL must start with http:// or https://'
    })
    .default('http://localhost:5173'),
  ALLOWED_ORIGINS: z.string()
    .default('http://localhost:5173')
    .transform((val: string) => val.split(',').map(origin => origin.trim())),

  // Payment Processing (Stripe)
  STRIPE_SECRET_KEY: stripeSecretKeySchema,
  STRIPE_PUBLISHABLE_KEY: stripePublishableKeySchema,
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // ============================================================================
  // TIER 3: Optional (Degraded functionality allowed)
  // ============================================================================

  // AI Configuration (Optional - degrades to no voice ordering)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_REALTIME_MODEL: z.string()
    .default('gpt-4o-realtime-preview-2025-06-03'),
  OPENAI_API_TIMEOUT_MS: z.coerce.number()
    .positive('OPENAI_API_TIMEOUT_MS must be positive')
    .int('OPENAI_API_TIMEOUT_MS must be an integer')
    .default(45000),
  AI_DEGRADED_MODE: booleanSchema.default(false),

  // Monitoring (Optional)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.string()
    .regex(/^0(\.\d+)?$|^1(\.0+)?$/, 'Must be between 0 and 1')
    .transform(Number)
    .optional(),
});

/**
 * Complete environment schema with production-specific validation
 */
export const envSchema = baseEnvSchema.superRefine((data, ctx) => {
  // Production-specific validation for payment processing
  if (data.NODE_ENV === 'production') {
    if (!data.STRIPE_SECRET_KEY || data.STRIPE_SECRET_KEY.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['STRIPE_SECRET_KEY'],
        message: 'STRIPE_SECRET_KEY is required for payment processing',
      });
    }
    if (!data.STRIPE_PUBLISHABLE_KEY || data.STRIPE_PUBLISHABLE_KEY.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['STRIPE_PUBLISHABLE_KEY'],
        message: 'STRIPE_PUBLISHABLE_KEY is required for payment processing',
      });
    }

    // Production-specific validation for authentication
    if (!data.KIOSK_JWT_SECRET || data.KIOSK_JWT_SECRET.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['KIOSK_JWT_SECRET'],
        message: 'KIOSK_JWT_SECRET is required for authentication',
      });
    } else if (data.KIOSK_JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['KIOSK_JWT_SECRET'],
        message: 'KIOSK_JWT_SECRET must be at least 32 characters',
      });
    }
    if (!data.PIN_PEPPER || data.PIN_PEPPER.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PIN_PEPPER'],
        message: 'PIN_PEPPER is required for authentication',
      });
    } else if (data.PIN_PEPPER.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PIN_PEPPER'],
        message: 'PIN_PEPPER must be at least 32 characters',
      });
    }
  }

  // Development warnings for missing payment variables
  if (data.NODE_ENV === 'development') {
    if (!data.STRIPE_SECRET_KEY || data.STRIPE_SECRET_KEY.trim() === '') {
      console.warn('⚠️  STRIPE_SECRET_KEY not set - payment features will not work');
    }
    if (!data.STRIPE_PUBLISHABLE_KEY || data.STRIPE_PUBLISHABLE_KEY.trim() === '') {
      console.warn('⚠️  STRIPE_PUBLISHABLE_KEY not set - payment features will not work');
    }

    // Warn about short secrets in development
    if (data.PIN_PEPPER && data.PIN_PEPPER.length < 32) {
      console.warn('⚠️  PIN_PEPPER is too short - should be at least 32 characters for security');
    }
    if (data.KIOSK_JWT_SECRET && data.KIOSK_JWT_SECRET.length < 32) {
      console.warn('⚠️  KIOSK_JWT_SECRET is too short - should be at least 32 characters for security');
    }
    if (data.STATION_TOKEN_SECRET && data.STATION_TOKEN_SECRET.length < 32) {
      console.warn('⚠️  STATION_TOKEN_SECRET is too short - should be at least 32 characters for security');
    }
    if (data.DEVICE_FINGERPRINT_SALT && data.DEVICE_FINGERPRINT_SALT.length < 32) {
      console.warn('⚠️  DEVICE_FINGERPRINT_SALT is too short - should be at least 32 characters for security');
    }
  }
});

// Export the inferred type
export type Env = z.infer<typeof baseEnvSchema>;

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