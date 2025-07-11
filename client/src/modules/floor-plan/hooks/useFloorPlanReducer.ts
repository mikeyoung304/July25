import { useReducer, useMemo } from 'react'
import { FloorPlanState, FloorPlanAction, Table } from '../types'

const initialState: FloorPlanState = {
  tables: [],
  selectedTableId: null,
  canvasSize: { width: 1200, height: 900 },
  zoomLevel: 1,
  panOffset: { x: 0, y: 0 },
  showGrid: true,
  gridSize: 20,
  snapToGrid: true,
  isDragging: false,
  draggedTableId: null,
  dragOffset: { x: 0, y: 0 },
  undoStack: [],
  redoStack: [],
}

function floorPlanReducer(state: FloorPlanState, action: FloorPlanAction): FloorPlanState {
  switch (action.type) {
    case 'ADD_TABLE':
      return {
        ...state,
        tables: [...state.tables, action.table],
        selectedTableId: action.table.id,
      }

    case 'UPDATE_TABLE':
      return {
        ...state,
        tables: state.tables.map(table =>
          table.id === action.id ? { ...table, ...action.updates } : table
        ),
      }

    case 'DELETE_TABLE':
      return {
        ...state,
        tables: state.tables.filter(table => table.id !== action.id),
        selectedTableId: state.selectedTableId === action.id ? null : state.selectedTableId,
      }

    case 'SELECT_TABLE':
      return {
        ...state,
        selectedTableId: action.id,
      }

    case 'SET_TABLES':
      return {
        ...state,
        tables: action.tables,
      }

    case 'SET_CANVAS_SIZE':
      return {
        ...state,
        canvasSize: action.size,
      }

    case 'SET_ZOOM_LEVEL':
      return {
        ...state,
        zoomLevel: Math.max(0.5, Math.min(2, action.level)),
      }

    case 'SET_PAN_OFFSET':
      return {
        ...state,
        panOffset: action.offset,
      }

    case 'TOGGLE_GRID':
      return {
        ...state,
        showGrid: !state.showGrid,
      }

    case 'SET_GRID_SIZE':
      return {
        ...state,
        gridSize: action.size,
      }

    case 'TOGGLE_SNAP_TO_GRID':
      return {
        ...state,
        snapToGrid: !state.snapToGrid,
      }

    case 'START_DRAG':
      return {
        ...state,
        isDragging: true,
        draggedTableId: action.tableId,
        dragOffset: action.offset,
      }

    case 'END_DRAG':
      return {
        ...state,
        isDragging: false,
        draggedTableId: null,
        dragOffset: { x: 0, y: 0 },
      }

    case 'ADD_TO_UNDO_STACK':
      return {
        ...state,
        undoStack: [...state.undoStack.slice(-19), action.tables],
        redoStack: [],
      }

    case 'UNDO': {
      if (state.undoStack.length === 0) return state
      const previousTables = state.undoStack[state.undoStack.length - 1]
      return {
        ...state,
        tables: previousTables,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, state.tables],
      }
    }

    case 'REDO': {
      if (state.redoStack.length === 0) return state
      const nextTables = state.redoStack[state.redoStack.length - 1]
      return {
        ...state,
        tables: nextTables,
        undoStack: [...state.undoStack, state.tables],
        redoStack: state.redoStack.slice(0, -1),
      }
    }

    default:
      return state
  }
}

export function useFloorPlanReducer() {
  const [state, dispatch] = useReducer(floorPlanReducer, initialState)

  const selectors = useMemo(() => ({
    tables: state.tables,
    selectedTable: state.tables.find(t => t.id === state.selectedTableId),
    selectedTableId: state.selectedTableId,
    canvasSize: state.canvasSize,
    zoomLevel: state.zoomLevel,
    panOffset: state.panOffset,
    showGrid: state.showGrid,
    gridSize: state.gridSize,
    snapToGrid: state.snapToGrid,
    isDragging: state.isDragging,
    draggedTableId: state.draggedTableId,
    dragOffset: state.dragOffset,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
  }), [state])

  const actions = useMemo(() => ({
    addTable: (table: Table) => dispatch({ type: 'ADD_TABLE', table }),
    updateTable: (id: string, updates: Partial<Table>) => 
      dispatch({ type: 'UPDATE_TABLE', id, updates }),
    deleteTable: (id: string) => dispatch({ type: 'DELETE_TABLE', id }),
    selectTable: (id: string | null) => dispatch({ type: 'SELECT_TABLE', id }),
    setTables: (tables: Table[]) => dispatch({ type: 'SET_TABLES', tables }),
    setCanvasSize: (size: { width: number; height: number }) => 
      dispatch({ type: 'SET_CANVAS_SIZE', size }),
    setZoomLevel: (level: number) => dispatch({ type: 'SET_ZOOM_LEVEL', level }),
    setPanOffset: (offset: { x: number; y: number }) => 
      dispatch({ type: 'SET_PAN_OFFSET', offset }),
    toggleGrid: () => dispatch({ type: 'TOGGLE_GRID' }),
    setGridSize: (size: number) => dispatch({ type: 'SET_GRID_SIZE', size }),
    toggleSnapToGrid: () => dispatch({ type: 'TOGGLE_SNAP_TO_GRID' }),
    startDrag: (tableId: string, offset: { x: number; y: number }) => 
      dispatch({ type: 'START_DRAG', tableId, offset }),
    endDrag: () => dispatch({ type: 'END_DRAG' }),
    undo: () => dispatch({ type: 'UNDO' }),
    redo: () => dispatch({ type: 'REDO' }),
    addToUndoStack: (tables: Table[]) => dispatch({ type: 'ADD_TO_UNDO_STACK', tables }),
  }), [dispatch])

  return { state, selectors, actions }
}