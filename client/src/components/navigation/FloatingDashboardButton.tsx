import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { motion } from 'framer-motion'

interface FloatingDashboardButtonProps {
  /**
   * Position of the floating button
   */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  /**
   * Show/hide the button
   */
  show?: boolean
  /**
   * Custom destination (defaults to "/")
   */
  to?: string
}

export function FloatingDashboardButton({ 
  position = 'bottom-right', 
  show = true,
  to = "/"
}: FloatingDashboardButtonProps) {
  if (!show) return null

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`fixed ${positionClasses[position]} z-50`}
    >
      <Link
        to={to}
        className="flex items-center justify-center w-14 h-14 bg-macon-navy text-white rounded-full shadow-xl hover:bg-macon-navy/90 hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-macon-navy/20"
        aria-label="Return to Dashboard"
      >
        <Home className="w-6 h-6" aria-hidden="true" />
      </Link>
    </motion.div>
  )
}