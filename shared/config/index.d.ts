/**
 * Centralized Configuration Service
 *
 * Single source of truth for all configuration values.
 * Eliminates hardcoded values and ensures multi-tenancy support.
 */
export interface AppConfig {
    nodeEnv: 'development' | 'test' | 'production';
    isDevelopment: boolean;
    isProduction: boolean;
    isTest: boolean;
    apiBaseUrl: string;
    frontendUrl: string;
    port: number;
    databaseUrl: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
    supabaseServiceKey: string;
    supabaseJwtSecret: string;
    kioskJwtSecret: string;
    stationTokenSecret: string;
    pinPepper: string;
    deviceFingerprintSalt: string;
    defaultRestaurantId: string;
    openaiApiKey?: string;
    openaiRealtimeModel?: string;
    aiDegradedMode: boolean;
    squareAccessToken: string;
    squareEnvironment: 'sandbox' | 'production';
    squareLocationId: string;
    squareAppId: string;
    useMockData: boolean;
    useRealtimeVoice: boolean;
}
declare class ConfigService {
    private config;
    /**
     * Initialize configuration from environment variables
     */
    init(): AppConfig;
    /**
     * Get configuration (initializes if needed)
     */
    get(): AppConfig;
    /**
     * Validate required configuration values
     * Throws errors for missing critical configuration
     */
    validate(): void;
    /**
     * Check if running in browser
     */
    isBrowser(): boolean;
    /**
     * Check if running on server
     */
    isServer(): boolean;
    /**
     * Get API URL with proper protocol
     */
    getApiUrl(path?: string): string;
    /**
     * Get WebSocket URL
     */
    getWsUrl(path?: string): string;
}
declare const configService: ConfigService;
export { config } from './simple';
export { configService };
export declare const getConfig: () => AppConfig;
export declare const validateConfig: () => void;
export declare const getApiUrl: (path?: string) => string;
export declare const getWsUrl: (path?: string) => string;
//# sourceMappingURL=index.d.ts.map