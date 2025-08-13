# BuildPanel Integration Testing Guide

## Overview

This document outlines the comprehensive testing strategy for BuildPanel service integration in Rebuild 6.0. All AI functionality must be tested through mocks to ensure reliable, fast, and predictable tests.

## Core Testing Principles

### 1. No Real BuildPanel Calls
- **NEVER** make actual HTTP requests to BuildPanel service during tests
- All BuildPanel interactions must be mocked
- Tests should be able to run without BuildPanel service running

### 2. Restaurant Context Required
- All tests must include proper restaurant context (restaurantId)
- Authentication mocking required for backend tests
- Multi-tenant isolation must be verified

### 3. Comprehensive Error Testing
- Test BuildPanel service unavailable scenarios
- Test network timeouts and connection failures
- Test invalid response handling

## Test Structure

### Frontend Integration Tests

#### Voice Component Testing
```typescript
// client/src/modules/voice/components/__tests__/VoiceRecorder.integration.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceRecorder } from '../VoiceRecorder';
import { createMockVoiceResponse, buildPanelTestUtils } from '../../../test/utils/buildpanel-mocks';

describe('VoiceRecorder Integration', () => {
  beforeEach(() => {
    // Mock BuildPanel service
    jest.mock('../../../services/transcription/TranscriptionService', () => ({
      default: {
        transcribe: jest.fn().mockResolvedValue({
          transcription: 'Mock transcription',
          confidence: 0.95
        })
      }
    }));
  });

  it('should complete voice ordering flow with BuildPanel', async () => {
    const mockResponse = createMockVoiceResponse({
      transcription: 'Two burgers with fries',
      response: 'I\'ve added two burgers with fries to your order',
      orderData: {
        items: [{ name: 'Burger', quantity: 2, modifiers: ['fries'] }],
        total: 24.98
      }
    });

    render(
      <RestaurantProvider restaurantId="test-restaurant">
        <VoiceRecorder onOrderUpdate={jest.fn()} />
      </RestaurantProvider>
    );

    // Start recording
    const recordButton = screen.getByRole('button', { name: /start recording/i });
    fireEvent.click(recordButton);

    expect(screen.getByText(/recording/i)).toBeInTheDocument();

    // Stop recording
    fireEvent.click(recordButton);

    // Wait for BuildPanel processing
    await waitFor(() => {
      expect(screen.getByText('Two burgers with fries')).toBeInTheDocument();
    });

    expect(screen.getByText(/added.*order/i)).toBeInTheDocument();
  });

  it('should handle BuildPanel service errors gracefully', async () => {
    // Mock service failure
    jest.mock('../../../services/transcription/TranscriptionService', () => ({
      default: {
        transcribe: jest.fn().mockRejectedValue(new Error('BuildPanel unavailable'))
      }
    }));

    render(
      <RestaurantProvider restaurantId="test-restaurant">
        <VoiceRecorder onOrderUpdate={jest.fn()} />
      </RestaurantProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
    fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));

    await waitFor(() => {
      expect(screen.getByText(/service unavailable/i)).toBeInTheDocument();
    });
  });
});
```

#### Chat Component Testing
```typescript
// client/src/modules/chat/components/__tests__/ChatInterface.integration.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInterface } from '../ChatInterface';
import { createMockChatResponse } from '../../../test/utils/buildpanel-mocks';

describe('ChatInterface Integration', () => {
  it('should process chat messages through BuildPanel', async () => {
    const mockResponse = createMockChatResponse({
      message: 'We have several burger options available.',
      suggestions: ['Classic Burger', 'Cheese Burger', 'Bacon Burger']
    });

    // Mock the chat service
    jest.mock('../../../services/chat/ChatService', () => ({
      default: {
        sendMessage: jest.fn().mockResolvedValue(mockResponse)
      }
    }));

    render(
      <RestaurantProvider restaurantId="test-restaurant">
        <ChatInterface />
      </RestaurantProvider>
    );

    const input = screen.getByPlaceholderText(/type your message/i);
    fireEvent.change(input, { target: { value: 'What burgers do you have?' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText('We have several burger options available.')).toBeInTheDocument();
    });

    // Verify suggestions are displayed
    expect(screen.getByText('Classic Burger')).toBeInTheDocument();
    expect(screen.getByText('Cheese Burger')).toBeInTheDocument();
    expect(screen.getByText('Bacon Burger')).toBeInTheDocument();
  });
});
```

### Backend Integration Tests

