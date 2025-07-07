import React, { forwardRef } from 'react'
import { cn } from '@/utils/cn'
import { Box, BoxProps } from './Box'
import { spacing } from '../tokens'

type SpacingValue = keyof typeof spacing | number | string

export interface StackProps extends Omit<BoxProps, 'display' | 'flexDirection' | 'gap'> {
  direction?: 'horizontal' | 'vertical'
  spacing?: SpacingValue
  align?: BoxProps['alignItems']
  justify?: BoxProps['justifyContent']
  wrap?: boolean
  reverse?: boolean
  divider?: React.ReactNode
  fullWidth?: boolean
  fullHeight?: boolean
}

export const Stack = forwardRef<HTMLDivElement, StackProps>(({
  direction = 'vertical',
  spacing: spacingProp = 3,
  align = 'stretch',
  justify = 'flex-start',
  wrap = false,
  reverse = false,
  divider,
  fullWidth = false,
  fullHeight = false,
  children,
  className,
  ...props
}, ref) => {
  const isHorizontal = direction === 'horizontal'
  
  let flexDirection: BoxProps['flexDirection'] = isHorizontal ? 'row' : 'column'
  if (reverse) {
    flexDirection = isHorizontal ? 'row-reverse' : 'column-reverse'
  }
  
  // If divider is provided, we need to handle spacing differently
  if (divider) {
    const childrenArray = React.Children.toArray(children)
    const childrenWithDividers = childrenArray.reduce<React.ReactNode[]>((acc, child, index) => {
      if (index === 0) return [child]
      
      const dividerElement = (
        <Box
          key={`divider-${index}`}
          className={cn(
            isHorizontal ? 'h-full' : 'w-full',
            'flex-shrink-0'
          )}
        >
          {divider}
        </Box>
      )
      
      return [...acc, dividerElement, child]
    }, [])
    
    return (
      <Box
        ref={ref}
        display="flex"
        flexDirection={flexDirection}
        alignItems={align}
        justifyContent={justify}
        gap={spacingProp}
        width={fullWidth ? '100%' : undefined}
        height={fullHeight ? '100%' : undefined}
        className={cn(
          wrap && 'flex-wrap',
          className
        )}
        {...props}
      >
        {childrenWithDividers}
      </Box>
    )
  }
  
  return (
    <Box
      ref={ref}
      display="flex"
      flexDirection={flexDirection}
      alignItems={align}
      justifyContent={justify}
      gap={spacingProp}
      width={fullWidth ? '100%' : undefined}
      height={fullHeight ? '100%' : undefined}
      className={cn(
        wrap && 'flex-wrap',
        className
      )}
      {...props}
    >
      {children}
    </Box>
  )
})

Stack.displayName = 'Stack'

// Convenience components
export const HStack = forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>(
  (props, ref) => <Stack ref={ref} direction="horizontal" {...props} />
)
HStack.displayName = 'HStack'

export const VStack = forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>(
  (props, ref) => <Stack ref={ref} direction="vertical" {...props} />
)
VStack.displayName = 'VStack'

// Center component for easy centering
export interface CenterProps extends Omit<BoxProps, 'display' | 'alignItems' | 'justifyContent'> {
  inline?: boolean
}

export const Center = forwardRef<HTMLDivElement, CenterProps>(({
  inline = false,
  className,
  ...props
}, ref) => (
  <Box
    ref={ref}
    display={inline ? 'inline-flex' : 'flex'}
    alignItems="center"
    justifyContent="center"
    className={className}
    {...props}
  />
))
Center.displayName = 'Center'

// Spacer component for flexible spacing
export interface SpacerProps {
  size?: SpacingValue
  horizontal?: boolean
}

export const Spacer: React.FC<SpacerProps> = ({ size, horizontal = false }) => {
  if (!size) {
    return <Box flex="1" />
  }
  
  return (
    <Box
      width={horizontal ? size : undefined}
      height={!horizontal ? size : undefined}
      flexShrink={0}
    />
  )
}
Spacer.displayName = 'Spacer'