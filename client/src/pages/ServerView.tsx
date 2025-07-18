import React, { useState, useMemo, useCallback, useEffect, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Users, Utensils, CheckCircle2, AlertCircle, Mic } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FloorPlanCanvas } from '@/modules/floor-plan/components/FloorPlanCanvas'
import { Table } from '@/modules/floor-plan/types'
import { cn } from '@/utils'
import { tableService } from '@/services/tables/TableService'
import { RestaurantContext } from '@/core/restaurant-types'
import { toast } from 'react-hot-toast'

// Default mock data for tables with realistic restaurant layout
const _generateMockTables = (): Table[] => {
  const tables: Table[] = [
    // Left side booth section (2-seaters)
    { id: 'booth-1', type: 'rectangle', x: 100, y: 100, width: 80, height: 60, seats: 2, label: 'B1', rotation: 0, status: 'available', z_index: 1 },
    { id: 'booth-2', type: 'rectangle', x: 100, y: 180, width: 80, height: 60, seats: 2, label: 'B2', rotation: 0, status: 'occupied', z_index: 1 },
    { id: 'booth-3', type: 'rectangle', x: 100, y: 260, width: 80, height: 60, seats: 2, label: 'B3', rotation: 0, status: 'available', z_index: 1 },
    { id: 'booth-4', type: 'rectangle', x: 100, y: 340, width: 80, height: 60, seats: 2, label: 'B4', rotation: 0, status: 'reserved', z_index: 1 },
    
    // Center section (4-seaters)
    { id: 'table-1', type: 'square', x: 280, y: 120, width: 80, height: 80, seats: 4, label: 'T1', rotation: 45, status: 'available', z_index: 2 },
    { id: 'table-2', type: 'square', x: 400, y: 120, width: 80, height: 80, seats: 4, label: 'T2', rotation: 45, status: 'occupied', z_index: 2 },
    { id: 'table-3', type: 'square', x: 280, y: 240, width: 80, height: 80, seats: 4, label: 'T3', rotation: 45, status: 'available', z_index: 2 },
    { id: 'table-4', type: 'square', x: 400, y: 240, width: 80, height: 80, seats: 4, label: 'T4', rotation: 45, status: 'available', z_index: 2 },
    { id: 'table-5', type: 'square', x: 340, y: 360, width: 80, height: 80, seats: 4, label: 'T5', rotation: 45, status: 'occupied', z_index: 2 },
    
    // Right side (mix of sizes)
    { id: 'round-1', type: 'circle', x: 550, y: 100, width: 100, height: 100, seats: 6, label: 'R1', rotation: 0, status: 'available', z_index: 3 },
    { id: 'round-2', type: 'circle', x: 680, y: 100, width: 80, height: 80, seats: 4, label: 'R2', rotation: 0, status: 'reserved', z_index: 3 },
    { id: 'round-3', type: 'circle', x: 550, y: 240, width: 80, height: 80, seats: 4, label: 'R3', rotation: 0, status: 'available', z_index: 3 },
    { id: 'round-4', type: 'circle', x: 680, y: 240, width: 80, height: 80, seats: 4, label: 'R4', rotation: 0, status: 'occupied', z_index: 3 },
    
    // Bar area (high tops)
    { id: 'bar-1', type: 'circle', x: 550, y: 380, width: 60, height: 60, seats: 2, label: 'H1', rotation: 0, status: 'available', z_index: 4 },
    { id: 'bar-2', type: 'circle', x: 620, y: 380, width: 60, height: 60, seats: 2, label: 'H2', rotation: 0, status: 'available', z_index: 4 },
    { id: 'bar-3', type: 'circle', x: 690, y: 380, width: 60, height: 60, seats: 2, label: 'H3', rotation: 0, status: 'occupied', z_index: 4 },
  ]
  
  return tables
}

