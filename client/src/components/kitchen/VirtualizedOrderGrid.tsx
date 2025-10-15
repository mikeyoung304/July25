import React, { useMemo, useEffect, useState } from 'react'
import { FixedSizeGrid as Grid } from 'react-window'
import { TouchOptimizedOrderCard } from './TouchOptimizedOrderCard'
import type { Order } from '@rebuild/shared'

interface VirtualizedOrderGridProps {
  orders: Order[]
  onStatusChange: (orderId: string, status: 'ready') => void
  className?: string
}

interface GridItemProps {
  columnIndex: number
  rowIndex: number
  style: React.CSSProperties
  data: {
    orders: Order[]
    columnsPerRow: number
    onStatusChange: (orderId: string, status: 'ready') => void
  }
}

const GridItem: React.FC<GridItemProps> = ({ columnIndex, rowIndex, style, data }) => {
  const { orders, columnsPerRow, onStatusChange } = data
  const index = rowIndex * columnsPerRow + columnIndex

  if (index >= orders.length) {
    return <div style={style} />
  }

  const order = orders[index]

  return (
    <div style={style}>
      <div className="p-2">
        <TouchOptimizedOrderCard
          order={order}
          onStatusChange={onStatusChange}
        />
      </div>
    </div>
  )
}

export function VirtualizedOrderGrid({ orders, onStatusChange, className }: VirtualizedOrderGridProps) {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth - 32 : 1200,
    height: typeof window !== 'undefined' ? Math.max(600, window.innerHeight - 200) : 800
  })

  useEffect(() => {
    const updateDimensions = () => {
      const container = document.getElementById('kitchen-grid-container')
      if (container) {
        const rect = container.getBoundingClientRect()
        setDimensions({
          width: rect.width,
          height: Math.max(600, window.innerHeight - 200) // Minimum height with viewport fallback
        })
      }
    }

    // Delay initial measurement to ensure DOM is ready
    const timer = setTimeout(updateDimensions, 0)

    const resizeObserver = new ResizeObserver(updateDimensions)
    const container = document.getElementById('kitchen-grid-container')

    if (container) {
      resizeObserver.observe(container)
    }

    window.addEventListener('resize', updateDimensions)

    return () => {
      clearTimeout(timer)
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateDimensions)
    }
  }, [])

  const { columnsPerRow, rowCount } = useMemo(() => {
    const cardWidth = 340 // Card width + padding
    const cols = Math.max(1, Math.floor(dimensions.width / cardWidth))
    const rows = Math.ceil(orders.length / cols)
    
    return {
      columnsPerRow: cols,
      rowCount: rows
    }
  }, [dimensions.width, orders.length])

  const itemData = useMemo(() => ({
    orders,
    columnsPerRow,
    onStatusChange
  }), [orders, columnsPerRow, onStatusChange])

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg border">
        <div className="text-center">
          <div className="text-4xl mb-4">🍽️</div>
          <p className="text-gray-500 text-lg">No orders to display</p>
          <p className="text-gray-400 text-sm mt-1">Orders will appear here when they come in</p>
        </div>
      </div>
    )
  }

  if (dimensions.width === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div id="kitchen-grid-container" className={className}>
      <Grid
        columnCount={columnsPerRow}
        columnWidth={340}
        height={dimensions.height}
        rowCount={rowCount}
        rowHeight={300}
        width={dimensions.width}
        itemData={itemData}
        overscanRowCount={2}
        overscanColumnCount={1}
      >
        {GridItem}
      </Grid>
    </div>
  )
}