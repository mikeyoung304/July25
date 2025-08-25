import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Load .env files from the root directory
  envDir: '..',
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    css: true,
    globals: true,
    
    // CRITICAL: Memory-conscious test pooling strategy 
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,  // Sequential execution, less memory
        maxForks: 1,
      }
    },
    
    // Memory-conscious settings
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    
    // Enhanced isolation for memory cleanup
    isolate: true,
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    
    coverage: {
      enabled: process.env.VITEST_COVERAGE !== 'false', // Allow disabling for memory
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      provider: 'v8', // More memory efficient
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.*',
        '**/*.stories.*',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60
      }
    },
  },
});