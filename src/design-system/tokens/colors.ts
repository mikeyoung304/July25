/**
 * MACON AI Solutions - Color Token System
 * Apple-grade color system with semantic tokens and dark mode support
 */

// Brand Colors - From MACON Logo
const brandColors = {
  navy: {
    50: '#e6ecf3',
    100: '#ccd9e7',
    200: '#99b3cf',
    300: '#668db7',
    400: '#33679f',
    500: '#1a365d', // Primary
    600: '#162d4d',
    700: '#12243d',
    800: '#0e1b2d',
    900: '#0a121d',
  },
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c', // Primary
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },
  teal: {
    50: '#e6fffa',
    100: '#b2f5ea',
    200: '#81e6d9',
    300: '#4dd4cc',
    400: '#38b2ac', // Primary
    500: '#319795',
    600: '#2c8a86',
    700: '#287876',
    800: '#236665',
    900: '#1e5555',
  },
}

// Grayscale - Critical for Apple-like interfaces
const grayScale = {
  0: '#ffffff',
  50: '#fafbfc',
  100: '#f6f8fa',
  150: '#f0f2f5',
  200: '#e8ecef',
  250: '#e1e6ea',
  300: '#d8dee4',
  350: '#c9d1d9',
  400: '#b8c2cc',
  450: '#a3afbb',
  500: '#8b98a8',
  550: '#6e7c8c',
  600: '#586173',
  650: '#444c5b',
  700: '#2f3845',
  750: '#24292f',
  800: '#1a1f25',
  850: '#121518',
  900: '#0d1014',
  950: '#040506',
  1000: '#000000',
}

// Semantic Colors - Light Mode
export const colors = {
  // Background layers
  background: {
    primary: grayScale[0],
    secondary: grayScale[50],
    tertiary: grayScale[100],
    elevated: grayScale[0],
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  
  // Surface colors for cards, panels, etc
  surface: {
    primary: grayScale[0],
    secondary: grayScale[50],
    tertiary: grayScale[100],
    elevated: grayScale[0],
    glassDark: 'rgba(255, 255, 255, 0.1)',
    glassLight: 'rgba(255, 255, 255, 0.7)',
  },
  
  // Text colors with proper contrast ratios
  text: {
    primary: grayScale[900],
    secondary: grayScale[600],
    tertiary: grayScale[500],
    disabled: grayScale[400],
    inverse: grayScale[0],
    link: brandColors.navy[500],
    linkHover: brandColors.navy[600],
  },
  
  // Border colors - subtle is key
  border: {
    default: grayScale[200],
    subtle: grayScale[150],
    strong: grayScale[300],
    focus: brandColors.orange[400],
    error: '#ef4444',
  },
  
  // Brand semantic colors
  brand: {
    primary: brandColors.navy[500],
    primaryHover: brandColors.navy[600],
    primaryActive: brandColors.navy[700],
    secondary: brandColors.orange[400],
    secondaryHover: brandColors.orange[500],
    secondaryActive: brandColors.orange[600],
    tertiary: brandColors.teal[400],
    tertiaryHover: brandColors.teal[500],
    tertiaryActive: brandColors.teal[600],
  },
  
  // Status colors
  status: {
    success: brandColors.teal[400],
    successLight: brandColors.teal[50],
    warning: brandColors.orange[400],
    warningLight: brandColors.orange[50],
    error: '#ef4444',
    errorLight: '#fee2e2',
    info: brandColors.navy[500],
    infoLight: brandColors.navy[50],
  },
  
  // Interactive states
  interactive: {
    hover: 'rgba(0, 0, 0, 0.04)',
    active: 'rgba(0, 0, 0, 0.08)',
    selected: brandColors.navy[50],
    focus: brandColors.orange[400],
  },
  
  // Shadows (using rgba for better control)
  shadow: {
    sm: 'rgba(0, 0, 0, 0.05)',
    md: 'rgba(0, 0, 0, 0.08)',
    lg: 'rgba(0, 0, 0, 0.12)',
    xl: 'rgba(0, 0, 0, 0.16)',
    focus: brandColors.orange[400] + '40', // 40 = 25% opacity
  },
}

// Dark mode colors (for future implementation)
export const darkColors = {
  background: {
    primary: grayScale[900],
    secondary: grayScale[850],
    tertiary: grayScale[800],
    elevated: grayScale[850],
    overlay: 'rgba(0, 0, 0, 0.8)',
  },
  
  surface: {
    primary: grayScale[850],
    secondary: grayScale[800],
    tertiary: grayScale[750],
    elevated: grayScale[800],
    glassDark: 'rgba(0, 0, 0, 0.3)',
    glassLight: 'rgba(255, 255, 255, 0.1)',
  },
  
  text: {
    primary: grayScale[50],
    secondary: grayScale[300],
    tertiary: grayScale[400],
    disabled: grayScale[500],
    inverse: grayScale[900],
    link: brandColors.teal[300],
    linkHover: brandColors.teal[200],
  },
  
  border: {
    default: grayScale[700],
    subtle: grayScale[750],
    strong: grayScale[600],
    focus: brandColors.orange[400],
    error: '#f87171',
  },
  
  // Keep brand colors consistent
  brand: colors.brand,
  status: colors.status,
  
  interactive: {
    hover: 'rgba(255, 255, 255, 0.08)',
    active: 'rgba(255, 255, 255, 0.12)',
    selected: brandColors.navy[900],
    focus: brandColors.orange[400],
  },
  
  shadow: {
    sm: 'rgba(0, 0, 0, 0.2)',
    md: 'rgba(0, 0, 0, 0.3)',
    lg: 'rgba(0, 0, 0, 0.4)',
    xl: 'rgba(0, 0, 0, 0.5)',
    focus: brandColors.orange[400] + '40',
  },
}

// Utility function to get color with opacity
export const withOpacity = (color: string, opacity: number): string => {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  // Handle rgb/rgba colors
  if (color.startsWith('rgb')) {
    const values = color.match(/\d+/g)
    if (values && values.length >= 3) {
      return `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${opacity})`
    }
  }
  return color
}

// Export raw colors for use in CSS/Tailwind
export { brandColors, grayScale }