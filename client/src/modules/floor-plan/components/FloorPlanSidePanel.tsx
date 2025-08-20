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
  
  // Group tables by status for better organization
  const groupedTables = {
    available: tables.filter(t => t.status === 'available'),
    occupied: tables.filter(t => t.status === 'occupied'),
    reserved: tables.filter(t => t.status === 'reserved'),
    unavailable: tables.filter(t => t.status === 'unavailable')
  }

  const renderTableItem = (table: Table) => {
    const isSelected = selectedTable?.id === table.id
    
    return (
      <button
        key={table.id}
        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
          isSelected
            ? 'bg-blue-50 border border-blue-200 shadow-sm'
            : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'
        }`}
        onClick={() => onSelectTable(table.id)}
      >
        <div className={`p-2 rounded-lg ${
          isSelected ? 'bg-blue-100' : 'bg-gray-200'
        }`}>
          {table.type === 'circle' && <Circle className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />}
          {table.type === 'square' && <Square className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />}
          {table.type === 'rectangle' && <RectangleHorizontal className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />}
        </div>
        <div className="flex-1 text-left">
          <div className={`font-medium text-sm ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
            {table.label}
          </div>
          <div className={`text-xs ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
            {table.seats} seats • {table.status}
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full ${
          table.status === 'available' ? 'bg-green-500' :
          table.status === 'occupied' ? 'bg-red-500' :
          table.status === 'reserved' ? 'bg-yellow-500' :
          'bg-gray-400'
        }`}></div>
      </button>
    )
  }

  return (
    <div className="w-full lg:w-80 flex flex-col gap-4 min-h-0">
      
      {/* Selected Table Properties */}
      {selectedTable && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Table Properties</h3>
          </div>
          
          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Name</label>
              <input
                type="text"
                value={selectedTable.label}
                onChange={(e) => onUpdateTable(selectedTable.id, { label: e.target.value })}
                className="w-full mt-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Seats</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={selectedTable.seats}
                  onChange={(e) => onUpdateTable(selectedTable.id, { seats: parseInt(e.target.value) || 1 })}
                  className="w-full mt-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Status</label>
                <select
                  value={selectedTable.status}
                  onChange={(e) => onUpdateTable(selectedTable.id, { status: e.target.value as Table['status'] })}
                  className="w-full mt-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table List */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">All Tables</h3>
          <p className="text-xs text-gray-500 mt-0.5">{tables.length} {tables.length === 1 ? 'table' : 'tables'}</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          {tables.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Square className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 text-sm">No tables added yet</p>
              <p className="text-gray-400 text-xs mt-1">Use the toolbar to add tables</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Available Tables */}
              {groupedTables.available.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Available ({groupedTables.available.length})
                  </h4>
                  <div className="space-y-2">
                    {groupedTables.available.map(renderTableItem)}
                  </div>
                </div>
              )}

              {/* Occupied Tables */}
              {groupedTables.occupied.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    Occupied ({groupedTables.occupied.length})
                  </h4>
                  <div className="space-y-2">
                    {groupedTables.occupied.map(renderTableItem)}
                  </div>
                </div>
              )}

              {/* Reserved Tables */}
              {groupedTables.reserved.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    Reserved ({groupedTables.reserved.length})
                  </h4>
                  <div className="space-y-2">
                    {groupedTables.reserved.map(renderTableItem)}
                  </div>
                </div>
              )}

              {/* Unavailable Tables */}
              {groupedTables.unavailable.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    Unavailable ({groupedTables.unavailable.length})
                  </h4>
                  <div className="space-y-2">
                    {groupedTables.unavailable.map(renderTableItem)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}