import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingCart, Package, Utensils, BarChart3, Users, Settings } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { SectionTitle } from '@/components/ui/Typography'
import { BrandHeader } from '@/components/layout/BrandHeader'
import { BrandHeaderPresets } from '@/components/layout/BrandHeaderPresets'
import { spacing } from '@/lib/typography'

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
        <Card className={`${spacing.component.card} h-full min-h-[250px] group cursor-pointer hover:shadow-elevation-3 transition-all duration-300`}>
          <div className={`flex flex-col items-center justify-center h-full ${spacing.content.stackLarge}`}>
            <div
              className={`p-4 rounded-xl transition-transform duration-300 group-hover:scale-110 ${iconBg}`}
            >
              {icon}
            </div>
            <SectionTitle as="h2">
              {title}
            </SectionTitle>
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
        <div className={`relative ${spacing.page.container}`}>
          <div className={`flex flex-col items-center ${spacing.content.stackLarge}`}>
            {/* Use BrandHeader with dashboard preset */}
            <BrandHeader 
              {...BrandHeaderPresets.dashboard}
              className="mb-8"
            />
            
            <div className={`grid md:grid-cols-3 ${spacing.grid.gapLarge} w-full max-w-5xl`}>
              <DashboardCard
                title="Orders"
                icon={<ShoppingCart className="h-12 w-12 text-secondary" />}
                iconBg="bg-secondary/10"
                href="/history"
                delay={0}
              />
              
              <DashboardCard
                title="Expo"
                icon={<Package className="h-12 w-12 text-accent" />}
                iconBg="bg-accent/10"
                href="/expo"
                delay={1}
              />
              
              <DashboardCard
                title="Kitchen"
                icon={<Utensils className="h-12 w-12 text-primary" />}
                iconBg="bg-primary/10"
                href="/kitchen"
                delay={2}
              />
              
              <DashboardCard
                title="Analytics"
                icon={<BarChart3 className="h-12 w-12 text-emerald-500" />}
                iconBg="bg-emerald-500/10"
                href="/analytics"
                delay={3}
              />
              
              <DashboardCard
                title="Staff"
                icon={<Users className="h-12 w-12 text-blue-500" />}
                iconBg="bg-blue-500/10"
                href="/staff"
                delay={4}
              />
              
              <DashboardCard
                title="Settings"
                icon={<Settings className="h-12 w-12 text-gray-500" />}
                iconBg="bg-gray-500/10"
                href="/settings"
                delay={5}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}