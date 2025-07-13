import React from 'react'
import { Button } from '@/components/ui/button'
import { Circle, Square, RectangleHorizontal, Trash2, Copy, Grid, Undo, Redo, Save, ZoomIn, ZoomOut } from 'lucide-react'
import { Table } from '../types'

interface FloorPlanToolbarProps {
  onAddTable: (type: Table['type']) => void
  onDeleteTable: () => void
  onDuplicateTable: () => void
  onToggleGrid: () => void
  onToggleSnapToGrid: () => void
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  showGrid: boolean
  snapToGrid: boolean
  canUndo: boolean
  canRedo: boolean
  hasSelectedTable: boolean
  zoomLevel: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  isSaving?: boolean
}

export function FloorPlanToolbar({
  onAddTable,
  onDeleteTable,
  onDuplicateTable,
  onToggleGrid,
  onToggleSnapToGrid,
  onUndo,
  onRedo,
  onSave,
  showGrid,
  snapToGrid,
  canUndo,
  canRedo,
  hasSelectedTable,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  isSaving = false,
}: FloorPlanToolbarProps) {
  return (
    <div className="relative bg-white backdrop-blur-xl border border-[rgba(26,54,93,0.08)] rounded-2xl shadow-medium mx-2 sm:mx-4 mt-2 sm:mt-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#FBFBFA] via-white to-[#FBFBFA]"></div>
      <div className="relative flex flex-wrap items-center gap-2 sm:gap-3 p-2 sm:p-3">
        {/* Add Table Section */}
        <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-xl bg-[#e6ecf3] backdrop-blur">
          <span className="text-xs font-medium text-[#1a365d] mr-1 sm:mr-2 hidden sm:inline">Tables</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddTable('circle')}
            title="Add Round Table"
            className="h-8 w-8 p-0 hover:bg-white hover:shadow-soft transition-all duration-200"
          >
            <Circle className="h-4 w-4 text-[#1a365d]" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddTable('square')}
            title="Add Square Table"
            className="h-8 w-8 p-0 hover:bg-white hover:shadow-soft transition-all duration-200"
          >
            <Square className="h-4 w-4 text-[#1a365d]" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddTable('rectangle')}
            title="Add Rectangular Table"
            className="h-8 w-8 p-0 hover:bg-white hover:shadow-soft transition-all duration-200"
          >
            <RectangleHorizontal className="h-4 w-4 text-[#1a365d]" />
          </Button>
        </div>

        <div className="w-px h-6 bg-[rgba(26,54,93,0.1)] hidden sm:block"></div>

        {/* Edit Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDuplicateTable}
            disabled={!hasSelectedTable}
            title="Duplicate Selected Table (⌘D)"
            className="h-8 w-8 p-0 hover:bg-white hover:shadow-soft transition-all duration-200 disabled:opacity-30"
          >
            <Copy className="h-4 w-4 text-[#1a365d]" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteTable}
            disabled={!hasSelectedTable}
            title="Delete Selected Table (Delete)"
            className="h-8 w-8 p-0 hover:bg-[#fff7ed] hover:shadow-soft transition-all duration-200 disabled:opacity-30 group"
          >
            <Trash2 className="h-4 w-4 text-[#1a365d] group-hover:text-[#fb923c]" />
          </Button>
        </div>

        <div className="w-px h-6 bg-[rgba(26,54,93,0.1)] hidden sm:block"></div>

        {/* View Options */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleGrid}
            title="Toggle Grid"
            className={`h-8 px-2 sm:px-3 transition-all duration-200 ${
              showGrid 
                ? 'bg-[#e6fffa] text-[#38b2ac] hover:bg-[#b2f5ea] shadow-soft' 
                : 'hover:bg-white hover:shadow-soft text-[#1a365d]'
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
                ? 'bg-[#e6fffa] text-[#38b2ac] hover:bg-[#b2f5ea] shadow-soft' 
                : 'hover:bg-white hover:shadow-soft text-[#1a365d]'
            }`}
          >
            <span className="hidden sm:inline">Snap</span>
            <span className="sm:hidden">S</span>
          </Button>
        </div>

        <div className="w-px h-6 bg-[rgba(26,54,93,0.1)] hidden sm:block"></div>

        {/* Undo/Redo */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            className="h-8 w-8 p-0 hover:bg-white hover:shadow-soft transition-all duration-200 disabled:opacity-30"
          >
            <Undo className="h-4 w-4 text-[#1a365d]" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (⌘⇧Z)"
            className="h-8 w-8 p-0 hover:bg-white hover:shadow-soft transition-all duration-200 disabled:opacity-30"
          >
            <Redo className="h-4 w-4 text-[#1a365d]" />
          </Button>
        </div>

        <div className="flex-1 hidden sm:block"></div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 hidden sm:flex">
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomOut}
            disabled={zoomLevel <= 0.5}
            title="Zoom Out"
            className="h-8 w-8 p-0 hover:bg-white hover:shadow-soft transition-all duration-200 disabled:opacity-30"
          >
            <ZoomOut className="h-4 w-4 text-[#1a365d]" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomReset}
            title="Reset Zoom (100%)"
            className="h-8 px-2 text-xs font-medium hover:bg-white hover:shadow-soft transition-all duration-200 text-[#1a365d]"
          >
            {Math.round(zoomLevel * 100)}%
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomIn}
            disabled={zoomLevel >= 2}
            title="Zoom In"
            className="h-8 w-8 p-0 hover:bg-white hover:shadow-soft transition-all duration-200 disabled:opacity-30"
          >
            <ZoomIn className="h-4 w-4 text-[#1a365d]" />
          </Button>
        </div>

        <div className="w-px h-6 bg-[rgba(26,54,93,0.1)] hidden sm:block"></div>

        {/* Save */}
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="bg-gradient-to-r from-[#fb923c] to-[#ea7c1c] hover:from-[#ea7c1c] hover:to-[#d96d0d] text-white font-medium px-3 sm:px-4 py-1.5 rounded-lg shadow-medium hover:shadow-large transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-1.5" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save Layout
            </>
          )}
        </Button>
      </div>
    </div>
  )
}