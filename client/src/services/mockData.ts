// Centralized mock data storage
import { MenuItem as ApiMenuItem } from '@rebuild/shared/api-types'
import { ClientOrder, ClientTable } from '@rebuild/shared/types/transformers'

export const mockData = {
  orders: [
    {
      id: '1',
      restaurantId: 'rest-1',
      orderNumber: '001',
      tableNumber: '5',
      items: [
        { id: '1', menuItemId: '1', quantity: 2, unitPrice: 14.99, subtotal: 29.98, modifiers: [{id: 'm1', name: 'Extra collards', price: 2}, {id: 'm2', name: 'No pico', price: 0}] },
        { id: '2', menuItemId: '2', quantity: 1, unitPrice: 7.99, subtotal: 7.99, modifiers: [{id: 'm3', name: 'Ranch dressing', price: 0}] },
        { id: '3', menuItemId: '3', quantity: 1, unitPrice: 4.99, subtotal: 4.99, specialInstructions: 'Customer allergic to nuts' }
      ],
      status: 'new' as const,
      orderTime: new Date(Date.now() - 2 * 60000), // 2 minutes ago
      createdAt: new Date(Date.now() - 2 * 60000),
      updatedAt: new Date(Date.now() - 2 * 60000),
      subtotal: 28.50,
      tax: 2.50,
      totalAmount: 32.50,
      paymentStatus: 'pending' as const,
      type: 'dine-in' as const
    },
    {
      id: '2',
      restaurantId: 'rest-1',
      orderNumber: '002',
      tableNumber: 'DT-1',
      items: [
        { id: '4', menuItemId: '4', quantity: 1, unitPrice: 12.99, subtotal: 12.99, modifiers: [{id: 'm4', name: 'Extra jam', price: 0}, {id: 'm5', name: 'Side salad', price: 2}] },
        { id: '5', menuItemId: '5', quantity: 2, unitPrice: 2.99, subtotal: 5.98 }
      ],
      status: 'preparing' as const,
      orderTime: new Date(Date.now() - 8 * 60000), // 8 minutes ago
      createdAt: new Date(Date.now() - 8 * 60000),
      updatedAt: new Date(Date.now() - 8 * 60000),
      subtotal: 17.00,
      tax: 1.50,
      totalAmount: 18.50,
      paymentStatus: 'completed' as const,
      type: 'drive-thru' as const,
      notes: 'Customer waiting in car'
    },
    {
      id: '3',
      restaurantId: 'rest-1',
      orderNumber: '003',
      tableNumber: '7',
      items: [
        { id: '6', menuItemId: '2', quantity: 1, unitPrice: 13.99, subtotal: 13.99, modifiers: [{id: 'm6', name: 'Black rice', price: 0}, {id: 'm7', name: 'Extra broccoli', price: 1}] },
        { id: '7', menuItemId: '7', quantity: 1, unitPrice: 3.99, subtotal: 3.99 },
        { id: '8', menuItemId: '8', quantity: 2, unitPrice: 2.99, subtotal: 5.98 }
      ],
      status: 'new' as const,
      orderTime: new Date(Date.now() - 1 * 60000), // 1 minute ago
      createdAt: new Date(Date.now() - 1 * 60000),
      updatedAt: new Date(Date.now() - 1 * 60000),
      subtotal: 26.50,
      tax: 2.25,
      totalAmount: 28.75,
      paymentStatus: 'pending' as const,
      type: 'dine-in' as const
    },
    {
      id: '4',
      restaurantId: 'rest-1',
      orderNumber: '004',
      tableNumber: 'DT-2',
      items: [
        { id: '9', menuItemId: '3', quantity: 2, unitPrice: 13.99, subtotal: 27.98, modifiers: [{id: 'm8', name: 'Yellow rice', price: 0}, {id: 'm9', name: 'Extra pineapple salsa', price: 1}] },
        { id: '10', menuItemId: '10', quantity: 1, unitPrice: 3.99, subtotal: 3.99 },
        { id: '11', menuItemId: '11', quantity: 2, unitPrice: 2.99, subtotal: 5.98 }
      ],
      status: 'ready' as const,
      orderTime: new Date(Date.now() - 15 * 60000), // 15 minutes ago
      createdAt: new Date(Date.now() - 15 * 60000),
      updatedAt: new Date(Date.now() - 15 * 60000),
      subtotal: 31.50,
      tax: 3.00,
      totalAmount: 34.50,
      paymentStatus: 'completed' as const,
      type: 'drive-thru' as const
    },
    {
      id: '5',
      restaurantId: 'rest-1',
      orderNumber: '005',
      tableNumber: '9',
      items: [
        { id: '12', menuItemId: '12', quantity: 1, unitPrice: 11.99, subtotal: 11.99, modifiers: [{id: 'm10', name: 'Extra pecans', price: 2}, {id: 'm11', name: 'No grapes', price: 0}], specialInstructions: 'Birthday celebration' },
        { id: '13', menuItemId: '13', quantity: 1, unitPrice: 3.99, subtotal: 3.99 },
        { id: '14', menuItemId: '14', quantity: 1, unitPrice: 4.99, subtotal: 4.99 }
      ],
      status: 'preparing' as const,
      orderTime: new Date(Date.now() - 10 * 60000), // 10 minutes ago
      createdAt: new Date(Date.now() - 10 * 60000),
      updatedAt: new Date(Date.now() - 10 * 60000),
      subtotal: 48.99,
      tax: 4.00,
      totalAmount: 52.99,
      paymentStatus: 'completed' as const,
      type: 'dine-in' as const
    },
    {
      id: '6',
      restaurantId: 'rest-1',
      orderNumber: '006',
      tableNumber: 'DT-3',
      items: [
        { id: '15', menuItemId: '15', quantity: 3, unitPrice: 9.99, subtotal: 29.97, modifiers: [{id: 'm12', name: 'No cranberries', price: 0}] },
        { id: '16', menuItemId: '16', quantity: 1, unitPrice: 5.99, subtotal: 5.99 },
        { id: '17', menuItemId: '17', quantity: 2, unitPrice: 3.99, subtotal: 7.98 }
      ],
      status: 'new' as const,
      orderTime: new Date(Date.now() - 3 * 60000), // 3 minutes ago
      createdAt: new Date(Date.now() - 3 * 60000),
      updatedAt: new Date(Date.now() - 3 * 60000),
      subtotal: 35.25,
      tax: 3.00,
      totalAmount: 38.25,
      paymentStatus: 'completed' as const,
      type: 'drive-thru' as const,
      notes: 'No ice in drinks'
    }
  ] as ClientOrder[],

  tables: [
    { id: '1', restaurantId: 'rest-1', tableNumber: '1', type: 'square' as const, x: 100, y: 100, width: 80, height: 80, capacity: 2, seats: 2, label: '1', rotation: 0, status: 'available' as const, zIndex: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: '2', restaurantId: 'rest-1', tableNumber: '2', type: 'square' as const, x: 200, y: 100, width: 80, height: 80, capacity: 4, seats: 4, label: '2', rotation: 0, status: 'occupied' as const, zIndex: 1, currentOrderId: '1', createdAt: new Date(), updatedAt: new Date() },
    { id: '3', restaurantId: 'rest-1', tableNumber: '3', type: 'rectangle' as const, x: 300, y: 100, width: 120, height: 80, capacity: 6, seats: 6, label: '3', rotation: 0, status: 'available' as const, zIndex: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: '4', restaurantId: 'rest-1', tableNumber: '4', type: 'square' as const, x: 100, y: 200, width: 80, height: 80, capacity: 4, seats: 4, label: '4', rotation: 0, status: 'reserved' as const, zIndex: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: '5', restaurantId: 'rest-1', tableNumber: '5', type: 'circle' as const, x: 200, y: 200, width: 80, height: 80, capacity: 2, seats: 2, label: '5', rotation: 0, status: 'occupied' as const, zIndex: 1, currentOrderId: '2', createdAt: new Date(), updatedAt: new Date() },
  ] as ClientTable[],

  menuItems: [
    {
      id: '1',
      restaurantId: 'rest-1',
      name: 'Georgia Soul Bowl',
      description: 'Smoked sausage, field peas, collards, yellow rice, pico de gallo',
      price: 14.99,
      categoryId: 'cat-1',
      isAvailable: true,
      modifiers: [
        { id: 'm1', name: 'Extra collards', price: 2.00 },
        { id: 'm2', name: 'No pico', price: 0 },
        { id: 'm3', name: 'Black rice', price: 0 }
      ]
    },
    {
      id: '2',
      restaurantId: 'rest-1',
      name: 'Teriyaki Chicken Bowl',
      description: 'Chicken breast, sauteed vegetables, steamed broccoli, pineapple salsa, rice',
      price: 13.99,
      categoryId: 'cat-1',
      isAvailable: true,
      modifiers: [
        { id: 'm4', name: 'Black rice', price: 0 },
        { id: 'm5', name: 'Yellow rice', price: 0 },
        { id: 'm6', name: 'Extra broccoli', price: 1.50 }
      ]
    },
    {
      id: '3',
      restaurantId: 'rest-1',
      name: 'Jerk Chicken Bowl',
      description: 'Jerk chicken breast, cabbage, black beans, pineapple salsa, rice',
      price: 13.99,
      categoryId: 'cat-1',
      isAvailable: true,
      modifiers: [
        { id: 'm7', name: 'Extra pineapple salsa', price: 1.00 },
        { id: 'm8', name: 'Black rice', price: 0 },
        { id: 'm9', name: 'Yellow rice', price: 0 }
      ]
    },
    {
      id: '4',
      restaurantId: 'rest-1',
      name: 'Mama\'s Chicken Salad',
      description: 'Chicken breast, mayo, celery, Georgia pecans, grapes, organic greens',
      price: 11.99,
      categoryId: 'cat-2',
      isAvailable: true,
      modifiers: [
        { id: 'm10', name: 'Extra pecans', price: 2.00 },
        { id: 'm11', name: 'No grapes', price: 0 },
        { id: 'm12', name: 'Extra dressing', price: 0.50 }
      ]
    },
    {
      id: '5',
      restaurantId: 'rest-1',
      name: 'Pear & Feta Salad',
      description: 'Pears, feta, toasted pecans, dried cranberries, organic greens',
      price: 10.99,
      categoryId: 'cat-2',
      isAvailable: true,
      modifiers: [
        { id: 'm13', name: 'Blue cheese instead', price: 0 },
        { id: 'm14', name: 'No cranberries', price: 0 },
        { id: 'm15', name: 'Add chicken', price: 4.00 }
      ]
    },
    {
      id: '6',
      restaurantId: 'rest-1',
      name: 'Monte Cristo Sandwich',
      description: 'Ham, turkey, swiss, raspberry jam, powdered sugar',
      price: 11.00,
      categoryId: 'cat-4',
      isAvailable: true,
      modifiers: [
        { id: 'm16', name: 'Extra jam', price: 0 },
        { id: 'm17', name: 'Side salad', price: 2.50 },
        { id: 'm18', name: 'Sweet potato fries', price: 3.00 }
      ]
    },
    {
      id: '7',
      restaurantId: 'rest-1',
      name: 'Boiled Peanuts',
      description: 'Traditional Southern style',
      price: 4.99,
      category: 'Starters',
      isAvailable: true
    },
    {
      id: '8',
      restaurantId: 'rest-1',
      name: 'Deviled Eggs',
      description: 'Six halves, traditional Southern style',
      price: 6.99,
      category: 'Starters',
      isAvailable: true
    },
    {
      id: '9',
      restaurantId: 'rest-1',
      name: 'Collard Greens',
      description: 'Slow cooked Southern style',
      price: 3.99,
      category: 'Sides',
      isAvailable: true
    },
    {
      id: '10',
      restaurantId: 'rest-1',
      name: 'Field Peas',
      description: 'Traditional Southern preparation',
      price: 3.99,
      category: 'Sides',
      isAvailable: true
    },
    {
      id: '11',
      restaurantId: 'rest-1',
      name: 'Sweet Potato Fries',
      description: 'Hand cut and seasoned',
      price: 4.99,
      category: 'Sides',
      isAvailable: true
    }
  ] as ApiMenuItem[]
}

// Create initial copies for reset
const initialOrders = [...mockData.orders]
const initialTables = [...mockData.tables]
const initialMenuItems = [...mockData.menuItems]

// Reset function for tests
export function resetMockData() {
  mockData.orders = [...initialOrders]
  mockData.tables = [...initialTables]
  mockData.menuItems = [...initialMenuItems]
}