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
    items: ['305', '501', '202', '401'] // Mom's Chicken Salad, Soul Bowl, Jalapeño Pimento Bites, Chicken Salad Sandwich
  },
  {
    id: 'lunch-combos',
    title: 'Lunch Combos',
    description: 'Complete meals with sides',
    icon: '🍱',
    items: ['701', '702', '703', '704']
  },
  {
    id: 'fresh-bowls',
    title: 'Fresh Bowls',
    description: 'Hearty and healthy bowl meals',
    icon: '🍲',
    items: ['501', '502', '503', '601']
  },
  {
    id: 'garden-fresh-salads',
    title: 'Garden Fresh Salads',
    description: 'Made with local, organic greens',
    icon: '🥗',
    items: ['301', '302', '303', '304', '305', '306']
  },
  {
    id: 'sandwiches-wraps',
    title: 'Sandwiches',
    description: 'Served with a side and house pickle',
    icon: '🥪',
    items: ['401', '402', '403', '404', '405']
  },
  {
    id: 'small-plates',
    title: 'Small Plates & Starters',
    description: 'Perfect for sharing',
    icon: '🍽️',
    items: ['201', '202', '203', '204', '205']
  },
  {
    id: 'plant-based',
    title: 'Plant-Based',
    description: '100% vegan options',
    icon: '🌱',
    items: ['601', '602']
  },
  {
    id: 'beverages',
    title: 'Beverages',
    description: 'Refreshing drinks',
    icon: '🥤',
    items: ['101', '102', '103']
  }
];

export const getDaypartSection = (): string => {
  const hour = new Date().getHours();
  if (hour < 11) return 'small-plates'; // Before lunch
  if (hour < 14) return 'lunch-combos'; // Lunch time
  return 'fresh-bowls'; // After lunch
};