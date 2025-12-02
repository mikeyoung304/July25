import { logger } from '../../../utils/logger'

export interface QueuedMessage {
  type: string
  data: unknown
  timestamp: number
}

export class MessageQueue {
  private queue: QueuedMessage[] = []
  private isProcessing = false
  private readonly processor: (message: QueuedMessage) => Promise<void>

  constructor(processor: (message: QueuedMessage) => Promise<void>) {
    this.processor = processor
  }

  public enqueue(type: string, data: unknown): void {
    this.queue.push({
      type,
      data,
      timestamp: Date.now(),
    })

    logger.debug('Message enqueued', {
      type,
      queueLength: this.queue.length,
    })

    if (!this.isProcessing) {
      void this.processQueue()
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return
    }

    this.isProcessing = true

    try {
      while (this.queue.length > 0) {
        const message = this.queue.shift()
        if (message) {
          await this.processor(message)
        }
      }
    } catch (error) {
      logger.error('Error processing message queue', { error })
    } finally {
      this.isProcessing = false
    }
  }

  public clear(): void {
    this.queue = []
    this.isProcessing = false
    logger.debug('Message queue cleared')
  }

  public getQueueLength(): number {
    return this.queue.length
  }

  public isProcessingMessages(): boolean {
    return this.isProcessing
  }
}
