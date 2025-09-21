/**
 * Centralized Configuration Service
 * 
 * Single source of truth for all configuration values.
 * Eliminates hardcoded values and ensures multi-tenancy support.
 */

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
  
  // Payment Processing
  squareAccessToken: string;
  squareEnvironment: 'sandbox' | 'production';
  squareLocationId: string;
  squareAppId: string;
  
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
    if (this.config) {
      return this.config;
    }
    
    const nodeEnv = (process.env['NODE_ENV'] || 'development') as AppConfig['nodeEnv'];
    
    const newConfig: AppConfig = {
      // Environment
      nodeEnv,
      isDevelopment: nodeEnv === 'development',
      isProduction: nodeEnv === 'production',
      isTest: nodeEnv === 'test',

      // API Configuration
      apiBaseUrl: process.env['VITE_API_BASE_URL'] || process.env['API_BASE_URL'] || 'http://localhost:3001',
      frontendUrl: process.env['FRONTEND_URL'] || 'http://localhost:5173',
      port: parseInt(process.env['PORT'] || '3001', 10),

      // Database
      databaseUrl: process.env['DATABASE_URL'] || '',
      supabaseUrl: process.env['VITE_SUPABASE_URL'] || process.env['SUPABASE_URL'] || '',
      supabaseAnonKey: process.env['VITE_SUPABASE_ANON_KEY'] || process.env['SUPABASE_ANON_KEY'] || '',
      supabaseServiceKey: process.env['SUPABASE_SERVICE_KEY'] || '',
      supabaseJwtSecret: process.env['SUPABASE_JWT_SECRET'] || '',

      // Authentication
      kioskJwtSecret: process.env['KIOSK_JWT_SECRET'] || '',
      stationTokenSecret: process.env['STATION_TOKEN_SECRET'] || '',
      pinPepper: process.env['PIN_PEPPER'] || '',
      deviceFingerprintSalt: process.env['DEVICE_FINGERPRINT_SALT'] || '',

      // Restaurant
      defaultRestaurantId: process.env['VITE_DEFAULT_RESTAURANT_ID'] || process.env['DEFAULT_RESTAURANT_ID'] || '',

      // AI Services
      openaiApiKey: process.env['OPENAI_API_KEY'] || '',
      openaiRealtimeModel: process.env['OPENAI_REALTIME_MODEL'] || '',
      aiDegradedMode: process.env['AI_DEGRADED_MODE'] === 'true',

      // Payment Processing
      squareAccessToken: process.env['SQUARE_ACCESS_TOKEN'] || 'demo',
      squareEnvironment: (process.env['VITE_SQUARE_ENVIRONMENT'] || process.env['SQUARE_ENVIRONMENT'] || 'sandbox') as 'sandbox' | 'production',
      squareLocationId: process.env['VITE_SQUARE_LOCATION_ID'] || process.env['SQUARE_LOCATION_ID'] || 'demo',
      squareAppId: process.env['VITE_SQUARE_APP_ID'] || process.env['SQUARE_APP_ID'] || 'demo',

      // Feature Flags
      useMockData: process.env['VITE_USE_MOCK_DATA'] === 'true',
      useRealtimeVoice: process.env['VITE_USE_REALTIME_VOICE'] !== 'false',
    };

    this.config = newConfig;
    return this.config;
  }
  
  /**
   * Get configuration (initializes if needed)
   */
  get(): AppConfig {
    if (!this.config) {
      return this.init();
    }
    return this.config;
  }
  
  /**
   * Validate required configuration values
   * Throws errors for missing critical configuration
   */
  validate(): void {
    const config = this.get();
    const errors: string[] = [];
    
    // Required in all environments
    if (!config.supabaseUrl) errors.push('SUPABASE_URL is required');
    if (!config.supabaseAnonKey) errors.push('SUPABASE_ANON_KEY is required');
    if (!config.defaultRestaurantId) errors.push('DEFAULT_RESTAURANT_ID is required');
    
    // Required for server
    if (typeof window === 'undefined') {
      if (!config.databaseUrl) errors.push('DATABASE_URL is required');
      if (!config.supabaseServiceKey) errors.push('SUPABASE_SERVICE_KEY is required');
      if (!config.supabaseJwtSecret) errors.push('SUPABASE_JWT_SECRET is required');
      if (!config.kioskJwtSecret) errors.push('KIOSK_JWT_SECRET is required');
      if (!config.stationTokenSecret) errors.push('STATION_TOKEN_SECRET is required');
      if (!config.pinPepper) errors.push('PIN_PEPPER is required');
      if (!config.deviceFingerprintSalt) errors.push('DEVICE_FINGERPRINT_SALT is required');
      
      // Required for AI features (unless degraded mode)
      if (!config.aiDegradedMode && !config.openaiApiKey) {
        errors.push('OPENAI_API_KEY is required (or set AI_DEGRADED_MODE=true)');
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }
  
  /**
   * Check if running in browser
   */
  isBrowser(): boolean {
    return typeof window !== 'undefined';
  }
  
  /**
   * Check if running on server
   */
  isServer(): boolean {
    return !this.isBrowser();
  }
  
  /**
   * Get API URL with proper protocol
   */
  getApiUrl(path: string = ''): string {
    const config = this.get();
    const baseUrl = this.isBrowser() 
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

// Create the service instance
const configService = new ConfigService();

// Export the simple config for build compatibility
export { config } from './simple';

// Export the service instance for runtime usage
export { configService };

// Export convenience functions
export const getConfig = () => configService.get();
export const validateConfig = () => configService.validate();
export const getApiUrl = (path?: string) => configService.getApiUrl(path);
export const getWsUrl = (path?: string) => configService.getWsUrl(path);