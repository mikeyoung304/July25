/**
 * Accessibility utilities for kiosk interface
 */

export const ARIA_LABELS = {
  // Mode Selection
  modeSelection: 'Choose ordering method',
  voiceMode: 'Select voice ordering mode - speak your order',
  touchMode: 'Select touch ordering mode - browse menu and add items',
  backToDashboard: 'Return to main dashboard',
  
  // Voice Ordering
  microphoneButton: 'Hold to speak your order',
  voiceStatus: 'Voice recognition status',
  orderSummary: 'Current order summary',
  removeItem: 'Remove item from order',
  
  // Touch Ordering
  menuSearch: 'Search menu items',
  menuFilters: 'Filter menu items',
  menuSort: 'Sort menu items',
  addToCart: 'Add item to cart',
  viewCart: 'View shopping cart',
  
  // Checkout
  contactForm: 'Customer contact information',
  paymentForm: 'Payment information',
  totalAmount: 'Order total amount',
  completeOrder: 'Complete order and process payment'
} as const;

export const ARIA_DESCRIPTIONS = {
  voiceMode: 'Voice ordering allows you to speak your order naturally. Press and hold the microphone button, then say what you would like to order.',
  touchMode: 'Touch ordering lets you browse the full menu with photos and detailed descriptions. You can search, filter, and customize items.',
  paymentForm: 'Secure payment form powered by Square. Your payment information is encrypted and processed securely.'
} as const;

export const KEYBOARD_SHORTCUTS = {
  escape: 'Press Escape to go back or close',
  enter: 'Press Enter to select or confirm',
  space: 'Press Space to activate buttons',
  tab: 'Press Tab to navigate between elements',
  arrow: 'Use arrow keys to navigate options'
} as const;

/**
 * Announce important changes to screen readers
 */
export const announceToScreenReader = (message: string) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  
  document.body.appendChild(announcement);
  announcement.textContent = message;
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Focus management for kiosk interface
 */
export class KioskFocusManager {
  private static instance: KioskFocusManager;
  private focusStack: HTMLElement[] = [];

  static getInstance(): KioskFocusManager {
    if (!KioskFocusManager.instance) {
      KioskFocusManager.instance = new KioskFocusManager();
    }
    return KioskFocusManager.instance;
  }

  pushFocus(element: HTMLElement) {
    const currentFocus = document.activeElement as HTMLElement;
    if (currentFocus) {
      this.focusStack.push(currentFocus);
    }
    element.focus();
  }

  popFocus() {
    const previousFocus = this.focusStack.pop();
    if (previousFocus) {
      previousFocus.focus();
    }
  }

  clearFocusStack() {
    this.focusStack = [];
  }
}

/**
 * High contrast mode detection
 */
export const isHighContrastMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia('(prefers-contrast: high)').matches ||
         window.matchMedia('(-ms-high-contrast: active)').matches;
};

/**
 * Reduced motion preference detection
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Touch-friendly target size validation
 */
export const TOUCH_TARGET_MIN_SIZE = 44; // 44px minimum for touch targets

export const validateTouchTarget = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return rect.width >= TOUCH_TARGET_MIN_SIZE && rect.height >= TOUCH_TARGET_MIN_SIZE;
};

/**
 * Color contrast utilities
 */
export const COLOR_CONTRAST = {
  // WCAG AA compliant color ratios
  normal: 4.5,
  large: 3.0,
  // High contrast theme colors
  highContrast: {
    background: '#000000',
    foreground: '#FFFFFF',
    accent: '#FFFF00',
    error: '#FF6B6B'
  }
} as const;