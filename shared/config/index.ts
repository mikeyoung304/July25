/**
 * Centralized Configuration Service
 * 
 * NOTE: This is for CLIENT-SIDE USE ONLY (browser/Vite).
 * Server uses server/src/config/env.ts for environment loading.
 * 
 * Single source of truth for all configuration values.
 * Eliminates hardcoded values and ensures multi-tenancy support.
 */

declare global {
   
  var __SHARED_CONFIG_VITE_ENV__: Record<string, string | undefined> | undefined;
}

export interface AppConfig {
  // Environment
  nodeEnv: 'development' | 'test' | 'production';
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  
  // API Configuration
  apiBaseUrl: string;
  frontendUrl: string;
  port: number;
  
  // Database
  databaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
  supabaseJwtSecret: string;
  
  // Authentication
  kioskJwtSecret: string;
  stationTokenSecret: string;
  pinPepper: string;
  deviceFingerprintSalt: string;
  
  // Restaurant
  defaultRestaurantId: string;
  
  // AI Services
  openaiApiKey?: string;
  openaiRealtimeModel?: string;
  aiDegradedMode: boolean;
  
  // Payment Processing (Stripe)
  stripeSecretKey: string;
  stripePublishableKey: string;
  
  // Feature Flags
  useMockData: boolean;
  useRealtimeVoice: boolean;
}

class ConfigService {
  private config: AppConfig | null = null;
  
  /**
   * Initialize configuration from environment variables
   */
  init(): AppConfig {
    const viteEnv = typeof window !== 'undefined' ? globalThis.__SHARED_CONFIG_VITE_ENV__ : undefined;

    const nodeEnv = (process.env['NODE_ENV'] || 'development') as AppConfig['nodeEnv'];
    
    const newConfig: AppConfig = {
      // Environment
      nodeEnv,
      isDevelopment: nodeEnv === 'development',
      isProduction: nodeEnv === 'production',
      isTest: nodeEnv === 'test',

      // API Configuration
      apiBaseUrl:
        viteEnv?.['VITE_API_BASE_URL'] ||
        process.env['VITE_API_BASE_URL'] ||
        process.env['API_BASE_URL'] ||
        'http://localhost:3001',
      frontendUrl: process.env['FRONTEND_URL'] || 'http://localhost:5173',
      port: parseInt(process.env['PORT'] || '3001', 10),

      // Database
      databaseUrl: process.env['DATABASE_URL'] || '',
      supabaseUrl:
        viteEnv?.['VITE_SUPABASE_URL'] ||
        process.env['VITE_SUPABASE_URL'] ||
        process.env['SUPABASE_URL'] ||
        '',
      supabaseAnonKey:
        viteEnv?.['VITE_SUPABASE_ANON_KEY'] ||
        process.env['VITE_SUPABASE_ANON_KEY'] ||
        process.env['SUPABASE_ANON_KEY'] ||
        '',
      supabaseServiceKey: process.env['SUPABASE_SERVICE_KEY'] || '',
      supabaseJwtSecret: process.env['SUPABASE_JWT_SECRET'] || '',

      // Authentication
      kioskJwtSecret: process.env['KIOSK_JWT_SECRET'] || '',
      stationTokenSecret: process.env['STATION_TOKEN_SECRET'] || '',
      pinPepper: process.env['PIN_PEPPER'] || '',
      deviceFingerprintSalt: process.env['DEVICE_FINGERPRINT_SALT'] || '',

      // Restaurant
      defaultRestaurantId:
        viteEnv?.['VITE_DEFAULT_RESTAURANT_ID'] ||
        process.env['VITE_DEFAULT_RESTAURANT_ID'] ||
        process.env['DEFAULT_RESTAURANT_ID'] ||
        '11111111-1111-1111-1111-111111111111',

      // AI Services
      ...(
        process.env['OPENAI_API_KEY']
          ? { openaiApiKey: process.env['OPENAI_API_KEY'] }
          : {}
      ),
      openaiRealtimeModel: process.env['OPENAI_REALTIME_MODEL'] || 'gpt-4o-realtime-preview-2025-06-03',
      aiDegradedMode: process.env['AI_DEGRADED_MODE'] === 'true',

      // Payment Processing (Stripe)
      stripeSecretKey: process.env['STRIPE_SECRET_KEY'] || '',
      stripePublishableKey:
        viteEnv?.['VITE_STRIPE_PUBLISHABLE_KEY'] ||
        process.env['VITE_STRIPE_PUBLISHABLE_KEY'] ||
        process.env['STRIPE_PUBLISHABLE_KEY'] ||
        '',

      // Feature Flags
      useMockData:
        viteEnv?.['VITE_USE_MOCK_DATA'] === 'true' ||
        process.env['VITE_USE_MOCK_DATA'] === 'true' ||
        false,
      useRealtimeVoice:
        viteEnv?.['VITE_USE_REALTIME_VOICE'] === 'true' ||
        process.env['VITE_USE_REALTIME_VOICE'] === 'true' ||
        false,
    };

    this.config = newConfig;
    return newConfig;
  }

  /**
   * Get current configuration
   */
  get(): AppConfig {
    if (!this.config) {
      return this.init();
    }
    return this.config;
  }

  /**
   * Validate required configuration values
   */
  validate(): void {
    const config = this.get();

    const required: Array<{ key: keyof AppConfig; name: string }> = [
      { key: 'supabaseUrl', name: 'SUPABASE_URL' },
      { key: 'supabaseAnonKey', name: 'SUPABASE_ANON_KEY' },
      { key: 'supabaseServiceKey', name: 'SUPABASE_SERVICE_KEY' },
      { key: 'defaultRestaurantId', name: 'DEFAULT_RESTAURANT_ID' },
    ];

    const missing = required.filter((r) => !config[r.key]);

    if (missing.length > 0) {
      const missingNames = missing.map((m) => m.name).join(', ');
      throw new Error(`Missing required environment variables: ${missingNames}`);
    }

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(config.defaultRestaurantId)) {
      throw new Error('DEFAULT_RESTAURANT_ID must be a valid UUID');
    }
  }

  /**
   * Get API URL with optional path
   */
  getApiUrl(path?: string): string {
    const config = this.get();
    const baseUrl =
      typeof window !== 'undefined'
        ? (config.apiBaseUrl || window.location.origin.replace(':5173', ':3001'))
        : config.apiBaseUrl;
    
    return path ? `${baseUrl}${path.startsWith('/') ? path : `/${path}`}` : baseUrl;
  }
  
  /**
   * Get WebSocket URL
   */
  getWsUrl(path: string = ''): string {
    const apiUrl = this.getApiUrl();
    const wsUrl = apiUrl.replace(/^http/, 'ws');
    return path ? `${wsUrl}${path.startsWith('/') ? path : `/${path}`}` : wsUrl;
  }
}

// Lazy singleton - only initializes when first accessed
let _instance: ConfigService | null = null;

function getInstance(): ConfigService {
  if (!_instance) {
    _instance = new ConfigService();
  }
  return _instance;
}

export const configService = {
  get: () => getInstance().get(),
  validate: () => getInstance().validate(),
  getApiUrl: (path?: string) => getInstance().getApiUrl(path),
  getWsUrl: (path?: string) => getInstance().getWsUrl(path)
};

// Export the simple config for build compatibility
export { config } from './simple';

// Export convenience functions
export const getConfig = () => configService.get();
export const validateConfig = () => configService.validate();
export const getApiUrl = (path?: string) => configService.getApiUrl(path);
export const getWsUrl = (path?: string) => configService.getWsUrl(path);
