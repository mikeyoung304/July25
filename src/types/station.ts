export type StationType = 'grill' | 'fryer' | 'cold' | 'pizza' | 'pasta' | 'drinks' | 'dessert'

export interface Station {
  id: string
  name: string
  type: StationType
  isActive: boolean
  currentOrders: string[] // Order IDs
}

export interface StationAssignment {
  orderId: string
  itemId: string
  stationId: string
  assignedAt: Date
  status: 'pending' | 'in-progress' | 'completed'
}

// Station configuration with item categories
export const STATION_CONFIG: Record<StationType, {
  name: string
  color: string
  icon: string
  itemPatterns: RegExp[]
}> = {
  grill: {
    name: 'Grill Station',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: '🔥',
    itemPatterns: [/burger/i, /steak/i, /salmon/i, /grilled/i, /fish/i]
  },
  fryer: {
    name: 'Fryer Station',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: '🍟',
    itemPatterns: [/fries/i, /wings/i, /nuggets/i, /onion rings/i, /fried/i]
  },
  cold: {
    name: 'Cold Station',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: '🥗',
    itemPatterns: [/salad/i, /wrap/i, /sandwich/i, /cold/i]
  },
  pizza: {
    name: 'Pizza Station',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: '🍕',
    itemPatterns: [/pizza/i, /calzone/i]
  },
  pasta: {
    name: 'Pasta Station',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: '🍝',
    itemPatterns: [/pasta/i, /spaghetti/i, /carbonara/i, /alfredo/i]
  },
  drinks: {
    name: 'Drinks Station',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    icon: '🥤',
    itemPatterns: [/cola/i, /juice/i, /water/i, /coffee/i, /tea/i]
  },
  dessert: {
    name: 'Dessert Station',
    color: 'bg-pink-100 text-pink-800 border-pink-300',
    icon: '🍰',
    itemPatterns: [/cake/i, /ice cream/i, /dessert/i, /pie/i]
  }
}