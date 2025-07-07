import React, { forwardRef } from 'react'
import { cn } from '@/utils/cn'
import { Box, BoxProps } from './Box'
import { glass, elevation, radius as radiusTokens, colors, transitions } from '../tokens'

type GlassVariant = keyof typeof glass
type SurfaceVariant = 'flat' | 'raised' | 'sunken' | 'glass' | 'glassLight' | 'glassDark'

export interface SurfaceProps extends BoxProps {
  variant?: SurfaceVariant
  glassEffect?: GlassVariant
  interactive?: boolean
  rounded?: boolean | keyof typeof radiusTokens
  blur?: boolean
  border?: boolean
  glow?: boolean
}

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(({
  variant = 'flat',
  glassEffect,
  interactive = false,
  rounded = true,
  blur = true,
  border = true,
  glow = false,
  className,
  style,
  elevation: elevationProp,
  borderRadius,
  transition,
  ...props
}, ref) => {
  // Determine glass variant based on surface variant
  const effectiveGlassEffect = glassEffect || (
    variant === 'glass' ? 'light' :
    variant === 'glassLight' ? 'light' :
    variant === 'glassDark' ? 'dark' :
    undefined
  )
  
  // Get glass styles if applicable
  const glassStyles = effectiveGlassEffect ? glass[effectiveGlassEffect] : {}
  
  // Determine elevation based on variant
  const defaultElevation = 
    variant === 'raised' ? 2 :
    variant === 'sunken' ? 0 :
    variant === 'flat' ? 0 :
    1
  
  // Determine border radius
  const effectiveBorderRadius = borderRadius || (
    rounded === true ? 'card' :
    rounded === false ? 'none' :
    rounded
  )
  
  // Build variant-specific styles
  const variantStyles: React.CSSProperties & { WebkitBackdropFilter?: string } = {
    ...style,
  }
  
  // Apply glass effects
  if (effectiveGlassEffect && blur && 'backdropFilter' in glassStyles) {
    variantStyles.backdropFilter = glassStyles.backdropFilter as string
    variantStyles.WebkitBackdropFilter = ('webkitBackdropFilter' in glassStyles ? glassStyles.webkitBackdropFilter : glassStyles.backdropFilter) as string
  }
  
  if (effectiveGlassEffect && 'background' in glassStyles) {
    variantStyles.background = glassStyles.background as string
    if (border && 'border' in glassStyles) {
      variantStyles.border = glassStyles.border as string
    }
    if (glow && 'boxShadow' in glassStyles) {
      variantStyles.boxShadow = glassStyles.boxShadow as string
    }
  }
  
  // Apply variant-specific backgrounds
  if (variant === 'flat') {
    variantStyles.background = variantStyles.background || colors.surface.primary
  } else if (variant === 'raised') {
    variantStyles.background = variantStyles.background || colors.surface.elevated
  } else if (variant === 'sunken') {
    variantStyles.background = variantStyles.background || colors.surface.secondary
  }
  
  return (
    <Box
      ref={ref}
      elevation={elevationProp ?? defaultElevation}
      borderRadius={effectiveBorderRadius}
      transition={transition || (interactive ? 'all' : undefined)}
      className={cn(
        'relative overflow-hidden',
        interactive && [
          'cursor-pointer',
          'hover:scale-[1.02]',
          'active:scale-[0.98]',
          'transition-all duration-200',
        ],
        className
      )}
      style={variantStyles}
      {...props}
    />
  )
})

Surface.displayName = 'Surface'

// Card component built on Surface
export interface CardProps extends SurfaceProps {
  hoverable?: boolean
  pressable?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({
  variant = 'raised',
  hoverable = false,
  pressable = false,
  interactive = hoverable || pressable,
  className,
  ...props
}, ref) => {
  return (
    <Surface
      ref={ref}
      variant={variant}
      interactive={interactive}
      className={cn(
        hoverable && [
          'hover:shadow-lg',
          'hover:-translate-y-1',
        ],
        pressable && [
          'active:shadow-sm',
          'active:translate-y-0',
        ],
        className
      )}
      {...props}
    />
  )
})

Card.displayName = 'Card'

// Glass Card preset
export interface GlassCardProps extends Omit<SurfaceProps, 'variant' | 'glassEffect'> {
  variant?: 'light' | 'dark' | 'primary' | 'secondary'
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(({
  variant = 'light',
  blur = true,
  border = true,
  className,
  ...props
}, ref) => {
  return (
    <Surface
      ref={ref}
      variant="glass"
      glassEffect={variant as GlassVariant}
      blur={blur}
      border={border}
      className={className}
      {...props}
    />
  )
})

GlassCard.displayName = 'GlassCard'

// Floating Card with shadow and hover effects
export const FloatingCard = forwardRef<HTMLDivElement, CardProps>(({
  elevation: elevationProp = 4,
  hoverable = true,
  className,
  ...props
}, ref) => {
  return (
    <Card
      ref={ref}
      elevation={elevationProp}
      hoverable={hoverable}
      className={cn(
        'transition-all duration-300',
        'hover:shadow-2xl',
        className
      )}
      {...props}
    />
  )
})

FloatingCard.displayName = 'FloatingCard'