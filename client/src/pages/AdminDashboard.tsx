import React, { useState, useContext, useCallback, useEffect } from 'react'
import { ArrowLeft, LayoutGrid, BarChart3 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FloorPlanEditor } from '@/modules/floor-plan/components/FloorPlanEditor'
import { RestaurantContext } from '@/core'
import { Table } from '@/modules/floor-plan/types'
import { PageTitle, SectionTitle, Body } from '@/components/ui/Typography'
import { spacing } from '@/lib/typography'
import { RoleGuard } from '@/components/auth/RoleGuard'
// import { BackToDashboard } from '@/components/navigation/BackToDashboard'
import { setCurrentRestaurantId } from '@/services/http/httpClient'
import { logger } from '@/services/logger'

interface AdminDashboardCardProps {
  title: string
  icon: React.ReactNode
  iconBg: string
  onClick: () => void
  delay?: number
}

function AdminDashboardCard({ 
  title, 
  icon, 
  iconBg, 
  onClick,
  delay = 0 
}: AdminDashboardCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.5, ease: 'easeOut' }}
    >
      <Card 
        className={`${spacing.component.card} h-full min-h-[250px] group cursor-pointer hover:shadow-elevation-3 transition-all duration-300`}
        onClick={onClick}
      >
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
    </motion.div>
  )
}

function AdminDashboard() {
  const [activeView, setActiveView] = useState<'overview' | 'floorplan' | 'analytics'>('overview')
  const context = useContext(RestaurantContext)
  
  if (!context) {
    throw new Error('AdminDashboard must be used within a RestaurantProvider')
  }
  
  const { restaurant } = context

  // Ensure restaurant ID is set for HTTP client
  useEffect(() => {
    if (restaurant?.id) {
      setCurrentRestaurantId(restaurant.id)
      logger.info('[AdminDashboard] Restaurant context set:', restaurant.id)
    }
  }, [restaurant?.id])

  const handleSaveFloorPlan = useCallback((tables: Table[]) => {
    logger.info('[AdminDashboard] Floor plan saved with tables:', tables.length)
  }, [])
  
  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FBFBFA' }}>
        <div className="text-center">
          <p className="text-neutral-600">Loading restaurant data...</p>
        </div>
      </div>
    )
  }

  return (
    <RoleGuard 
      suggestedRoles={['admin']} 
      pageTitle="Admin Dashboard"
    >
      <div className="min-h-screen bg-macon-background">
      {/* Main Content */}
      <div className="relative overflow-hidden py-20">
        <div className={`relative ${spacing.page.container} ${spacing.page.padding}`}>
        {activeView === 'overview' && (
          <div className={`flex flex-col items-center ${spacing.content.stackLarge}`}>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center space-y-2"
            >
              <PageTitle>
                Restaurant Admin Center
              </PageTitle>
              <Body className="text-neutral-600">
                Configure and manage your restaurant operations
              </Body>
            </motion.div>
            
            <div className={`grid md:grid-cols-2 ${spacing.grid.gapLarge} w-full max-w-5xl`}>
              <AdminDashboardCard
                title="Floor Plan Creator"
                icon={<LayoutGrid className="h-12 w-12 text-primary" />}
                iconBg="bg-primary/10"
                onClick={() => setActiveView('floorplan')}
                delay={0}
              />
              
              <AdminDashboardCard
                title="Analytics"
                icon={<BarChart3 className="h-12 w-12 text-emerald-500" />}
                iconBg="bg-emerald-500/10"
                onClick={() => setActiveView('analytics')}
                delay={1}
              />
            </div>
          </div>
        )}

        {activeView === 'floorplan' && (
          <div className="fixed inset-0 bg-gray-50 z-50">
            <FloorPlanEditor
              restaurantId={restaurant.id}
              onSave={handleSaveFloorPlan}
              onBack={() => setActiveView('overview')}
            />
          </div>
        )}

        {activeView === 'analytics' && (
          <div>
            {/* Header with Back Button */}
            <div className="bg-white border-b border-neutral-200 -mx-8 -mt-20 mb-8 px-8 py-4">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => setActiveView('overview')}
                  className="text-macon-logo-blue hover:bg-macon-logo-blue/10"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Button>
                <div>
                  <PageTitle as="h1" className="text-2xl md:text-3xl">Analytics Dashboard</PageTitle>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Placeholder Analytics Cards */}
              <Card className="p-6 bg-white">
                <h3 className="text-lg font-semibold text-macon-logo-blue mb-2">Daily Orders</h3>
                <p className="text-3xl font-bold text-macon-orange">0</p>
                <p className="text-sm text-neutral-500 mt-1">No data available</p>
              </Card>
              
              <Card className="p-6 bg-white">
                <h3 className="text-lg font-semibold text-macon-logo-blue mb-2">Average Wait Time</h3>
                <p className="text-3xl font-bold text-macon-teal">-- min</p>
                <p className="text-sm text-neutral-500 mt-1">No data available</p>
              </Card>
              
              <Card className="p-6 bg-white">
                <h3 className="text-lg font-semibold text-macon-logo-blue mb-2">Customer Satisfaction</h3>
                <p className="text-3xl font-bold text-green-600">--%</p>
                <p className="text-sm text-neutral-500 mt-1">No data available</p>
              </Card>
            </div>
            
            <Card className="mt-8 p-8 bg-white">
              <div className="flex items-center justify-center h-64 border-2 border-dashed border-neutral-300 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                  <p className="text-lg text-neutral-600">Analytics visualization coming soon</p>
                  <p className="text-sm text-neutral-400 mt-2">Charts and graphs will be displayed here</p>
                </div>
              </div>
            </Card>
          </div>
        )}
        </div>
      </div>
      </div>
    </RoleGuard>
  )
}

export default AdminDashboard;