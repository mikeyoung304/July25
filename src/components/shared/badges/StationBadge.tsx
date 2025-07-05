import React from 'react'
import { Badge } from '@/components/ui/badge'
import { StationType, STATION_CONFIG } from '@/types/station'

interface StationBadgeProps {
  stationType: StationType
  className?: string
}

export const StationBadge: React.FC<StationBadgeProps> = ({ stationType, className }) => {
  const config = STATION_CONFIG[stationType]
  
  return (
    <Badge 
      variant="outline" 
      className={`${config.color} ${className || ''}`}
    >
      <span className="mr-1">{config.icon}</span>
      {config.name}
    </Badge>
  )
}