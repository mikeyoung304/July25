import React from 'react'
import { Table } from '../types'
import { Circle, Square, RectangleHorizontal } from 'lucide-react'

interface FloorPlanSidePanelProps {
  selectedTable: Table | undefined
  tables: Table[]
  onUpdateTable: (id: string, updates: Partial<Table>) => void
  onSelectTable: (id: string | null) => void
}

export function FloorPlanSidePanel({
  selectedTable,
  tables,
  onUpdateTable,
  onSelectTable,
}: FloorPlanSidePanelProps) {
  return (
    <div className="w-80 flex flex-col gap-4">
      {/* Selected Table Properties */}
      {selectedTable && (
        <div className="bg-white backdrop-blur-xl border border-[rgba(26,54,93,0.08)] rounded-2xl shadow-medium overflow-hidden">
          <div className="bg-gradient-to-r from-[#FBFBFA] via-white to-[#FBFBFA] px-5 py-4 border-b border-[rgba(26,54,93,0.08)]">
            <h3 className="font-semibold text-[#1a365d]">Table Properties</h3>
          </div>
          
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-[#2d4a7c] uppercase tracking-wider">Name</label>
              <input
                type="text"
                value={selectedTable.label}
                onChange={(e) => onUpdateTable(selectedTable.id, { label: e.target.value })}
                className="w-full mt-2 px-3 py-2 bg-[#FBFBFA] border border-[rgba(26,54,93,0.08)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fb923c]/20 focus:border-[#fb923c] transition-all duration-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[#2d4a7c] uppercase tracking-wider">Seats</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={selectedTable.seats}
                  onChange={(e) => onUpdateTable(selectedTable.id, { seats: parseInt(e.target.value) || 1 })}
                  className="w-full mt-2 px-3 py-2 bg-[#FBFBFA] border border-[rgba(26,54,93,0.08)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fb923c]/20 focus:border-[#fb923c] transition-all duration-200"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#2d4a7c] uppercase tracking-wider">Status</label>
                <select
                  value={selectedTable.status}
                  onChange={(e) => onUpdateTable(selectedTable.id, { status: e.target.value as Table['status'] })}
                  className="w-full mt-2 px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem',
                  }}
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#2d4a7c] uppercase tracking-wider">Width</label>
                  <input
                    type="number"
                    value={Math.round(selectedTable.width)}
                    onChange={(e) => onUpdateTable(selectedTable.id, { width: parseInt(e.target.value) || 40 })}
                    className="w-full mt-2 px-3 py-2 bg-[#FBFBFA] border border-[rgba(26,54,93,0.08)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fb923c]/20 focus:border-[#fb923c] transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#2d4a7c] uppercase tracking-wider">Height</label>
                  <input
                    type="number"
                    value={Math.round(selectedTable.height)}
                    onChange={(e) => onUpdateTable(selectedTable.id, { height: parseInt(e.target.value) || 40 })}
                    className="w-full mt-2 px-3 py-2 bg-[#FBFBFA] border border-[rgba(26,54,93,0.08)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fb923c]/20 focus:border-[#fb923c] transition-all duration-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#2d4a7c] uppercase tracking-wider">X Position</label>
                  <input
                    type="number"
                    value={Math.round(selectedTable.x)}
                    onChange={(e) => onUpdateTable(selectedTable.id, { x: parseInt(e.target.value) || 0 })}
                    className="w-full mt-2 px-3 py-2 bg-[#FBFBFA] border border-[rgba(26,54,93,0.08)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fb923c]/20 focus:border-[#fb923c] transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#2d4a7c] uppercase tracking-wider">Y Position</label>
                  <input
                    type="number"
                    value={Math.round(selectedTable.y)}
                    onChange={(e) => onUpdateTable(selectedTable.id, { y: parseInt(e.target.value) || 0 })}
                    className="w-full mt-2 px-3 py-2 bg-[#FBFBFA] border border-[rgba(26,54,93,0.08)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fb923c]/20 focus:border-[#fb923c] transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#2d4a7c] uppercase tracking-wider">Rotation</label>
                <div className="mt-2 space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={selectedTable.rotation}
                    onChange={(e) => onUpdateTable(selectedTable.id, { rotation: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-[rgba(26,54,93,0.1)] rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #fb923c 0%, #fb923c ${(selectedTable.rotation / 360) * 100}%, rgba(26,54,93,0.1) ${(selectedTable.rotation / 360) * 100}%, rgba(26,54,93,0.1) 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-[#6b7280]">
                    <span>0°</span>
                    <span className="font-medium text-[#1a365d]">{selectedTable.rotation}°</span>
                    <span>360°</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table List */}
      <div className="bg-white backdrop-blur-xl border border-[rgba(26,54,93,0.08)] rounded-2xl shadow-medium overflow-hidden flex-1 flex flex-col">
        <div className="bg-gradient-to-r from-[#FBFBFA] via-white to-[#FBFBFA] px-5 py-4 border-b border-[rgba(26,54,93,0.08)]">
          <h3 className="font-semibold text-[#1a365d]">All Tables</h3>
          <p className="text-xs text-[#6b7280] mt-0.5">{tables.length} {tables.length === 1 ? 'table' : 'tables'}</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-2">
            {tables.map((table) => {
              const isSelected = selectedTable?.id === table.id
              return (
                <button
                  key={table.id}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                    isSelected
                      ? 'bg-[#fff7ed] border border-[#fca85c] shadow-soft'
                      : 'bg-[#FBFBFA] border border-[rgba(26,54,93,0.08)] hover:bg-white hover:border-[rgba(26,54,93,0.16)] hover:shadow-soft'
                  }`}
                  onClick={() => onSelectTable(table.id)}
                >
                  <div className={`p-2 rounded-lg ${
                    isSelected ? 'bg-[#ffedd5]' : 'bg-[#e6ecf3]'
                  }`}>
                    {table.type === 'circle' && <Circle className={`h-4 w-4 ${isSelected ? 'text-[#fb923c]' : 'text-[#1a365d]'}`} />}
                    {table.type === 'square' && <Square className={`h-4 w-4 ${isSelected ? 'text-[#fb923c]' : 'text-[#1a365d]'}`} />}
                    {table.type === 'rectangle' && <RectangleHorizontal className={`h-4 w-4 ${isSelected ? 'text-[#fb923c]' : 'text-[#1a365d]'}`} />}
                  </div>
                  <div className="flex-1 text-left">
                    <div className={`font-medium text-sm ${isSelected ? 'text-[#ea7c1c]' : 'text-[#1a365d]'}`}>
                      {table.label}
                    </div>
                    <div className={`text-xs ${isSelected ? 'text-[#fb923c]' : 'text-[#6b7280]'}`}>
                      {table.seats} seats • {table.status}
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    table.status === 'available' ? 'bg-[#38b2ac]' :
                    table.status === 'occupied' ? 'bg-[#fb923c]' :
                    'bg-[#1a365d]'
                  }`}></div>
                </button>
              )
            })}
          </div>

          {tables.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#e6ecf3] flex items-center justify-center">
                <Square className="h-8 w-8 text-[#2d4a7c]" />
              </div>
              <p className="text-[#1a365d] text-sm">No tables added yet</p>
              <p className="text-[#6b7280] text-xs mt-1">Use the toolbar to add tables</p>
            </div>
          )}
        </div>
      </div>
      
    </div>
  )
}