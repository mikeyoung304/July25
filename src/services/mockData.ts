// Centralized mock data storage
import { Order, Table, MenuItem } from './types'

export const mockData = {
  orders: [
    {
      id: '1',
      orderNumber: '001',
      tableNumber: '5',
      items: [
        { id: '1', name: 'Grilled Salmon', quantity: 2, modifiers: ['No sauce', 'Extra lemon'] },
        { id: '2', name: 'Caesar Salad', quantity: 1 },
        { id: '3', name: 'French Fries', quantity: 1, notes: 'Customer allergic to garlic' }
      ],
      status: 'new' as const,
      orderTime: new Date(Date.now() - 5 * 60000), // 5 minutes ago
      totalAmount: 45.99,
      paymentStatus: 'pending' as const
    },
    {
      id: '2',
      orderNumber: '002',
      tableNumber: '12',
      items: [
        { id: '4', name: 'Burger', quantity: 1, modifiers: ['Medium rare', 'No onions'] },
        { id: '5', name: 'Coca Cola', quantity: 2 }
      ],
      status: 'preparing' as const,
      orderTime: new Date(Date.now() - 12 * 60000), // 12 minutes ago
      totalAmount: 18.50,
      paymentStatus: 'paid' as const
    }
  ] as Order[],

  tables: [
    { id: '1', number: '1', seats: 2, status: 'available' as const },
    { id: '2', number: '2', seats: 4, status: 'occupied' as const, currentOrderId: '1' },
    { id: '3', number: '3', seats: 6, status: 'available' as const },
    { id: '4', number: '4', seats: 4, status: 'reserved' as const },
    { id: '5', number: '5', seats: 2, status: 'occupied' as const, currentOrderId: '2' },
  ] as Table[],

  menuItems: [
    {
      id: '1',
      name: 'Grilled Salmon',
      description: 'Fresh Atlantic salmon with herbs',
      price: 24.99,
      category: 'Main Course',
      available: true,
      modifiers: [
        { id: 'm1', name: 'Extra lemon', price: 0 },
        { id: 'm2', name: 'No sauce', price: 0 }
      ]
    },
    {
      id: '2',
      name: 'Caesar Salad',
      description: 'Classic Caesar with parmesan',
      price: 12.99,
      category: 'Salads',
      available: true
    },
    {
      id: '3',
      name: 'Burger',
      description: 'Angus beef with lettuce and tomato',
      price: 15.99,
      category: 'Main Course',
      available: true,
      modifiers: [
        { id: 'm3', name: 'Medium rare', price: 0 },
        { id: 'm4', name: 'No onions', price: 0 },
        { id: 'm5', name: 'Add bacon', price: 2.50 }
      ]
    }
  ] as MenuItem[]
}