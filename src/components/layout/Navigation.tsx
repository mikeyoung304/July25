import React from 'react'
import { Link } from 'react-router-dom'
import { Home, Utensils, Mic, History, Activity } from 'lucide-react'

export function Navigation() {
  return (
    <nav className="bg-white shadow-sm border-b" id="navigation" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex" role="list">
            <Link 
              to="/" 
              className="flex items-center px-4 text-gray-900 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              role="listitem"
              aria-label="Home page"
            >
              <Home className="h-5 w-5 mr-2" aria-hidden="true" />
              Home
            </Link>
            <Link 
              to="/kitchen" 
              className="flex items-center px-4 text-gray-900 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              role="listitem"
              aria-label="Kitchen Display System"
            >
              <Utensils className="h-5 w-5 mr-2" aria-hidden="true" />
              Kitchen Display
            </Link>
            <Link 
              to="/kiosk" 
              className="flex items-center px-4 text-gray-900 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              role="listitem"
              aria-label="Voice Ordering Kiosk"
            >
              <Mic className="h-5 w-5 mr-2" aria-hidden="true" />
              Voice Kiosk
            </Link>
            <Link 
              to="/history" 
              className="flex items-center px-4 text-gray-900 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              role="listitem"
              aria-label="Order History and Analytics"
            >
              <History className="h-5 w-5 mr-2" aria-hidden="true" />
              Order History
            </Link>
            <Link 
              to="/performance" 
              className="flex items-center px-4 text-gray-900 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              role="listitem"
              aria-label="Performance Monitoring Dashboard"
            >
              <Activity className="h-5 w-5 mr-2" aria-hidden="true" />
              Performance
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}