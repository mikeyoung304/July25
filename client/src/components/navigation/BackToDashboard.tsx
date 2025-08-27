import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * Minimal navigation component - standard across all pages
 * No animations, no hover effects, just simple functionality
 */
export function BackToDashboard() {
  return (
    <Link 
      to="/" 
      className="inline-flex items-center gap-2 text-sm text-gray-600"
    >
      <ArrowLeft className="w-4 h-4" />
      Dashboard
    </Link>
  )
}