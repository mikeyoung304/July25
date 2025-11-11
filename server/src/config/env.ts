import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from project root
// Working directory is server/, so we go up one level to find .env
const envPath = path.resolve(process.cwd(), '../.env');
dotenv.config({ path: envPath });

const rawEnv = process.env;

const getString = (key: string, fallback = ''): string => {
  const value = rawEnv[key];
  // Trim to remove any whitespace or newline characters (e.g., from Vercel CLI)
  const trimmed = value?.trim();
  return trimmed !== undefined && trimmed !== '' ? trimmed : fallback;
};

const getOptionalString = (key: string): string | undefined => {
  const value = rawEnv[key];
  // Trim to remove any whitespace or newline characters (e.g., from Vercel CLI)
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === '' ? undefined : trimmed;
};

const getNumber = (key: string, fallback: number): number => {
  const value = rawEnv[key];
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getBoolean = (key: string, fallback = false): boolean => {
  const value = rawEnv[key];
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
};

const getSquareEnvironment = (): 'sandbox' | 'production' => {
  const value = getString('SQUARE_ENVIRONMENT', 'sandbox').toLowerCase();
  return value === 'production' ? 'production' : 'sandbox';
};

/**
 * Server Environment Configuration
 * Reads from process.env after dotenv has loaded .env file
 */
export const env = {
  // Node
  NODE_ENV: getString('NODE_ENV', 'development'),
  PORT: getNumber('PORT', 3001),
  
  // Database
  DATABASE_URL: getString('DATABASE_URL'),
  SUPABASE_URL: getString('SUPABASE_URL'),
  SUPABASE_ANON_KEY: getString('SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_KEY: getString('SUPABASE_SERVICE_KEY'),
  SUPABASE_JWT_SECRET: getString('SUPABASE_JWT_SECRET'),
  
  // Frontend
  FRONTEND_URL: getString('FRONTEND_URL', 'http://localhost:5173'),
  ALLOWED_ORIGINS: getString('ALLOWED_ORIGINS', 'http://localhost:5173'),
  
  // Restaurant (CRITICAL: Required for multi-tenant operation - no fallback per P0.7)
  DEFAULT_RESTAURANT_ID: getString('DEFAULT_RESTAURANT_ID'),
  
  // AI
  OPENAI_API_KEY: getOptionalString('OPENAI_API_KEY'),
  OPENAI_REALTIME_MODEL: getString('OPENAI_REALTIME_MODEL', 'gpt-4o-realtime-preview-2025-06-03'),
  AI_DEGRADED_MODE: getBoolean('AI_DEGRADED_MODE'),
  
  // Auth
  KIOSK_JWT_SECRET: getString('KIOSK_JWT_SECRET'),
  STATION_TOKEN_SECRET: getString('STATION_TOKEN_SECRET'),
  PIN_PEPPER: getString('PIN_PEPPER'),
  DEVICE_FINGERPRINT_SALT: getString('DEVICE_FINGERPRINT_SALT'),
  
  // Payments
  SQUARE_ACCESS_TOKEN: getString('SQUARE_ACCESS_TOKEN'),
  SQUARE_LOCATION_ID: getString('SQUARE_LOCATION_ID'),
  SQUARE_ENVIRONMENT: getSquareEnvironment(),
  SQUARE_APP_ID: getString('SQUARE_APP_ID'),
} as const;

/**
 * Enhanced Environment Validation (P0.7)
 *
 * Per ADR-009 fail-fast philosophy, all compliance-critical environment
 * variables must be validated at startup to prevent runtime failures.
 *
 * Validation Tiers:
 * - TIER 1: Always required (database, core config)
 * - TIER 2: Production-required (payments, auth secrets)
 * - TIER 3: Optional (can run with degraded functionality)
 */
export function validateEnv(): void {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = env.NODE_ENV === 'production';

  // ============================================================================
  // TIER 1: Always Required (All Environments)
  // ============================================================================

  const tier1Required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'DEFAULT_RESTAURANT_ID',
  ] as const;

  for (const key of tier1Required) {
    if (!env[key]) {
      errors.push(`${key} is required in all environments`);
    }
  }

  // Validate UUID format for restaurant ID
  if (env.DEFAULT_RESTAURANT_ID) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(env.DEFAULT_RESTAURANT_ID)) {
      errors.push('DEFAULT_RESTAURANT_ID must be a valid UUID format');
    }
  }

  // Validate Supabase URL format
  if (env.SUPABASE_URL && !env.SUPABASE_URL.match(/^https:\/\/[a-z0-9-]+\.supabase\.co$/i)) {
    warnings.push('SUPABASE_URL format may be invalid (expected: https://PROJECT_REF.supabase.co)');
  }

  // ============================================================================
  // TIER 2: Production-Critical (Required in production, warn in development)
  // ============================================================================

  // Payment Processing (CRITICAL for revenue - PCI DSS compliance)
  const paymentVars = {
    SQUARE_ACCESS_TOKEN: 'Square API access token for payment processing',
    SQUARE_LOCATION_ID: 'Square location ID for payment processing',
    SQUARE_APP_ID: 'Square application ID for payment processing',
  } as const;

  for (const [key, description] of Object.entries(paymentVars)) {
    const value = env[key as keyof typeof env];
    if (!value) {
      const message = `${key} is required for payment processing (${description})`;
      if (isProduction) {
        errors.push(message);
      } else {
        warnings.push(`${message} - payments will fail`);
      }
    }
  }

  // Validate Square environment setting
  if (isProduction && env.SQUARE_ENVIRONMENT !== 'production') {
    warnings.push(
      'SQUARE_ENVIRONMENT is set to "sandbox" in production - ' +
      'payments will not process real transactions. Set to "production" for live payments.'
    );
  }

  // Validate Square access token format (production tokens start with 'EAAA')
  if (isProduction && env.SQUARE_ACCESS_TOKEN) {
    if (!env.SQUARE_ACCESS_TOKEN.startsWith('EAAA')) {
      warnings.push(
        'SQUARE_ACCESS_TOKEN may be a sandbox token (production tokens start with "EAAA"). ' +
        'Verify you are using a production access token for live payments.'
      );
    }
  }

  // Authentication Secrets (CRITICAL for security)
  const authVars = {
    KIOSK_JWT_SECRET: 'Kiosk JWT signing secret',
    STATION_TOKEN_SECRET: 'Station token signing secret',
    PIN_PEPPER: 'PIN hashing pepper (security)',
    DEVICE_FINGERPRINT_SALT: 'Device fingerprint salt (security)',
  } as const;

  for (const [key, description] of Object.entries(authVars)) {
    const value = env[key as keyof typeof env];
    if (!value) {
      const message = `${key} is required for authentication (${description})`;
      if (isProduction) {
        errors.push(message);
      } else {
        warnings.push(`${message} - auth features may fail`);
      }
    }
  }

  // Validate minimum secret length for security
  const minSecretLength = 32; // Minimum 256 bits
  const secretKeys = ['PIN_PEPPER', 'DEVICE_FINGERPRINT_SALT', 'KIOSK_JWT_SECRET', 'STATION_TOKEN_SECRET'] as const;

  for (const key of secretKeys) {
    const value = env[key as keyof typeof env];
    if (value && typeof value === 'string' && value.length < minSecretLength) {
      warnings.push(
        `${key} is too short (${value.length} chars). ` +
        `Minimum ${minSecretLength} characters recommended for security.`
      );
    }
  }

  // Frontend URL validation
  if (!env.FRONTEND_URL) {
    if (isProduction) {
      errors.push('FRONTEND_URL is required in production for CORS configuration');
    } else {
      warnings.push('FRONTEND_URL not set, defaulting to http://localhost:5173');
    }
  } else if (!env.FRONTEND_URL.match(/^https?:\/\//)) {
    errors.push('FRONTEND_URL must start with http:// or https://');
  }

  // ============================================================================
  // Report Validation Results
  // ============================================================================

  if (warnings.length > 0) {
    // Log warnings but don't block startup
    // Note: Using console.warn here because this runs during module initialization,
    // before logger is available. This is intentional for fail-fast validation.
    for (const warning of warnings) {
      // eslint-disable-next-line no-console
      console.warn(`⚠️  VALIDATION WARNING: ${warning}`);
    }
  }

  if (errors.length > 0) {
    // Fail-fast on errors per ADR-009
    const errorMessage = [
      '❌ ENVIRONMENT VALIDATION FAILED',
      '',
      'The following required environment variables are missing or invalid:',
      ...errors.map(err => `  - ${err}`),
      '',
      'Per ADR-009 fail-fast policy, the server cannot start without these critical variables.',
      'Please check your .env file and ensure all required variables are set.',
      '',
      'See .env.example for reference.',
    ].join('\n');

    throw new Error(errorMessage);
  }
}
