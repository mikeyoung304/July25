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

  // Log OpenAI configuration status
  if (process.env['OPENAI_API_KEY']) {
    console.log(`✅ OpenAI configured`);
  } else {
    console.warn(`⚠️  OpenAI API key not configured - AI features will use stub implementations`);
  }
}

export function getConfig(): EnvironmentConfig {
  return {
    port: parseInt(process.env['PORT'] || '3001', 10),
    nodeEnv: (process.env['NODE_ENV'] as any) || 'development',
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
      apiKey: process.env['OPENAI_API_KEY'],
    },
    logging: {
      level: process.env['LOG_LEVEL'] || 'info',
      format: (process.env['LOG_FORMAT'] as any) || 'json',
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