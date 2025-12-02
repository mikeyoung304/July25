export interface Table {
  id: string
  type: 'circle' | 'rectangle' | 'square' | 'chip_monkey'
  x: number
  y: number
  width: number
  height: number
  seats: number
  label: string
  rotation: number
  status: 'available' | 'occupied' | 'reserved' | 'unavailable' | 'cleaning' | 'paid'
  z_index: number
  current_order_id?: string | null
  metadata?: Record<string, unknown>
  active?: boolean
  created_at?: string
  updated_at?: string
  restaurant_id?: string
}

export interface FloorPlanState {
  tables: Table[]
  selectedTableId: string | null
  canvasSize: { width: number; height: number }
  zoomLevel: number
  panOffset: { x: number; y: number }
  showGrid: boolean
  gridSize: number
  snapToGrid: boolean
  isDragging: boolean
  draggedTableId: string | null
  dragOffset: { x: number; y: number }
  undoStack: Table[][]
  redoStack: Table[][]
}

export type FloorPlanAction =
  | { type: 'ADD_TABLE'; table: Table }
  | { type: 'UPDATE_TABLE'; id: string; updates: Partial<Table> }
  | { type: 'DELETE_TABLE'; id: string }
  | { type: 'SELECT_TABLE'; id: string | null }
  | { type: 'SET_TABLES'; tables: Table[] }
  | { type: 'SET_CANVAS_SIZE'; size: { width: number; height: number } }
  | { type: 'SET_ZOOM_LEVEL'; level: number }
  | { type: 'SET_PAN_OFFSET'; offset: { x: number; y: number } }
  | { type: 'TOGGLE_GRID' }
  | { type: 'SET_GRID_SIZE'; size: number }
  | { type: 'TOGGLE_SNAP_TO_GRID' }
  | { type: 'START_DRAG'; tableId: string; offset: { x: number; y: number } }
  | { type: 'END_DRAG' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'ADD_TO_UNDO_STACK'; tables: Table[] }