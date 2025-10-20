import React from 'react'

interface LoadingOverlayProps {
  isLoading: boolean
  isAutoFitting: boolean
  tableCount: number
}

/**
 * Loading overlay for floor plan operations
 * Extracted from FloorPlanEditor for better component organization
 */
export function LoadingOverlay({ isLoading, isAutoFitting, tableCount }: LoadingOverlayProps) {
  if (!isAutoFitting && !(isLoading && tableCount === 0)) {
    return null
  }

  return (
    <div className="absolute inset-0 bg-gray-50/60 backdrop-blur-sm flex items-center justify-center z-10">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-sm text-gray-600 font-medium">
          {isAutoFitting ? 'Optimizing layout...' : 'Loading floor plan...'}
        </p>
      </div>
    </div>
  )
}
