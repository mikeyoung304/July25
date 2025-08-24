/**
 * Page information presets for the BrandHeader component
 * Maps routes to their display titles and descriptions
 */

interface PageInfo {
  title: string
  description?: string
}

export const pageInfo: Record<string, PageInfo> = {
  '/': {
    title: 'Restaurant Dashboard',
    description: 'Grow Fresh Local Food Management System'
  },
  '/kitchen': {
    title: 'Kitchen Display System',
    description: 'Real-time order management and preparation tracking'
  },
  '/kiosk': {
    title: 'Voice Ordering Kiosk',
    description: 'AI-powered customer ordering system'
  },
  '/drive-thru': {
    title: 'Drive-Thru Voice Orders',
    description: 'Fast lane voice ordering system'
  },
  '/expo': {
    title: 'Expo Station',
    description: 'Order completion and quality control'
  },
  '/history': {
    title: 'Order History',
    description: 'Analytics and historical order data'
  },
  '/order-history': {
    title: 'Order History',
    description: 'Analytics and historical order data'
  },
  '/performance': {
    title: 'Performance Dashboard',
    description: 'System metrics and operational insights'
  },
  '/admin': {
    title: 'Admin Dashboard',
    description: 'Restaurant management and configuration'
  },
  '/order': {
    title: 'Online Ordering',
    description: 'Customer menu and cart system'
  },
  '/checkout': {
    title: 'Checkout',
    description: 'Payment and order confirmation'
  },
  '/order-confirmation': {
    title: 'Order Confirmed',
    description: 'Thank you for your order'
  }
}