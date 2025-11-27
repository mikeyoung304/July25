/**
 * KDS (Kitchen Display System) Configuration
 *
 * Consolidated alert thresholds from multiple files into a single source of truth.
 *
 * PHASE 4: Architectural Hardening
 * Previously scattered across 3+ files with inconsistent values (5min, 10min, 15min).
 *
 * @see docs/reports/ARCHITECTURAL_AUDIT_REPORT_V2.md - Line 88, 206
 *
 * Files unified:
 * - client/src/components/kitchen/OrderCard.tsx (10/15 min thresholds)
 * - client/src/pages/KitchenDisplayOptimized.tsx (15 min urgent threshold)
 * - client/src/components/kitchen/ScheduledOrdersSection.tsx (0/5 min thresholds)
 */

/**
 * Standard KDS Alert Thresholds (in minutes)
 *
 * Industry standard for kitchen timing:
 * - Green: 0-10 minutes (on track)
 * - Yellow: 10-15 minutes (warning)
 * - Red: 15+ minutes (urgent)
 */
export const KDS_THRESHOLDS = {
  /**
   * GREEN → YELLOW transition
   * Order has been in the system for 10 minutes
   */
  WARNING_MINUTES: 10,

  /**
   * YELLOW → RED transition
   * Order has been in the system for 15 minutes (urgent)
   */
  URGENT_MINUTES: 15,

  /**
   * Scheduled order warning threshold
   * Fire warning when order is within 5 minutes of scheduled time
   */
  SCHEDULED_WARNING_MINUTES: 5,

  /**
   * Scheduled order immediate threshold
   * Fire immediately when scheduled time is reached (0 minutes)
   */
  SCHEDULED_IMMEDIATE_MINUTES: 0,
} as const;

/**
 * KDS Urgency Levels
 */
export type KDSUrgencyLevel = 'normal' | 'warning' | 'urgent' | 'critical';

/**
 * Calculate urgency level based on elapsed time
 *
 * @param elapsedMinutes - Minutes since order was created
 * @returns Urgency level string
 */
export function getOrderUrgency(elapsedMinutes: number): KDSUrgencyLevel {
  if (elapsedMinutes >= KDS_THRESHOLDS.URGENT_MINUTES) {
    return 'urgent';
  }

  if (elapsedMinutes >= KDS_THRESHOLDS.WARNING_MINUTES) {
    return 'warning';
  }

  return 'normal';
}

/**
 * Get urgency color class for Tailwind CSS
 *
 * @param urgencyLevel - Urgency level string
 * @returns Tailwind CSS color class string
 */
export function getUrgencyColorClass(urgencyLevel: KDSUrgencyLevel): string {
  switch (urgencyLevel) {
    case 'critical':
    case 'urgent':
      return 'text-red-600';
    case 'warning':
      return 'text-yellow-600';
    case 'normal':
    default:
      return 'text-green-700';
  }
}

/**
 * Get card background color class for Tailwind CSS
 *
 * @param urgencyLevel - Urgency level string
 * @returns Tailwind CSS background color class string
 */
export function getUrgencyCardClass(urgencyLevel: KDSUrgencyLevel): string {
  switch (urgencyLevel) {
    case 'critical':
    case 'urgent':
      return 'bg-red-50 border-red-300';
    case 'warning':
      return 'bg-yellow-50 border-yellow-300';
    case 'normal':
    default:
      return 'bg-white border-gray-200';
  }
}

/**
 * Get urgency level for scheduled orders
 *
 * @param minutesUntilFire - Minutes until scheduled fire time
 * @returns Urgency level
 */
export function getScheduledUrgency(minutesUntilFire: number): KDSUrgencyLevel {
  if (minutesUntilFire <= KDS_THRESHOLDS.SCHEDULED_IMMEDIATE_MINUTES) {
    return 'critical'; // Fire now!
  }

  if (minutesUntilFire <= KDS_THRESHOLDS.SCHEDULED_WARNING_MINUTES) {
    return 'warning'; // Fire soon
  }

  return 'normal'; // Plenty of time
}

/**
 * Get scheduled urgency card class
 *
 * @param minutesUntilFire - Minutes until scheduled fire time
 * @returns Tailwind CSS class string
 */
export function getScheduledCardClass(minutesUntilFire: number): string {
  const urgency = getScheduledUrgency(minutesUntilFire);

  switch (urgency) {
    case 'critical':
      return 'bg-red-50 border-red-400';
    case 'warning':
      return 'bg-orange-50 border-orange-400';
    case 'normal':
    default:
      return 'bg-white border-blue-300';
  }
}

