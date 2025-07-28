/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: 'jest-environment-jsdom',
  testEnvironmentOptions: { url: 'http://localhost/' },
  roots: ['<rootDir>/src'],
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}', '<rootDir>/src/**/*.spec.{ts,tsx}'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
        isolatedModules: true,
        baseUrl: '.',
        paths: {
          '@/*': ['./src/*']
        },
        target: 'ES2020',
        module: 'ESNext'
      },
      useESM: true
    }],
    '^.+\\.mjs$': ['babel-jest', { presets: ['@babel/preset-env', '@babel/preset-typescript'] }],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!(isows|@supabase|@supabase/.*)/)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFiles: ['../test/setupImportMeta.ts', '<rootDir>/src/test/jest-globals.js', '<rootDir>/src/test/setupJest.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
}