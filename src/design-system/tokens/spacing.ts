/**
 * MACON AI Solutions - Spacing Token System
 * Apple-grade spacing scale for consistent rhythm and generous whitespace
 */

// Base unit - all spacing derived from this
const baseUnit = 8 // 8px base for pixel-perfect alignment

// Spacing scale - follows Apple's generous spacing philosophy
export const spacing = {
  // Micro spacing for fine adjustments
  px: '1px',
  0.5: `${baseUnit * 0.5}px`, // 4px
  
  // Core spacing scale
  1: `${baseUnit}px`, // 8px
  1.5: `${baseUnit * 1.5}px`, // 12px
  2: `${baseUnit * 2}px`, // 16px
  2.5: `${baseUnit * 2.5}px`, // 20px
  3: `${baseUnit * 3}px`, // 24px
  3.5: `${baseUnit * 3.5}px`, // 28px
  4: `${baseUnit * 4}px`, // 32px
  5: `${baseUnit * 5}px`, // 40px
  6: `${baseUnit * 6}px`, // 48px
  7: `${baseUnit * 7}px`, // 56px
  8: `${baseUnit * 8}px`, // 64px
  9: `${baseUnit * 9}px`, // 72px
  10: `${baseUnit * 10}px`, // 80px
  11: `${baseUnit * 11}px`, // 88px
  12: `${baseUnit * 12}px`, // 96px
  14: `${baseUnit * 14}px`, // 112px
  16: `${baseUnit * 16}px`, // 128px
  20: `${baseUnit * 20}px`, // 160px
  24: `${baseUnit * 24}px`, // 192px
  28: `${baseUnit * 28}px`, // 224px
  32: `${baseUnit * 32}px`, // 256px
  36: `${baseUnit * 36}px`, // 288px
  40: `${baseUnit * 40}px`, // 320px
  44: `${baseUnit * 44}px`, // 352px
  48: `${baseUnit * 48}px`, // 384px
  52: `${baseUnit * 52}px`, // 416px
  56: `${baseUnit * 56}px`, // 448px
  60: `${baseUnit * 60}px`, // 480px
  64: `${baseUnit * 64}px`, // 512px
  72: `${baseUnit * 72}px`, // 576px
  80: `${baseUnit * 80}px`, // 640px
  96: `${baseUnit * 96}px`, // 768px
}

// Semantic spacing tokens for specific use cases
export const semanticSpacing = {
  // Component internal spacing
  component: {
    xs: spacing[1], // 8px - tight component padding
    sm: spacing[2], // 16px - small component padding
    md: spacing[3], // 24px - medium component padding
    lg: spacing[4], // 32px - large component padding
    xl: spacing[5], // 40px - extra large component padding
  },
  
  // Gap between elements
  gap: {
    xs: spacing[1], // 8px - minimal gap
    sm: spacing[2], // 16px - small gap
    md: spacing[3], // 24px - medium gap
    lg: spacing[4], // 32px - large gap
    xl: spacing[6], // 48px - extra large gap
    xxl: spacing[8], // 64px - section gap
  },
  
  // Page layout spacing
  page: {
    margin: spacing[4], // 32px - page margins on mobile
    marginTablet: spacing[6], // 48px - page margins on tablet
    marginDesktop: spacing[8], // 64px - page margins on desktop
    sectionGap: spacing[12], // 96px - gap between major sections
    heroHeight: spacing[80], // 640px - hero section height
  },
  
  // Content spacing
  content: {
    paragraphGap: spacing[3], // 24px - between paragraphs
    headingGap: spacing[4], // 32px - before headings
    listItemGap: spacing[2], // 16px - between list items
    inlineGap: spacing[1], // 8px - between inline elements
  },
  
  // Form spacing
  form: {
    fieldGap: spacing[3], // 24px - between form fields
    groupGap: spacing[6], // 48px - between form groups
    labelGap: spacing[1], // 8px - between label and input
    inputPadding: spacing[2], // 16px - input internal padding
  },
  
  // Card and surface spacing
  card: {
    padding: spacing[3], // 24px - card padding
    paddingLarge: spacing[4], // 32px - large card padding
    gap: spacing[2], // 16px - gap between card elements
  },
  
  // Navigation spacing
  navigation: {
    height: spacing[8], // 64px - navigation bar height
    itemGap: spacing[1], // 8px - between nav items
    padding: spacing[3], // 24px - nav padding
  },
}

