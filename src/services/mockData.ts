// Centralized mock data storage
import { Order, Table, MenuItem } from './types'

export const mockData = {
  orders: [
    {
      id: '1',
      restaurant_id: 'rest-1',
      orderNumber: '001',
      tableNumber: '5',
      items: [
        { id: '1', name: 'Georgia Soul Bowl', quantity: 2, modifiers: ['Extra collards', 'No pico'] },
        { id: '2', name: 'Garden Salad', quantity: 1, modifiers: ['Ranch dressing'] },
        { id: '3', name: 'Sweet Potato Fries', quantity: 1, notes: 'Customer allergic to nuts' }
      ],
      status: 'new' as const,
      orderTime: new Date(Date.now() - 2 * 60000), // 2 minutes ago
      totalAmount: 32.50,
      paymentStatus: 'pending' as const,
      orderType: 'dine-in' as const
    },
    {
      id: '2',
      restaurant_id: 'rest-1',
      orderNumber: '002',
      tableNumber: 'DT-1',
      items: [
        { id: '4', name: 'Monte Cristo Sandwich', quantity: 1, modifiers: ['Extra jam', 'Side salad'] },
        { id: '5', name: 'Sweet Tea', quantity: 2 }
      ],
      status: 'preparing' as const,
      orderTime: new Date(Date.now() - 8 * 60000), // 8 minutes ago
      totalAmount: 18.50,
      paymentStatus: 'paid' as const,
      orderType: 'drive-thru' as const,
      notes: 'Customer waiting in car'
    },
    {
      id: '3',
      restaurant_id: 'rest-1',
      orderNumber: '003',
      tableNumber: '7',
      items: [
        { id: '6', name: 'Teriyaki Chicken Bowl', quantity: 1, modifiers: ['Black rice', 'Extra broccoli'] },
        { id: '7', name: 'Boiled Peanuts', quantity: 1 },
        { id: '8', name: 'Lemonade', quantity: 2 }
      ],
      status: 'new' as const,
      orderTime: new Date(Date.now() - 1 * 60000), // 1 minute ago
      totalAmount: 28.75,
      paymentStatus: 'pending' as const,
      orderType: 'dine-in' as const
    },
    {
      id: '4',
      restaurant_id: 'rest-1',
      orderNumber: '004',
      tableNumber: 'DT-2',
      items: [
        { id: '9', name: 'Jerk Chicken Bowl', quantity: 2, modifiers: ['Yellow rice', 'Extra pineapple salsa'] },
        { id: '10', name: 'Collard Greens', quantity: 1 },
        { id: '11', name: 'Unsweet Tea', quantity: 2 }
      ],
      status: 'ready' as const,
      orderTime: new Date(Date.now() - 15 * 60000), // 15 minutes ago
      totalAmount: 34.50,
      paymentStatus: 'paid' as const,
      orderType: 'drive-thru' as const
    },
    {
      id: '5',
      restaurant_id: 'rest-1',
      orderNumber: '005',
      tableNumber: '9',
      items: [
        { id: '12', name: 'Mama\'s Chicken Salad', quantity: 1, modifiers: ['Extra pecans', 'No grapes'], notes: 'Birthday celebration' },
        { id: '13', name: 'Field Peas', quantity: 1 },
        { id: '14', name: 'Fresh Juice', quantity: 1 }
      ],
      status: 'preparing' as const,
      orderTime: new Date(Date.now() - 10 * 60000), // 10 minutes ago
      totalAmount: 52.99,
      paymentStatus: 'paid' as const,
      orderType: 'dine-in' as const
    },
    {
      id: '6',
      restaurant_id: 'rest-1',
      orderNumber: '006',
      tableNumber: 'DT-3',
      items: [
        { id: '15', name: 'Pear & Feta Salad', quantity: 3, modifiers: ['No cranberries'] },
        { id: '16', name: 'Deviled Eggs', quantity: 1 },
        { id: '17', name: 'Arnold Palmer', quantity: 2 }
      ],
      status: 'new' as const,
      orderTime: new Date(Date.now() - 3 * 60000), // 3 minutes ago
      totalAmount: 38.25,
      paymentStatus: 'paid' as const,
      orderType: 'drive-thru' as const,
      notes: 'No ice in drinks'
    }
  ] as Order[],

  tables: [
    { id: '1', restaurant_id: 'rest-1', number: '1', seats: 2, status: 'available' as const },
    { id: '2', restaurant_id: 'rest-1', number: '2', seats: 4, status: 'occupied' as const, currentOrderId: '1' },
    { id: '3', restaurant_id: 'rest-1', number: '3', seats: 6, status: 'available' as const },
    { id: '4', restaurant_id: 'rest-1', number: '4', seats: 4, status: 'reserved' as const },
    { id: '5', restaurant_id: 'rest-1', number: '5', seats: 2, status: 'occupied' as const, currentOrderId: '2' },
  ] as Table[],

  menuItems: [
    {
      id: '1',
      restaurant_id: 'rest-1',
      name: 'Georgia Soul Bowl',
      description: 'Smoked sausage, field peas, collards, yellow rice, pico de gallo',
      price: 14.99,
      category: 'Bowls',
      available: true,
      modifiers: [
        { id: 'm1', name: 'Extra collards', price: 2.00 },
        { id: 'm2', name: 'No pico', price: 0 },
        { id: 'm3', name: 'Black rice', price: 0 }
      ]
    },
    {
      id: '2',
      restaurant_id: 'rest-1',
      name: 'Teriyaki Chicken Bowl',
      description: 'Chicken breast, sauteed vegetables, steamed broccoli, pineapple salsa, rice',
      price: 13.99,
      category: 'Bowls',
      available: true,
      modifiers: [
        { id: 'm4', name: 'Black rice', price: 0 },
        { id: 'm5', name: 'Yellow rice', price: 0 },
        { id: 'm6', name: 'Extra broccoli', price: 1.50 }
      ]
    },
    {
      id: '3',
      restaurant_id: 'rest-1',
      name: 'Jerk Chicken Bowl',
      description: 'Jerk chicken breast, cabbage, black beans, pineapple salsa, rice',
      price: 13.99,
      category: 'Bowls',
      available: true,
      modifiers: [
        { id: 'm7', name: 'Extra pineapple salsa', price: 1.00 },
        { id: 'm8', name: 'Black rice', price: 0 },
        { id: 'm9', name: 'Yellow rice', price: 0 }
      ]
    },
    {
      id: '4',
      restaurant_id: 'rest-1',
      name: 'Mama\'s Chicken Salad',
      description: 'Chicken breast, mayo, celery, Georgia pecans, grapes, organic greens',
      price: 11.99,
      category: 'Salads',
      available: true,
      modifiers: [
        { id: 'm10', name: 'Extra pecans', price: 2.00 },
        { id: 'm11', name: 'No grapes', price: 0 },
        { id: 'm12', name: 'Extra dressing', price: 0.50 }
      ]
    },
    {
      id: '5',
      restaurant_id: 'rest-1',
      name: 'Pear & Feta Salad',
      description: 'Pears, feta, toasted pecans, dried cranberries, organic greens',
      price: 10.99,
      category: 'Salads',
      available: true,
      modifiers: [
        { id: 'm13', name: 'Blue cheese instead', price: 0 },
        { id: 'm14', name: 'No cranberries', price: 0 },
        { id: 'm15', name: 'Add chicken', price: 4.00 }
      ]
    },
    {
      id: '6',
      restaurant_id: 'rest-1',
      name: 'Monte Cristo Sandwich',
      description: 'Ham, turkey, swiss, raspberry jam, powdered sugar',
      price: 11.00,
      category: 'Sandwiches',
      available: true,
      modifiers: [
        { id: 'm16', name: 'Extra jam', price: 0 },
        { id: 'm17', name: 'Side salad', price: 2.50 },
        { id: 'm18', name: 'Sweet potato fries', price: 3.00 }
      ]
    },
    {
      id: '7',
      restaurant_id: 'rest-1',
      name: 'Boiled Peanuts',
      description: 'Traditional Southern style',
      price: 4.99,
      category: 'Starters',
      available: true
    },
    {
      id: '8',
      restaurant_id: 'rest-1',
      name: 'Deviled Eggs',
      description: 'Six halves, traditional Southern style',
      price: 6.99,
      category: 'Starters',
      available: true
    },
    {
      id: '9',
      restaurant_id: 'rest-1',
      name: 'Collard Greens',
      description: 'Slow cooked Southern style',
      price: 3.99,
      category: 'Sides',
      available: true
    },
    {
      id: '10',
      restaurant_id: 'rest-1',
      name: 'Field Peas',
      description: 'Traditional Southern preparation',
      price: 3.99,
      category: 'Sides',
      available: true
    },
    {
      id: '11',
      restaurant_id: 'rest-1',
      name: 'Sweet Potato Fries',
      description: 'Hand cut and seasoned',
      price: 4.99,
      category: 'Sides',
      available: true
    }
  ] as MenuItem[]
}