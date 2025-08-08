import { cn } from '@/utils';

// Typography scale based on a 1.25 ratio (Major Third)
export const typography = {
  // Display - For hero sections and marketing pages
  display: {
    size: 'text-5xl md:text-6xl lg:text-7xl',
    weight: 'font-bold',
    leading: 'leading-tight',
    tracking: 'tracking-tight',
  },
  
  // Page titles
  h1: {
    size: 'text-4xl md:text-5xl',
    weight: 'font-bold',
    leading: 'leading-tight',
    tracking: 'tracking-tight',
  },
  
  // Section titles
  h2: {
    size: 'text-3xl md:text-4xl',
    weight: 'font-semibold',
    leading: 'leading-snug',
    tracking: 'tracking-tight',
  },
  
  // Subsection titles
  h3: {
    size: 'text-2xl md:text-3xl',
    weight: 'font-semibold',
    leading: 'leading-snug',
  },
  
  // Card titles
  h4: {
    size: 'text-xl md:text-2xl',
    weight: 'font-semibold',
    leading: 'leading-normal',
  },
  
  // Small headings
  h5: {
    size: 'text-lg md:text-xl',
    weight: 'font-semibold',
    leading: 'leading-normal',
  },
  
  // Tiny headings
  h6: {
    size: 'text-base md:text-lg',
    weight: 'font-semibold',
    leading: 'leading-normal',
  },
  
  // Body text variants
  body: {
    size: 'text-base',
    weight: 'font-normal',
    leading: 'leading-relaxed',
  },
  
  bodyLarge: {
    size: 'text-lg',
    weight: 'font-normal',
    leading: 'leading-relaxed',
  },
  
  bodySmall: {
    size: 'text-sm',
    weight: 'font-normal',
    leading: 'leading-relaxed',
  },
  
  // UI text variants
  label: {
    size: 'text-sm',
    weight: 'font-medium',
    leading: 'leading-none',
  },
  
  caption: {
    size: 'text-xs',
    weight: 'font-normal',
    leading: 'leading-none',
  },
  
  // Special variants
  stat: {
    size: 'text-3xl md:text-4xl',
    weight: 'font-bold',
    leading: 'leading-none',
    tracking: 'tracking-tight',
  },
  
  price: {
    size: 'text-lg',
    weight: 'font-bold',
    leading: 'leading-none',
  },
};

// Helper function to get typography classes
export const getTypographyClasses = (variant: keyof typeof typography) => {
  const styles = typography[variant];
  return cn(styles.size, styles.weight, styles.leading, 'tracking' in styles ? styles.tracking : '');
};

// Spacing scale (using Tailwind's spacing scale)
export const spacing = {
  // Page-level spacing
  page: {
    padding: 'p-6 md:p-8 lg:p-10',
    container: 'max-w-7xl mx-auto',
    section: 'mb-8 md:mb-12 lg:mb-16',
  },
  
  // Component-level spacing
  component: {
    card: 'p-6',
    cardCompact: 'p-4',
    button: 'px-4 py-2',
    buttonLarge: 'px-6 py-3',
    input: 'px-3 py-2',
  },
  
  // Content spacing
  content: {
    stack: 'space-y-4',
    stackSmall: 'space-y-2',
    stackLarge: 'space-y-6',
    inline: 'space-x-4',
    inlineSmall: 'space-x-2',
    inlineLarge: 'space-x-6',
  },
  
  // Grid spacing
  grid: {
    gap: 'gap-4',
    gapSmall: 'gap-2',
    gapLarge: 'gap-6',
  },
};