# TODO: Extract message queue logic to separate class

**Priority**: P3 (Nice-to-have)
**Status**: Pending
**Created**: 2025-11-24
**Category**: Refactoring

## Problem

The VoiceEventHandler class contains 115 lines of message queue management logic mixed with event handling responsibilities, violating Single Responsibility Principle.

**Locations**:
- Property declaration: `server/src/features/voice/realtime/VoiceEventHandler.ts:115-116`
- Queue implementation: `server/src/features/voice/realtime/VoiceEventHandler.ts:749-834`

```typescript
// Current structure in VoiceEventHandler
private messageQueue: any[] = [];
private isProcessing = false;

// 85+ lines of queue management methods
private enqueueMessage(message: any) { ... }
private async processMessageQueue() { ... }
private async sendQueuedMessage(message: any) { ... }
```

## Current Issues

- **Mixed responsibilities**: Event handling + queue management
- **Testing complexity**: Hard to test queue logic in isolation
- **Code organization**: 900+ line class with multiple concerns
- **Reusability**: Queue logic not reusable for other features

## Proposed Solution

### Extract to MessageQueue Class

```typescript
// server/src/features/voice/realtime/MessageQueue.ts

import { logger } from '../../../../utils/logger';

export interface QueuedMessage {
  type: string;
  data: any;
  timestamp: number;
}

export class MessageQueue {
  private queue: QueuedMessage[] = [];
  private isProcessing = false;
  private readonly processor: (message: QueuedMessage) => Promise<void>;

  constructor(processor: (message: QueuedMessage) => Promise<void>) {
    this.processor = processor;
  }

  public enqueue(type: string, data: any): void {
    this.queue.push({
      type,
      data,
      timestamp: Date.now(),
    });

    logger.debug('Message enqueued', {
      type,
      queueLength: this.queue.length,
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      void this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const message = this.queue.shift();
        if (message) {
          await this.processor(message);
        }
      }
    } catch (error) {
      logger.error('Error processing message queue', { error });
    } finally {
      this.isProcessing = false;
    }
  }

  public clear(): void {
    this.queue = [];
    this.isProcessing = false;
    logger.debug('Message queue cleared');
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public isProcessingMessages(): boolean {
    return this.isProcessing;
  }
}
```

### Update VoiceEventHandler

```typescript
// In VoiceEventHandler.ts

import { MessageQueue } from './MessageQueue';

export class VoiceEventHandler {
  private messageQueue: MessageQueue;

  constructor(/* ... */) {
    // ... existing initialization

    // Initialize message queue with processor callback
    this.messageQueue = new MessageQueue(
      this.sendQueuedMessage.bind(this)
    );
  }

  private handleResponseOutputItemAdded(item: any) {
    // ... existing logic

    // Enqueue message instead of managing queue directly
    this.messageQueue.enqueue('output_item_added', {
      item_id: item.item.id,
      // ... other data
    });
  }

  private async sendQueuedMessage(message: QueuedMessage): Promise<void> {
    // Actual sending logic - can now be tested via MessageQueue
    if (!this.rtConnection.isDataChannelOpen()) {
      throw new Error('Data channel not open');
    }

    await this.rtConnection.sendMessage(message.data);
  }

  public cleanup() {
    this.messageQueue.clear();
    // ... rest of cleanup
  }
}
```

## Acceptance Criteria

- [ ] MessageQueue class created with clear interface
- [ ] VoiceEventHandler refactored to use MessageQueue
- [ ] All existing queue functionality preserved
- [ ] Unit tests for MessageQueue in isolation
- [ ] VoiceEventHandler tests updated
- [ ] No behavior changes in voice ordering
- [ ] Code reduction: ~80 lines removed from VoiceEventHandler

## Files to Create/Modify

**New Files**:
- `server/src/features/voice/realtime/MessageQueue.ts`
- `server/src/features/voice/realtime/__tests__/MessageQueue.test.ts`

**Modified Files**:
- `server/src/features/voice/realtime/VoiceEventHandler.ts`
- `server/src/features/voice/realtime/__tests__/VoiceEventHandler.test.ts`

## Testing Strategy

### MessageQueue Unit Tests

```typescript
describe('MessageQueue', () => {
  let processedMessages: QueuedMessage[];
  let queue: MessageQueue;

  beforeEach(() => {
    processedMessages = [];
    queue = new MessageQueue(async (msg) => {
      processedMessages.push(msg);
    });
  });

  it('processes messages in FIFO order', async () => {
    queue.enqueue('type1', { id: 1 });
    queue.enqueue('type2', { id: 2 });
    queue.enqueue('type3', { id: 3 });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(processedMessages).toHaveLength(3);
    expect(processedMessages[0].data.id).toBe(1);
    expect(processedMessages[2].data.id).toBe(3);
  });

  it('does not start multiple processors', async () => {
    let processingCount = 0;

    queue = new MessageQueue(async () => {
      processingCount++;
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    queue.enqueue('type', {});
    queue.enqueue('type', {});

    expect(processingCount).toBe(1);
  });

  it('handles processor errors gracefully', async () => {
    queue = new MessageQueue(async () => {
      throw new Error('Processing failed');
    });

    queue.enqueue('type', {});

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(queue.getQueueLength()).toBe(0);
    expect(queue.isProcessingMessages()).toBe(false);
  });

  it('clears queue and stops processing', () => {
    queue.enqueue('type', {});
    queue.enqueue('type', {});

    queue.clear();

    expect(queue.getQueueLength()).toBe(0);
    expect(queue.isProcessingMessages()).toBe(false);
  });
});
```

### Integration Tests

```typescript
describe('VoiceEventHandler with MessageQueue', () => {
  it('enqueues messages when data channel opens', () => {
    // Test that messages are properly queued
  });

  it('processes queued messages when channel becomes ready', async () => {
    // Test end-to-end message flow
  });
});
```

## Benefits

### Separation of Concerns
- VoiceEventHandler: Event handling only
- MessageQueue: Queue management only

### Testability
- Can test queue logic independently
- Mock message processing easily
- Clearer test scenarios

### Reusability
- Queue logic can be used elsewhere
- Generic implementation with any processor function

### Maintainability
- Smaller, focused classes
- Easier to understand and modify
- Clear boundaries between components

## Migration Plan

1. **Phase 1**: Create MessageQueue class
2. **Phase 2**: Add unit tests for MessageQueue
3. **Phase 3**: Integrate into VoiceEventHandler
4. **Phase 4**: Update VoiceEventHandler tests
5. **Phase 5**: Test voice ordering end-to-end
6. **Phase 6**: Remove old queue code from VoiceEventHandler

## Notes

- Preserve all existing logging behavior
- Maintain backward compatibility during migration
- Consider adding queue metrics (size, processing time)
- Document the queue's role in voice flow

## Future Enhancements

Once extracted, the MessageQueue could support:
- Priority-based message ordering
- Message expiration/TTL
- Retry logic for failed messages
- Queue size limits with overflow handling

## References

- Code review finding: P3 refactoring opportunities
- Single Responsibility Principle
- Current implementation: VoiceEventHandler.ts:749-834
