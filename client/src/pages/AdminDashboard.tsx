import React, { useState, useContext, useCallback } from 'react'
import { ArrowLeft, LayoutGrid, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FloorPlanEditor } from '@/modules/floor-plan/components/FloorPlanEditor'
import { RestaurantContext } from '@/core'
import { Table } from '@/modules/floor-plan/types'
import { PageTitle, SectionTitle, Body } from '@/components/ui/Typography'
import { spacing } from '@/lib/typography'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { BackToDashboard } from '@/components/navigation/BackToDashboard'

function AdminDashboard() {
  const [activeView, setActiveView] = useState<'overview' | 'floorplan' | 'analytics'>('overview')
  const context = useContext(RestaurantContext)
  
  if (!context) {
    throw new Error('AdminDashboard must be used within a RestaurantProvider')
  }
  
  const { restaurant } = context

  const handleSaveFloorPlan = useCallback((tables: Table[]) => {
    // Floor plan saved
  }, [restaurant?.id])
  
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
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className={`${spacing.page.container} py-4 flex items-center justify-between`}>
          <div className="flex items-center space-x-4">
            <BackToDashboard />
            <PageTitle as="h1" className="text-2xl md:text-3xl">Admin Dashboard</PageTitle>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${spacing.page.container} ${spacing.page.padding}`}>
        {activeView === 'overview' && (
          <div>
            <div className={`grid grid-cols-1 md:grid-cols-2 ${spacing.grid.gapLarge} max-w-4xl mx-auto`}>
              {/* Floor Plan Creator */}
              <div
                className={`${spacing.component.card} cursor-pointer bg-white rounded-xl border border-neutral-100/30 p-6`}
                onClick={() => setActiveView('floorplan')}
              >
                <div className={`flex flex-col items-center ${spacing.content.stack}`}>
                  <div className="p-4 rounded-xl bg-macon-logo-blue/10">
                    <LayoutGrid className="h-12 w-12 text-macon-logo-blue" />
                  </div>
                  <SectionTitle as="h2" className="text-center">Floor Plan Creator</SectionTitle>
                  <Body className="text-center">
                    Design and manage your restaurant floor layout with drag-and-drop interface
                  </Body>
                </div>
              </div>

              {/* Analytics */}
              <div
                className={`${spacing.component.card} cursor-pointer bg-white rounded-xl border border-neutral-100/30 p-6`}
                onClick={() => setActiveView('analytics')}
              >
                <div className={`flex flex-col items-center ${spacing.content.stack}`}>
                  <div className="p-4 rounded-xl bg-macon-teal/10">
                    <BarChart3 className="h-12 w-12 text-macon-teal" />
                  </div>
                  <SectionTitle as="h2" className="text-center">Analytics</SectionTitle>
                  <Body className="text-center">
                    View restaurant performance metrics and operational insights
                  </Body>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'floorplan' && (
          <div>
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => setActiveView('overview')}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin Overview
              </Button>
              <h2 className="text-3xl font-bold text-macon-logo-blue mb-2">Floor Plan Creator</h2>
              <p className="text-neutral-600">Create and manage your restaurant floor layout</p>
            </div>
            
            <div className="bg-white rounded-lg border border-neutral-200 p-4" style={{ height: 'calc(100vh - 200px)' }}>
              <FloorPlanEditor
                restaurantId={restaurant.id}
                onSave={handleSaveFloorPlan}
              />
            </div>
          </div>
        )}

        {activeView === 'analytics' && (
          <div>
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => setActiveView('overview')}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin Overview
              </Button>
              <h2 className="text-3xl font-bold text-macon-logo-blue mb-2">Analytics Dashboard</h2>
              <p className="text-neutral-600">Restaurant performance metrics and insights</p>
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
    </RoleGuard>
  )
}

export default AdminDashboard;