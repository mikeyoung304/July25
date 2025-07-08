'use client'

import { useEffect, useState } from 'react'
import { KDSLayout } from '@/components/kds'
import { KDSErrorBoundary } from '@/components/error-boundaries'
import { PageLoadingState } from '@/components/loading-states'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart3,
  ChevronLeft,
  Grid2x2,
  Maximize,
  Minimize,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import type { KDSStation } from '@/lib/modassembly/supabase/database/kds'

type LayoutMode = 'single' | 'multi' | 'split'

interface KDSInterfaceProps {
  initialStations: KDSStation[]
}

export function KDSInterface({ initialStations }: KDSInterfaceProps) {
  // Add session validation for client component
  useEffect(() => {
    const validateClientSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      console.log('🔐 [KDS Interface] Client session validation:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        stationsCount: initialStations.length,
        timestamp: new Date().toISOString()
      })

      if (!session) {
        console.error('🚨 [KDS Interface] Client lost session - potential auth issue')
      }
    }
    
    validateClientSession()
  }, [])
  const [selectedStationId, setSelectedStationId] = useState<string>('')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [splitStations, setSplitStations] = useState<string[]>([])
  const [stations] = useState<KDSStation[]>(initialStations)

  // Initialize with first station and auto-select all stations for split view
  useEffect(() => {
    if (stations.length > 0) {
      if (!selectedStationId) {
        setSelectedStationId(stations[0].id)
      }
      // Auto-select all stations for split view (up to 4)
      if (splitStations.length === 0) {
        setSplitStations(stations.slice(0, 4).map(s => s.id))
      }
    }
  }, [stations, selectedStationId, splitStations.length])

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
    setIsFullscreen(!isFullscreen)
  }

  // Handle split view station selection
  const toggleSplitStation = (stationId: string) => {
    setSplitStations(prev => {
      if (prev.includes(stationId)) {
        return prev.filter(id => id !== stationId)
      } else if (prev.length < 4) {
        // Max 4 stations in split view
        return [...prev, stationId]
      }
      return prev
    })
  }

  // Get layout classes for split view
  const getSplitLayoutClasses = () => {
    const count = splitStations.length
    if (count <= 1) {
      return 'grid-cols-1'
    }
    if (count === 2) {
      return 'grid-cols-1 lg:grid-cols-2'
    }
    if (count === 3) {
      return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
    }
    return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4'
  }

  return (
    <div
      className={cn(
        'h-screen flex flex-col bg-gray-100 dark:bg-gray-900',
        isFullscreen && 'fixed inset-0 z-50'
      )}
    >
        {/* Header - hidden in fullscreen */}
        {!isFullscreen && (
          <div className='flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b shadow-sm'>
            <div className='flex items-center gap-4'>
              {/* Back to dashboard */}
              <Link href='/dashboard'>
                <Button variant='outline' size='sm'>
                  <ChevronLeft className='h-4 w-4 mr-1' />
                  Back to Dashboard
                </Button>
              </Link>

              {/* Page title */}
              <div>
                <h1 className='text-2xl font-bold'>Kitchen Display System</h1>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  Real-time order management and tracking
                </p>
              </div>
            </div>

            <div className='flex items-center gap-4'>
              {/* Layout mode selector */}
              <div className='flex items-center gap-2'>
                <label className='text-sm font-medium'>Layout:</label>
                <Select
                  value={layoutMode}
                  onValueChange={(value: LayoutMode) => setLayoutMode(value)}
                >
                  <SelectTrigger className='w-32'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='single'>Single Station</SelectItem>
                    <SelectItem value='multi'>All Stations</SelectItem>
                    <SelectItem value='split'>Split View</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Station selector for single mode */}
              {layoutMode === 'single' && (
                <div className='flex items-center gap-2'>
                  <label className='text-sm font-medium'>Station:</label>
                  <Select
                    value={selectedStationId}
                    onValueChange={setSelectedStationId}
                  >
                    <SelectTrigger className='w-48'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map(station => (
                        <SelectItem key={station.id} value={station.id}>
                          <div className='flex items-center gap-2'>
                            <div
                              className='w-3 h-3 rounded-full'
                              style={{ backgroundColor: station.color }}
                            />
                            {station.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Actions */}
              <div className='flex items-center gap-2'>
                {/* Metrics link */}
                <Link href='/admin'>
                  <Button variant='outline' size='sm'>
                    <BarChart3 className='h-4 w-4 mr-1' />
                    Metrics
                  </Button>
                </Link>

                {/* Settings link */}
                <Link href='/admin'>
                  <Button variant='outline' size='sm'>
                    <Settings className='h-4 w-4 mr-1' />
                    Settings
                  </Button>
                </Link>

                {/* Fullscreen toggle */}
                <Button variant='outline' size='sm' onClick={toggleFullscreen}>
                  <Maximize className='h-4 w-4 mr-1' />
                  Fullscreen
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Split view station selector */}
        {layoutMode === 'split' && !isFullscreen && (
          <div className='p-4 bg-gray-50 dark:bg-gray-800 border-b'>
            <div className='flex items-center gap-2 mb-2'>
              <Grid2x2 className='h-4 w-4' />
              <span className='text-sm font-medium'>
                Select stations for split view:
              </span>
            </div>
            <div className='flex flex-wrap gap-2'>
              {stations.map(station => (
                <Button
                  key={station.id}
                  variant={
                    splitStations.includes(station.id) ? 'default' : 'outline'
                  }
                  size='sm'
                  onClick={() => toggleSplitStation(station.id)}
                  className='flex items-center gap-2'
                  disabled={
                    !splitStations.includes(station.id) &&
                    splitStations.length >= 4
                  }
                >
                  <div
                    className='w-3 h-3 rounded-full'
                    style={{ backgroundColor: station.color }}
                  />
                  {station.name}
                </Button>
              ))}
            </div>
            {splitStations.length === 0 && (
              <p className='text-sm text-gray-500 mt-2'>
                Select up to 4 stations to display in split view
              </p>
            )}
          </div>
        )}

        {/* Main content */}
        <div className='flex-1 overflow-auto'>
          <KDSErrorBoundary>
            {layoutMode === 'single' && selectedStationId && (
              <div className="h-full overflow-auto">
                <KDSLayout
                  stationId={selectedStationId}
                  showHeader={true}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={toggleFullscreen}
                />
              </div>
            )}

            {layoutMode === 'multi' && (
              <KDSLayout
                showHeader={true}
                isFullscreen={isFullscreen}
                onToggleFullscreen={toggleFullscreen}
              />
            )}

            {layoutMode === 'split' && (
              <div className='h-full p-4'>
                {splitStations.length === 0 ? (
                  <div className='flex items-center justify-center h-full text-gray-500'>
                    <div className='text-center'>
                      <Grid2x2 className='h-12 w-12 mx-auto mb-4 text-gray-400' />
                      <h3 className='text-lg font-medium mb-2'>Split View</h3>
                      <p className='text-gray-400'>
                        Select stations above to display multiple views
                        simultaneously
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn('h-full grid gap-4', getSplitLayoutClasses())}
                  >
                    {splitStations.map(stationId => {
                      const station = stations.find(s => s.id === stationId)
                      return (
                        <div
                          key={stationId}
                          className='border rounded-lg overflow-hidden bg-white dark:bg-gray-800'
                        >
                          {/* Station header */}
                          <div
                            className='p-2 text-white text-center font-medium text-sm'
                            style={{
                              backgroundColor: station?.color || '#6B7280',
                            }}
                          >
                            {station?.name || 'Unknown Station'}
                          </div>

                          {/* Station content */}
                          <div className='h-[calc(100%-2.5rem)]'>
                            <KDSLayout
                              stationId={stationId}
                              showHeader={false}
                              className='h-full'
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </KDSErrorBoundary>
        </div>

        {/* Fullscreen exit button */}
        {isFullscreen && (
          <div className='absolute top-4 right-4 z-10'>
            <Button
              variant='outline'
              size='sm'
              onClick={toggleFullscreen}
              className='bg-white dark:bg-gray-800'
            >
              <Minimize className='h-4 w-4 mr-1' />
              Exit Fullscreen
            </Button>
          </div>
        )}
    </div>
  )
}