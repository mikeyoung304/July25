export interface MenuSection {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  items: string[]; // Array of menu item IDs
}

export const menuSections: MenuSection[] = [
  {
    id: 'starters',
    title: 'STARTERS',
    description: 'Perfect for sharing or starting your meal',
    items: ['201', '202', '203', '204', '205']
  },
  {
    id: 'nachos',
    title: 'NACHOS',
    description: 'Loaded with fresh ingredients',
    items: []
  },
  {
    id: 'salads',
    title: 'SALADS',
    description: 'Fresh, healthy options packed with flavor',
    items: ['301', '302', '303', '304', '305', '306']
  },
  {
    id: 'sandwiches',
    title: 'SANDWICHES',
    description: 'Served with choice of side and pickle',
    items: ['401', '402', '403', '404', '405']
  },
  {
    id: 'bowls',
    title: 'BOWLS',
    description: 'Hearty and satisfying bowls',
    items: ['501', '502', '503']
  },
  {
    id: 'vegan',
    title: 'VEGAN',
    description: 'Plant-based selections',
    items: ['601', '602']
  },
  {
    id: 'entrees',
    title: 'ENTREES',
    description: 'Served with 2 sides and cornbread',
    items: ['701', '702', '703', '704']
  },
  {
    id: 'fresh-sides',
    title: 'FRESH SIDES',
    description: 'Perfect accompaniments to any meal',
    items: []
  },
  {
    id: 'beverages',
    title: 'Beverages',
    description: 'Refreshing drinks',
    items: ['101', '102', '103']
  }
];

export const getDaypartSection = (): string => {
  const hour = new Date().getHours();
  if (hour < 11) return 'starters'; // Before lunch
  if (hour < 14) return 'sandwiches'; // Lunch time
  return 'bowls'; // After lunch
};