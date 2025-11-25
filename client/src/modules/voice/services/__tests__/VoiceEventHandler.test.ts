import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  VoiceEventHandler,
  RealtimeEvent,
  TranscriptEvent,
  OrderEvent,
  TurnState,
  WebRTCVoiceConfig
} from '../VoiceEventHandler'

// Mock logger
vi.mock('@/services/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

// Import the mocked logger for assertions
import { logger } from '@/services/logger'

describe('VoiceEventHandler', () => {
  let handler: VoiceEventHandler
  let mockDataChannel: Partial<RTCDataChannel>
  let mockConfig: WebRTCVoiceConfig

  beforeEach(() => {
    mockConfig = {
      restaurantId: 'test-restaurant',
      userId: 'test-user',
      debug: false,
      enableVAD: true,
      muteAudioOutput: false
    }

    // Create mock data channel
    mockDataChannel = {
      readyState: 'connecting',
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    handler = new VoiceEventHandler(mockConfig)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Event Routing', () => {
    it('routes session.created to handler', () => {
      const emitSpy = vi.spyOn(handler, 'emit')
      const event: RealtimeEvent = {
        type: 'session.created',
        event_id: 'evt_001',
        session: { id: 'sess_123', model: 'gpt-4o-realtime' }
      }

      handler.handleRealtimeEvent(event)

      expect(emitSpy).toHaveBeenCalledWith('session.created', event.session)
    })

    it('routes conversation.item.created to handler', () => {
      const event: RealtimeEvent = {
        type: 'conversation.item.created',
        event_id: 'evt_002',
        item: {
          id: 'item_123',
          role: 'user',
          type: 'message'
        }
      }

      handler.handleRealtimeEvent(event)

      // Should initialize transcript entry for user item
      expect(handler.getCurrentEventIndex()).toBe(1)
    })

    it('routes response.audio_transcript.delta to handler', () => {
      const emitSpy = vi.spyOn(handler, 'emit')

      // First create a conversation item
      handler.handleRealtimeEvent({
        type: 'conversation.item.created',
        event_id: 'evt_001',
        item: { id: 'item_123', role: 'assistant' }
      })

      // Set turn state to waiting_response
      handler.setTurnState('waiting_response')

      // Then send delta
      const event: RealtimeEvent = {
        type: 'response.audio_transcript.delta',
        event_id: 'evt_002',
        delta: 'Hello ',
        item_id: 'item_123'
      }

      handler.handleRealtimeEvent(event)

      expect(emitSpy).toHaveBeenCalledWith('response.text', 'Hello ')
    })

    it('routes response.function_call_arguments.done to handler', () => {
      const emitSpy = vi.spyOn(handler, 'emit')
      const event: RealtimeEvent = {
        type: 'response.function_call_arguments.done',
        event_id: 'evt_003',
        name: 'add_to_order',
        arguments: JSON.stringify({
          items: [{ name: 'Greek Salad', quantity: 1 }]
        })
      }

      handler.handleRealtimeEvent(event)

      expect(emitSpy).toHaveBeenCalledWith('order.detected', expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ name: 'Greek Salad', quantity: 1 })
        ]),
        confidence: 0.95
      }))
    })

    it('routes input_audio_buffer.speech_started to handler', () => {
      const emitSpy = vi.spyOn(handler, 'emit')
      handler.setTurnState('recording')

      const event: RealtimeEvent = {
        type: 'input_audio_buffer.speech_started',
        event_id: 'evt_004'
      }

      handler.handleRealtimeEvent(event)

      expect(emitSpy).toHaveBeenCalledWith('speech.started')
    })

    it('routes response.done to handler', () => {
      const emitSpy = vi.spyOn(handler, 'emit')
      handler.setTurnState('waiting_response')

      const event: RealtimeEvent = {
        type: 'response.done',
        event_id: 'evt_005',
        response: { id: 'resp_123', status: 'completed' }
      }

      handler.handleRealtimeEvent(event)

      expect(emitSpy).toHaveBeenCalledWith('response.complete', event.response)
      expect(handler.getTurnState()).toBe('idle')
    })

    it('routes error to handler', () => {
      const emitSpy = vi.spyOn(handler, 'emit')

      const event: RealtimeEvent = {
        type: 'error',
        event_id: 'evt_006',
        error: {
          message: 'Test error',
          code: 'test_error'
        }
      }

      handler.handleRealtimeEvent(event)

      expect(emitSpy).toHaveBeenCalledWith('error', expect.any(Error))
      expect(logger.error).toHaveBeenCalled()
    })

    it('routes unknown events gracefully', () => {
      const event: RealtimeEvent = {
        type: 'unknown.event.type',
        event_id: 'evt_007'
      }

      // Should not throw
      expect(() => handler.handleRealtimeEvent(event)).not.toThrow()
      expect(handler.getCurrentEventIndex()).toBe(1)
    })
  })

  describe('Event Deduplication', () => {
    it('duplicate event_id is ignored', () => {
      const emitSpy = vi.spyOn(handler, 'emit')
      const event: RealtimeEvent = {
        type: 'session.created',
        event_id: 'evt_duplicate',
        session: { id: 'sess_123' }
      }

      // First call should process
      handler.handleRealtimeEvent(event)
      expect(emitSpy).toHaveBeenCalledTimes(1)

      // Second call with same event_id should be ignored
      handler.handleRealtimeEvent(event)
      expect(emitSpy).toHaveBeenCalledTimes(1)
    })

    it('new event_id is processed', () => {
      const emitSpy = vi.spyOn(handler, 'emit')

      const event1: RealtimeEvent = {
        type: 'session.created',
        event_id: 'evt_001',
        session: { id: 'sess_123' }
      }

      const event2: RealtimeEvent = {
        type: 'session.created',
        event_id: 'evt_002',
        session: { id: 'sess_456' }
      }

      handler.handleRealtimeEvent(event1)
      handler.handleRealtimeEvent(event2)

      expect(emitSpy).toHaveBeenCalledTimes(2)
    })

    it('seenEventIds map grows correctly and bounds at 1000', () => {
      // Process 1100 events to test the bounding logic
      for (let i = 0; i < 1100; i++) {
        handler.handleRealtimeEvent({
          type: 'session.updated',
          event_id: `evt_${i}`
        })
      }

      // Event index should be 1100
      expect(handler.getCurrentEventIndex()).toBe(1100)

      // Process a duplicate from early in the sequence (should have been removed)
      const firstEventAgain: RealtimeEvent = {
        type: 'session.updated',
        event_id: 'evt_0'
      }

      const initialIndex = handler.getCurrentEventIndex()
      handler.handleRealtimeEvent(firstEventAgain)

      // Should process it since evt_0 was evicted
      expect(handler.getCurrentEventIndex()).toBe(initialIndex + 1)
    })
  })

  describe('Message Queuing', () => {
    it('messages queue when data channel not ready', () => {
      const event = { type: 'response.create' }

      handler.sendEvent(event)

      // Data channel should not have been called
      expect(mockDataChannel.send).not.toHaveBeenCalled()
    })

    it('queued messages flush when channel ready', () => {
      const event1 = { type: 'response.create' }
      const event2 = { type: 'input_audio_buffer.append' }

      // Queue messages
      handler.sendEvent(event1)
      handler.sendEvent(event2)

      // Set up data channel
      mockDataChannel.readyState = 'open'
      handler.setDataChannel(mockDataChannel as RTCDataChannel)

      // Manually trigger onopen
      if (mockDataChannel.onopen) {
        mockDataChannel.onopen(new Event('open'))
      }

      // Should flush both messages
      expect(mockDataChannel.send).toHaveBeenCalledTimes(2)
      expect(mockDataChannel.send).toHaveBeenCalledWith(JSON.stringify(event1))
      expect(mockDataChannel.send).toHaveBeenCalledWith(JSON.stringify(event2))
    })

    it('queue respects order (FIFO)', () => {
      const calls: string[] = []
      mockDataChannel.send = vi.fn((data: string) => {
        const parsed = JSON.parse(data)
        calls.push(parsed.type)
      })

      // Queue 3 messages
      handler.sendEvent({ type: 'first' })
      handler.sendEvent({ type: 'second' })
      handler.sendEvent({ type: 'third' })

      // Set up data channel
      mockDataChannel.readyState = 'open'
      handler.setDataChannel(mockDataChannel as RTCDataChannel)

      // Trigger onopen
      if (mockDataChannel.onopen) {
        mockDataChannel.onopen(new Event('open'))
      }

      // Should maintain order
      expect(calls).toEqual(['first', 'second', 'third'])
    })
  })

  describe('Transcript Accumulation', () => {
    it('user transcript accumulates from deltas', () => {
      const emitSpy = vi.spyOn(handler, 'emit')

      // Create user item
      handler.handleRealtimeEvent({
        type: 'conversation.item.created',
        event_id: 'evt_001',
        item: { id: 'item_user', role: 'user' }
      })

      // Send transcript deltas
      handler.handleRealtimeEvent({
        type: 'conversation.item.input_audio_transcription.delta',
        event_id: 'evt_002',
        item_id: 'item_user',
        delta: 'I want '
      })

      handler.handleRealtimeEvent({
        type: 'conversation.item.input_audio_transcription.delta',
        event_id: 'evt_003',
        item_id: 'item_user',
        delta: 'a Greek '
      })

      handler.handleRealtimeEvent({
        type: 'conversation.item.input_audio_transcription.delta',
        event_id: 'evt_004',
        item_id: 'item_user',
        delta: 'Salad'
      })

      // Check partial transcripts were emitted
      expect(emitSpy).toHaveBeenCalledWith('transcript', expect.objectContaining({
        text: 'I want ',
        isFinal: false
      }))

      expect(emitSpy).toHaveBeenCalledWith('transcript', expect.objectContaining({
        text: 'I want a Greek ',
        isFinal: false
      }))

      expect(emitSpy).toHaveBeenCalledWith('transcript', expect.objectContaining({
        text: 'I want a Greek Salad',
        isFinal: false
      }))
    })

    it('assistant transcript accumulates from deltas', () => {
      const emitSpy = vi.spyOn(handler, 'emit')

      // Create assistant item
      handler.handleRealtimeEvent({
        type: 'conversation.item.created',
        event_id: 'evt_001',
        item: { id: 'item_asst', role: 'assistant' }
      })

      // Set turn state
      handler.setTurnState('waiting_response')

      // Send transcript deltas
      handler.handleRealtimeEvent({
        type: 'response.audio_transcript.delta',
        event_id: 'evt_002',
        item_id: 'item_asst',
        delta: 'Great '
      })

      handler.handleRealtimeEvent({
        type: 'response.audio_transcript.delta',
        event_id: 'evt_003',
        item_id: 'item_asst',
        delta: 'choice!'
      })

      // Check partial responses were emitted
      expect(emitSpy).toHaveBeenCalledWith('response.text', 'Great ')
      expect(emitSpy).toHaveBeenCalledWith('response.text', 'Great choice!')
    })

    it('transcript emitted on completion', () => {
      const emitSpy = vi.spyOn(handler, 'emit')

      // Create user item
      handler.handleRealtimeEvent({
        type: 'conversation.item.created',
        event_id: 'evt_001',
        item: { id: 'item_user', role: 'user' }
      })

      // Complete transcript
      handler.handleRealtimeEvent({
        type: 'conversation.item.input_audio_transcription.completed',
        event_id: 'evt_002',
        item_id: 'item_user',
        transcript: 'I want a Greek Salad'
      })

      // Check final transcript was emitted
      expect(emitSpy).toHaveBeenCalledWith('transcript', expect.objectContaining({
        text: 'I want a Greek Salad',
        isFinal: true,
        confidence: 0.95
      }))
    })

    it('transcript map tracks by item_id', () => {
      // Create two user items
      handler.handleRealtimeEvent({
        type: 'conversation.item.created',
        event_id: 'evt_001',
        item: { id: 'item_user_1', role: 'user' }
      })

      handler.handleRealtimeEvent({
        type: 'conversation.item.created',
        event_id: 'evt_002',
        item: { id: 'item_user_2', role: 'user' }
      })

      // Add deltas to each
      handler.handleRealtimeEvent({
        type: 'conversation.item.input_audio_transcription.delta',
        event_id: 'evt_003',
        item_id: 'item_user_1',
        delta: 'First item'
      })

      handler.handleRealtimeEvent({
        type: 'conversation.item.input_audio_transcription.delta',
        event_id: 'evt_004',
        item_id: 'item_user_2',
        delta: 'Second item'
      })

      // Both should be tracked independently
      expect(handler.getCurrentEventIndex()).toBe(4)
    })

    it('transcript cleared on new turn', () => {
      const emitSpy = vi.spyOn(handler, 'emit')

      // Create and complete first turn
      handler.handleRealtimeEvent({
        type: 'conversation.item.created',
        event_id: 'evt_001',
        item: { id: 'item_1', role: 'user' }
      })

      handler.setTurnState('waiting_response')
      handler.handleRealtimeEvent({
        type: 'response.done',
        event_id: 'evt_002',
        response: { id: 'resp_1' }
      })

      expect(handler.getTurnState()).toBe('idle')
      expect(handler.getCurrentTurnId()).toBe(1)

      // Start new turn
      handler.handleRealtimeEvent({
        type: 'conversation.item.created',
        event_id: 'evt_003',
        item: { id: 'item_2', role: 'user' }
      })

      // Should not have old transcript data
      expect(handler.getCurrentEventIndex()).toBe(1) // Reset to 1 for new turn
    })
  })

  describe('Order Detection', () => {
    it('add_to_order function call emits order.detected', () => {
      const emitSpy = vi.spyOn(handler, 'emit')

      const event: RealtimeEvent = {
        type: 'response.function_call_arguments.done',
        event_id: 'evt_001',
        name: 'add_to_order',
        arguments: JSON.stringify({
          items: [
            { name: 'Greek Salad', quantity: 1 },
            { name: 'Pizza', quantity: 2 }
          ]
        })
      }

      handler.handleRealtimeEvent(event)

      expect(emitSpy).toHaveBeenCalledWith('order.detected', expect.objectContaining({
        items: [
          { name: 'Greek Salad', quantity: 1 },
          { name: 'Pizza', quantity: 2 }
        ],
        confidence: 0.95,
        timestamp: expect.any(Number)
      }))
    })

    it('confirm_order function call emits order.confirmation', () => {
      const emitSpy = vi.spyOn(handler, 'emit')

      const event: RealtimeEvent = {
        type: 'response.function_call_arguments.done',
        event_id: 'evt_001',
        name: 'confirm_order',
        arguments: JSON.stringify({
          action: 'proceed_to_checkout'
        })
      }

      handler.handleRealtimeEvent(event)

      expect(emitSpy).toHaveBeenCalledWith('order.confirmation', expect.objectContaining({
        action: 'proceed_to_checkout',
        timestamp: expect.any(Number)
      }))
    })

    it('remove_from_order function call emits order.item.removed', () => {
      const emitSpy = vi.spyOn(handler, 'emit')

      const event: RealtimeEvent = {
        type: 'response.function_call_arguments.done',
        event_id: 'evt_001',
        name: 'remove_from_order',
        arguments: JSON.stringify({
          itemName: 'Greek Salad',
          quantity: 1
        })
      }

      handler.handleRealtimeEvent(event)

      expect(emitSpy).toHaveBeenCalledWith('order.item.removed', expect.objectContaining({
        itemName: 'Greek Salad',
        quantity: 1,
        timestamp: expect.any(Number)
      }))
    })

    it('invalid function call arguments handled', () => {
      const event: RealtimeEvent = {
        type: 'response.function_call_arguments.done',
        event_id: 'evt_001',
        name: 'add_to_order',
        arguments: 'invalid json {{'
      }

      // Should not throw
      expect(() => handler.handleRealtimeEvent(event)).not.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('multiple items in single call processed', () => {
      const emitSpy = vi.spyOn(handler, 'emit')

      const event: RealtimeEvent = {
        type: 'response.function_call_arguments.done',
        event_id: 'evt_001',
        name: 'add_to_order',
        arguments: JSON.stringify({
          items: [
            { name: 'Greek Salad', quantity: 1, modifiers: ['no onions'] },
            { name: 'Pizza', quantity: 2, modifiers: ['extra cheese', 'gluten free'] },
            { name: 'Wings', quantity: 3 }
          ]
        })
      }

      handler.handleRealtimeEvent(event)

      expect(emitSpy).toHaveBeenCalledWith('order.detected', expect.objectContaining({
        items: expect.arrayContaining([
          { name: 'Greek Salad', quantity: 1, modifiers: ['no onions'] },
          { name: 'Pizza', quantity: 2, modifiers: ['extra cheese', 'gluten free'] },
          { name: 'Wings', quantity: 3 }
        ])
      }))
    })
  })

  describe('Turn State', () => {
    it('turn state transitions correctly', () => {
      expect(handler.getTurnState()).toBe('idle')

      handler.setTurnState('recording')
      expect(handler.getTurnState()).toBe('recording')

      handler.setTurnState('committing')
      expect(handler.getTurnState()).toBe('committing')

      handler.setTurnState('waiting_user_final')
      expect(handler.getTurnState()).toBe('waiting_user_final')

      handler.setTurnState('waiting_response')
      expect(handler.getTurnState()).toBe('waiting_response')

      handler.setTurnState('idle')
      expect(handler.getTurnState()).toBe('idle')
    })

    it('turn state affects event handling', () => {
      const emitSpy = vi.spyOn(handler, 'emit')

      // speech.started only emits when recording
      handler.setTurnState('idle')
      handler.handleRealtimeEvent({
        type: 'input_audio_buffer.speech_started',
        event_id: 'evt_001'
      })
      expect(emitSpy).not.toHaveBeenCalledWith('speech.started')

      // Now set to recording
      handler.setTurnState('recording')
      handler.handleRealtimeEvent({
        type: 'input_audio_buffer.speech_started',
        event_id: 'evt_002'
      })
      expect(emitSpy).toHaveBeenCalledWith('speech.started')
    })

    it('turn completion clears state', () => {
      handler.setTurnState('waiting_response')
      expect(handler.getCurrentTurnId()).toBe(0)

      handler.handleRealtimeEvent({
        type: 'response.done',
        event_id: 'evt_001',
        response: { id: 'resp_1' }
      })

      expect(handler.getTurnState()).toBe('idle')
      expect(handler.getCurrentTurnId()).toBe(1)
      expect(handler.getCurrentEventIndex()).toBe(0)
    })
  })

  describe('Data Channel Management', () => {
    it('setDataChannel configures data channel handlers', () => {
      handler.setDataChannel(mockDataChannel as RTCDataChannel)

      expect(mockDataChannel.onopen).toBeDefined()
      // Note: onmessage intentionally not set - handled by WebRTCConnection to prevent race condition
      expect(mockDataChannel.onerror).toBeDefined()
      expect(mockDataChannel.onclose).toBeDefined()
    })

    it('data channel onopen flushes queue', () => {
      // Queue a message
      handler.sendEvent({ type: 'test' })

      // Set up data channel
      mockDataChannel.readyState = 'open'
      handler.setDataChannel(mockDataChannel as RTCDataChannel)

      // Trigger onopen
      if (mockDataChannel.onopen) {
        mockDataChannel.onopen(new Event('open'))
      }

      expect(mockDataChannel.send).toHaveBeenCalledWith(JSON.stringify({ type: 'test' }))
      expect(handler.isDataChannelReady()).toBe(true)
    })

    it('handleRawMessage processes events', () => {
      const emitSpy = vi.spyOn(handler, 'emit')
      handler.setDataChannel(mockDataChannel as RTCDataChannel)

      const event = {
        type: 'session.created',
        event_id: 'evt_001',
        session: { id: 'sess_123' }
      }

      // Use handleRawMessage directly (WebRTCConnection calls this method)
      handler.handleRawMessage(JSON.stringify(event))

      expect(emitSpy).toHaveBeenCalledWith('session.created', event.session)
    })

    it('data channel onerror emits error event', () => {
      const emitSpy = vi.spyOn(handler, 'emit')

      handler.setDataChannel(mockDataChannel as RTCDataChannel)

      // Trigger onerror
      if (mockDataChannel.onerror) {
        const error = new Error('Data channel error')
        mockDataChannel.onerror(new ErrorEvent('error', { error }))
      }

      expect(logger.error).toHaveBeenCalled()
      expect(emitSpy).toHaveBeenCalledWith('error', expect.any(ErrorEvent))
    })

    it('data channel onclose marks channel as not ready', () => {
      handler.setDataChannel(mockDataChannel as RTCDataChannel)

      // Open the channel first
      if (mockDataChannel.onopen) {
        mockDataChannel.readyState = 'open'
        mockDataChannel.onopen(new Event('open'))
      }

      expect(handler.isDataChannelReady()).toBe(true)

      // Close the channel
      if (mockDataChannel.onclose) {
        mockDataChannel.readyState = 'closed'
        mockDataChannel.onclose(new Event('close'))
      }

      expect(handler.isDataChannelReady()).toBe(false)
    })
  })

  describe('Queue Management', () => {
    it('flushMessageQueue sends all queued messages', () => {
      handler.sendEvent({ type: 'first' })
      handler.sendEvent({ type: 'second' })
      handler.sendEvent({ type: 'third' })

      mockDataChannel.readyState = 'open'
      handler.setDataChannel(mockDataChannel as RTCDataChannel)

      // Manually mark as ready
      if (mockDataChannel.onopen) {
        mockDataChannel.onopen(new Event('open'))
      }

      handler.flushMessageQueue()

      expect(mockDataChannel.send).toHaveBeenCalledTimes(3)
    })

    it('clearMessageQueue empties the queue', () => {
      handler.sendEvent({ type: 'first' })
      handler.sendEvent({ type: 'second' })

      handler.clearMessageQueue()

      // Set up data channel
      mockDataChannel.readyState = 'open'
      handler.setDataChannel(mockDataChannel as RTCDataChannel)

      if (mockDataChannel.onopen) {
        mockDataChannel.onopen(new Event('open'))
      }

      // Should not send any messages
      expect(mockDataChannel.send).not.toHaveBeenCalled()
    })

    it('sendEvent queues when data channel closed', () => {
      mockDataChannel.readyState = 'closed'
      handler.setDataChannel(mockDataChannel as RTCDataChannel)

      handler.sendEvent({ type: 'test' })

      expect(mockDataChannel.send).not.toHaveBeenCalled()
    })

    it('sendEvent sends immediately when data channel open', () => {
      mockDataChannel.readyState = 'open'
      handler.setDataChannel(mockDataChannel as RTCDataChannel)

      if (mockDataChannel.onopen) {
        mockDataChannel.onopen(new Event('open'))
      }

      handler.sendEvent({ type: 'test' })

      expect(mockDataChannel.send).toHaveBeenCalledWith(JSON.stringify({ type: 'test' }))
    })
  })

  describe('State Management', () => {
    it('getCurrentTurnId returns current turn', () => {
      expect(handler.getCurrentTurnId()).toBe(0)

      handler.setTurnState('waiting_response')
      handler.handleRealtimeEvent({
        type: 'response.done',
        event_id: 'evt_001',
        response: { id: 'resp_1' }
      })

      expect(handler.getCurrentTurnId()).toBe(1)
    })

    it('getCurrentEventIndex tracks events correctly', () => {
      expect(handler.getCurrentEventIndex()).toBe(0)

      handler.handleRealtimeEvent({ type: 'session.created', event_id: 'evt_001' })
      expect(handler.getCurrentEventIndex()).toBe(1)

      handler.handleRealtimeEvent({ type: 'session.updated', event_id: 'evt_002' })
      expect(handler.getCurrentEventIndex()).toBe(2)
    })

    it('reset clears all state', () => {
      // Set up some state
      handler.setTurnState('recording')
      handler.sendEvent({ type: 'test' })
      handler.handleRealtimeEvent({ type: 'session.created', event_id: 'evt_001' })

      // Reset
      handler.reset()

      expect(handler.getTurnState()).toBe('idle')
      expect(handler.getCurrentTurnId()).toBe(0)
      expect(handler.getCurrentEventIndex()).toBe(0)
      expect(handler.isDataChannelReady()).toBe(false)
    })

    it('isDataChannelReady reflects channel state', () => {
      expect(handler.isDataChannelReady()).toBe(false)

      mockDataChannel.readyState = 'open'
      handler.setDataChannel(mockDataChannel as RTCDataChannel)

      if (mockDataChannel.onopen) {
        mockDataChannel.onopen(new Event('open'))
      }

      expect(handler.isDataChannelReady()).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('handles rate_limit_exceeded error', () => {
      const emitSpy = vi.spyOn(handler, 'emit')

      handler.handleRealtimeEvent({
        type: 'error',
        event_id: 'evt_001',
        error: {
          code: 'rate_limit_exceeded',
          message: 'Rate limit exceeded'
        }
      })

      expect(emitSpy).toHaveBeenCalledWith('error', expect.any(Error))
      expect(emitSpy).toHaveBeenCalledWith('rate_limit_error')
      expect(logger.warn).toHaveBeenCalled()
    })

    it('handles session_expired error', () => {
      const emitSpy = vi.spyOn(handler, 'emit')

      handler.handleRealtimeEvent({
        type: 'error',
        event_id: 'evt_001',
        error: {
          code: 'session_expired',
          message: 'Session expired'
        }
      })

      expect(emitSpy).toHaveBeenCalledWith('error', expect.any(Error))
      expect(emitSpy).toHaveBeenCalledWith('session_expired')
      expect(logger.warn).toHaveBeenCalled()
    })

    it('handles invalid JSON in handleRawMessage', () => {
      handler.setDataChannel(mockDataChannel as RTCDataChannel)

      // Use handleRawMessage with invalid JSON
      handler.handleRawMessage('invalid json {{')

      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('Integration Tests', () => {
    it('handles complete conversation flow', () => {
      const emitSpy = vi.spyOn(handler, 'emit')

      // Session created
      handler.handleRealtimeEvent({
        type: 'session.created',
        event_id: 'evt_001',
        session: { id: 'sess_123' }
      })

      // User speaks
      handler.setTurnState('recording')
      handler.handleRealtimeEvent({
        type: 'input_audio_buffer.speech_started',
        event_id: 'evt_002'
      })

      // User item created
      handler.handleRealtimeEvent({
        type: 'conversation.item.created',
        event_id: 'evt_003',
        item: { id: 'item_user', role: 'user' }
      })

      // Transcript delta
      handler.handleRealtimeEvent({
        type: 'conversation.item.input_audio_transcription.delta',
        event_id: 'evt_004',
        item_id: 'item_user',
        delta: 'I want pizza'
      })

      // Transcript completed
      handler.setTurnState('waiting_user_final')
      handler.handleRealtimeEvent({
        type: 'conversation.item.input_audio_transcription.completed',
        event_id: 'evt_005',
        item_id: 'item_user',
        transcript: 'I want pizza'
      })

      // Response created
      handler.handleRealtimeEvent({
        type: 'response.created',
        event_id: 'evt_006',
        response: { id: 'resp_123', output: [{ id: 'item_asst' }] }
      })

      // Function call
      handler.handleRealtimeEvent({
        type: 'response.function_call_arguments.done',
        event_id: 'evt_007',
        name: 'add_to_order',
        arguments: JSON.stringify({
          items: [{ name: 'Pizza', quantity: 1 }]
        })
      })

      // Response done
      handler.handleRealtimeEvent({
        type: 'response.done',
        event_id: 'evt_008',
        response: { id: 'resp_123' }
      })

      // Verify key emissions
      expect(emitSpy).toHaveBeenCalledWith('session.created', expect.anything())
      expect(emitSpy).toHaveBeenCalledWith('speech.started')
      expect(emitSpy).toHaveBeenCalledWith('transcript', expect.objectContaining({
        text: 'I want pizza',
        isFinal: true
      }))
      expect(emitSpy).toHaveBeenCalledWith('order.detected', expect.objectContaining({
        items: [{ name: 'Pizza', quantity: 1 }]
      }))
      expect(emitSpy).toHaveBeenCalledWith('response.complete', expect.anything())

      // State should be reset
      expect(handler.getTurnState()).toBe('idle')
      expect(handler.getCurrentTurnId()).toBe(1)
    })
  })
})
