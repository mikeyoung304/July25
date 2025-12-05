import { OrderStatus } from '@rebuild/shared/types'

export interface OrderFilterState {
  status?: OrderStatus | 'all'
  tableNumber?: string
  dateRange?: {
    start: Date
    end: Date
  }
  searchQuery?: string
}

export interface FilterOption<T = string> {
  value: T
  label: string
  count?: number
}

export interface FilterConfig {
  id: string
  label: string
  type: 'select' | 'search' | 'date-range' | 'multi-select'
  options?: FilterOption[]
  placeholder?: string
}