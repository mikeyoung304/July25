import React from 'react'
import { motion } from 'framer-motion'
import { spacing } from '@/lib/typography'

interface PageLayoutProps {
  children: React.ReactNode
  className?: string
  centered?: boolean
  fullHeight?: boolean
}

export function PageLayout({ 
  children, 
  className = '',
  centered = false,
  fullHeight = true
}: PageLayoutProps) {
  return (
    <div className={`${fullHeight ? 'min-h-screen' : ''} bg-macon-background ${className}`}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`${centered ? 'flex items-center justify-center min-h-screen' : ''}`}
      >
        <div className={`w-full ${spacing.page.container} ${spacing.page.padding}`}>
          {children}
        </div>
      </motion.div>
    </div>
  )
}

interface PageContentProps {
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl' | 'full'
  className?: string
}

export function PageContent({ 
  children, 
  maxWidth = '6xl',
  className = ''
}: PageContentProps) {
  const maxWidthClasses = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    'full': 'max-w-full'
  }

  return (
    <div className={`${maxWidthClasses[maxWidth]} mx-auto ${className}`}>
      {children}
    </div>
  )
}

interface GridLayoutProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  gap?: 'small' | 'medium' | 'large'
  className?: string
}

export function GridLayout({
  children,
  columns = 3,
  gap = 'large',
  className = ''
}: GridLayoutProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-6'
  }

  const gapClasses = {
    'small': spacing.grid.gapSmall,
    'medium': spacing.grid.gap,
    'large': spacing.grid.gapLarge
  }

  return (
    <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  )
}