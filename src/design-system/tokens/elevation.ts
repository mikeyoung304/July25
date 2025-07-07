/**
 * MACON AI Solutions - Elevation & Shadow Token System
 * Apple-grade elevation system with subtle, elegant shadows
 */

import { colors } from './colors'

// Shadow color bases
const shadowColors = {
  light: {
    umbra: 'rgba(0, 0, 0, 0.04)',
    penumbra: 'rgba(0, 0, 0, 0.02)',
    ambient: 'rgba(0, 0, 0, 0.01)',
  },
  dark: {
    umbra: 'rgba(0, 0, 0, 0.2)',
    penumbra: 'rgba(0, 0, 0, 0.14)',
    ambient: 'rgba(0, 0, 0, 0.12)',
  }
}

// Elevation levels - Apple-inspired subtle shadows
export const elevation = {
  // Ground level - no elevation
  0: 'none',
  
  // Subtle elevation for interactive elements
  1: {
    boxShadow: `
      0 1px 1px 0 ${shadowColors.light.umbra},
      0 2px 1px -1px ${shadowColors.light.penumbra},
      0 1px 3px 0 ${shadowColors.light.ambient}
    `.trim(),
    zIndex: 1,
  },
  
  // Cards and surfaces
  2: {
    boxShadow: `
      0 2px 2px 0 ${shadowColors.light.umbra},
      0 3px 1px -2px ${shadowColors.light.penumbra},
      0 1px 5px 0 ${shadowColors.light.ambient}
    `.trim(),
    zIndex: 2,
  },
  
  // Raised cards and buttons
  3: {
    boxShadow: `
      0 3px 4px 0 ${shadowColors.light.umbra},
      0 3px 3px -2px ${shadowColors.light.penumbra},
      0 1px 8px 0 ${shadowColors.light.ambient}
    `.trim(),
    zIndex: 3,
  },
  
  // Floating action buttons
  4: {
    boxShadow: `
      0 4px 5px 0 ${shadowColors.light.umbra},
      0 1px 10px 0 ${shadowColors.light.penumbra},
      0 2px 4px -1px ${shadowColors.light.ambient}
    `.trim(),
    zIndex: 4,
  },
  
  // Dropdowns and popovers
  6: {
    boxShadow: `
      0 6px 10px 0 ${shadowColors.light.umbra},
      0 1px 18px 0 ${shadowColors.light.penumbra},
      0 3px 5px -1px ${shadowColors.light.ambient}
    `.trim(),
    zIndex: 6,
  },
  
  // Menus
  8: {
    boxShadow: `
      0 8px 10px 1px ${shadowColors.light.umbra},
      0 3px 14px 2px ${shadowColors.light.penumbra},
      0 5px 5px -3px ${shadowColors.light.ambient}
    `.trim(),
    zIndex: 8,
  },
  
  // Modal dialogs
  12: {
    boxShadow: `
      0 12px 17px 2px ${shadowColors.light.umbra},
      0 5px 22px 4px ${shadowColors.light.penumbra},
      0 7px 8px -4px ${shadowColors.light.ambient}
    `.trim(),
    zIndex: 12,
  },
  
  // Sheets and overlays
  16: {
    boxShadow: `
      0 16px 24px 2px ${shadowColors.light.umbra},
      0 6px 30px 5px ${shadowColors.light.penumbra},
      0 8px 10px -5px ${shadowColors.light.ambient}
    `.trim(),
    zIndex: 16,
  },
  
  // Full-screen overlays
  24: {
    boxShadow: `
      0 24px 38px 3px ${shadowColors.light.umbra},
      0 9px 46px 8px ${shadowColors.light.penumbra},
      0 11px 15px -7px ${shadowColors.light.ambient}
    `.trim(),
    zIndex: 24,
  },
}

