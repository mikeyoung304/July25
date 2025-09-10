import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/useToast'
import { useApiRequest } from '@/hooks/useApiRequest'
import { Settings, Monitor, CheckCircle, AlertCircle } from 'lucide-react'
import { logger } from '@/services/monitoring/logger'

interface TerminalDevice {
  id: string
  code: string
  name: string
  status: 'ONLINE' | 'OFFLINE'
  location_id: string
}

export function SquareTerminalConfig() {
  const { toast } = useToast()
  const api = useApiRequest<TerminalDevice[]>()
  const [devices, setDevices] = useState<TerminalDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    // Load saved device configuration
    const savedDeviceId = localStorage.getItem('square_terminal_device_id')
    if (savedDeviceId) {
      setSelectedDeviceId(savedDeviceId)
      setIsConfigured(true)
    }
  }, [])
  
  useEffect(() => {
    // Fetch available devices on mount
    fetchDevices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDevices = async () => {
    setIsLoading(true)
    try {
      const response = await api.get('/api/v1/terminal/devices')
      if (response && Array.isArray(response)) {
        setDevices(response)
        logger.info('[SquareTerminalConfig] Devices fetched', { count: response.length })
      } else if ((response as any)?.devices) {
        setDevices((response as any).devices)
        logger.info('[SquareTerminalConfig] Devices fetched', { count: (response as any).devices.length })
      }
    } catch (error) {
      logger.error('[SquareTerminalConfig] Failed to fetch devices', { error })
      // Use demo device for testing
      setDevices([{
        id: 'DEMO_DEVICE_001',
        code: 'DEMO',
        name: 'Demo Terminal',
        status: 'ONLINE',
        location_id: 'demo'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const saveDeviceConfiguration = (deviceId: string) => {
    localStorage.setItem('square_terminal_device_id', deviceId)
    setSelectedDeviceId(deviceId)
    setIsConfigured(true)
    toast.success('Square Terminal configured successfully')
    logger.info('[SquareTerminalConfig] Device configured', { deviceId })
  }

  const clearConfiguration = () => {
    localStorage.removeItem('square_terminal_device_id')
    setSelectedDeviceId('')
    setIsConfigured(false)
    toast.success('Square Terminal configuration cleared')
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Square Terminal Configuration</h3>
        </div>
        {isConfigured && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            Configured
          </div>
        )}
      </div>

      {selectedDeviceId && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-900">
            <strong>Current Device:</strong> {selectedDeviceId}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto" />
            <p className="text-sm text-neutral-500 mt-2">Loading devices...</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500">No Square Terminal devices found</p>
            <p className="text-sm text-neutral-400 mt-1">
              Please ensure your terminal is connected and powered on
            </p>
            <Button
              onClick={fetchDevices}
              variant="outline"
              className="mt-4"
            >
              Refresh Devices
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {devices.map(device => (
              <div
                key={device.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedDeviceId === device.id
                    ? 'border-primary bg-primary/5'
                    : 'border-neutral-200 hover:border-primary/50'
                }`}
                onClick={() => saveDeviceConfiguration(device.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Monitor className="h-5 w-5 text-neutral-500" />
                    <div>
                      <div className="font-medium">{device.name}</div>
                      <div className="text-sm text-neutral-500">
                        Code: {device.code} • ID: {device.id}
                      </div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    device.status === 'ONLINE'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {device.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isConfigured && (
          <div className="pt-4 border-t">
            <Button
              onClick={clearConfiguration}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              Clear Configuration
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900 mb-1">Terminal Setup Required</h4>
            <p className="text-sm text-amber-800">
              To enable voice order payments, select your Square Terminal device above. 
              The terminal will automatically receive checkout requests when voice orders are confirmed.
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}