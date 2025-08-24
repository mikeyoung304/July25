import React from 'react'
import { Button } from '@/components/ui/button'
import { Circle, Square, RectangleHorizontal, Trash2, Copy, Grid, Save, ZoomIn, ZoomOut, RotateCcw, Maximize } from 'lucide-react'
import { Table } from '../types'

interface FloorPlanToolbarProps {
  onAddTable: (type: Table['type']) => void
  onDeleteTable: () => void
  onDuplicateTable: () => void
  onToggleGrid: () => void
  onToggleSnapToGrid: () => void
  onSave: () => void
  showGrid: boolean
  snapToGrid: boolean
  hasSelectedTable: boolean
  zoomLevel: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  onResetView: () => void
  onFitAllTables?: () => void
  isSaving?: boolean
}

export function FloorPlanToolbar({
  onAddTable,
  onDeleteTable,
  onDuplicateTable,
  onToggleGrid,
  onToggleSnapToGrid,
  onSave,
  showGrid,
  snapToGrid,
  hasSelectedTable,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onResetView,
  onFitAllTables,
  isSaving = false,
}: FloorPlanToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        
        {/* Add Tables */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className="text-xs font-medium text-gray-600 mr-1 hidden sm:inline">Tables</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddTable('circle')}
            title="Add Circle Table"
            className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
          >
            <Circle className="h-4 w-4 text-gray-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddTable('square')}
            title="Add Square Table"
            className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
          >
            <Square className="h-4 w-4 text-gray-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddTable('rectangle')}
            title="Add Rectangle Table"
            className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
          >
            <RectangleHorizontal className="h-4 w-4 text-gray-600" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>

        {/* Edit Tools */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDuplicateTable}
            disabled={!hasSelectedTable}
            title="Duplicate Selected Table"
            className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 disabled:opacity-30"
          >
            <Copy className="h-4 w-4 text-gray-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteTable}
            disabled={!hasSelectedTable}
            title="Delete Selected Table"
            className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-200 transition-all duration-200 disabled:opacity-30 group"
          >
            <Trash2 className="h-4 w-4 text-gray-600 group-hover:text-red-600" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>

        {/* View Options */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleGrid}
            title="Toggle Grid"
            className={`h-8 px-2 sm:px-3 transition-all duration-200 ${
              showGrid 
                ? 'bg-blue-50 text-blue-600 border-blue-200' 
                : 'hover:bg-gray-50 text-gray-600'
            }`}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSnapToGrid}
            title="Toggle Snap to Grid"
            className={`h-8 px-2 sm:px-3 text-xs font-medium transition-all duration-200 ${
              snapToGrid 
                ? 'bg-blue-50 text-blue-600 border-blue-200' 
                : 'hover:bg-gray-50 text-gray-600'
            }`}
          >
            <span className="hidden sm:inline">Snap</span>
            <span className="sm:hidden">S</span>
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 hidden sm:flex">
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomOut}
            disabled={zoomLevel <= 0.25}
            title="Zoom Out"
            className="h-8 w-8 p-0 hover:bg-gray-50 transition-all duration-200 disabled:opacity-30"
          >
            <ZoomOut className="h-4 w-4 text-gray-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomReset}
            title="Reset Zoom (100%)"
            className="h-8 px-2 text-xs font-medium hover:bg-gray-50 transition-all duration-200 text-gray-600"
          >
            {Math.round(zoomLevel * 100)}%
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomIn}
            disabled={zoomLevel >= 3}
            title="Zoom In"
            className="h-8 w-8 p-0 hover:bg-gray-50 transition-all duration-200 disabled:opacity-30"
          >
            <ZoomIn className="h-4 w-4 text-gray-600" />
          </Button>
          
          {onFitAllTables && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onFitAllTables}
              title="Fit All Tables"
              className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetView}
            title="Reset View"
            className="h-8 w-8 p-0 hover:bg-gray-50 transition-all duration-200 text-gray-600"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Simple Save Button */}
      <Button
        size="sm"
        onClick={onSave}
        disabled={isSaving}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Layout
          </>
        )}
      </Button>
    </div>
  )
}