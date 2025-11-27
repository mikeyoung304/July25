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
      return 'text-green-600';
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
