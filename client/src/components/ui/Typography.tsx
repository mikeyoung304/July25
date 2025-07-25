import React from 'react';
import { cn } from '@/lib/utils';
import { getTypographyClasses } from '@/lib/typography';

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

// Page Title (h1)
export const PageTitle: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'h1' 
}) => (
  <Component className={cn(getTypographyClasses('h1'), 'text-primary', className)}>
    {children}
  </Component>
);

// Section Title (h2)
export const SectionTitle: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'h2' 
}) => (
  <Component className={cn(getTypographyClasses('h2'), 'text-primary', className)}>
    {children}
  </Component>
);

// Card Title (h3)
export const CardTitle: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'h3' 
}) => (
  <Component className={cn(getTypographyClasses('h3'), 'text-primary', className)}>
    {children}
  </Component>
);

// Subtitle (h4)
export const Subtitle: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'h4' 
}) => (
  <Component className={cn(getTypographyClasses('h4'), 'text-primary', className)}>
    {children}
  </Component>
);

// Body Text
export const Body: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'p' 
}) => (
  <Component className={cn(getTypographyClasses('body'), 'text-neutral-700', className)}>
    {children}
  </Component>
);

// Large Body Text
export const BodyLarge: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'p' 
}) => (
  <Component className={cn(getTypographyClasses('bodyLarge'), 'text-neutral-700', className)}>
    {children}
  </Component>
);

// Small Body Text
export const BodySmall: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'p' 
}) => (
  <Component className={cn(getTypographyClasses('bodySmall'), 'text-neutral-600', className)}>
    {children}
  </Component>
);

// Label Text
export const Label: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'span' 
}) => (
  <Component className={cn(getTypographyClasses('label'), 'text-neutral-700', className)}>
    {children}
  </Component>
);

// Caption Text
export const Caption: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'span' 
}) => (
  <Component className={cn(getTypographyClasses('caption'), 'text-neutral-500', className)}>
    {children}
  </Component>
);

// Statistic
export const Stat: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'div' 
}) => (
  <Component className={cn(getTypographyClasses('stat'), 'text-primary', className)}>
    {children}
  </Component>
);

// Price
export const Price: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'span' 
}) => (
  <Component className={cn(getTypographyClasses('price'), 'text-accent', className)}>
    {children}
  </Component>
);

// Export all components
export const Typography = {
  PageTitle,
  SectionTitle,
  CardTitle,
  Subtitle,
  Body,
  BodyLarge,
  BodySmall,
  Label,
  Caption,
  Stat,
  Price,
};