import { defineConfig } from 'vitest/config';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const qFile = join(__dirname, 'tests', 'quarantine.list');
const qList = existsSync(qFile) ? readFileSync(qFile, 'utf8').split('\n').map(s=>s.trim()).filter(Boolean).filter(s=>!s.startsWith('#')) : [];
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@rebuild/shared': resolve(__dirname, '../shared/dist'),
      '/shared': resolve(__dirname, '../shared/src'),
      '@shared': resolve(__dirname, '../shared/src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 15000,
    hookTimeout: 15000,
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**','**/dist/**','**/tests/quarantine/**', ...qList],
    // Limit parallelism to prevent 70GB+ RAM spikes
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 4,
        minForks: 1,
      },
    },
  },
});
