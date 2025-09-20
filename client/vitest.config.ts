import { defineConfig } from 'vitest/config';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const qFile = join(__dirname, 'tests', 'quarantine.list');
const qList = existsSync(qFile) ? readFileSync(qFile, 'utf8').split('\n').map(s=>s.trim()).filter(Boolean) : [];
export default defineConfig({
  test: {
    environment: 'jsdom',
    testTimeout: 15000,
    hookTimeout: 15000,
    exclude: ['**/node_modules/**','**/dist/**','**/tests/quarantine/**', ...qList],
  },
});
