import React, { forwardRef, CSSProperties } from 'react'
import { cn } from '@/utils/cn'
import { typography, fontWeights, colors, createTextStyle } from '../tokens'
import { Box, type BoxProps } from './Box'

type TypographyVariant = keyof typeof typography
type FontWeight = keyof typeof fontWeights
type TextAlign = 'left' | 'center' | 'right' | 'justify'
type TextTransform = 'uppercase' | 'lowercase' | 'capitalize' | 'normal'
type TextDecoration = 'underline' | 'strikethrough' | 'none'

export interface TextProps extends Omit<BoxProps, 'as'> {
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'blockquote' | 'code' | 'pre'
  variant?: TypographyVariant
  weight?: FontWeight
  align?: TextAlign
  transform?: TextTransform
  decoration?: TextDecoration
  color?: string
  truncate?: boolean
  clamp?: number
  italic?: boolean
  mono?: boolean
}

const getDefaultElement = (variant: TypographyVariant): TextProps['as'] => {
  if (variant.startsWith('display')) return 'h1'
  if (variant === 'title1') return 'h2'
  if (variant === 'title2') return 'h3'
  if (variant === 'title3') return 'h4'
  if (variant === 'headline') return 'h5'
  if (variant === 'subheadline') return 'h6'
  if (variant === 'code' || variant === 'codeSmall') return 'code'
  return 'p'
}

export const Text = forwardRef<any, TextProps>(({
  as,
  variant = 'body',
  weight,
  align,
  transform,
  decoration,
  color: colorProp,
  truncate,
  clamp,
  italic,
  mono,
  className,
  style,
  ...props
}, ref) => {
  const Component = as || getDefaultElement(variant)
  
  // Get typography styles
  const textStyles = createTextStyle(variant, {
    weight,
    color: colorProp,
    align,
    transform,
    decoration,
  })
  
  // Add additional styles
  const additionalStyles: CSSProperties = {
    ...textStyles,
    fontStyle: italic ? 'italic' : undefined,
    fontFamily: mono ? 'var(--font-mono)' : undefined,
  }
  
  // Handle text truncation
  if (truncate) {
    additionalStyles.overflow = 'hidden'
    additionalStyles.textOverflow = 'ellipsis'
    additionalStyles.whiteSpace = 'nowrap'
  }
  
  // Handle line clamping
  if (clamp) {
    additionalStyles.display = '-webkit-box'
    additionalStyles.WebkitLineClamp = clamp
    additionalStyles.WebkitBoxOrient = 'vertical'
    additionalStyles.overflow = 'hidden'
  }
  
  return (
    <Box
      as={Component}
      ref={ref}
      className={cn(
        'transition-colors duration-200',
        className
      )}
      style={{
        ...additionalStyles,
        ...style,
      }}
      {...props}
    />
  )
})

Text.displayName = 'Text'

// Convenience components for common text elements
export const Heading = forwardRef<HTMLHeadingElement, Omit<TextProps, 'as' | 'variant'> & { level?: 1 | 2 | 3 | 4 | 5 | 6 }>(
  ({ level = 1, ...props }, ref) => {
    const variantMap = {
      1: 'title1',
      2: 'title2',
      3: 'title3',
      4: 'headline',
      5: 'subheadline',
      6: 'subheadline',
    } as const
    
    return (
      <Text
        ref={ref}
        as={`h${level}`}
        variant={variantMap[level]}
        {...props}
      />
    )
  }
)
Heading.displayName = 'Heading'

export const Paragraph = forwardRef<HTMLParagraphElement, Omit<TextProps, 'as' | 'variant'> & { size?: 'large' | 'normal' }>(
  ({ size = 'normal', ...props }, ref) => (
    <Text
      ref={ref}
      as="p"
      variant={size === 'large' ? 'bodyLarge' : 'body'}
      {...props}
    />
  )
)
Paragraph.displayName = 'Paragraph'

export const Label = forwardRef<HTMLLabelElement, Omit<TextProps, 'as' | 'variant'>>(
  (props, ref) => (
    <Text
      ref={ref}
      as="label"
      variant="callout"
      weight="medium"
      {...props}
    />
  )
)
Label.displayName = 'Label'

export const Caption = forwardRef<HTMLSpanElement, Omit<TextProps, 'as' | 'variant'>>(
  (props, ref) => (
    <Text
      ref={ref}
      as="span"
      variant="caption"
      color={colors.text.secondary}
      {...props}
    />
  )
)
Caption.displayName = 'Caption'

export const Code = forwardRef<HTMLElement, Omit<TextProps, 'as' | 'variant' | 'mono'> & { inline?: boolean }>(
  ({ inline = true, className, ...props }, ref) => (
    <Text
      ref={ref}
      as={inline ? 'code' : 'pre'}
      variant="code"
      mono
      className={cn(
        inline && 'px-1 py-0.5 bg-gray-100 rounded',
        className
      )}
      {...props}
    />
  )
)
Code.displayName = 'Code'