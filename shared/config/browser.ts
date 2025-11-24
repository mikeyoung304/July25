import * as simpleExports from './simple';
const { config: baseConfig } = simpleExports;

// Browser-only config access (Vite / import.meta.env)
function assertBrowser() {
  if (typeof window === 'undefined') {
    throw new Error('shared/config/browser.ts used in non-browser runtime');
  }
}

export function getPublicEnv(key: string): string | undefined {
  assertBrowser();
  // Vite injects env under import.meta.env at build time
  const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
  return env[key];
}

assertBrowser();
const viteEnv = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

globalThis.__SHARED_CONFIG_VITE_ENV__ = viteEnv;

// Ensure process.env exists so shared config can continue to read values uniformly
type MutableProcess = NodeJS.Process & {
  env: Record<string, string | undefined>;
};

const currentProcess =
  ((globalThis as typeof globalThis & { process?: NodeJS.Process }).process as MutableProcess | undefined) ??
  ({ env: {} as Record<string, string | undefined> } as MutableProcess);

const existingEnv: Record<string, string | undefined> = { ...currentProcess.env };

// Preserve prior NODE_ENV unless Vite provides a mode override
if (typeof viteEnv.MODE === 'string' && viteEnv.MODE.length > 0) {
  existingEnv.NODE_ENV = viteEnv.MODE;
} else if (!existingEnv.NODE_ENV) {
  existingEnv.NODE_ENV = 'development';
}

for (const [key, value] of Object.entries(viteEnv)) {
  if (key.startsWith('VITE_')) {
    existingEnv[key] = value;
  }
}

currentProcess.env = existingEnv as NodeJS.ProcessEnv;
(globalThis as typeof globalThis & { process: MutableProcess }).process = currentProcess;

export const browserConfig = baseConfig;

// Import CommonJS module using namespace import
import * as configExports from '../dist/config/index.js';
export const { getConfig, validateConfig, getApiUrl, getWsUrl, configService } = configExports;
export type { AppConfig } from './index';