// Layout breakpoints - aligned with spacing system
export const breakpoints = {
  mobile: 375, // iPhone size
  mobileL: 425,
  tablet: 768, // iPad portrait
  laptop: 1024,
  desktop: 1280,
  desktopL: 1440,
  desktopXL: 1920,
  desktop4K: 2560,
}

// Container widths - content max widths
export const containers = {
  xs: '100%',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  xxl: '1536px',
  prose: '65ch', // Optimal reading width
}

// Grid system
export const grid = {
  columns: 12,
  gap: {
    mobile: spacing[2], // 16px
    tablet: spacing[3], // 24px
    desktop: spacing[4], // 32px
  },
  margin: {
    mobile: spacing[2], // 16px
    tablet: spacing[4], // 32px
    desktop: spacing[6], // 48px
  },
}

// Border radius tokens - smooth, Apple-like curves
export const radius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  xxl: '24px',
  full: '9999px',
  
  // Semantic radius
  button: '12px',
  input: '10px',
  card: '16px',
  modal: '20px',
  tooltip: '8px',
}

// Z-index scale for layering
export const zIndex = {
  auto: 'auto',
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
  notification: 800,
  debug: 900,
  max: 999,
}

// Aspect ratios for media
export const aspectRatios = {
  square: '1 / 1',
  video: '16 / 9',
  photo: '4 / 3',
  cinema: '21 / 9',
  portrait: '3 / 4',
  goldenRatio: '1.618 / 1',
}

// Utility functions
export const getSpacing = (...values: (keyof typeof spacing)[]) => 
  values.map(v => spacing[v]).join(' ')

export const getResponsiveSpacing = (
  mobile: keyof typeof spacing,
  tablet?: keyof typeof spacing,
  desktop?: keyof typeof spacing
) => ({
  mobile: spacing[mobile],
  tablet: spacing[tablet || mobile],
  desktop: spacing[desktop || tablet || mobile],
})

// Media query helpers
export const mediaQueries = {
  mobile: `@media (min-width: ${breakpoints.mobile}px)`,
  mobileL: `@media (min-width: ${breakpoints.mobileL}px)`,
  tablet: `@media (min-width: ${breakpoints.tablet}px)`,
  laptop: `@media (min-width: ${breakpoints.laptop}px)`,
  desktop: `@media (min-width: ${breakpoints.desktop}px)`,
  desktopL: `@media (min-width: ${breakpoints.desktopL}px)`,
  desktopXL: `@media (min-width: ${breakpoints.desktopXL}px)`,
  desktop4K: `@media (min-width: ${breakpoints.desktop4K}px)`,
  
  // Utility queries
  hover: '@media (hover: hover)',
  touch: '@media (hover: none)',
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  highContrast: '@media (prefers-contrast: high)',
  darkMode: '@media (prefers-color-scheme: dark)',
}

// Layout utilities
export const layout = {
  // Center content with max width
  container: (maxWidth: keyof typeof containers = 'xl') => ({
    width: '100%',
    maxWidth: containers[maxWidth],
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: semanticSpacing.page.margin,
    paddingRight: semanticSpacing.page.margin,
    [mediaQueries.tablet]: {
      paddingLeft: semanticSpacing.page.marginTablet,
      paddingRight: semanticSpacing.page.marginTablet,
    },
    [mediaQueries.desktop]: {
      paddingLeft: semanticSpacing.page.marginDesktop,
      paddingRight: semanticSpacing.page.marginDesktop,
    },
  }),
  
  // Stack elements vertically
  stack: (gap: keyof typeof spacing = 3) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[gap],
  }),
  
  // Arrange elements horizontally
  inline: (gap: keyof typeof spacing = 2, align: string = 'center') => ({
    display: 'flex',
    flexDirection: 'row',
    alignItems: align,
    gap: spacing[gap],
  }),
  
  // Grid layout
  grid: (columns: number = 12, gap: keyof typeof spacing = 3) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: spacing[gap],
  }),
}