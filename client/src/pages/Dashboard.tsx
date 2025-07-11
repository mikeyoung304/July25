import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingCart, Package, Utensils } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface DashboardCardProps {
  title: string
  icon: React.ReactNode
  iconBg: string
  href: string
  delay?: number
}

function DashboardCard({ 
  title, 
  icon, 
  iconBg, 
  href, 
  delay = 0 
}: DashboardCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.5, ease: 'easeOut' }}
    >
      <Link to={href}>
        <Card className="p-8 h-full min-h-[250px] group cursor-pointer hover:shadow-lg transition-shadow duration-300">
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div
              className="p-4 rounded-xl transition-transform duration-300 group-hover:scale-110"
              style={{ backgroundColor: iconBg }}
            >
              {icon}
            </div>
            <h2 className="text-2xl font-bold text-macon-navy">
              {title}
            </h2>
          </div>
        </Card>
      </Link>
    </motion.div>
  )
}

export function Dashboard() {
  return (
    <div className="min-h-screen bg-macon-background">
      <div className="relative overflow-hidden py-20">
        <div className="relative max-w-7xl mx-auto px-8">
          <div className="flex flex-col items-center space-y-12">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center space-y-2"
            >
              <h1 className="text-4xl font-bold text-macon-navy">
                Restaurant Command Center
              </h1>
              <p className="text-gray-600">
                Select a module to manage your operations
              </p>
            </motion.div>
            
            <div className="grid md:grid-cols-3 gap-8 w-full max-w-4xl">
              <DashboardCard
                title="Orders"
                icon={<ShoppingCart className="h-12 w-12 text-macon-orange" />}
                iconBg="#ff6b3533"
                href="/history"
                delay={0}
              />
              
              <DashboardCard
                title="Expo"
                icon={<Package className="h-12 w-12 text-macon-teal" />}
                iconBg="#00b4d833"
                href="/expo"
                delay={1}
              />
              
              <DashboardCard
                title="Kitchen"
                icon={<Utensils className="h-12 w-12 text-macon-navy" />}
                iconBg="#0a253033"
                href="/kitchen"
                delay={2}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}