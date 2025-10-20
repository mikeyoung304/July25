import React from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Edit3, Users } from 'lucide-react'
import { Table } from '../types'

interface TableEditorProps {
  selectedTable: Table
  onUpdate: (id: string, updates: Partial<Table>) => void
  onDelete: () => void
}

/**
 * Floating editor panel for selected table
 * Extracted from FloorPlanEditor for better component organization
 */
export function TableEditor({ selectedTable, onUpdate, onDelete }: TableEditorProps) {
  return (
    <div className="absolute top-6 left-6 z-20 w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Edit3 className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Edit Table</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name</label>
            <input
              type="text"
              value={selectedTable.label}
              onChange={(e) => onUpdate(selectedTable.id, { label: e.target.value })}
              className="w-full mt-2 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>
          {selectedTable.type === 'chip_monkey' ? (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Size</label>
              <input
                type="range"
                min="32"
                max="120"
                step="4"
                value={selectedTable.width}
                onChange={(e) => {
                  const size = parseInt(e.target.value)
                  onUpdate(selectedTable.id, { width: size, height: size })
                }}
                className="w-full mt-2 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-600">{selectedTable.width}px</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onUpdate(selectedTable.id, { width: 40, height: 40 })} className="h-7 px-2 text-xs">S</Button>
                  <Button variant="ghost" size="sm" onClick={() => onUpdate(selectedTable.id, { width: 64, height: 64 })} className="h-7 px-2 text-xs">M</Button>
                  <Button variant="ghost" size="sm" onClick={() => onUpdate(selectedTable.id, { width: 88, height: 88 })} className="h-7 px-2 text-xs">L</Button>
                  <Button variant="ghost" size="sm" onClick={() => onUpdate(selectedTable.id, { width: 112, height: 112 })} className="h-7 px-2 text-xs">XL</Button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Seats</label>
              <div className="relative mt-2">
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={selectedTable.seats}
                  onChange={(e) => onUpdate(selectedTable.id, { seats: parseInt(e.target.value) || 1 })}
                  className="w-full pl-3 pr-10 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
                <Users className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rotation</label>
          <div className="mt-2 space-y-2">
            <input
              type="range"
              min="0"
              max="360"
              step="15"
              value={selectedTable.rotation || 0}
              onChange={(e) => onUpdate(selectedTable.id, { rotation: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{selectedTable.rotation || 0}°</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => onUpdate(selectedTable.id, { rotation: ((selectedTable.rotation || 0) - 45 + 360) % 360 })} className="h-7 px-2 text-xs">-45°</Button>
                <Button variant="ghost" size="sm" onClick={() => onUpdate(selectedTable.id, { rotation: ((selectedTable.rotation || 0) - 90 + 360) % 360 })} className="h-7 px-2 text-xs">-90°</Button>
                <Button variant="ghost" size="sm" onClick={() => onUpdate(selectedTable.id, { rotation: 0 })} className="h-7 px-2 text-xs">Reset</Button>
                <Button variant="ghost" size="sm" onClick={() => onUpdate(selectedTable.id, { rotation: ((selectedTable.rotation || 0) + 90) % 360 })} className="h-7 px-2 text-xs">+90°</Button>
                <Button variant="ghost" size="sm" onClick={() => onUpdate(selectedTable.id, { rotation: ((selectedTable.rotation || 0) + 45) % 360 })} className="h-7 px-2 text-xs">+45°</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
