import React from 'react'
import { Button } from '@/components/ui/button'
import { StationBadge } from '@/components/shared/badges'
import { StationType } from 'shared/types'
import { stationRouting } from '@/services/stationRouting'

interface StationFilterProps {
  selectedStation: StationType | 'all'
  onStationChange: (station: StationType | 'all') => void
}

export const StationFilter: React.FC<StationFilterProps> = ({
  selectedStation,
  onStationChange
}) => {
  const activeStations = stationRouting.getActiveStations()
  const stationTypes = [...new Set(activeStations.map(s => s.type))] as StationType[]
  
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selectedStation === 'all' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onStationChange('all')}
      >
        All Stations
      </Button>
      
      {stationTypes.map(stationType => (
        <Button
          key={stationType}
          variant={selectedStation === stationType ? 'default' : 'outline'}
          size="sm"
          onClick={() => onStationChange(stationType)}
          className="p-0"
        >
          <StationBadge stationType={stationType} />
        </Button>
      ))}
    </div>
  )
}