export default {
  projects: [
    {
      displayName: 'client',
      testEnvironment: 'jsdom',
      rootDir: 'client',
      testMatch: ['<rootDir>/src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
      setupFiles: ['<rootDir>/../test/setupImportMeta.ts', '<rootDir>/src/test/jest-globals.js'],
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
  ],
};