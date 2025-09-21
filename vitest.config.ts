import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    watch: false,
    reporters: ['dot'],
    passWithNoTests: true,
    isolate: true,
    hookTimeout: 15000,
    testTimeout: 15000,
    poolOptions: { threads: { singleThread: true } },
    setupFiles: ['tests/setup.ts'],
  },
})