
// Note: logger import moved after getConfig to avoid circular dependency
import { configService, validateConfig } from '../../../shared/config';

export interface EnvironmentConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  supabase: {
    url: string;
    anonKey: string;
    serviceKey: string;
    jwtSecret?: string | undefined;
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
    // Use centralized validation
    validateConfig();
    
    // Additional server-specific validation
    const cfg = configService.get();
    
    if (!cfg.isDevelopment && !cfg.aiDegradedMode && !cfg.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is required in production. Set AI_DEGRADED_MODE=true to use stubs.');
    }
    
    if (!cfg.openaiApiKey) {
      console.warn(`⚠️  OpenAI API key not configured - AI features will use stub implementations`);
    } else {
      console.warn(`✅ OpenAI configured`);
    }
  } catch (error) {
    // Re-throw with more context
    throw new Error(`Environment validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function getConfig(): EnvironmentConfig {
  const cfg = configService.get();
  
  return {
    port: cfg.port,
    nodeEnv: cfg.nodeEnv,
    supabase: {
      url: cfg.supabaseUrl,
      anonKey: cfg.supabaseAnonKey,
      serviceKey: cfg.supabaseServiceKey,
      jwtSecret: cfg.supabaseJwtSecret || undefined,
    },
    frontend: {
      url: cfg.frontendUrl,
    },
    openai: {
      apiKey: cfg.openaiApiKey || undefined,
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
      defaultId: cfg.defaultRestaurantId,
    },
    auth: {
      kioskJwtSecret: cfg.kioskJwtSecret,
      stationTokenSecret: cfg.stationTokenSecret,
      pinPepper: cfg.pinPepper,
      deviceFingerprintSalt: cfg.deviceFingerprintSalt,
    },
    square: {
      accessToken: cfg.squareAccessToken,
      environment: cfg.squareEnvironment,
      locationId: cfg.squareLocationId,
      appId: cfg.squareAppId,
    },
  };
}