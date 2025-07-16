import { MenuItem } from '@/services/types';

export interface OrderModification {
  id: string;
  name: string;
  price?: number;
}

export interface VoiceOrderItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  modifications: OrderModification[];
  specialInstructions?: string;
  subtotal: number;
}

export interface VoiceOrderContextType {
  items: VoiceOrderItem[];
  addItem: (item: MenuItem, quantity?: number, mods?: OrderModification[]) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateModifications: (id: string, mods: OrderModification[]) => void;
  clear: () => void;
  total: number;
  itemCount: number;
}