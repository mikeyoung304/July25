import React from 'react'

/**
 * Instructions overlay for canvas controls
 * Extracted from FloorPlanEditor for better component organization
 */
export function CanvasInstructions() {
  return (
    <div className="absolute bottom-6 right-6 z-10">
      <div className="text-xs text-gray-500 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm space-y-1">
        <p>Click tables to select • Drag to move • Scroll to zoom • Shift+drag to pan</p>
        <p>R/E to rotate • Shift+R/E for 45° • Ctrl+0 to reset rotation</p>
      </div>
    </div>
  )
}
