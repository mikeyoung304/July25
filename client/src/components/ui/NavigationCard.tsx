import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SectionTitle } from '@/components/ui/Typography'

interface NavigationCardProps {
  title: string
  icon: React.ReactNode
  href: string
  color: string
  delay?: number
  onClick?: () => void
  disabled?: boolean
}

export function NavigationCard({ 
  title, 
  icon, 
  href, 
  color, 
  delay = 0,
  onClick,
  disabled = false
}: NavigationCardProps) {
  const cardContent = (
    <div
      className={`relative h-64 rounded-2xl p-8 flex flex-col items-center justify-center text-white shadow-large overflow-hidden group ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      style={{ backgroundColor: disabled ? '#9CA3AF' : color }}
    >
      <div className={`absolute inset-0 bg-black transition-opacity duration-300 ${
        disabled ? 'opacity-20' : 'opacity-0 group-hover:opacity-10'
      }`} />
      <div className="relative z-10 flex flex-col items-center space-y-4">
        {icon}
        <SectionTitle as="h3" className="text-white text-center">
          {title}
        </SectionTitle>
      </div>
    </div>
  )

  const motionWrapper = (children: React.ReactNode) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.1, duration: 0.3 }}
      whileHover={!disabled ? { scale: 1.05 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )

  if (disabled || !href) {
    return motionWrapper(cardContent)
  }

  return motionWrapper(
    <Link to={href}>
      {cardContent}
    </Link>
  )
}

interface ActionCardProps {
  title: string
  description?: string
  icon: React.ReactNode
  color: string
  onClick?: () => void
  delay?: number
  disabled?: boolean
  compact?: boolean
}

export function ActionCard({
  title,
  description,
  icon,
  color,
  onClick,
  delay = 0,
  disabled = false,
  compact = false
}: ActionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.3 }}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
    >
      <div
        className={`relative ${compact ? 'h-32' : 'h-48'} rounded-2xl p-6 flex flex-col items-center justify-center text-white shadow-large overflow-hidden group ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        style={{ backgroundColor: disabled ? '#9CA3AF' : color }}
        onClick={disabled ? undefined : onClick}
      >
        <div className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          disabled ? 'opacity-20' : 'opacity-0 group-hover:opacity-10'
        }`} />
        <div className="relative z-10 flex flex-col items-center space-y-2 text-center">
          {icon}
          <SectionTitle as="h3" className="text-white text-lg">
            {title}
          </SectionTitle>
          {description && (
            <p className="text-white/80 text-sm">{description}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}