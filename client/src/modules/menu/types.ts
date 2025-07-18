// Re-export MenuItem and related types from services
export type { MenuItem } from '@/services/types';

// Also re-export Modifier type for convenience
export interface Modifier {
  id: string;
  name: string;
  price: number;
}