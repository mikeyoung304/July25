// Station color system adapted from plate-clean-test
// Using lighter, more vibrant colors for Macon brand alignment

export const STATION_COLORS = {
  grill: {
    name: 'Grill',
    primary: '#FF6B35', // Macon Orange
    secondary: '#ff8255',
    light: '#ffebe0',
    dark: '#e55a25',
    gradient: 'from-orange-400 to-orange-500',
    icon: '🔥'
  },
  fryer: {
    name: 'Fryer',
    primary: '#fbbf24', // Warm yellow
    secondary: '#fcd34d',
    light: '#fef3c7',
    dark: '#f59e0b',
    gradient: 'from-yellow-400 to-amber-500',
    icon: '🍟'
  },
  salad: {
    name: 'Salad',
    primary: '#4ECDC4', // Macon Teal
    secondary: '#6ed9d0',
    light: '#e0fffc',
    dark: '#3eb5ac',
    gradient: 'from-teal-400 to-teal-500',
    icon: '🥗'
  },
  bar: {
    name: 'Bar',
    primary: '#14b8a6', // Macon Teal
    secondary: '#2dd4bf',
    light: '#ccfbf1',
    dark: '#0d9488',
    gradient: 'from-teal-400 to-teal-500',
    icon: '🍹'
  },
  expo: {
    name: 'Expo',
    primary: '#0A253D', // Macon Navy
    secondary: '#1a365d',
    light: '#e8edf5',
    dark: '#061529',
    gradient: 'from-blue-800 to-blue-900',
    icon: '📦'
  },
  default: {
    name: 'General',
    primary: '#6b7280',
    secondary: '#9ca3af',
    light: '#f3f4f6',
    dark: '#4b5563',
    gradient: 'from-gray-400 to-gray-500',
    icon: '🍽️'
  }
} as const

export type StationType = keyof typeof STATION_COLORS

// Helper function to get station color classes
export function getStationColorClasses(station: StationType) {
  const colors = STATION_COLORS[station] || STATION_COLORS.default
  
  return {
    bg: `bg-${station}-50/10`,
    border: `border-${station}-200`,
    text: `text-${station}-700`,
    badge: `bg-gradient-to-br ${colors.gradient} text-white`,
    glow: `shadow-[0_0_20px_${colors.primary}40]`,
    hover: `hover:bg-${station}-100/20`,
  }
}

// Station priority levels (higher number = higher priority)
export const STATION_PRIORITY = {
  expo: 5,    // Highest - final quality check
  grill: 4,   // Hot food must be served quickly
  fryer: 3,   // Also time-sensitive
  salad: 2,   // Can be prepped ahead
  bar: 1,     // Drinks can wait slightly
  default: 0
} as const

// Estimated prep times by station (in minutes)
export const STATION_PREP_TIMES = {
  grill: 8,
  fryer: 5,
  salad: 3,
  bar: 2,
  expo: 1,
  default: 5
} as const