/**
 * KDS Display Types
 * - 'drive-thru': All online/pickup/delivery orders (to-go)
 * - 'dine-in': Orders with table assignment
 */
export type KDSDisplayType = 'drive-thru' | 'dine-in';

// ============================================================================
// Card Sizing (Adaptive Layout)
// ============================================================================

/**
 * Card size for adaptive grid layout
 * - standard: 1 column (simple orders)
 * - wide: 2 columns (complex orders)
 * - large: 2 columns + taller (very complex orders)
 */
export type CardSize = 'standard' | 'wide' | 'large';

/**
 * Card sizing configuration
 *
 * Rationale:
 * - Each item = 1 unit of complexity (primary content)
 * - Each modifier = 0.3 units (secondary content, less visual impact)
 *
 * Thresholds tuned based on typical kitchen orders:
 * - Standard (1 col): Simple order (1-4 items, few mods)
 * - Wide (2 cols): Medium complexity (5-9 items or heavy mods)
 * - Large (2 cols tall): Complex orders (10+ items)
 */
export const CARD_SIZING_CONFIG = {
  /** Weight applied to modifier count (modifiers are 30% as important as items) */
  MODIFIER_WEIGHT: 0.3,
  /** Maximum complexity for standard (1-column) card */
  STANDARD_MAX_COMPLEXITY: 5,
  /** Maximum complexity for wide (2-column) card */
  WIDE_MAX_COMPLEXITY: 10,
} as const;

export function getCardSize(itemCount: number, modifierCount: number): CardSize {
  const { MODIFIER_WEIGHT, STANDARD_MAX_COMPLEXITY, WIDE_MAX_COMPLEXITY } = CARD_SIZING_CONFIG;
  const complexity = itemCount + (modifierCount * MODIFIER_WEIGHT);

  if (complexity <= STANDARD_MAX_COMPLEXITY) return 'standard';  // 1 column
  if (complexity <= WIDE_MAX_COMPLEXITY) return 'wide';     // 2 columns
  return 'large';                          // 2 columns + taller
}

/**
 * Tailwind CSS classes for card sizes
 */
export const CARD_SIZE_CLASSES = {
  standard: 'col-span-1',
  wide: 'col-span-1 xl:col-span-2',
  large: 'col-span-1 xl:col-span-2 row-span-2',
} as const;

// ============================================================================
// Order Number Formatting
// ============================================================================

/**
 * Format order number to show last 4 digits only
 * e.g., "20251105-0004" -> "0004"
 *
 * @param orderNumber - Full order number string
 * @returns Last 4 digits, zero-padded
 */
export function formatOrderNumber(orderNumber: string): string {
  if (!orderNumber) return '0000';
  const parts = orderNumber.split('-');
  const lastPart = parts[parts.length - 1] || orderNumber;
  return lastPart.padStart(4, '0');
}

// ============================================================================
// Modifier Type Detection & Styling
// ============================================================================

/**
 * Modifier types for color-coded display
 */
export type ModifierType = 'removal' | 'addition' | 'allergy' | 'temperature' | 'substitution' | 'default';

const REMOVAL_KEYWORDS = ['no ', 'without', 'remove', 'hold'];
const ADDITION_KEYWORDS = ['extra', 'add', 'double', 'triple', 'more'];
const ALLERGY_KEYWORDS = ['allergy', 'allergic', 'gluten', 'dairy', 'nut', 'peanut', 'shellfish', 'celiac'];
const TEMP_KEYWORDS = ['rare', 'medium', 'well', 'well-done', 'hot', 'cold', 'temp'];
const SUB_KEYWORDS = ['sub ', 'substitute', 'instead', 'swap'];

/**
 * Detect modifier type based on keyword matching
 * Priority: allergy > removal > addition > temperature > substitution > default
 *
 * @param modifierName - The modifier text to analyze
 * @returns ModifierType for styling
 */
export function getModifierType(modifierName: string): ModifierType {
  const lower = modifierName.toLowerCase();

  // Allergy takes highest priority (safety critical)
  if (ALLERGY_KEYWORDS.some(k => lower.includes(k))) return 'allergy';
  if (REMOVAL_KEYWORDS.some(k => lower.startsWith(k))) return 'removal';
  if (ADDITION_KEYWORDS.some(k => lower.startsWith(k))) return 'addition';
  if (TEMP_KEYWORDS.some(k => lower.includes(k))) return 'temperature';
  if (SUB_KEYWORDS.some(k => lower.includes(k))) return 'substitution';
  return 'default';
}

