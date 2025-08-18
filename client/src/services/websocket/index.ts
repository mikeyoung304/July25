/**
 * WebSocket Service Exports
 * Central export point for all WebSocket-related functionality
 * v2 - Fixed order handler payload handling
 */

export { webSocketService, WebSocketService, type WebSocketMessage, type ConnectionState } from './WebSocketService'
export { orderUpdatesHandler, OrderUpdatesHandler, type OrderUpdatePayload } from './orderUpdates'

// Import the singletons for convenience methods
import { webSocketService } from './WebSocketService'
import { orderUpdatesHandler } from './orderUpdates'

// Re-export convenience methods
export const connectWebSocket = () => webSocketService.connect()
export const disconnectWebSocket = () => webSocketService.disconnect()
export const initializeOrderUpdates = () => orderUpdatesHandler.initialize()
export const cleanupOrderUpdates = () => orderUpdatesHandler.cleanup()