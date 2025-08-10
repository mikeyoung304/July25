// Re-export all types directly from shared module
// No more compatibility layer - use shared types directly

export type {
  Order,
  OrderItem,
  OrderItemModifier,
  OrderStatus,
  OrderType,
  PaymentStatus,
  PaymentMethod,
  CreateOrderDTO,
  UpdateOrderDTO,
  OrderFilters,
  MenuItem,
  MenuCategory,
  MenuItemModifierOption,
  MenuItemModifierGroup,
  CreateMenuItemDTO,
  UpdateMenuItemDTO,
  Table,
  TableStatus,
  CreateTableDTO,
  UpdateTableDTO,
  Customer,
  CustomerAddress,
  CreateCustomerDTO,
  UpdateCustomerDTO,
  Restaurant,
  RestaurantSettings,
  CreateRestaurantDTO,
  UpdateRestaurantDTO,
  WebSocketMessage,
  WebSocketEventType,
  OrderCreatedEvent,
  OrderUpdatedEvent,
  OrderStatusChangedEvent,
  TableStatusChangedEvent,
  VoiceStreamData,
  VoiceTranscriptionResult,
  PaginationParams,
  PaginatedResponse,
  ApiResponse,
  ApiError
} from '@rebuild/shared'

// Local-only types (if any) that don't exist in shared
export interface DateRangeParams {
  startDate?: Date
  endDate?: Date
}

export interface OrderHistoryParams extends PaginationParams, DateRangeParams {
  searchQuery?: string
}

export interface OrderStatistics {
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  totalRevenue: number
  averageOrderValue: number
  averagePreparationTime: number
  ordersByHour: Array<{
    hour: number
    count: number
  }>
}