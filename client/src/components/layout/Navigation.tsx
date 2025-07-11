import React from 'react'
import { Link } from 'react-router-dom'
import { Home, Utensils, Mic, History, Activity } from 'lucide-react'
import { MaconLogo } from '@/components/brand/MaconLogo'

export function Navigation() {
  return (
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
        </div>
      </div>
    </nav>
  )
}