# Test Architecture

## Overview

The Rebuild 6.0 project uses Jest for unit/integration testing with React Testing Library for component tests. All AI functionality is tested via BuildPanel service mocks.

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

## BuildPanel Testing Strategy

### Core Principle
**ALL AI functionality must be mocked** - Never make real calls to BuildPanel service during tests.

### Mock Patterns

#### 1. Service-Level Mocking
```typescript
// Mock the entire BuildPanel service
jest.mock('../services/buildpanel.service', () => ({
  getBuildPanelService: () => ({
    processVoice: jest.fn().mockResolvedValue({
      transcription: 'Mock transcription result',
      response: 'Mock AI response',
      orderData: { items: [], total: 0 }
    }),
    processChat: jest.fn().mockResolvedValue({
      message: 'Mock chat response',
      suggestions: ['Mock suggestion 1', 'Mock suggestion 2']
    }),
    healthCheck: jest.fn().mockResolvedValue(true),
    getMenu: jest.fn().mockResolvedValue([]),
    createOrder: jest.fn().mockResolvedValue({ orderId: 'mock-123', status: 'created' })
  })
}));
```

#### 2. HTTP Client Mocking
```typescript
// Mock axios calls to BuildPanel
import axios from 'axios';
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeEach(() => {
  mockedAxios.create.mockReturnValue({
    post: jest.fn().mockResolvedValue({
      data: { transcription: 'Mock result', response: 'Mock AI response' }
    }),
    get: jest.fn().mockResolvedValue({ data: { status: 'healthy' } })
  } as any);
});
```

#### 3. Voice Integration Mocking
```typescript
// Mock WebSocket + BuildPanel integration
const mockBuildPanelResponse = {
  transcription: 'Two burgers with fries',
  response: 'I\'ve added two burgers with fries to your order',
  orderData: {
    items: [{ name: 'Burger', quantity: 2, modifiers: ['fries'] }],
    total: 24.98
  }
};

// In voice component tests
it('should process voice recording through BuildPanel', async () => {
  const mockProcessVoice = jest.fn().mockResolvedValue(mockBuildPanelResponse);
  
  jest.mock('../services/buildpanel.service', () => ({
    getBuildPanelService: () => ({ processVoice: mockProcessVoice })
  }));

  // Test voice recording flow
  const { result } = renderHook(() => useVoiceCapture());
  
  act(() => {
    result.current.startRecording();
  });
  
  act(() => {
    result.current.stopRecording();
  });

  await waitFor(() => {
    expect(mockProcessVoice).toHaveBeenCalledWith(
      expect.any(Buffer),
      'audio/webm',
      'restaurant-123',
      'user-456'
    );
  });
  
  expect(result.current.transcription).toBe('Two burgers with fries');
});
```

### Integration Test Requirements

#### Prerequisites
1. **BuildPanel service must be mocked** - Never connect to real BuildPanel during tests
2. **Restaurant context required** - All tests must include restaurantId
3. **Authentication mocked** - Mock AuthenticatedRequest for backend tests
4. **WebSocket mocking** - Mock WebSocket connections for voice tests

#### Backend Integration Tests
```typescript
describe('AI Service Integration', () => {
  let mockBuildPanel: jest.Mocked<BuildPanelService>;

  beforeEach(() => {
    mockBuildPanel = {
      processVoice: jest.fn(),
      processChat: jest.fn(),
      healthCheck: jest.fn(),
      getMenu: jest.fn(),
      createOrder: jest.fn()
    } as any;

    // Mock the service factory
    jest.doMock('../services/buildpanel.service', () => ({
      getBuildPanelService: () => mockBuildPanel
    }));
  });

  it('should process voice with restaurant context', async () => {
    mockBuildPanel.processVoice.mockResolvedValue({
      transcription: 'Test order',
      response: 'Order processed',
      orderData: null
    });

    const req = createMockAuthenticatedRequest({
      restaurantId: 'test-restaurant',
      user: { id: 'test-user' }
    });

    const audioBuffer = Buffer.from('mock audio data');
    const result = await aiService.transcribeAudio(req, audioBuffer, 'audio/webm');

    expect(mockBuildPanel.processVoice).toHaveBeenCalledWith(
      audioBuffer,
      'audio/webm',
      'test-restaurant',
      'test-user'
    );
    
    expect(result).toMatchObject({
      transcription: 'Test order',
      response: 'Order processed'
    });
  });
});
```

