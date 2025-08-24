import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, Utensils, Mic, History, Activity, User, ShoppingCart, Menu, X } from 'lucide-react'
import { MaconLogo } from '@/components/brand/MaconLogo'
import { useRole } from '@/contexts/RoleContext'
import { RoleSelector } from '@/components/auth/RoleSelector'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function Navigation() {
  const { currentRole, isRoleSelected } = useRole()
  const [showRoleSelector, setShowRoleSelector] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-2" role="list">
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
                to="/drive-thru" 
                className="flex items-center px-4 py-2.5 rounded-lg text-neutral-700 hover:text-macon-orange hover:bg-macon-orange/5 hover:shadow-soft transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-macon-orange/20 font-medium"
                role="listitem"
                aria-label="Drive-Thru Voice Ordering"
              >
                <Mic className="h-5 w-5 mr-2.5 text-macon-orange" aria-hidden="true" />
                Drive-Thru
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
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-neutral-100 transition-colors"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-neutral-700" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6 text-neutral-700" aria-hidden="true" />
              )}
            </Button>
          </div>

          {/* Desktop Role Selector */}
          <div className="hidden md:flex items-center">
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
      
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div 
          id="mobile-menu"
          className="md:hidden bg-white border-b border-neutral-100 shadow-lg"
        >
          <div className="px-4 py-6 space-y-4">
            {/* Mobile Navigation Links */}
            <div className="space-y-2" role="list">
              <Link 
                to="/" 
                className="flex items-center px-4 py-3 rounded-lg text-neutral-700 hover:text-macon-navy hover:bg-macon-navy/5 transition-all duration-200"
                role="listitem"
                aria-label="Home page"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="h-5 w-5 mr-3" aria-hidden="true" />
                Home
              </Link>
              <Link 
                to="/order" 
                className="flex items-center px-4 py-3 rounded-lg text-neutral-700 hover:text-accent hover:bg-accent/5 transition-all duration-200"
                role="listitem"
                aria-label="Order Online"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ShoppingCart className="h-5 w-5 mr-3 text-accent" aria-hidden="true" />
                Order Online
              </Link>
              <Link 
                to="/kitchen" 
                className="flex items-center px-4 py-3 rounded-lg text-neutral-700 hover:text-macon-navy hover:bg-macon-navy/5 transition-all duration-200"
                role="listitem"
                aria-label="Kitchen Display System"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Utensils className="h-5 w-5 mr-3" aria-hidden="true" />
                Kitchen Display
              </Link>
              <Link 
                to="/kiosk" 
                className="flex items-center px-4 py-3 rounded-lg text-neutral-700 hover:text-macon-orange hover:bg-macon-orange/5 transition-all duration-200"
                role="listitem"
                aria-label="Voice Ordering Kiosk"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Mic className="h-5 w-5 mr-3 text-macon-orange" aria-hidden="true" />
                Voice Kiosk
              </Link>
              <Link 
                to="/drive-thru" 
                className="flex items-center px-4 py-3 rounded-lg text-neutral-700 hover:text-macon-orange hover:bg-macon-orange/5 transition-all duration-200"
                role="listitem"
                aria-label="Drive-Thru Voice Ordering"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Mic className="h-5 w-5 mr-3 text-macon-orange" aria-hidden="true" />
                Drive-Thru
              </Link>
              <Link 
                to="/history" 
                className="flex items-center px-4 py-3 rounded-lg text-neutral-700 hover:text-macon-navy hover:bg-macon-navy/5 transition-all duration-200"
                role="listitem"
                aria-label="Order History and Analytics"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <History className="h-5 w-5 mr-3" aria-hidden="true" />
                Order History
              </Link>
              <Link 
                to="/performance" 
                className="flex items-center px-4 py-3 rounded-lg text-neutral-700 hover:text-macon-teal-dark hover:bg-macon-teal/5 transition-all duration-200"
                role="listitem"
                aria-label="Performance Monitoring Dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Activity className="h-5 w-5 mr-3 text-macon-teal" aria-hidden="true" />
                Performance
              </Link>
            </div>
            
            {/* Mobile Role Selector */}
            <div className="border-t border-neutral-200 pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowRoleSelector(true)
                  setIsMobileMenuOpen(false)
                }}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-lg hover:bg-neutral-100 transition-colors justify-start"
              >
                <User className="h-5 w-5 text-neutral-600" />
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
      )}
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