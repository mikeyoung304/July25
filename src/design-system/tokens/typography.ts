/**
 * MACON AI Solutions - Typography Token System
 * Apple-grade typography scale with precise sizing and spacing
 */

// Font families
export const fontFamilies = {
  sans: [
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    'SF Pro Display',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ].join(', '),
  
  mono: [
    'SF Mono',
    'Monaco',
    'Consolas',
    'Liberation Mono',
    'Courier New',
    'monospace',
  ].join(', '),
}

// Font weights
export const fontWeights = {
  thin: 100,
  extraLight: 200,
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extraBold: 800,
  black: 900,
}

// Line heights
const lineHeights = {
  tight: 1.1,
  snug: 1.2,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
}

// Letter spacing
const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
}

// Typography scale - Following Apple's type system
export const typography = {
  // Display - For hero sections and marketing
  display: {
    fontSize: '4rem', // 64px
    lineHeight: lineHeights.tight,
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacing.tight,
    fontFamily: fontFamilies.sans,
  },
  
  displayMedium: {
    fontSize: '3.5rem', // 56px
    lineHeight: lineHeights.tight,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.tight,
    fontFamily: fontFamilies.sans,
  },
  
  displaySmall: {
    fontSize: '3rem', // 48px
    lineHeight: lineHeights.snug,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.tight,
    fontFamily: fontFamilies.sans,
  },
  
  // Titles - For page and section headers
  title1: {
    fontSize: '2.25rem', // 36px
    lineHeight: lineHeights.snug,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamilies.sans,
  },
  
  title2: {
    fontSize: '1.875rem', // 30px
    lineHeight: lineHeights.snug,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamilies.sans,
  },
  
  title3: {
    fontSize: '1.5rem', // 24px
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamilies.sans,
  },
  
  // Functional text
  headline: {
    fontSize: '1.25rem', // 20px
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamilies.sans,
  },
  
  body: {
    fontSize: '1rem', // 16px
    lineHeight: lineHeights.relaxed,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamilies.sans,
  },
  
  bodyLarge: {
    fontSize: '1.125rem', // 18px
    lineHeight: lineHeights.relaxed,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamilies.sans,
  },
  
  callout: {
    fontSize: '1rem', // 16px
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamilies.sans,
  },
  
  subheadline: {
    fontSize: '0.875rem', // 14px
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacing.wide,
    fontFamily: fontFamilies.sans,
  },
  
  footnote: {
    fontSize: '0.8125rem', // 13px
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamilies.sans,
  },
  
  caption: {
    fontSize: '0.75rem', // 12px
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacing.wide,
    fontFamily: fontFamilies.sans,
  },
  
  overline: {
    fontSize: '0.75rem', // 12px
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.widest,
    textTransform: 'uppercase' as const,
    fontFamily: fontFamilies.sans,
  },
  
  // Code
  code: {
    fontSize: '0.875rem', // 14px
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamilies.mono,
  },
  
  codeSmall: {
    fontSize: '0.75rem', // 12px
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamilies.mono,
  },
}

// Responsive typography utilities
export const responsiveTypography = {
  display: {
    mobile: { ...typography.displaySmall },
    tablet: { ...typography.displayMedium },
    desktop: { ...typography.display },
  },
  
  title1: {
    mobile: { ...typography.title2 },
    tablet: { ...typography.title1 },
    desktop: { ...typography.title1 },
  },
  
  title2: {
    mobile: { ...typography.title3 },
    tablet: { ...typography.title2 },
    desktop: { ...typography.title2 },
  },
}

// Text decoration utilities
export const textDecoration = {
  underline: {
    textDecoration: 'underline',
    textUnderlineOffset: '0.125rem',
    textDecorationThickness: '0.0625rem',
  },
  
  strikethrough: {
    textDecoration: 'line-through',
    textDecorationThickness: '0.0625rem',
  },
  
  none: {
    textDecoration: 'none',
  },
}

// Text transform utilities
export const textTransform = {
  uppercase: { textTransform: 'uppercase' as const },
  lowercase: { textTransform: 'lowercase' as const },
  capitalize: { textTransform: 'capitalize' as const },
  normal: { textTransform: 'none' as const },
}

// Utility function to create text styles
export const createTextStyle = (
  variant: keyof typeof typography,
  options?: {
    weight?: keyof typeof fontWeights
    color?: string
    align?: 'left' | 'center' | 'right' | 'justify'
    transform?: keyof typeof textTransform
    decoration?: keyof typeof textDecoration
  }
) => {
  const baseStyle = typography[variant]
  return {
    ...baseStyle,
    ...(options?.weight && { fontWeight: fontWeights[options.weight] }),
    ...(options?.color && { color: options.color }),
    ...(options?.align && { textAlign: options.align }),
    ...(options?.transform && textTransform[options.transform]),
    ...(options?.decoration && textDecoration[options.decoration]),
  }
}