/**
 * Tailwind CSS classes for modifier types
 */
export const MODIFIER_STYLES = {
  removal: 'text-red-600',
  addition: 'text-green-600',
  allergy: 'bg-red-100 text-red-800 px-2 py-0.5 rounded font-semibold',
  temperature: 'text-orange-600',
  substitution: 'text-blue-600',
  default: 'text-gray-600',
} as const;

/**
 * Icons/prefixes for modifier types
 */
export const MODIFIER_ICONS = {
  removal: '\u2715',      // ✕
  addition: '+',
  allergy: '\u26A0\uFE0F', // ⚠️
  temperature: '\uD83D\uDD25', // 🔥
  substitution: '\u2194', // ↔
  default: '\u2022',      // •
} as const;

/**
 * Determine KDS display type based on order data
 *
 * Business Rule:
 * - Dine-in: Order has a table_number assigned
 * - Drive-thru: Everything else (online, pickup, delivery without table)
 *
 * @param order - Order object with optional table_number
 * @returns 'dine-in' if table assigned, 'drive-thru' otherwise
 */
export function getKDSDisplayType(order: { table_number?: number | string | null }): KDSDisplayType {
  // Dine-in only if order has table assignment
  if (order.table_number) {
    return 'dine-in';
  }
  // Everything else is drive-thru (online, pickup, delivery)
  return 'drive-thru';
}

/**
 * KDS Type Colors
 * Color-code cards by order type for visual distinction
 */
export const KDS_TYPE_COLORS = {
  'drive-thru': {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700 border-blue-300'
  },
  'dine-in': {
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    badge: 'bg-teal-100 text-teal-700 border-teal-300'
  }
} as const;

/**
 * Get urgency left border accent class
 * Subtle 4px left border indicating order urgency
 *
 * @param urgencyLevel - Urgency level from getOrderUrgency
 * @returns Tailwind CSS left border class
 */
export function getUrgencyAccentClass(urgencyLevel: KDSUrgencyLevel): string {
  switch (urgencyLevel) {
    case 'critical':
    case 'urgent':
      return 'border-l-4 border-l-red-500';
    case 'warning':
      return 'border-l-4 border-l-yellow-400';
    case 'normal':
    default:
      return 'border-l-4 border-l-green-400';
  }
}

// ============================================================================
// Customer Name & Order Label Helpers
// ============================================================================

/**
 * Guest placeholder constant
 * Used to identify anonymous/guest orders in the system
 */
export const GUEST_CUSTOMER_NAME = 'Guest';

/**
 * Extract display name from customer name
 * Returns last name for personalization, or null if customer is guest
 *
 * @param customerName - Full customer name or 'Guest' placeholder
 * @returns Last name or null if guest/invalid
 *
 * @example
 * getDisplayCustomerName('John Smith') // 'Smith'
 * getDisplayCustomerName('Guest') // null
 * getDisplayCustomerName(null) // null
 * getDisplayCustomerName('Madonna') // 'Madonna'
 */
export function getDisplayCustomerName(customerName: string | null | undefined): string | null {
  if (!customerName) return null;

  const trimmed = customerName.trim();
  if (trimmed === GUEST_CUSTOMER_NAME) return null;

  const parts = trimmed.split(' ');
  // Return last part, or whole name if single word
  return parts.length > 1 ? parts[parts.length - 1]! : trimmed;
}

/**
 * Get primary label for order display
 * Priority: Table Number > Customer Name > Order Number
 *
 * @param tableNumber - Table number if dine-in
 * @param customerName - Customer name
 * @param orderNumber - Order number
 * @returns Display label for order
 */
export function getOrderPrimaryLabel(
  tableNumber: number | string | null | undefined,
  customerName: string | null | undefined,
  orderNumber: string
): string {
  if (tableNumber) {
    return `Table ${tableNumber}`;
  }

  const displayName = getDisplayCustomerName(customerName);
  if (displayName) {
    return displayName;
  }

  return `Order #${formatOrderNumber(orderNumber)}`;
}

// ============================================================================
// Accessibility Helpers for Modifiers
// ============================================================================

/**
 * Screen reader text prefixes for modifier types
 * Used to provide context beyond color-coding
 */
export const MODIFIER_TEXT_PREFIX = {
  removal: 'Remove',
  addition: 'Add',
  allergy: 'ALLERGY',
  temperature: 'Temp',
  substitution: 'Sub',
  default: '',
} as const;
