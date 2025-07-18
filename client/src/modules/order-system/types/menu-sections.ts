export interface MenuSection {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  items: string[]; // Array of menu item IDs
}

export const menuSections: MenuSection[] = [
  {
    id: 'popular',
    title: 'Popular Items',
    description: 'Customer favorites',
    icon: '⭐',
    items: ['salad-5', 'bowl-1', 'start-2', 'sand-1'] // Mom's Chicken Salad, Soul Bowl, Jalapeño Pimento Bites, Chicken Salad Sandwich
  },
  {
    id: 'lunch-combos',
    title: 'Lunch Combos',
    description: 'Complete meals with sides',
    icon: '🍱',
    items: ['entree-1', 'entree-2', 'entree-3', 'entree-4']
  },
  {
    id: 'fresh-bowls',
    title: 'Fresh Bowls',
    description: 'Hearty and healthy bowl meals',
    icon: '🍲',
    items: ['bowl-1', 'bowl-2', 'bowl-3', 'vegan-1']
  },
  {
    id: 'garden-fresh-salads',
    title: 'Garden Fresh Salads',
    description: 'Made with local, organic greens',
    icon: '🥗',
    items: ['salad-1', 'salad-2', 'salad-3', 'salad-4', 'salad-5', 'salad-6']
  },
  {
    id: 'sandwiches-wraps',
    title: 'Sandwiches',
    description: 'Served with a side and house pickle',
    icon: '🥪',
    items: ['sand-1', 'sand-2', 'sand-3', 'sand-4', 'sand-5']
  },
  {
    id: 'small-plates',
    title: 'Small Plates & Starters',
    description: 'Perfect for sharing',
    icon: '🍽️',
    items: ['start-1', 'start-2', 'start-3', 'start-4', 'start-5']
  },
  {
    id: 'plant-based',
    title: 'Plant-Based',
    description: '100% vegan options',
    icon: '🌱',
    items: ['vegan-1', 'vegan-2']
  },
  {
    id: 'beverages',
    title: 'Beverages',
    description: 'Refreshing drinks',
    icon: '🥤',
    items: ['bev-1', 'bev-2', 'bev-3']
  }
];

export const getDaypartSection = (): string => {
  const hour = new Date().getHours();
  if (hour < 11) return 'small-plates'; // Before lunch
  if (hour < 14) return 'lunch-combos'; // Lunch time
  return 'fresh-bowls'; // After lunch
};