#### AI Service Testing
```typescript
// server/src/services/__tests__/ai.service.integration.test.ts
import { AIService } from '../ai.service';
import { 
  createMockBuildPanelService, 
  createMockAuthenticatedRequest,
  buildPanelTestScenarios
} from '../test/mocks/buildpanel.service.mock';

describe('AI Service Integration', () => {
  let aiService: AIService;
  let mockBuildPanel: jest.Mocked<BuildPanelService>;

  beforeEach(() => {
    mockBuildPanel = createMockBuildPanelService();
    
    // Mock the BuildPanel service module
    jest.doMock('../buildpanel.service', () => ({
      getBuildPanelService: () => mockBuildPanel
    }));

    aiService = new AIService();
  });

  describe('Voice Processing', () => {
    it('should process voice audio with restaurant context', async () => {
      const req = createMockAuthenticatedRequest({
        restaurantId: 'test-restaurant',
        user: { id: 'test-user' }
      });

      const audioBuffer = Buffer.from('mock audio data');
      const mockResponse = buildPanelTestScenarios.voiceOrdering.simpleOrder.output;
      
      mockBuildPanel.processAuthenticatedVoice.mockResolvedValue(mockResponse);

      const result = await aiService.transcribeAudio(req, audioBuffer, 'audio/webm');

      expect(mockBuildPanel.processAuthenticatedVoice).toHaveBeenCalledWith(
        req,
        audioBuffer,
        'audio/webm'
      );

      expect(result).toMatchObject({
        success: true,
        transcription: mockResponse.transcription,
        response: mockResponse.response,
        orderData: mockResponse.orderData
      });
    });

    it('should handle BuildPanel service failures', async () => {
      const req = createMockAuthenticatedRequest();
      const audioBuffer = Buffer.from('mock audio data');

      mockBuildPanel.processAuthenticatedVoice.mockRejectedValue(
        new Error('BuildPanel service unavailable')
      );

      const result = await aiService.transcribeAudio(req, audioBuffer, 'audio/webm');

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('BuildPanel service unavailable')
      });
    });

    it('should validate restaurant context before BuildPanel call', async () => {
      const req = createMockAuthenticatedRequest({ restaurantId: '' });
      const audioBuffer = Buffer.from('mock audio data');

      const result = await aiService.transcribeAudio(req, audioBuffer, 'audio/webm');

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('restaurant context required')
      });

      expect(mockBuildPanel.processAuthenticatedVoice).not.toHaveBeenCalled();
    });
  });

  describe('Chat Processing', () => {
    it('should process chat messages with restaurant context', async () => {
      const req = createMockAuthenticatedRequest({
        restaurantId: 'test-restaurant',
        user: { id: 'test-user' }
      });

      const message = 'What burgers do you have?';
      const mockResponse = buildPanelTestScenarios.chatInteraction.menuInquiry.output;
      
      mockBuildPanel.processAuthenticatedChat.mockResolvedValue(mockResponse);

      const result = await aiService.processChat(req, message);

      expect(mockBuildPanel.processAuthenticatedChat).toHaveBeenCalledWith(
        req,
        message
      );

      expect(result).toMatchObject({
        success: true,
        message: mockResponse.message,
        suggestions: mockResponse.suggestions
      });
    });
  });
});
```

#### WebSocket Integration Testing
```typescript
// server/src/ai/__tests__/websocket.integration.test.ts
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Client as SocketIOClient } from 'socket.io-client';
import { setupVoiceWebSocket } from '../websocket';
import { createMockBuildPanelService } from '../test/mocks/buildpanel.service.mock';

describe('Voice WebSocket Integration', () => {
  let server: any;
  let io: SocketIOServer;
  let clientSocket: SocketIOClient;
  let mockBuildPanel: jest.Mocked<BuildPanelService>;

  beforeEach(async () => {
    mockBuildPanel = createMockBuildPanelService();
    
    // Mock BuildPanel service
    jest.doMock('../services/buildpanel.service', () => ({
      getBuildPanelService: () => mockBuildPanel
    }));

    server = createServer();
    io = new SocketIOServer(server);
    setupVoiceWebSocket(io);

    await new Promise<void>((resolve) => {
      server.listen(() => {
        const port = (server.address() as any).port;
        clientSocket = new SocketIOClient(`http://localhost:${port}`);
        clientSocket.on('connect', resolve);
      });
    });
  });

  afterEach(() => {
    clientSocket.close();
    server.close();
  });

  it('should process complete audio stream through BuildPanel', async () => {
    const mockResponse = {
      transcription: 'Complete voice order',
      response: 'Order processed successfully',
      orderData: { items: [], total: 0 }
    };

    mockBuildPanel.processVoice.mockResolvedValue(mockResponse);

    // Simulate audio streaming
    clientSocket.emit('audio-chunk', Buffer.from('chunk1'));
    clientSocket.emit('audio-chunk', Buffer.from('chunk2'));
    clientSocket.emit('audio-complete', { restaurantId: 'test-restaurant' });

    // Wait for BuildPanel processing
    const response = await new Promise((resolve) => {
      clientSocket.on('voice-response', resolve);
    });

    expect(mockBuildPanel.processVoice).toHaveBeenCalledWith(
      expect.any(Buffer),
      'audio/webm',
      'test-restaurant',
      undefined
    );

    expect(response).toMatchObject({
      transcription: mockResponse.transcription,
      response: mockResponse.response,
      orderData: mockResponse.orderData
    });
  });

  it('should handle BuildPanel errors in WebSocket flow', async () => {
    mockBuildPanel.processVoice.mockRejectedValue(
      new Error('BuildPanel processing failed')
    );

    clientSocket.emit('audio-complete', { restaurantId: 'test-restaurant' });

    const response = await new Promise((resolve) => {
      clientSocket.on('voice-error', resolve);
    });

    expect(response).toMatchObject({
      error: expect.stringContaining('processing failed')
    });
  });
});
```

## Test Configuration

### Jest Configuration Updates
```javascript
// jest.config.js (client)
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapping: {
    '^@/services/buildpanel.service$': '<rootDir>/src/test/mocks/buildpanel.service.mock.ts'
  },
  testMatch: [
    '<rootDir>/src/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/*.integration.test.{ts,tsx}'
  ]
};

