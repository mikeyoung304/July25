/**
 * Simple Configuration Export
 *
 * A lightweight configuration object that can be used during builds
 * without complex initialization logic.
 */

import { envBool, envInt } from '../env';

// Use a simple object that can be tree-shaken
export const config = {
  // Environment
  env: (process.env['NODE_ENV'] ?? 'development') as 'development' | 'test' | 'production',
  isProd: process.env['NODE_ENV'] === 'production',
  isTest: process.env['NODE_ENV'] === 'test',
  isDev: process.env['NODE_ENV'] === 'development',

  // API Configuration
  apiBase: process.env['VITE_API_BASE'] || process.env['API_BASE'] || '/api',
  apiBaseUrl: process.env['VITE_API_BASE_URL'] || process.env['API_BASE_URL'] || 'http://localhost:3000',
  frontendUrl: process.env['FRONTEND_URL'] || 'http://localhost:5173',

  // Feature flags
  voiceEnabled: envBool(process.env['VOICE_ENABLED']),
  paymentsWebhooksEnabled: envBool(process.env['PAYMENTS_WEBHOOKS_ENABLED']),
  useMockData: envBool(process.env['VITE_USE_MOCK_DATA']),
  useRealtimeVoice: envBool(process.env['VITE_USE_REALTIME_VOICE']),

  // Timeouts
  defaultTimeoutMs: envInt(process.env['DEFAULT_TIMEOUT_MS'], 15000),

  // Restaurant
  defaultRestaurantId: process.env['VITE_DEFAULT_RESTAURANT_ID'] || process.env['DEFAULT_RESTAURANT_ID'] || 'clzqjvfny0000c0cwtdhb9n87',
} as const;

export type AppConfig = typeof config;

// Helper functions
export function getApiUrl(path?: string): string {
  const base = config.apiBaseUrl;
  if (!path) return base;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export function getWsUrl(path?: string): string {
  const apiUrl = getApiUrl(path);
  return apiUrl.replace(/^http/, 'ws');
}