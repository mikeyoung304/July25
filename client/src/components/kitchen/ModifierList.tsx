import { cn } from '@/utils'
import {
  getModifierType,
  MODIFIER_STYLES,
  MODIFIER_ICONS,
  MODIFIER_TEXT_PREFIX
} from '@rebuild/shared/config/kds'

interface ModifierListProps {
  modifiers: Array<{ name: string; price?: number }> | undefined
  size?: 'sm' | 'base' | 'lg' | 'xl'
  className?: string
}

/**
 * Displays order modifiers with color-coded types and accessibility support
 *
 * Features:
 * - Color-coded by type (removal, addition, allergy, temperature, substitution)
 * - Allergy modifiers have visible "ALLERGY:" label and screen reader support
 * - Configurable text size for different contexts (cards vs overlay)
 *
 * Used by: OrderCard, OrderGroupCard, FocusOverlay
 */
export function ModifierList({ modifiers, size = 'sm', className }: ModifierListProps) {
  if (!modifiers?.length) return null

  const sizeClass = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }[size]

  return (
    <div className={className}>
      {modifiers.map((mod, i) => {
        const modType = getModifierType(mod.name)
        const isAllergy = modType === 'allergy'

        return (
          <div
            key={`${mod.name}-${i}`}
            className={cn(sizeClass, MODIFIER_STYLES[modType])}
          >
            <span aria-hidden="true">{MODIFIER_ICONS[modType]} </span>
            {isAllergy && <span className="sr-only">ALLERGY WARNING: </span>}
            {isAllergy && <span className="font-bold uppercase mr-1">ALLERGY:</span>}
            {mod.name}
          </div>
        )
      })}
    </div>
  )
}