// jest.config.js (server)
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: [
    '<rootDir>/src/**/*.test.{ts,js}',
    '<rootDir>/src/**/*.integration.test.{ts,js}'
  ]
};
```

### Test Environment Setup
```typescript
// client/src/test/setup.ts
import '@testing-library/jest-dom';
import { buildPanelTestUtils } from './utils/buildpanel-mocks';

// Global BuildPanel mock setup
beforeEach(() => {
  // Ensure BuildPanel service is always mocked
  jest.clearAllMocks();
  
  // Setup default mocks
  buildPanelTestUtils.setupBuildPanelMocks();
});

// server/src/test/setup.ts
import { buildPanelTestHelpers } from './mocks/buildpanel.service.mock';

beforeEach(() => {
  jest.clearAllMocks();
  buildPanelTestHelpers.setupMockService();
});
```

## Test Execution

### Running Integration Tests
```bash
# Run all integration tests
npm test -- --testNamePattern="Integration"

# Run BuildPanel-specific tests
npm test -- --testPathPattern="buildpanel|BuildPanel"

# Run with coverage for BuildPanel integration
npm test -- --coverage --testPathPattern="integration"

# Run specific test suites
npm test -- client/src/modules/voice/components/__tests__/VoiceRecorder.integration.test.tsx
npm test -- server/src/services/__tests__/ai.service.integration.test.ts
```

### Continuous Integration
```yaml
# .github/workflows/test.yml
name: Integration Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test -- --testPathIgnorePatterns="integration"
      
      - name: Run integration tests
        run: npm test -- --testNamePattern="Integration"
        env:
          USE_BUILDPANEL: false  # Ensure BuildPanel is mocked
      
      - name: Verify no real BuildPanel calls
        run: |
          if grep -r "http://localhost:3003" test-results/; then
            echo "ERROR: Tests making real BuildPanel calls detected"
            exit 1
          fi
```

## Monitoring and Validation

### Test Quality Metrics
- **BuildPanel Mock Coverage**: 100% of AI operations must be mocked
- **Error Scenario Coverage**: All BuildPanel failure modes tested
- **Restaurant Context Coverage**: All operations tested with proper context
- **Integration Flow Coverage**: Complete end-to-end flows tested

### Validation Scripts
```bash
#!/bin/bash
# scripts/validate-buildpanel-tests.sh

echo "Validating BuildPanel test coverage..."

# Check for any real BuildPanel URLs in tests
if grep -r "localhost:3003" --include="*.test.ts" --include="*.test.tsx" .; then
  echo "ERROR: Real BuildPanel URLs found in tests"
  exit 1
fi

# Verify all BuildPanel services are mocked
if ! grep -r "mock.*BuildPanel" --include="*.test.ts" --include="*.test.tsx" . >/dev/null; then
  echo "WARNING: No BuildPanel mocks found in tests"
fi

# Check for restaurant context in integration tests
if ! grep -r "restaurantId.*test" --include="*.integration.test.ts" . >/dev/null; then
  echo "WARNING: Integration tests may be missing restaurant context"
fi

echo "BuildPanel test validation complete"
```

## Best Practices

### DO
- ✅ Mock all BuildPanel service calls in tests
- ✅ Test with realistic restaurant context
- ✅ Use factory functions for consistent test data
- ✅ Test error scenarios comprehensively
- ✅ Verify service call parameters
- ✅ Test complete integration flows
- ✅ Use descriptive test names that include "BuildPanel"
- ✅ Group related tests in describe blocks

### DON'T
- ❌ Make real HTTP calls to BuildPanel during tests
- ❌ Skip restaurant context validation
- ❌ Ignore error handling scenarios
- ❌ Test without proper authentication mocking
- ❌ Forget to reset mocks between tests
- ❌ Test only happy path scenarios
- ❌ Use hardcoded mock data without factories

## Troubleshooting

### Common Issues
1. **Tests timing out**: Ensure BuildPanel service is properly mocked
2. **Inconsistent test results**: Check for shared mock state between tests
3. **Missing restaurant context**: Verify all tests include restaurantId
4. **Mock not applied**: Check jest.mock() placement and module resolution

### Debug Strategies
```typescript
// Add debug logging to tests
it('should debug BuildPanel integration', async () => {
  const mockService = createMockBuildPanelService();
  
  // Log all mock calls
  mockService.processVoice.mockImplementation((...args) => {
    console.log('BuildPanel.processVoice called with:', args);
    return Promise.resolve(createMockVoiceResponse());
  });
  
  // Run test and verify calls
  await testFunction();
  
  console.log('Mock calls:', mockService.processVoice.mock.calls);
});
```

---

*Last Updated: August 1, 2025*