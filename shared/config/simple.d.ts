/**
 * Simple Configuration Export
 *
 * A lightweight configuration object that can be used during builds
 * without complex initialization logic.
 */
export declare const config: {
    readonly env: "development" | "test" | "production";
    readonly isProd: boolean;
    readonly isTest: boolean;
    readonly isDev: boolean;
    readonly apiBase: string;
    readonly apiBaseUrl: string;
    readonly frontendUrl: string;
    readonly voiceEnabled: boolean;
    readonly paymentsWebhooksEnabled: boolean;
    readonly useMockData: boolean;
    readonly useRealtimeVoice: boolean;
    readonly defaultTimeoutMs: number;
    readonly defaultRestaurantId: string;
};
export type AppConfig = typeof config;
export declare function getApiUrl(path?: string): string;
export declare function getWsUrl(path?: string): string;
//# sourceMappingURL=simple.d.ts.map