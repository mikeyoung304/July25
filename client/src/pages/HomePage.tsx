import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, ChefHat, ShoppingCart, Settings, Globe, Package } from 'lucide-react'
import { BrandHeader } from '@/components/layout/BrandHeader'
import { BrandHeaderPresets } from '@/components/layout/BrandHeaderPresets'

interface NavigationCardProps {
  title: string
  icon: React.ReactNode
  href: string
  color: string
  delay?: number
}

function NavigationCard({ title, icon, href, color, delay = 0 }: NavigationCardProps) {
  return (
    <motion.div
      className="h-full min-h-[200px] md:min-h-[250px]"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.08, duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link to={href} data-testid={title === 'Online Order' ? 'nav-order' : undefined} className="block h-full">
        <div
          className="relative h-full rounded-2xl p-8 md:p-10 lg:p-12 flex flex-col items-center justify-center text-white shadow-xl cursor-pointer overflow-hidden group transition-all duration-200"
          style={{ backgroundColor: color }}
        >
          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
          <div className="relative z-10 flex flex-col items-center space-y-4 md:space-y-6">
            {React.cloneElement(icon as React.ReactElement, { 
              className: "h-16 w-16 md:h-20 md:w-20 lg:h-24 lg:w-24" 
            })}
            <h3 className="text-white font-bold text-xl md:text-2xl lg:text-3xl">
              {title}
            </h3>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export function HomePage() {
  // Original color palette - solid, professional colors
  const navigationOptions = [
    {
      title: 'Server',
      icon: <Users />,
      href: '/server',
      color: '#2A4B5C', // Deep blue-gray
    },
    {
      title: 'Kitchen',
      icon: <ChefHat />,
      href: '/kitchen',
      color: '#FF6B35', // Vibrant orange
    },
    {
      title: 'Kiosk',
      icon: <ShoppingCart />,
      href: '/kiosk',
      color: '#4ECDC4', // Teal
    },
    {
      title: 'Online Order',
      icon: <Globe />,
      href: '/order',
      color: '#7B68EE', // Medium purple
    },
    {
      title: 'Admin',
      icon: <Settings />,
      href: '/admin',
      color: '#88B0A4', // Sage green
    },
    {
      title: 'Expo',
      icon: <Package />,
      href: '/expo',
      color: '#F4A460', // Sandy brown
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      {/* Logo and Title - Using BrandHeader with HomePage preset */}
      <BrandHeader 
        {...BrandHeaderPresets.homepage}
        className="py-6 md:py-8"
      />

      {/* Navigation Grid - Use all available space */}
      <div className="flex-1 px-4 md:px-8 lg:px-12 pb-4 md:pb-8">
        <div className="h-full grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 lg:gap-6 max-w-screen-2xl mx-auto">
          {navigationOptions.map((option, index) => (
            <NavigationCard
              key={option.title}
              title={option.title}
              icon={option.icon}
              href={option.href}
              color={option.color}
              delay={index}
            />
          ))}
        </div>
      </div>
    </div>
  )
}