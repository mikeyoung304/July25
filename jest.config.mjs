export default {
  projects: [
    {
      displayName: 'client',
      testEnvironment: 'jsdom',
      rootDir: 'client',
      testMatch: ['<rootDir>/src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
      setupFiles: ['../test/setupImportMeta.ts', '<rootDir>/src/test/jest-globals.js'],
      setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            target: 'ES2020',
            module: 'ESNext',
          },
        }],
        '^.+\\.mjs$': ['babel-jest', { presets: ['@babel/preset-env', '@babel/preset-typescript'] }],
        '^.+\\.js$': ['babel-jest', { presets: ['@babel/preset-env'] }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      globals: {
        'ts-jest': {
          useESM: true,
        },
      },
    },
    {
      displayName: 'server',
      testEnvironment: 'node',
      rootDir: 'server',
      testMatch: ['<rootDir>/**/*.{test,spec}.{ts,js}'],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: {
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            target: 'ES2020',
            module: 'commonjs',
          },
        }],
      },
    },
    {
      displayName: 'e2e',
      testEnvironment: 'jsdom',
      rootDir: 'tests/e2e',
      testMatch: ['<rootDir>/**/*.{e2e.test,spec}.{ts,tsx,js,jsx}'],
      setupFiles: ['../../test/setupImportMeta.ts', '../../client/src/test/jest-globals.js'],
      setupFilesAfterEnv: ['../../client/src/test/setup.ts'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            target: 'ES2020',
            module: 'ESNext',
          },
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/../../client/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      globals: {
        'ts-jest': {
          useESM: true,
        },
      },
    },
  ],
};