// Semantic shadow tokens
export const shadows = {
  // Interactive element shadows
  interactive: {
    rest: elevation[1].boxShadow,
    hover: elevation[2].boxShadow,
    active: elevation[0],
    focus: `0 0 0 3px ${colors.brand.secondary}40`, // Orange focus ring
  },
  
  // Card shadows
  card: {
    rest: elevation[2].boxShadow,
    hover: elevation[3].boxShadow,
    dragging: elevation[8].boxShadow,
  },
  
  // Navigation shadows
  navigation: {
    top: `0 1px 3px 0 ${shadowColors.light.umbra}`,
    bottom: `0 -1px 3px 0 ${shadowColors.light.umbra}`,
  },
  
  // Modal and overlay shadows
  modal: {
    backdrop: 'rgba(0, 0, 0, 0.5)',
    content: elevation[16].boxShadow,
  },
  
  // Tooltip shadows
  tooltip: elevation[6].boxShadow,
  
  // Dropdown shadows
  dropdown: elevation[8].boxShadow,
  
  // Inset shadows for inputs and wells
  inset: {
    sm: `inset 0 1px 2px 0 ${shadowColors.light.ambient}`,
    md: `inset 0 2px 4px 0 ${shadowColors.light.ambient}`,
    lg: `inset 0 2px 8px 0 ${shadowColors.light.ambient}`,
  },
  
  // Text shadows for improved readability
  text: {
    subtle: `0 1px 2px ${shadowColors.light.umbra}`,
    strong: `0 2px 4px ${shadowColors.light.penumbra}`,
  },
  
  // Special effects
  glow: {
    primary: `0 0 20px ${colors.brand.primary}20`,
    secondary: `0 0 20px ${colors.brand.secondary}30`,
    tertiary: `0 0 20px ${colors.brand.tertiary}30`,
  },
}

// Glassmorphism effects
export const glass = {
  // Light glass effect
  light: {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px) saturate(180%)',
    webkitBackdropFilter: 'blur(10px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    boxShadow: typeof elevation[2] === 'object' ? elevation[2].boxShadow : '',
  },
  
  // Dark glass effect
  dark: {
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(10px) saturate(180%)',
    webkitBackdropFilter: 'blur(10px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: typeof elevation[4] === 'object' ? elevation[4].boxShadow : '',
  },
  
  // Colored glass effects
  primary: {
    background: `${colors.brand.primary}15`,
    backdropFilter: 'blur(10px) saturate(180%)',
    webkitBackdropFilter: 'blur(10px) saturate(180%)',
    border: `1px solid ${colors.brand.primary}20`,
    boxShadow: shadows.glow.primary,
  },
  
  secondary: {
    background: `${colors.brand.secondary}15`,
    backdropFilter: 'blur(10px) saturate(180%)',
    webkitBackdropFilter: 'blur(10px) saturate(180%)',
    border: `1px solid ${colors.brand.secondary}20`,
    boxShadow: shadows.glow.secondary,
  },
  
  // Subtle glass for overlays
  overlay: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px) saturate(180%)',
    webkitBackdropFilter: 'blur(20px) saturate(180%)',
  },
}

// Utility functions
export const createElevation = (level: keyof typeof elevation) => {
  const elevationStyle = elevation[level]
  if (typeof elevationStyle === 'string') return { boxShadow: elevationStyle }
  return elevationStyle
}

export const createShadow = (
  x: number,
  y: number,
  blur: number,
  spread: number = 0,
  color: string = shadowColors.light.umbra
) => `${x}px ${y}px ${blur}px ${spread}px ${color}`

export const combineShadows = (...shadowList: string[]) => 
  shadowList.filter(Boolean).join(', ')

// Animation utilities for elevation transitions
export const elevationTransition = {
  fast: 'box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  standard: 'box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: 'box-shadow 350ms cubic-bezier(0.4, 0, 0.2, 1)',
}

// Hover elevation mixin
export const hoverElevation = (
  restLevel: keyof typeof elevation = 2,
  hoverLevel: keyof typeof elevation = 4
) => ({
  ...createElevation(restLevel),
  transition: elevationTransition.standard,
  '&:hover': {
    ...createElevation(hoverLevel),
  },
})

// Focus elevation mixin
export const focusElevation = (color: string = colors.brand.secondary) => ({
  '&:focus': {
    outline: 'none',
    boxShadow: `0 0 0 3px ${color}40`,
  },
  '&:focus-visible': {
    outline: 'none',
    boxShadow: `0 0 0 3px ${color}40`,
  },
})

// Dark mode shadow adjustments
export const darkElevation = Object.fromEntries(
  Object.entries(elevation).map(([key, value]) => {
    if (typeof value === 'string') return [key, value]
    
    const darkShadow = value.boxShadow
      .replace(shadowColors.light.umbra, shadowColors.dark.umbra)
      .replace(shadowColors.light.penumbra, shadowColors.dark.penumbra)
      .replace(shadowColors.light.ambient, shadowColors.dark.ambient)
    
    return [key, { ...value, boxShadow: darkShadow }]
  })
)