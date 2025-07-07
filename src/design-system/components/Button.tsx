import React, { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import { 
  colors, 
  spacing, 
  radius, 
  typography, 
  fontWeights,
  transitions,
  shadows
} from '../tokens'

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  rounded?: boolean
  glowing?: boolean
}

const sizeStyles = {
  xs: {
    height: '32px',
    paddingX: spacing[2],
    fontSize: typography.footnote.fontSize,
    gap: spacing[1],
  },
  sm: {
    height: '36px',
    paddingX: spacing[3],
    fontSize: typography.subheadline.fontSize,
    gap: spacing[1.5],
  },
  md: {
    height: '44px',
    paddingX: spacing[4],
    fontSize: typography.callout.fontSize,
    gap: spacing[2],
  },
  lg: {
    height: '52px',
    paddingX: spacing[5],
    fontSize: typography.body.fontSize,
    gap: spacing[2],
  },
  xl: {
    height: '60px',
    paddingX: spacing[6],
    fontSize: typography.bodyLarge.fontSize,
    gap: spacing[3],
  },
}

const variantClasses = {
  primary: 'bg-macon-navy text-white hover:bg-macon-navy-dark active:bg-macon-navy-dark disabled:bg-gray-300',
  secondary: 'bg-macon-orange text-white hover:bg-macon-orange-dark active:bg-orange-700 disabled:bg-gray-300',
  tertiary: 'bg-gray-100 text-gray-900 border border-gray-200 hover:bg-gray-200 hover:border-gray-300 active:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 hover:text-macon-navy active:bg-gray-200 disabled:text-gray-400',
  danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 disabled:bg-gray-300',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  rounded = true,
  glowing = false,
  disabled,
  className,
  children,
  ...props
}, ref) => {
  const sizeStyle = sizeStyles[size]
  const isDisabled = disabled || loading
  
  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={cn(
        // Base styles
        'relative inline-flex items-center justify-center',
        'font-medium whitespace-nowrap select-none',
        'outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'transition-all duration-200',
        
        // Size styles
        'min-w-fit',
        fullWidth && 'w-full',
        
        // Variant styles
        variantClasses[variant],
        
        // Variant focus colors
        variant === 'primary' && 'focus-visible:ring-blue-500',
        variant === 'secondary' && 'focus-visible:ring-orange-500',
        variant === 'tertiary' && 'focus-visible:ring-gray-500',
        variant === 'ghost' && 'focus-visible:ring-gray-400',
        variant === 'danger' && 'focus-visible:ring-red-500',
        
        // States
        !isDisabled && 'cursor-pointer hover:-translate-y-px hover:shadow-md active:translate-y-0 active:shadow-sm',
        isDisabled && 'cursor-not-allowed opacity-60',
        
        // Glow effect
        glowing && !isDisabled && variant === 'primary' && 'shadow-lg shadow-blue-500/25',
        glowing && !isDisabled && variant === 'secondary' && 'shadow-lg shadow-orange-500/25',
        glowing && !isDisabled && variant === 'danger' && 'shadow-lg shadow-red-500/25',
        
        className
      )}
      style={{
        height: sizeStyle.height,
        paddingLeft: sizeStyle.paddingX,
        paddingRight: sizeStyle.paddingX,
        fontSize: sizeStyle.fontSize,
        fontWeight: fontWeights.medium,
        borderRadius: rounded ? radius.button : radius.sm,
      }}
      {...props}
    >
      {/* Loading spinner */}
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      )}
      
      {/* Button content */}
      <span
        className={cn(
          'inline-flex items-center',
          loading && 'opacity-0'
        )}
        style={{ gap: sizeStyle.gap }}
      >
        {icon && iconPosition === 'left' && (
          <span className="flex-shrink-0">
            {icon}
          </span>
        )}
        {children}
        {icon && iconPosition === 'right' && (
          <span className="flex-shrink-0">
            {icon}
          </span>
        )}
      </span>
    </button>
  )
})

Button.displayName = 'Button'

// Icon Button variant
export interface IconButtonProps extends Omit<ButtonProps, 'icon' | 'iconPosition' | 'children'> {
  icon: React.ReactNode
  label: string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
  size = 'md',
  label,
  icon,
  className,
  ...props
}, ref) => {
  const sizeMap = {
    xs: 'h-8 w-8',
    sm: 'h-9 w-9',
    md: 'h-11 w-11',
    lg: 'h-13 w-13',
    xl: 'h-15 w-15',
  }
  
  return (
    <Button
      ref={ref}
      size={size}
      aria-label={label}
      className={cn(
        sizeMap[size],
        '!p-0',
        className
      )}
      {...props}
    >
      {icon}
    </Button>
  )
})

IconButton.displayName = 'IconButton'