#### Frontend Integration Tests
```typescript
describe('Voice Component Integration', () => {
  beforeEach(() => {
    // Mock the transcription service that calls BuildPanel
    jest.mock('@/services/transcription/TranscriptionService', () => ({
      default: {
        transcribe: jest.fn().mockResolvedValue({
          transcription: 'Mock transcription result',
          confidence: 0.95
        })
      }
    }));
  });

  it('should handle voice ordering flow', async () => {
    const { result } = renderHook(() => useVoiceOrdering());
    
    // Start recording
    act(() => {
      result.current.startRecording();
    });
    
    expect(result.current.isRecording).toBe(true);
    
    // Stop recording (triggers BuildPanel call via service)
    act(() => {
      result.current.stopRecording();
    });
    
    await waitFor(() => {
      expect(result.current.transcription).toBe('Mock transcription result');
    });
  });
});
```

## Key Testing Patterns

1. **Component Testing**: Use React Testing Library
2. **Service Testing**: Mock BuildPanel service calls
3. **Hook Testing**: Use `renderHook` from RTL
4. **API Testing**: Mock BuildPanel HTTP endpoints
5. **Voice Testing**: Mock WebSocket + BuildPanel integration
6. **Integration Testing**: Test service boundaries with mocked BuildPanel

## Mock Data Factories

Create consistent mock data for BuildPanel responses:

```typescript
// client/src/test/utils/buildpanel-mocks.ts
export const createMockVoiceResponse = (overrides = {}) => ({
  transcription: 'Mock transcription',
  response: 'Mock AI response',
  orderData: null,
  audioUrl: null,
  ...overrides
});

export const createMockChatResponse = (overrides = {}) => ({
  message: 'Mock chat response',
  suggestions: ['Suggestion 1', 'Suggestion 2'],
  orderData: null,
  ...overrides
});

export const createMockMenuItem = (overrides = {}) => ({
  id: 'mock-item-1',
  name: 'Mock Item',
  description: 'Mock description',
  price: 9.99,
  category: 'mock-category',
  available: true,
  ...overrides
});
```

## Environment Setup

### Test Environment Variables
```bash
# .env.test
USE_BUILDPANEL=false  # Always false in tests
BUILDPANEL_URL=http://localhost:3003  # Unused in tests
NODE_ENV=test
```

### Jest Configuration
```javascript
// Automatically mock BuildPanel service in all tests
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapping: {
    '^@/services/buildpanel.service$': '<rootDir>/src/test/mocks/buildpanel.service.mock.ts'
  }
};
```

## Common Test Commands

```bash
npm test              # Run all tests
npm run test:client   # Client tests only
npm run test:server   # Server tests only
npm run lint:fix      # Fix linting issues
```

## Testing Best Practices

### DO
- ✅ Mock all BuildPanel service calls
- ✅ Test with realistic restaurant context
- ✅ Use consistent mock data factories
- ✅ Test error scenarios (BuildPanel unavailable)
- ✅ Verify service call parameters
- ✅ Test WebSocket + BuildPanel integration flows

### DON'T
- ❌ Make real HTTP calls to BuildPanel service
- ❌ Skip restaurant context in tests
- ❌ Test without proper authentication mocking
- ❌ Ignore error handling for BuildPanel failures
- ❌ Forget to mock WebSocket connections in voice tests

## Error Handling Tests

```typescript
it('should handle BuildPanel service unavailable', async () => {
  mockBuildPanel.processVoice.mockRejectedValue(
    new Error('BuildPanel service unavailable')
  );

  const result = await aiService.transcribeAudio(mockReq, audioBuffer, 'audio/webm');
  
  expect(result).toMatchObject({
    success: false,
    error: expect.stringContaining('BuildPanel service unavailable')
  });
});
```

---
*Last Updated: January 24, 2025*