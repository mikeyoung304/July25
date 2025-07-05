import { createClient } from '@supabase/supabase-js'

// These should be stored in environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

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

export interface DatabaseTable {
  id: string
  number: string
  restaurant_id: string
  seats: number
  status: string
  current_order_id?: string
}

// Real-time subscription helpers
export const subscribeToOrders = (
  restaurantId: string,
  callback: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE'
    new: DatabaseOrder | null
    old: DatabaseOrder | null
  }) => void
) => {
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
      callback
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
      callback
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