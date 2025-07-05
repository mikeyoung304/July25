import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils'

interface TranscriptionDisplayProps {
  transcription: string
  isProcessing?: boolean
  isInterim?: boolean
  confidence?: number
  className?: string
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  transcription,
  isProcessing = false,
  isInterim = false,
  confidence,
  className,
}) => {
  if (!transcription && !isProcessing) return null

  return (
    <Card
      data-testid="transcription-display"
      className={cn(
        'w-full max-w-lg transition-all duration-200',
        isInterim && 'opacity-70',
        className
      )}
    >
      <CardContent className="p-4">
        {isProcessing ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing your order...</span>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-lg">{transcription}</p>
            {confidence !== undefined && (
              <div className="flex justify-end">
                <Badge variant="secondary" className="text-xs">
                  {Math.round(confidence * 100)}% confident
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}