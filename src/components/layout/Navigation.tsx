import React from 'react'
import { Link } from 'react-router-dom'
import { Home, Utensils, Mic, History, Activity } from 'lucide-react'
import { MaconLogo } from '@/components/brand/MaconLogo'

export function Navigation() {
  return (
    <nav className="bg-white shadow-md border-b border-gray-100" id="navigation" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link 
              to="/" 
              className="flex-shrink-0 flex items-center mr-8 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-macon-orange rounded-lg"
              aria-label="MACON AI Solutions Home"
            >
              <MaconLogo size="sm" className="h-12 w-auto" />
            </Link>
            <div className="flex space-x-1" role="list">
              <Link 
                to="/" 
                className="flex items-center px-4 py-2 rounded-lg text-gray-700 hover:text-macon-navy hover:bg-macon-navy-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-macon-orange"
                role="listitem"
                aria-label="Home page"
              >
                <Home className="h-5 w-5 mr-2" aria-hidden="true" />
                Home
              </Link>
              <Link 
                to="/kitchen" 
                className="flex items-center px-4 py-2 rounded-lg text-gray-700 hover:text-macon-navy hover:bg-macon-navy-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-macon-orange"
                role="listitem"
                aria-label="Kitchen Display System"
              >
                <Utensils className="h-5 w-5 mr-2" aria-hidden="true" />
                Kitchen Display
              </Link>
              <Link 
                to="/kiosk" 
                className="flex items-center px-4 py-2 rounded-lg text-gray-700 hover:text-macon-navy hover:bg-macon-navy-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-macon-orange"
                role="listitem"
                aria-label="Voice Ordering Kiosk"
              >
                <Mic className="h-5 w-5 mr-2" aria-hidden="true" />
                Voice Kiosk
              </Link>
              <Link 
                to="/history" 
                className="flex items-center px-4 py-2 rounded-lg text-gray-700 hover:text-macon-navy hover:bg-macon-navy-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-macon-orange"
                role="listitem"
                aria-label="Order History and Analytics"
              >
                <History className="h-5 w-5 mr-2" aria-hidden="true" />
                Order History
              </Link>
              <Link 
                to="/performance" 
                className="flex items-center px-4 py-2 rounded-lg text-gray-700 hover:text-macon-navy hover:bg-macon-navy-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-macon-orange"
                role="listitem"
                aria-label="Performance Monitoring Dashboard"
              >
                <Activity className="h-5 w-5 mr-2" aria-hidden="true" />
                Performance
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}