export function ServerView() {
  const navigate = useNavigate()
  const context = useContext(RestaurantContext)
  const [tables, setTables] = useState<Table[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [showSeatSelection, setShowSeatSelection] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 })
  const [zoomLevel] = useState(1)
  const [panOffset] = useState({ x: 0, y: 0 })
  
  // Get restaurant from context
  const restaurant = context?.restaurant
  
  // Load floor plan on mount
  useEffect(() => {
    const loadFloorPlan = async () => {
      if (!restaurant?.id) {
        setTables([])
        setIsLoading(false)
        return
      }
      
      try {
        setIsLoading(true)
        const { tables: loadedTables } = await tableService.getTables()
        
        if (loadedTables && loadedTables.length > 0) {
          setTables(loadedTables)
        } else {
          // No tables configured yet
          setTables([])
          toast('No floor plan configured. Please set up your floor plan in Admin.')
        }
      } catch (error) {
        console.error('Failed to load floor plan:', error)
        setTables([])
        toast.error('Failed to load floor plan. Please configure in Admin.')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadFloorPlan()
  }, [restaurant?.id])
  
  // Calculate stats
  const stats = useMemo(() => {
    const totalTables = tables.length
    const availableTables = tables.filter(t => t.status === 'available').length
    const occupiedTables = tables.filter(t => t.status === 'occupied').length
    const reservedTables = tables.filter(t => t.status === 'reserved').length
    const totalSeats = tables.reduce((acc, t) => acc + t.seats, 0)
    const availableSeats = tables
      .filter(t => t.status === 'available')
      .reduce((acc, t) => acc + t.seats, 0)
    
    return {
      totalTables,
      availableTables,
      occupiedTables,
      reservedTables,
      totalSeats,
      availableSeats
    }
  }, [tables])
  
  const selectedTable = useMemo(() => 
    tables.find(t => t.id === selectedTableId),
    [tables, selectedTableId]
  )
  
  const handleTableClick = useCallback((tableId: string) => {
    const table = tables.find(t => t.id === tableId)
    if (table && table.status === 'available') {
      setSelectedTableId(tableId)
      setShowSeatSelection(true)
      setSelectedSeat(null)
    }
  }, [tables])
  
  const handleSeatSelect = useCallback((seatNumber: number) => {
    setSelectedSeat(seatNumber)
  }, [])
  
  const handleStartOrder = useCallback(() => {
    if (selectedTableId && selectedSeat) {
      // Navigate to voice ordering with table and seat context
      navigate('/kiosk', {
        state: {
          tableId: selectedTableId,
          seatNumber: selectedSeat,
          tableLabel: selectedTable?.label
        }
      })
    }
  }, [selectedTableId, selectedSeat, selectedTable, navigate])
  
  const handleCanvasClick = useCallback(() => {
    setSelectedTableId(null)
    setShowSeatSelection(false)
    setSelectedSeat(null)
  }, [])
  
  // Adjust canvas size based on container
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = document.getElementById('floor-plan-container')
      if (container) {
        const rect = container.getBoundingClientRect()
        setCanvasSize({
          width: Math.max(800, rect.width - 48), // Account for padding
          height: 500
        })
      }
    }
    
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [])
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FBFBFA' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-macon-teal mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading floor plan...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FBFBFA' }}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-macon-logo-blue">Server View - Dining Room</h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full bg-macon-teal" />
                <span className="text-neutral-600">Available</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full bg-macon-orange" />
                <span className="text-neutral-600">Occupied</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full bg-macon-navy" />
                <span className="text-neutral-600">Reserved</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-6 bg-white" id="floor-plan-container">
            <div className="relative">
              {tables.length > 0 ? (
                <FloorPlanCanvas
                  tables={tables}
                  selectedTableId={selectedTableId}
                  canvasSize={canvasSize}
                  showGrid={false}
                  gridSize={20}
                  onTableClick={handleTableClick}
                  onCanvasClick={handleCanvasClick}
                  snapToGrid={false}
                  zoomLevel={zoomLevel}
                  panOffset={panOffset}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="w-24 h-24 mb-6 rounded-full bg-neutral-100 flex items-center justify-center">
                    <svg className="w-12 h-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-neutral-900 mb-2">No Floor Plan Configured</h3>
                  <p className="text-neutral-600 text-center max-w-sm mb-6">
                    Please ask your manager to set up the floor plan in the Admin section.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-neutral-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Admin → Floor Plan → Add Tables</span>
                  </div>
                </div>
              )}
              
              {/* Seat Selection Modal */}
              <AnimatePresence>
                {showSeatSelection && selectedTable && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl"
                    onClick={handleCanvasClick}
                  >
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 className="text-2xl font-bold text-macon-logo-blue mb-2">
                        {selectedTable.label} - Select Seat
                      </h3>
                      <p className="text-neutral-600 mb-6">
                        This table has {selectedTable.seats} seats. Please select a seat number:
                      </p>
                      
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        {Array.from({ length: selectedTable.seats }, (_, i) => i + 1).map(seatNum => (
                          <button
                            key={seatNum}
                            onClick={() => handleSeatSelect(seatNum)}
                            className={cn(
                              "p-4 rounded-xl border-2 transition-all duration-200",
                              "hover:border-macon-orange hover:shadow-md",
                              selectedSeat === seatNum
                                ? "border-macon-orange bg-macon-orange/10 shadow-md"
                                : "border-neutral-200 bg-white"
                            )}
                          >
                            <div className="text-lg font-semibold text-macon-logo-blue">
                              Seat {seatNum}
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      <div className="flex space-x-3">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={handleCanvasClick}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="flex-1 bg-macon-orange hover:bg-macon-orange-dark text-white"
                          disabled={!selectedSeat}
                          onClick={handleStartOrder}
                        >
                          <Mic className="h-4 w-4 mr-2" />
                          Start Voice Order
                        </Button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card className="p-4 bg-white border-neutral-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600">Total Tables</p>
                  <p className="text-2xl font-bold text-macon-logo-blue">{stats.totalTables}</p>
                </div>
                <Users className="h-8 w-8 text-neutral-400" />
              </div>
            </Card>
            
            <Card className="p-4 bg-white border-neutral-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600">Available</p>
                  <p className="text-2xl font-bold text-macon-teal">{stats.availableTables}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-macon-teal" />
              </div>
            </Card>
            
            <Card className="p-4 bg-white border-neutral-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600">Occupied</p>
                  <p className="text-2xl font-bold text-macon-orange">{stats.occupiedTables}</p>
                </div>
                <Utensils className="h-8 w-8 text-macon-orange" />
              </div>
            </Card>
            
            <Card className="p-4 bg-white border-neutral-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600">Available Seats</p>
                  <p className="text-2xl font-bold text-green-600">{stats.availableSeats}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-green-600" />
              </div>
            </Card>
          </div>
          
          {/* Instructions */}
          <Card className="mt-6 p-6 bg-macon-logo-blue/5 border-macon-logo-blue/20">
            <h3 className="text-lg font-semibold text-macon-logo-blue mb-3">How to Start a Voice Order</h3>
            <ol className="space-y-2 text-neutral-700">
              <li className="flex items-start">
                <span className="font-semibold text-macon-orange mr-2">1.</span>
                <span>Click on any available table (shown in teal)</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold text-macon-orange mr-2">2.</span>
                <span>Select the seat number for the customer</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold text-macon-orange mr-2">3.</span>
                <span>Click "Start Voice Order" to begin taking the order</span>
              </li>
            </ol>
            <div className="mt-4 p-4 bg-macon-orange/10 rounded-lg border border-macon-orange/20">
              <p className="text-sm text-macon-logo-blue">
                <strong>Tip:</strong> The voice ordering system will automatically capture the customer's order and send it to the kitchen display.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}