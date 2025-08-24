/**
 * Brand Header Presets - Predefined styling configurations
 * Provides consistent brand presentation across different contexts
 */

export type BrandPreset = 'default' | 'compact' | 'hero' | 'minimal' | 'mobile'

interface BrandConfig {
  wrapper: string
  container: string
  logo: string
  title: string
  tagline: string
}

export const BRAND_PRESETS: Record<BrandPreset, BrandConfig> = {
  default: {
    wrapper: 'block',
    container: 'items-center',
    logo: 'h-8 w-auto sm:h-10',
    title: 'text-lg sm:text-xl text-macon-navy',
    tagline: 'text-sm text-macon-navy/70'
  },
  
  compact: {
    wrapper: 'block',
    container: 'items-center',
    logo: 'h-6 w-auto sm:h-8',
    title: 'text-base sm:text-lg text-macon-navy',
    tagline: 'text-xs sm:text-sm text-macon-navy/70'
  },
  
  hero: {
    wrapper: 'block text-center sm:text-left',
    container: 'flex-col sm:flex-row items-center sm:items-center justify-center sm:justify-start',
    logo: 'h-16 w-auto sm:h-20 mb-2 sm:mb-0',
    title: 'text-2xl sm:text-3xl lg:text-4xl text-macon-navy',
    tagline: 'text-base sm:text-lg text-macon-navy/80'
  },
  
  minimal: {
    wrapper: 'block',
    container: 'items-center',
    logo: 'h-6 w-auto',
    title: 'text-sm text-macon-navy font-medium',
    tagline: 'text-xs text-macon-navy/60'
  },
  
  mobile: {
    wrapper: 'block',
    container: 'items-center',
    logo: 'h-8 w-auto',
    title: 'text-lg text-macon-navy',
    tagline: 'text-sm text-macon-navy/70 hidden sm:block'
  }
}

// Responsive breakpoints for consistent mobile experience
export const MOBILE_BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px'
}

// Accessibility enhancements
export const A11Y_ENHANCEMENTS = {
  skipLink: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-white p-2 rounded-md shadow-lg',
  screenReader: 'sr-only',
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-macon-orange',
  highContrast: 'contrast-more:border contrast-more:border-current'
}