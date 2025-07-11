import React from 'react'
import type { RenderMetric, APIMetric } from '@/services/performance/performanceMonitor'

interface PerformanceChartProps {
  data: RenderMetric[] | APIMetric[]
  type: 'render' | 'api'
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, type }) => {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  // Calculate chart dimensions
  const width = 600
  const height = 250
  const padding = { top: 20, right: 20, bottom: 40, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Calculate scales
  const maxValue = Math.max(...data.map(d => d.duration))
  const minTime = Math.min(...data.map(d => d.timestamp))
  const maxTime = Math.max(...data.map(d => d.timestamp))
  const timeRange = maxTime - minTime || 1

  // Threshold lines
  const threshold = type === 'render' ? 16 : 1000

  // Create path data
  const pathData = data
    .map((d, i) => {
      const x = padding.left + ((d.timestamp - minTime) / timeRange) * chartWidth
      const y = padding.top + chartHeight - (d.duration / maxValue) * chartHeight
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  // Create points
  const points = data.map((d) => ({
    x: padding.left + ((d.timestamp - minTime) / timeRange) * chartWidth,
    y: padding.top + chartHeight - (d.duration / maxValue) * chartHeight,
    duration: d.duration,
    status: type === 'api' ? (d as APIMetric).status : 'success'
  }))

  // Y-axis labels
  const yLabels = [0, maxValue / 2, maxValue].map(value => ({
    value: value.toFixed(0),
    y: padding.top + chartHeight - (value / maxValue) * chartHeight
  }))

  return (
    <svg width={width} height={height} className="w-full h-auto">
      {/* Grid lines */}
      {yLabels.map((label, i) => (
        <line
          key={i}
          x1={padding.left}
          y1={label.y}
          x2={padding.left + chartWidth}
          y2={label.y}
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeDasharray="4 4"
        />
      ))}

      {/* Threshold line */}
      <line
        x1={padding.left}
        y1={padding.top + chartHeight - (threshold / maxValue) * chartHeight}
        x2={padding.left + chartWidth}
        y2={padding.top + chartHeight - (threshold / maxValue) * chartHeight}
        stroke="hsl(var(--destructive))"
        strokeOpacity="0.5"
        strokeDasharray="8 4"
      />

      {/* Y-axis */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={padding.top + chartHeight}
        stroke="currentColor"
        strokeOpacity="0.2"
      />

      {/* X-axis */}
      <line
        x1={padding.left}
        y1={padding.top + chartHeight}
        x2={padding.left + chartWidth}
        y2={padding.top + chartHeight}
        stroke="currentColor"
        strokeOpacity="0.2"
      />

      {/* Y-axis labels */}
      {yLabels.map((label, i) => (
        <text
          key={i}
          x={padding.left - 10}
          y={label.y + 4}
          textAnchor="end"
          className="text-xs fill-muted-foreground"
        >
          {label.value}ms
        </text>
      ))}

      {/* Chart line */}
      <path
        d={pathData}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
      />

      {/* Data points */}
      {points.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r="3"
          fill={
            point.status === 'error' 
              ? 'hsl(var(--destructive))' 
              : point.duration > threshold
              ? 'hsl(var(--warning))'
              : 'hsl(var(--primary))'
          }
          className="hover:r-4 transition-all cursor-pointer"
        >
          <title>{`${point.duration.toFixed(1)}ms`}</title>
        </circle>
      ))}

      {/* Threshold label */}
      <text
        x={padding.left + chartWidth + 10}
        y={padding.top + chartHeight - (threshold / maxValue) * chartHeight + 4}
        className="text-xs fill-destructive"
      >
        {type === 'render' ? '16ms' : '1s'}
      </text>

      {/* X-axis label */}
      <text
        x={width / 2}
        y={height - 10}
        textAnchor="middle"
        className="text-xs fill-muted-foreground"
      >
        Time
      </text>

      {/* Y-axis label */}
      <text
        x={15}
        y={height / 2}
        textAnchor="middle"
        transform={`rotate(-90 15 ${height / 2})`}
        className="text-xs fill-muted-foreground"
      >
        Duration (ms)
      </text>
    </svg>
  )
}