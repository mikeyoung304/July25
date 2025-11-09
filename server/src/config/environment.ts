import { env, validateEnv } from './env';
import { logger } from '../utils/logger';

export interface EnvironmentConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  supabase: {
    url: string;
    anonKey: string;
    serviceKey: string;
    jwtSecret: string; // Required by startup validation, but type allows empty for test compatibility
  };
  frontend: {
    url: string;
  };
  openai: {
    apiKey?: string;
  };
  logging: {
    level: string;
    format: 'json' | 'simple';
  };
  cache: {
    ttlSeconds: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  restaurant: {
    defaultId: string;
  };
  auth: {
    kioskJwtSecret: string;
    stationTokenSecret: string;
    pinPepper: string;
    deviceFingerprintSalt: string;
  };
  square: {
    accessToken: string;
    environment: 'sandbox' | 'production';
    locationId: string;
    appId: string;
  };
}

export function validateEnvironment(): void {
  try {
    validateEnv();

    // JWT_SECRET is critical for authentication - required in all environments
    if (!env.SUPABASE_JWT_SECRET) {
      throw new Error(
        'SUPABASE_JWT_SECRET is required for authentication.\n' +
        'This secret is used to verify JWT tokens from Supabase.\n' +
        'Find it in your Supabase Dashboard: Settings > API > JWT Secret\n' +
        'It should be a base64-encoded string (~88 characters).'
      );
    }

    // Validate JWT_SECRET format (should be base64, typically ~88 characters)
    const jwtSecret = env.SUPABASE_JWT_SECRET.trim();
    if (jwtSecret.length < 32) {
      throw new Error(
        'SUPABASE_JWT_SECRET appears invalid: too short (expected ~88 characters).\n' +
        'Ensure you copied the full JWT Secret from Supabase Dashboard: Settings > API > JWT Secret'
      );
    }

    // Check for base64 format (optional but recommended warning)
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Regex.test(jwtSecret)) {
      logger.warn(
        '⚠️  SUPABASE_JWT_SECRET format warning: expected base64-encoded string.\n' +
        'If authentication fails, verify the JWT Secret from Supabase Dashboard.'
      );
    }

    if (env.NODE_ENV !== 'development' && !env.AI_DEGRADED_MODE && !env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required in production. Set AI_DEGRADED_MODE=true to use stubs.');
    }

    if (!env.OPENAI_API_KEY) {
      logger.warn('⚠️  OpenAI API key not configured - AI features will use stub implementations');
    } else {
      logger.info('✅ OpenAI configured');
    }

    logger.info('✅ JWT authentication configured');
  } catch (error) {
    throw new Error(`Environment validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function getConfig(): EnvironmentConfig {
  return {
    port: env.PORT,
    // Read NODE_ENV fresh for test compatibility (tests may modify process.env at runtime)
    nodeEnv: (process.env['NODE_ENV'] || env.NODE_ENV) as 'development' | 'production' | 'test',
    supabase: {
      url: env.SUPABASE_URL,
      anonKey: env.SUPABASE_ANON_KEY,
      serviceKey: env.SUPABASE_SERVICE_KEY,
      // Read JWT_SECRET fresh for test compatibility (tests may modify process.env at runtime)
      // Check if explicitly set in process.env, otherwise fall back to env constant
      // When deleted from process.env in tests, use empty string (not fallback)
      jwtSecret: process.env['SUPABASE_JWT_SECRET'] || '',
    },
    frontend: {
      url: env.FRONTEND_URL,
    },
    openai: {
      ...(env.OPENAI_API_KEY ? { apiKey: env.OPENAI_API_KEY } : {}),
    },
    logging: {
      level: process.env['LOG_LEVEL'] || 'info',
      format: (process.env['LOG_FORMAT'] as 'json' | 'simple') || 'json',
    },
    cache: {
      ttlSeconds: parseInt(process.env['CACHE_TTL_SECONDS'] || '300', 10),
    },
    rateLimit: {
      windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '60000', 10),
      maxRequests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10),
    },
    restaurant: {
      defaultId: env.DEFAULT_RESTAURANT_ID,
    },
    auth: {
      kioskJwtSecret: env.KIOSK_JWT_SECRET,
      stationTokenSecret: env.STATION_TOKEN_SECRET,
      pinPepper: env.PIN_PEPPER,
      deviceFingerprintSalt: env.DEVICE_FINGERPRINT_SALT,
    },
    square: {
      accessToken: env.SQUARE_ACCESS_TOKEN,
      environment: env.SQUARE_ENVIRONMENT,
      locationId: env.SQUARE_LOCATION_ID,
      appId: env.SQUARE_APP_ID,
    },
  };
}
