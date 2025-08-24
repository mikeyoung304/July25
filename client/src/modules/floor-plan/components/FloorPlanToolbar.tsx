import React from 'react'
import { Button } from '@/components/ui/button'
import { Circle, Square, RectangleHorizontal, Save, Maximize2, ArrowLeft } from 'lucide-react'
import { Table } from '../types'

interface FloorPlanToolbarProps {
  onAddTable: (type: Table['type']) => void
  onSave: () => void
  onAutoFit: () => void
  onBack?: () => void
  isSaving?: boolean
}

export function FloorPlanToolbar({
  onAddTable,
  onSave,
  onAutoFit,
  onBack,
  isSaving = false,
}: FloorPlanToolbarProps) {
  return (
    <div className="flex items-center justify-between px-8 py-8 bg-white border-b border-gray-200 shadow-sm">
      {/* Left side - Back button and Table creation */}
      <div className="flex items-center gap-6">
        {onBack && (
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="h-12 px-4 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl font-medium text-base transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Admin
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Floor Plan Creator</h1>
          </div>
        )}
        
        <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="default"
          onClick={() => onAddTable('circle')}
          className="h-20 w-20 p-0 rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-lg transition-all duration-300 group bg-white shadow-sm hover:scale-105"
        >
          <Circle className="h-8 w-8 text-gray-600 group-hover:text-blue-600 transition-colors duration-300" />
        </Button>
        <Button
          variant="outline"
          size="default"
          onClick={() => onAddTable('square')}
          className="h-20 w-20 p-0 rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-lg transition-all duration-300 group bg-white shadow-sm hover:scale-105"
        >
          <Square className="h-8 w-8 text-gray-600 group-hover:text-blue-600 transition-colors duration-300" />
        </Button>
        <Button
          variant="outline"
          size="default"
          onClick={() => onAddTable('rectangle')}
          className="h-20 w-20 p-0 rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-lg transition-all duration-300 group bg-white shadow-sm hover:scale-105"
        >
          <RectangleHorizontal className="h-8 w-8 text-gray-600 group-hover:text-blue-600 transition-colors duration-300" />
        </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={onAutoFit}
          className="h-16 px-8 font-semibold bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 rounded-2xl shadow-sm hover:scale-105 text-base"
        >
          <Maximize2 className="h-5 w-5 mr-3" />
          Fit All
        </Button>
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="h-16 px-8 font-semibold bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-105 text-base"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-3" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-3" />
              Save Layout
            </>
          )}
        </Button>
      </div>
    </div>
  )
}