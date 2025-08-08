import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ActionButtonProps {
  children: React.ReactNode
  icon?: React.ReactNode
  onClick?: () => void
  color?: string
  size?: 'small' | 'medium' | 'large' | 'xl'
  variant?: 'solid' | 'outline' | 'ghost'
  disabled?: boolean
  fullWidth?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

export function ActionButton({
  children,
  icon,
  onClick,
  color = '#2A4B5C',
  size = 'large',
  variant = 'solid',
  disabled = false,
  fullWidth = false,
  className = '',
  type = 'button'
}: ActionButtonProps) {
  const sizeClasses = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg',
    xl: 'px-10 py-6 text-xl'
  }

  const baseClasses = cn(
    'rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center gap-3',
    sizeClasses[size],
    fullWidth ? 'w-full' : '',
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
    className
  )

  const variantStyles = {
    solid: {
      backgroundColor: disabled ? '#9CA3AF' : color,
      color: 'white',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    },
    outline: {
      backgroundColor: 'transparent',
      border: `2px solid ${disabled ? '#9CA3AF' : color}`,
      color: disabled ? '#9CA3AF' : color
    },
    ghost: {
      backgroundColor: 'transparent',
      color: disabled ? '#9CA3AF' : color
    }
  }

  return (
    <motion.button
      type={type}
      className={baseClasses}
      style={variantStyles[variant]}
      onClick={disabled ? undefined : onClick}
      whileHover={!disabled ? { scale: 1.05 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {icon && <span className={size === 'xl' ? 'text-2xl' : ''}>{icon}</span>}
      {children}
    </motion.button>
  )
}

interface IconButtonProps {
  icon: React.ReactNode
  onClick?: () => void
  color?: string
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  className?: string
  label?: string
}

export function IconButton({
  icon,
  onClick,
  color = '#2A4B5C',
  size = 'medium',
  disabled = false,
  className = '',
  label
}: IconButtonProps) {
  const sizeClasses = {
    small: 'w-10 h-10',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  }

  return (
    <motion.button
      className={cn(
        'rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200',
        sizeClasses[size],
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className
      )}
      style={{ backgroundColor: disabled ? '#9CA3AF' : color }}
      onClick={disabled ? undefined : onClick}
      whileHover={!disabled ? { scale: 1.1 } : undefined}
      whileTap={!disabled ? { scale: 0.9 } : undefined}
      aria-label={label}
    >
      {icon}
    </motion.button>
  )
}