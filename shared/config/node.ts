import * as simpleExports from './simple.js';
const { config: baseServerConfig } = simpleExports;

// Node-only config access (process.env)
function assertNode() {
  if (typeof window !== 'undefined') {
    throw new Error('shared/config/node.ts used in browser runtime');
  }
}

export function getServerEnv(key: string): string | undefined {
  assertNode();
  return process.env[key];
}

assertNode();

export const serverConfig = baseServerConfig;
export { getConfig, validateConfig, getApiUrl, getWsUrl, configService } from './index.js';
export type { AppConfig } from './index.js';
