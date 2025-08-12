# Features Overview

## Order Management
- **Multi-channel**: Dine-in, takeout, delivery, online
- **Real-time sync**: WebSocket updates across all clients
- **Status tracking**: Created → Pending → Preparing → Ready → Completed
- **Kitchen display**: Optimized KDS view with urgency indicators

## Voice Ordering
- **Natural language**: "Two burgers medium with fries"
- **Real-time transcription**: See what's being captured
- **Smart parsing**: Automatically extracts items and modifiers
- **Multi-mode**: Hold-to-talk or tap-to-toggle
- **OpenAI Integration**: All AI processing via external OpenAI service
- **Context Isolation**: Restaurant-specific AI context and menu understanding

## Unified Components
- **BaseOrderCard**: Single component, multiple display modes
- **UnifiedVoiceRecorder**: Consistent voice interface
- **Shared UI library**: Reusable components across views
- **Type safety**: Shared types between client and server

## Performance & Monitoring
- **Bundle optimization**: Vendor splitting, modern targets
- **Performance tracking**: Component render times, API latency
- **Error boundaries**: Graceful error handling
- **Health checks**: System status endpoints

## Developer Experience
- **Single command start**: `npm run dev`
- **TypeScript**: Full type safety
- **Hot reload**: Instant feedback during development
- **Quality gates**: Linting, type checking, testing

## Testing Strategy

### AI/Voice Testing with OpenAI Mocks
- **No Real AI Calls**: All OpenAI service calls mocked in tests
- **Voice Order Testing**: Complete ordering flows with realistic scenarios
- **Error Handling**: OpenAI service failures and timeouts
- **Restaurant Context**: Multi-tenant testing with proper isolation

### Test Coverage
- **Component Tests**: React Testing Library for UI components
- **Integration Tests**: Complete voice ordering and chat flows
- **Service Tests**: OpenAI integration with proper mocking
- **Error Scenarios**: Network failures, invalid responses, service unavailable

### Voice Testing Patterns
```typescript
// Example: Testing voice ordering with OpenAI mock
const mockVoiceResponse = createMockVoiceResponse({
  transcription: 'Two burgers with fries',
  response: 'Added to your order',
  orderData: { items: [...], total: 24.98 }
});

// Mock OpenAI service
mockTranscriptionService.transcribe.mockResolvedValue(mockVoiceResponse);

// Test complete voice ordering flow
fireEvent.click(recordButton);
await waitFor(() => {
  expect(screen.getByText('Two burgers with fries')).toBeInTheDocument();
});
```

### Chat Testing Patterns
```typescript
// Example: Testing chat with OpenAI mock
const mockChatResponse = createMockChatResponse({
  message: 'We have several burger options available',
  suggestions: ['Classic Burger', 'Cheese Burger']
});

// Test chat interaction flow
await user.type(input, 'What burgers do you have?');
await user.click(sendButton);

await waitFor(() => {
  expect(screen.getByText('We have several burger options')).toBeInTheDocument();
});
```

### Integration Test Requirements
- **OpenAI Service Mock**: Never call real OpenAI service
- **Restaurant Context**: All tests must include restaurantId
- **Authentication Mock**: Backend tests need AuthenticatedRequest mocks
- **WebSocket Mock**: Voice tests require WebSocket connection mocks
- **Error Recovery**: Test all OpenAI failure scenarios