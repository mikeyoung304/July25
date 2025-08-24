import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, Utensils, Mic, History, Activity, User, ShoppingCart } from 'lucide-react'
import { MaconLogo } from '@/components/brand/MaconLogo'
import { useRole } from '@/contexts/RoleContext'
import { RoleSelector } from '@/components/auth/RoleSelector'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function Navigation() {
  const { currentRole, isRoleSelected } = useRole()
  const [showRoleSelector, setShowRoleSelector] = useState(false)

  const roleLabels = {
    server: 'Server',
    kitchen: 'Kitchen',
    admin: 'Admin',
    customer: 'Customer'
  }

  return (
    <>
      <nav className="bg-white/95 backdrop-blur-sm shadow-medium border-b border-neutral-100" id="navigation" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-18">
          <div className="flex items-center">
            <Link 
              to="/" 
              className="flex-shrink-0 flex items-center mr-8 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-macon-orange rounded-lg"
              aria-label="MACON AI Solutions Home"
            >
              <MaconLogo size="sm" className="h-12 w-auto" />
            </Link>
            <div className="flex space-x-2" role="list">
              <Link 
                to="/" 
                className="flex items-center px-4 py-2.5 rounded-lg text-neutral-700 hover:text-macon-navy hover:bg-macon-navy/5 hover:shadow-soft transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-macon-orange/20 font-medium"
                role="listitem"
                aria-label="Home page"
              >
                <Home className="h-5 w-5 mr-2.5" aria-hidden="true" />
                Home
              </Link>
              <Link 
                to="/order" 
                className="flex items-center px-4 py-2.5 rounded-lg text-neutral-700 hover:text-accent hover:bg-accent/5 hover:shadow-soft transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent/20 font-medium"
                role="listitem"
                aria-label="Order Online"
              >
                <ShoppingCart className="h-5 w-5 mr-2.5 text-accent" aria-hidden="true" />
                Order Online
              </Link>
              <Link 
                to="/kitchen" 
                className="flex items-center px-4 py-2.5 rounded-lg text-neutral-700 hover:text-macon-navy hover:bg-macon-navy/5 hover:shadow-soft transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-macon-orange/20 font-medium"
                role="listitem"
                aria-label="Kitchen Display System"
              >
                <Utensils className="h-5 w-5 mr-2.5" aria-hidden="true" />
                Kitchen Display
              </Link>
              <Link 
                to="/kiosk" 
                className="flex items-center px-4 py-2.5 rounded-lg text-neutral-700 hover:text-macon-orange hover:bg-macon-orange/5 hover:shadow-soft transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-macon-orange/20 font-medium"
                role="listitem"
                aria-label="Voice Ordering Kiosk"
              >
                <Mic className="h-5 w-5 mr-2.5 text-macon-orange" aria-hidden="true" />
                Voice Kiosk
              </Link>
              <Link 
                to="/history" 
                className="flex items-center px-4 py-2.5 rounded-lg text-neutral-700 hover:text-macon-navy hover:bg-macon-navy/5 hover:shadow-soft transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-macon-orange/20 font-medium"
                role="listitem"
                aria-label="Order History and Analytics"
              >
                <History className="h-5 w-5 mr-2.5" aria-hidden="true" />
                Order History
              </Link>
              <Link 
                to="/performance" 
                className="flex items-center px-4 py-2.5 rounded-lg text-neutral-700 hover:text-macon-teal-dark hover:bg-macon-teal/5 hover:shadow-soft transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-macon-orange/20 font-medium"
                role="listitem"
                aria-label="Performance Monitoring Dashboard"
              >
                <Activity className="h-5 w-5 mr-2.5 text-macon-teal" aria-hidden="true" />
                Performance
              </Link>
            </div>
          </div>
          
          {/* Role Selector */}
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRoleSelector(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <User className="h-4 w-4 text-neutral-600" />
              {isRoleSelected ? (
                <Badge variant="secondary" className="text-xs">
                  {roleLabels[currentRole!]}
                </Badge>
              ) : (
                <span className="text-sm text-neutral-600">Select Role</span>
              )}
            </Button>
          </div>
        </div>
      </div>
      </nav>
      
      {/* Role Selector Modal */}
      {showRoleSelector && (
        <RoleSelector
          onClose={() => setShowRoleSelector(false)}
          showCloseButton={true}
        />
      )}
    </>
  )
}