import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env-validator'
import type { DatabaseTable } from 'shared/types'

// Environment variables are validated at app startup
// If we reach this point, we know they exist and are valid
const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for database tables (simplified for now)
export interface DatabaseOrder {
  id: string
  order_number: string
  table_id: string
  restaurant_id: string
  items: Array<{
    id: string
    name: string
    quantity: number
    price: number
    modifiers?: string[]
  }>
  status: string
  created_at: string
  updated_at: string
  total_amount: number
  payment_status: string
  notes?: string
}

// Re-export DatabaseTable from shared types for backward compatibility
export type { DatabaseTable }

// Real-time subscription helpers
export const subscribeToOrders = (
  restaurantId: string,
  callback: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE'
    new: DatabaseOrder | null
    old: DatabaseOrder | null
  }) => void
) => {
  if (!supabase) {
    console.warn('Supabase client not initialized. Cannot subscribe to orders.')
    return () => {} // Return no-op unsubscribe function
  }

  const subscription = supabase
    .channel(`orders:${restaurantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      callback as () => void
    )
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}

export const subscribeToTableUpdates = (
  restaurantId: string,
  callback: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE'
    new: DatabaseTable | null
    old: DatabaseTable | null
  }) => void
) => {
  if (!supabase) {
    console.warn('Supabase client not initialized. Cannot subscribe to table updates.')
    return () => {} // Return no-op unsubscribe function
  }

  const subscription = supabase
    .channel(`tables:${restaurantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tables',
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      callback as () => void
    )
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}

// Order operations
export const orderOperations = {
  // Fetch all orders for a restaurant
  async getOrders(restaurantId: string, filters?: { status?: string }) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    let query = supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  // Update order status
  async updateOrderStatus(orderId: string, status: string) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Create new order
  async createOrder(orderData: Partial<DatabaseOrder>) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Table operations
export const tableOperations = {
  // Fetch all tables for a restaurant
  async getTables(restaurantId: string) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('number', { ascending: true })

    if (error) throw error
    return data
  },

  // Update table status
  async updateTableStatus(tableId: string, status: string) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase
      .from('tables')
      .update({ status })
      .eq('id', tableId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}