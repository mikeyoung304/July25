# Test Architecture

## Overview

The Rebuild 6.0 project uses Jest for unit/integration testing with React Testing Library for component tests.

## Test Structure

```
rebuild-6.0/
├── client/
│   ├── src/
│   │   └── **/*.test.{ts,tsx}      # Component and unit tests
│   └── jest.config.cjs             # Jest configuration
├── server/
│   ├── src/
│   │   └── **/*.test.ts            # Backend tests
│   └── jest.config.js              # Server Jest config
└── jest.config.mjs                 # Root Jest orchestrator
```

## Test Statistics

- **Total Tests**: 238
- **Test Suites**: 34
- **Coverage**: ~85%
- **ESLint Warnings**: 30 (non-blocking)

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- path/to/file.test.tsx

# Run in watch mode
npm test -- --watch
```

## Test Utilities

Located in `client/src/test/utils/`:
- `test-utils.tsx` - Custom render with providers
- `mock-factories.ts` - Mock data generators
- `test-helpers.ts` - Common test utilities

## Key Testing Patterns

1. **Component Testing**: Use React Testing Library
2. **Service Testing**: Mock external dependencies
3. **Hook Testing**: Use `renderHook` from RTL
4. **API Testing**: Mock fetch with Jest

## Common Test Commands

```bash
npm test              # Run all tests
npm run test:client   # Client tests only
npm run test:server   # Server tests only
npm run lint:fix      # Fix linting issues
```

---
*Last Updated: January 24, 2025*