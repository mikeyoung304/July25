import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Utensils, Mic, History, Activity } from 'lucide-react'

export function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Restaurant Management System</h1>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5" />
                Kitchen Display System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Real-time order management for kitchen staff. Track orders from new to ready.
              </p>
              <Link to="/kitchen">
                <Button className="w-full">View Kitchen Display</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Voice Ordering Kiosk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Natural language voice ordering system. Customers can speak their orders.
              </p>
              <Link to="/kiosk">
                <Button className="w-full">Try Voice Kiosk</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Order History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                View past orders, analyze performance metrics, and export data.
              </p>
              <Link to="/history">
                <Button className="w-full">View Order History</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Performance Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Monitor system performance, API response times, and component metrics.
              </p>
              <Link to="/performance">
                <Button className="w-full">View Performance</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}