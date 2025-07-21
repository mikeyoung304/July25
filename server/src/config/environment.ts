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
    apiKey: string;
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

  // OPENAI_API_KEY is optional but warn if missing
  const optional = ['OPENAI_API_KEY'];

  // Check for both regular and VITE_ prefixed versions
  const missing = required.filter(key => !process.env[key] && !process.env[`VITE_${key}`]);
  const missingOptional = optional.filter(key => !process.env[key] && !process.env[`VITE_${key}`]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (missingOptional.length > 0) {
    console.warn(`⚠️  Missing optional environment variables: ${missingOptional.join(', ')}`);
    console.warn('   Voice ordering features will not be available without OPENAI_API_KEY');
  }

  // Log successful API key detection
  if (process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY) {
    const key = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    console.log(`✅ OpenAI API key detected: ${key?.substring(0, 7)}...`);
  }
}

export function getConfig(): EnvironmentConfig {
  return {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: (process.env.NODE_ENV as any) || 'development',
    supabase: {
      url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
      anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY!,
      serviceKey: process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY!,
      jwtSecret: process.env.SUPABASE_JWT_SECRET,
    },
    frontend: {
      url: process.env.FRONTEND_URL || 'http://localhost:5173',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '',
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      format: (process.env.LOG_FORMAT as any) || 'json',
    },
    cache: {
      ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '300', 10),
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
    restaurant: {
      defaultId: process.env.DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111',
    },
  };
}