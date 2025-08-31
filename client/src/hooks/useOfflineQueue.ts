import { useState, useEffect, useCallback, useRef } from 'react'
import type { Order } from '@rebuild/shared'

interface QueuedAction {
  id: string
  orderId: string
  status: Order['status']
  timestamp: number
  retryCount: number
}

interface UseOfflineQueueReturn {
  queuedActions: QueuedAction[]
  addToQueue: (orderId: string, status: Order['status']) => string
  removeFromQueue: (actionId: string) => void
  processQueue: () => Promise<void>
  clearQueue: () => void
  isProcessingQueue: boolean
}

const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_BASE = 1000 // 1 second base delay

export const useOfflineQueue = (
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<boolean>
): UseOfflineQueueReturn => {
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([])
  const [isProcessingQueue, setIsProcessingQueue] = useState(false)
  const processingRef = useRef(false)

  // Load queue from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem('kitchen_offline_queue')
    if (savedQueue) {
      try {
        const parsed = JSON.parse(savedQueue)
        setQueuedActions(parsed)
      } catch (error) {
        console.error('Failed to load offline queue from localStorage:', error)
        localStorage.removeItem('kitchen_offline_queue')
      }
    }
  }, [])

  // Save queue to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('kitchen_offline_queue', JSON.stringify(queuedActions))
  }, [queuedActions])

  // Add action to queue
  const addToQueue = useCallback((orderId: string, status: Order['status']): string => {
    const actionId = `${orderId}_${status}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const newAction: QueuedAction = {
      id: actionId,
      orderId,
      status,
      timestamp: Date.now(),
      retryCount: 0
    }

    setQueuedActions(prev => {
      // Remove any existing actions for the same order to prevent conflicts
      const filtered = prev.filter(action => action.orderId !== orderId)
      return [...filtered, newAction]
    })

    return actionId
  }, [])

  // Remove action from queue
  const removeFromQueue = useCallback((actionId: string) => {
    setQueuedActions(prev => prev.filter(action => action.id !== actionId))
  }, [])

  // Clear entire queue
  const clearQueue = useCallback(() => {
    setQueuedActions([])
    localStorage.removeItem('kitchen_offline_queue')
  }, [])

  // Process all actions in the queue
  const processQueue = useCallback(async () => {
    if (processingRef.current || queuedActions.length === 0) {
      return
    }

    processingRef.current = true
    setIsProcessingQueue(true)

    // Processing offline queue

    const actionsToProcess = [...queuedActions].sort((a, b) => a.timestamp - b.timestamp)
    const processedActions: string[] = []
    const failedActions: QueuedAction[] = []

    for (const action of actionsToProcess) {
      try {
        // Processing queued action
        
        const success = await updateOrderStatus(action.orderId, action.status)
        
        if (success) {
          // Action processed successfully
          processedActions.push(action.id)
        } else {
          // Action failed to process
          
          if (action.retryCount < MAX_RETRY_ATTEMPTS) {
            failedActions.push({
              ...action,
              retryCount: action.retryCount + 1
            })
          } else {
            console.warn(`⚠️ Dropping action after ${MAX_RETRY_ATTEMPTS} attempts:`, action)
            processedActions.push(action.id) // Remove from queue
          }
        }
      } catch (error) {
        console.error(`💥 Error processing queued action:`, action, error)
        
        if (action.retryCount < MAX_RETRY_ATTEMPTS) {
          // Add delay for retry with exponential backoff
          const delay = RETRY_DELAY_BASE * Math.pow(2, action.retryCount)
          setTimeout(() => {
            failedActions.push({
              ...action,
              retryCount: action.retryCount + 1
            })
          }, delay)
        } else {
          processedActions.push(action.id) // Remove from queue after max retries
        }
      }
    }

    // Update queue state
    setQueuedActions(prev => {
      const remaining = prev.filter(action => !processedActions.includes(action.id))
      return [...remaining, ...failedActions]
    })

    processingRef.current = false
    setIsProcessingQueue(false)

    if (processedActions.length > 0) {
      // Processed queued actions successfully
    }
    
    if (failedActions.length > 0) {
      // Some actions will be retried
    }
  }, [queuedActions, updateOrderStatus])

  // Auto-process queue when coming back online
  useEffect(() => {
    const handleOnline = () => {
      if (queuedActions.length > 0) {
        // Back online, processing queued actions
        setTimeout(processQueue, 1000) // Small delay to ensure connection is stable
      }
    }

    window.addEventListener('online', handleOnline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [queuedActions.length, processQueue])

  // Auto-process queue when it receives new items (if online)
  useEffect(() => {
    if (navigator.onLine && queuedActions.length > 0 && !isProcessingQueue) {
      const timer = setTimeout(processQueue, 500) // Small delay to batch multiple additions
      return () => clearTimeout(timer)
    }
  }, [queuedActions.length, isProcessingQueue, processQueue])

  return {
    queuedActions,
    addToQueue,
    removeFromQueue,
    processQueue,
    clearQueue,
    isProcessingQueue
  }
}