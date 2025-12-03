// Re-export Table and related types from shared
export type { Table, TableStatus, TableShape } from 'shared/types'

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