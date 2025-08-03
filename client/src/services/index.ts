// Direct service exports - no factory pattern needed
export { orderService } from './orders/OrderService'
export { orderHistoryService } from './orders/OrderHistoryService'
export { tableService } from './tables/TableService'
export { menuService } from './menu/MenuService'
export { orderStatisticsService } from './statistics/OrderStatisticsService'

// Audio service export
export { getAudioPlaybackService } from './audio/AudioPlaybackService'

// Export types
export type { IOrderService } from './orders/OrderService'
export type { IOrderHistoryService } from './orders/OrderHistoryService'
export type { ITableService } from './tables/TableService'
export type { IMenuService } from './menu/MenuService'
export type { IOrderStatisticsService } from './statistics/OrderStatisticsService'
export type { AudioPlaybackState, AudioQueueItem } from './audio/AudioPlaybackService'