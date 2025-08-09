import { cn } from '@/utils';

// Attention-friendly typography system optimized for readability
// Mobile-first design with significantly larger text sizes
export const typography = {
  // Page titles
  h1: {
    size: 'text-4xl md:text-5xl',
    weight: 'font-bold',
    leading: 'leading-tight',
    tracking: 'tracking-tight',
  },
  
  // Section titles - much larger for attention
  h2: {
    size: 'text-3xl md:text-4xl',
    weight: 'font-bold',
    leading: 'leading-tight',
    tracking: 'tracking-tight',
  },
  
  // Card titles - significantly increased
  h3: {
    size: 'text-xl md:text-2xl',
    weight: 'font-semibold', 
    leading: 'leading-tight',
  },
  
  h4: {
    size: 'text-lg md:text-xl',
    weight: 'font-semibold',
    leading: 'leading-tight',
  },
  
  // Body text - much larger for readability
  body: {
    size: 'text-base md:text-lg',
    weight: 'font-normal',
    leading: 'leading-relaxed',
  },
  
  bodyLarge: {
    size: 'text-lg md:text-xl',
    weight: 'font-normal',
    leading: 'leading-relaxed',
  },
  
  bodySmall: {
    size: 'text-sm md:text-base',
    weight: 'font-normal',
    leading: 'leading-relaxed',
  },
  
  // Label text - larger for better readability
  label: {
    size: 'text-base md:text-lg',
    weight: 'font-medium',
    leading: 'leading-tight',
  },
  
  // Price text - much more prominent
  price: {
    size: 'text-2xl md:text-3xl',
    weight: 'font-bold',
    leading: 'leading-none',
  },
  
  priceSmall: {
    size: 'text-xl md:text-2xl',
    weight: 'font-bold',
    leading: 'leading-none',
  },
  
  // Button text - larger for better tap targets
  button: {
    size: 'text-lg md:text-xl',
    weight: 'font-medium',
    leading: 'leading-none',
  },
  
  buttonSmall: {
    size: 'text-base md:text-lg',
    weight: 'font-medium',
    leading: 'leading-none',
  },
  
  // Small caption text - still readable
  caption: {
    size: 'text-sm md:text-base',
    weight: 'font-normal',
    leading: 'leading-tight',
  },
  
  // Statistics
  stat: {
    size: 'text-3xl md:text-4xl',
    weight: 'font-bold',
    leading: 'leading-tight',
  },
  
  // Section headers - attention-grabbing
  sectionHeader: {
    size: 'text-2xl md:text-3xl',
    weight: 'font-bold',
    leading: 'leading-tight',
    tracking: 'tracking-tight',
  },
  
  // Menu item card title - optimized for scanning
  menuItemTitle: {
    size: 'text-xl md:text-2xl',
    weight: 'font-semibold', 
    leading: 'leading-tight',
  },
  
  // Menu item description - readable but secondary
  menuItemDescription: {
    size: 'text-base md:text-lg',
    weight: 'font-normal',
    leading: 'leading-relaxed',
  },
  
  // Menu item price - most prominent after title
  menuItemPrice: {
    size: 'text-2xl md:text-3xl',
    weight: 'font-bold',
    leading: 'leading-none',
  },
  
  // Aliases for backward compatibility
  sectionTitle: {
    size: 'text-2xl md:text-3xl',
    weight: 'font-bold',
    leading: 'leading-tight',
    tracking: 'tracking-tight',
  },
  
  cardTitle: {
    size: 'text-xl md:text-2xl',
    weight: 'font-semibold', 
    leading: 'leading-tight',
  },
};

// Helper function to get typography classes
export const getTypographyClasses = (variant: keyof typeof typography) => {
  const styles = typography[variant];
  return cn(styles.size, styles.weight, styles.leading, 'tracking' in styles ? styles.tracking : '');
};

// Attention-friendly 8-point grid with generous spacing
export const spacing = {
  // Page-level spacing (responsive padding)
  page: {
    padding: 'p-5 md:p-8 lg:p-12', // More breathing room
    container: 'max-w-7xl mx-auto',
    section: 'mb-12 md:mb-16', // Much more space between sections
  },
  
  // Component-level spacing (generous for touch)
  component: {
    card: 'p-6 md:p-8', // More internal padding
    cardCompact: 'p-4 md:p-6', 
    button: 'px-8 py-4', // Much larger tap targets (48px min height)
    buttonSmall: 'px-6 py-3', // Still substantial
    buttonLarge: 'px-12 py-6', // Huge CTAs
  },
  
  // Content spacing (more breathing room)
  content: {
    stack: 'space-y-6 md:space-y-8', // Much more vertical space
    stackSmall: 'space-y-4 md:space-y-6', 
    stackLarge: 'space-y-8 md:space-y-12', 
    inline: 'space-x-6 md:space-x-8', 
    inlineSmall: 'space-x-4 md:space-x-6',
  },
  
  // Grid spacing (responsive gaps)
  grid: {
    gap: 'gap-6 md:gap-8 lg:gap-10', // Responsive grid spacing
    gapSmall: 'gap-4 md:gap-6', 
    gapLarge: 'gap-8 md:gap-12 lg:gap-16', 
  },
  
  // Menu-specific spacing
  menu: {
    sectionGap: 'mb-12 md:mb-16', // Large gaps between menu sections
    itemGap: 'gap-6 md:gap-8', // Space between menu items
    cardPadding: 'p-6 md:p-8', // Generous card padding
  },
};