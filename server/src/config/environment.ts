import { env, validateEnv } from './env';

export interface EnvironmentConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  supabase: {
    url: string;
    anonKey: string;
    serviceKey: string;
    jwtSecret?: string;
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
    
    if (env.NODE_ENV !== 'development' && !env.AI_DEGRADED_MODE && !env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required in production. Set AI_DEGRADED_MODE=true to use stubs.');
    }
    
    if (!env.OPENAI_API_KEY) {
      console.warn('⚠️  OpenAI API key not configured - AI features will use stub implementations');
    } else {
      console.warn('✅ OpenAI configured');
    }
  } catch (error) {
    throw new Error(`Environment validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function getConfig(): EnvironmentConfig {
  return {
    port: env.PORT,
    nodeEnv: env.NODE_ENV as 'development' | 'production' | 'test',
    supabase: {
      url: env.SUPABASE_URL,
      anonKey: env.SUPABASE_ANON_KEY,
      serviceKey: env.SUPABASE_SERVICE_KEY,
      ...(env.SUPABASE_JWT_SECRET ? { jwtSecret: env.SUPABASE_JWT_SECRET } : {}),
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
