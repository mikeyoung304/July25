import { defineConfig } from 'vitest/config';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const qFile = join(__dirname, 'tests', 'quarantine.list');
const qList = existsSync(qFile) ? readFileSync(qFile, 'utf8').split('\n').map(s=>s.trim()).filter(Boolean) : [];
export default defineConfig({
  resolve: {
    alias: {
      'shared': resolve(__dirname, '../shared')
    }
  },
  test: {
    environment: 'node',
    include: [
      'tests/**/*.test.ts',
      'src/**/__tests__/**/*.test.ts'  // colocated route tests
    ],
    testTimeout: 15000,
    hookTimeout: 15000,
    exclude: ['**/node_modules/**','**/dist/**','**/tests/quarantine/**', '**/.worktrees/**', '**/.conductor/**', ...qList],
    passWithNoTests: true,
    setupFiles: ['./tests/bootstrap.ts'],
  },
});
