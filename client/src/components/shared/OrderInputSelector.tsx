import { motion } from 'framer-motion'
import { Mic, Hand } from 'lucide-react'
import { cn } from '@/utils'

export type OrderInputMode = 'voice' | 'touch'

export interface OrderInputSelectorProps {
  /**
   * Currently selected mode
   */
  mode: OrderInputMode

  /**
   * Callback when mode changes
   */
  onChange: (mode: OrderInputMode) => void

  /**
   * Optional className for custom styling
   */
  className?: string

  /**
   * Disable the selector
   */
  disabled?: boolean

  /**
   * Size variant
   */
  size?: 'medium' | 'large' | 'xl'
}

/**
 * OrderInputSelector - A segmented control for toggling between voice and touch ordering modes
 *
 * Features:
 * - Smooth animations with Framer Motion
 * - Full keyboard accessibility (Tab, Arrow keys, Enter/Space)
 * - ARIA labels and roles for screen readers
 * - Visual feedback for active state
 * - Matches dashboard aesthetic with teal (#4ECDC4) and green (#4CAF50) colors
 */
export function OrderInputSelector({
  mode,
  onChange,
  className = '',
  disabled = false,
  size = 'large'
}: OrderInputSelectorProps) {
  const sizeClasses = {
    medium: {
      container: 'h-14',
      button: 'px-6 text-base',
      icon: 'w-5 h-5'
    },
    large: {
      container: 'h-16',
      button: 'px-8 text-lg',
      icon: 'w-6 h-6'
    },
    xl: {
      container: 'h-20',
      button: 'px-10 text-xl',
      icon: 'w-7 h-7'
    }
  }

  const sizes = sizeClasses[size]

  const handleKeyDown = (event: React.KeyboardEvent, targetMode: OrderInputMode) => {
    if (disabled) return

    // Handle Enter or Space key
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onChange(targetMode)
    }

    // Handle Arrow keys for navigation
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const newMode = mode === 'voice' ? 'touch' : 'voice'
      onChange(newMode)
    }
  }

  return (
    <div
      className={cn(
        'relative inline-flex rounded-2xl p-1.5 bg-gray-100 shadow-inner',
        sizes.container,
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      role="radiogroup"
      aria-label="Order input mode selector"
    >
      {/* Animated background slider */}
      <motion.div
        className="absolute top-1.5 bottom-1.5 rounded-xl shadow-lg"
        style={{
          backgroundColor: mode === 'voice' ? '#4ECDC4' : '#4CAF50'
        }}
        initial={false}
        animate={{
          left: mode === 'voice' ? '0.375rem' : '50%',
          right: mode === 'voice' ? '50%' : '0.375rem'
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30
        }}
      />

      {/* Voice mode button */}
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'voice'}
        aria-label="Voice ordering mode"
        disabled={disabled}
        onClick={() => !disabled && onChange('voice')}
        onKeyDown={(e) => handleKeyDown(e, 'voice')}
        className={cn(
          'relative z-10 flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500',
          sizes.button,
          mode === 'voice' ? 'text-white' : 'text-gray-600 hover:text-gray-800',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        )}
      >
        <motion.div
          animate={{
            scale: mode === 'voice' ? 1.1 : 1,
            rotate: mode === 'voice' ? [0, -5, 5, 0] : 0
          }}
          transition={{
            duration: 0.3
          }}
        >
          <Mic className={sizes.icon} strokeWidth={2.5} />
        </motion.div>
        <span>Voice Order</span>
      </button>

      {/* Touch mode button */}
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'touch'}
        aria-label="Touch ordering mode"
        disabled={disabled}
        onClick={() => !disabled && onChange('touch')}
        onKeyDown={(e) => handleKeyDown(e, 'touch')}
        className={cn(
          'relative z-10 flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500',
          sizes.button,
          mode === 'touch' ? 'text-white' : 'text-gray-600 hover:text-gray-800',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        )}
      >
        <motion.div
          animate={{
            scale: mode === 'touch' ? 1.1 : 1,
            rotate: mode === 'touch' ? [0, 5, -5, 0] : 0
          }}
          transition={{
            duration: 0.3
          }}
        >
          <Hand className={sizes.icon} strokeWidth={2.5} />
        </motion.div>
        <span>Touch Order</span>
      </button>
    </div>
  )
}
