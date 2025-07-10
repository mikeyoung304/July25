import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, ChefHat, ShoppingCart, Settings } from 'lucide-react'

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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.1, duration: 0.3 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link to={href}>
        <div
          className="relative h-64 rounded-2xl p-8 flex flex-col items-center justify-center text-white shadow-large cursor-pointer overflow-hidden group"
          style={{ backgroundColor: color }}
        >
          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
          <div className="relative z-10 flex flex-col items-center space-y-4">
            {icon}
            <h2 className="text-3xl font-bold">{title}</h2>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export function HomePage() {
  const navigationOptions = [
    {
      title: 'Server',
      icon: <Users className="h-16 w-16" />,
      href: '/server',
      color: '#2A4B5C',
    },
    {
      title: 'Kitchen',
      icon: <ChefHat className="h-16 w-16" />,
      href: '/kitchen',
      color: '#FF6B35',
    },
    {
      title: 'Kiosk',
      icon: <ShoppingCart className="h-16 w-16" />,
      href: '/kiosk',
      color: '#4ECDC4',
    },
    {
      title: 'Admin',
      icon: <Settings className="h-16 w-16" />,
      href: '/admin',
      color: '#88B0A4',
    },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FBFBFA' }}>
      <div className="w-full max-w-7xl px-8">
        {/* Logo and Title */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <img
            src="/transparent.png"
            alt="MACON AI SOLUTIONS"
            className="h-20 w-auto mx-auto mb-8 object-contain"
          />
          <h1 className="text-4xl font-bold text-macon-logo-blue">
            Restaurant OS
          </h1>
        </motion.div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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