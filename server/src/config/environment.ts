
// Note: logger import moved after getConfig to avoid circular dependency

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
}

export function validateEnvironment(): void {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
  ];

  // Check for both regular and VITE_ prefixed versions
  const missing = required.filter(key => !process.env[key] && !process.env[`VITE_${key}`]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // OpenAI configuration policy
  const isDevelopment = process.env['NODE_ENV'] === 'development';
  const isDegradedMode = process.env['AI_DEGRADED_MODE'] === 'true';
  const hasOpenAIKey = !!process.env['OPENAI_API_KEY'];
  
  if (!hasOpenAIKey) {
    if (!isDevelopment && !isDegradedMode) {
      throw new Error('OPENAI_API_KEY is required in production. Set AI_DEGRADED_MODE=true to use stubs.');
    }
    // Use console.warn since it's allowed by ESLint
    console.warn(`⚠️  OpenAI API key not configured - AI features will use stub implementations`);
  } else {
    // Changed from console.info to console.warn to comply with ESLint rules
    console.warn(`✅ OpenAI configured`);
  }
}

export function getConfig(): EnvironmentConfig {
  return {
    port: parseInt(process.env['PORT'] || '3001', 10),
    nodeEnv: (process.env['NODE_ENV'] as 'development' | 'production' | 'test') || 'development',
    supabase: {
      url: process.env['SUPABASE_URL'] || process.env['VITE_SUPABASE_URL']!,
      anonKey: process.env['SUPABASE_ANON_KEY'] || process.env['VITE_SUPABASE_ANON_KEY']!,
      serviceKey: process.env['SUPABASE_SERVICE_KEY'] || process.env['VITE_SUPABASE_SERVICE_KEY']!,
      jwtSecret: process.env['SUPABASE_JWT_SECRET'] || undefined,
    },
    frontend: {
      url: process.env['FRONTEND_URL'] || 'http://localhost:5173',
    },
    openai: {
      apiKey: process.env['OPENAI_API_KEY'] || undefined,
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
      defaultId: process.env['DEFAULT_RESTAURANT_ID'] || '11111111-1111-1111-1111-111111111111',
    },
  };
}