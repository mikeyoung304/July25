import React, { forwardRef, CSSProperties } from 'react'
import { cn } from '@/utils/cn'
import { spacing, radius, elevation, transitions } from '../tokens'

type SpacingValue = keyof typeof spacing | number | string
type RadiusValue = keyof typeof radius | number | string
type ElevationValue = keyof typeof elevation

export interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType
  
  // Spacing
  p?: SpacingValue | { mobile?: SpacingValue; tablet?: SpacingValue; desktop?: SpacingValue }
  px?: SpacingValue | { mobile?: SpacingValue; tablet?: SpacingValue; desktop?: SpacingValue }
  py?: SpacingValue
  pt?: SpacingValue
  pr?: SpacingValue
  pb?: SpacingValue
  pl?: SpacingValue
  
  m?: SpacingValue
  mx?: SpacingValue
  my?: SpacingValue
  mt?: SpacingValue
  mr?: SpacingValue
  mb?: SpacingValue
  ml?: SpacingValue
  
  // Layout
  display?: CSSProperties['display']
  position?: CSSProperties['position']
  flex?: CSSProperties['flex']
  flexDirection?: CSSProperties['flexDirection']
  alignItems?: CSSProperties['alignItems']
  justifyContent?: CSSProperties['justifyContent']
  gap?: SpacingValue
  flexShrink?: CSSProperties['flexShrink']
  
  // Sizing
  width?: CSSProperties['width']
  height?: CSSProperties['height']
  minWidth?: CSSProperties['minWidth']
  minHeight?: CSSProperties['minHeight']
  maxWidth?: CSSProperties['maxWidth']
  maxHeight?: CSSProperties['maxHeight']
  
  // Visual
  bg?: string
  color?: string
  borderRadius?: RadiusValue
  elevation?: ElevationValue
  opacity?: CSSProperties['opacity']
  transition?: keyof typeof transitions | string
  
  // Other
  overflow?: CSSProperties['overflow']
  cursor?: CSSProperties['cursor']
  zIndex?: CSSProperties['zIndex']
  
  // Position properties
  top?: CSSProperties['top']
  right?: CSSProperties['right']
  bottom?: CSSProperties['bottom']
  left?: CSSProperties['left']
}

function getSpacingValue(value: SpacingValue | { mobile?: SpacingValue; tablet?: SpacingValue; desktop?: SpacingValue } | undefined): string | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'object' && 'mobile' in value) {
    // For responsive values, just use the desktop value for now
    const desktopValue = value.desktop || value.tablet || value.mobile
    if (desktopValue === undefined) return undefined
    if (typeof desktopValue === 'number') return `${desktopValue}px`
    if (typeof desktopValue === 'string' && desktopValue in spacing) {
      return spacing[desktopValue as keyof typeof spacing]
    }
    return desktopValue
  }
  if (typeof value === 'number') return `${value}px`
  if (typeof value === 'string' && value in spacing) {
    return spacing[value as keyof typeof spacing]
  }
  return value as string
}

function getRadiusValue(value: RadiusValue | undefined): string | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'number') return `${value}px`
  if (typeof value === 'string' && value in radius) {
    return radius[value as keyof typeof radius]
  }
  return value
}

function getElevationStyles(value: ElevationValue | undefined): CSSProperties {
  if (value === undefined || value === 0) return {}
  const elevationStyle = elevation[value]
  if (typeof elevationStyle === 'string') return { boxShadow: elevationStyle }
  return {
    boxShadow: elevationStyle.boxShadow,
    zIndex: elevationStyle.zIndex,
  }
}

export const Box = forwardRef<HTMLDivElement, BoxProps>(({
  as: Component = 'div',
  
  // Spacing props
  p, px, py, pt, pr, pb, pl,
  m, mx, my, mt, mr, mb, ml,
  
  // Layout props
  display,
  position,
  flex,
  flexDirection,
  alignItems,
  justifyContent,
  gap,
  flexShrink,
  
  // Sizing props
  width,
  height,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  
  // Visual props
  bg,
  color,
  borderRadius,
  elevation: elevationProp,
  opacity,
  transition,
  
  // Other props
  overflow,
  cursor,
  zIndex,
  
  // Position props
  top,
  right,
  bottom,
  left,
  
  className,
  style,
  ...props
}, ref) => {
  // Calculate padding values
  const paddingTop = getSpacingValue(pt ?? py ?? p)
  const paddingRight = getSpacingValue(pr ?? px ?? p)
  const paddingBottom = getSpacingValue(pb ?? py ?? p)
  const paddingLeft = getSpacingValue(pl ?? px ?? p)
  
  // Calculate margin values
  const marginTop = getSpacingValue(mt ?? my ?? m)
  const marginRight = getSpacingValue(mr ?? mx ?? m)
  const marginBottom = getSpacingValue(mb ?? my ?? m)
  const marginLeft = getSpacingValue(ml ?? mx ?? m)
  
  // Get transition value
  const transitionValue = transition && typeof transition === 'string' && transition in transitions
    ? transitions[transition as keyof typeof transitions]
    : transition
  
  const styles: CSSProperties = {
    // Spacing
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    
    // Layout
    display,
    position,
    flex,
    flexDirection,
    alignItems,
    justifyContent,
    gap: getSpacingValue(gap),
    flexShrink,
    
    // Sizing
    width,
    height,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    
    // Visual
    backgroundColor: bg,
    color,
    borderRadius: getRadiusValue(borderRadius),
    ...getElevationStyles(elevationProp),
    opacity,
    transition: transitionValue,
    
    // Other
    overflow,
    cursor,
    zIndex,
    
    // Position properties
    top,
    right,
    bottom,
    left,
    
    // Merge with provided styles
    ...style,
  }
  
  return (
    <Component
      ref={ref}
      className={cn(className)}
      style={styles}
      {...props}
    />
  )
})

Box.displayName = 'Box'