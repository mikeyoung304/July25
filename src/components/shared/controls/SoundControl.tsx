import React from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface SoundControlProps {
  enabled: boolean
  volume: number
  onToggle: () => void
  onVolumeChange: (volume: number) => void
  className?: string
}

/**
 * Sound control component for managing audio notifications
 * Provides toggle and volume slider in a popover
 */
export const SoundControl: React.FC<SoundControlProps> = ({
  enabled,
  volume,
  onToggle,
  onVolumeChange,
  className
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn('relative', className)}
          aria-label={enabled ? 'Sound enabled' : 'Sound disabled'}
        >
          {enabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Sound Notifications</span>
            <Button
              variant={enabled ? 'default' : 'outline'}
              size="sm"
              onClick={onToggle}
            >
              {enabled ? 'On' : 'Off'}
            </Button>
          </div>
          
          {enabled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Volume</span>
                <span className="text-sm font-medium">{Math.round(volume * 100)}%</span>
              </div>
              <Slider
                value={[volume]}
                onValueChange={([value]) => onVolumeChange(value)}
                max={1}
                step={0.1}
                className="w-full"
                aria-label="Volume control"
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}