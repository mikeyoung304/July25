export interface Table {
  id: string;
  restaurant_id: string;
  label: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  position?: {
    x: number;
    y: number;
  };
  current_order_id?: string;
  created_at: string;
  updated_at: string;
}
