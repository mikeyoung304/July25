import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { ArrowLeft, Loader2, Check, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageTitle, Body } from '@/components/ui/Typography'
import { spacing } from '@/lib/typography'
import { menuService } from '@/services/menu/MenuService'
import { MenuItem } from '@/services/types'
import { useToast } from '@/hooks/useToast'
import { OptimizedImage } from '@/components/shared/OptimizedImage'
import { formatPrice } from '@rebuild/shared'
import { logger } from '@/services/logger'

interface MenuManagementProps {
  restaurantId: string
  onBack?: () => void
}

interface AvailabilityToggleProps {
  item: MenuItem
  onToggle: (itemId: string, isAvailable: boolean) => Promise<void>
}

function AvailabilityToggle({ item, onToggle }: AvailabilityToggleProps) {
  const [isLoading, setIsLoading] = useState(false)
  const isAvailable = item.isAvailable !== false

  const handleToggle = async () => {
    setIsLoading(true)
    try {
      await onToggle(item.id, !isAvailable)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        ${isAvailable ? 'bg-teal-600' : 'bg-gray-300'}
      `}
      role="switch"
      aria-checked={isAvailable}
      aria-label={`Toggle availability for ${item.name}`}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full
          bg-white shadow ring-0 transition duration-200 ease-in-out
          flex items-center justify-center
          ${isAvailable ? 'translate-x-5' : 'translate-x-0'}
        `}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 text-gray-400 animate-spin" />
        ) : isAvailable ? (
          <Check className="h-3 w-3 text-teal-600" />
        ) : (
          <X className="h-3 w-3 text-gray-400" />
        )}
      </span>
    </button>
  )
}

export function MenuManagement({ restaurantId, onBack }: MenuManagementProps) {
  const [items, setItems] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const loadMenu = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const menuItems = await menuService.getMenuItems()
      setItems(menuItems)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load menu'
      setError(message)
      logger.error('Failed to load menu for management', { error: err, restaurantId })
    } finally {
      setIsLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    loadMenu()
  }, [loadMenu])

  const handleToggleAvailability = async (itemId: string, isAvailable: boolean) => {
    try {
      await menuService.updateMenuItemAvailability(itemId, isAvailable)

      // Update local state optimistically
      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, isAvailable } : item
      ))

      toast.success(isAvailable ? 'Item is now available' : 'Item marked as sold out')
      logger.info('Menu item availability updated', { itemId, isAvailable, restaurantId })
    } catch (err) {
      toast.error('Failed to update availability')
      logger.error('Failed to update menu item availability', { error: err, itemId, restaurantId })
      // Reload to get correct state
      loadMenu()
    }
  }

  // Group items by category (Todo #174: memoized to avoid recomputation on every render)
  const groupedItems = useMemo(() => {
    return items.reduce((acc, item) => {
      const categoryName = item.category?.name || 'Uncategorized'
      if (!acc[categoryName]) {
        acc[categoryName] = []
      }
      acc[categoryName].push(item)
      return acc
    }, {} as Record<string, MenuItem[]>)
  }, [items])

  // Count unavailable items (Todo #174: memoized)
  const unavailableCount = useMemo(() => {
    return items.filter(item => item.isAvailable === false).length
  }, [items])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-macon-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-macon-logo-blue" />
          <span className="text-neutral-600">Loading menu...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-macon-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-neutral-600 mb-4">{error}</p>
          <Button onClick={loadMenu}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-macon-background">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-8 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="text-macon-logo-blue hover:bg-macon-logo-blue/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            )}
            <div>
              <PageTitle as="h1" className="text-2xl">Menu Management</PageTitle>
              <Body className="text-neutral-500">
                {items.length} items • {unavailableCount > 0 && (
                  <span className="text-red-500 font-medium">{unavailableCount} sold out</span>
                )}
              </Body>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className={`${spacing.page.container} ${spacing.page.padding} py-8`}>
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <div key={category} className="mb-8">
            <h2 className="text-lg font-semibold text-neutral-700 mb-4">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categoryItems.map(item => (
                <Card
                  key={item.id}
                  className={`p-4 ${item.isAvailable === false ? 'opacity-60 border-red-200' : ''}`}
                >
                  <div className="flex gap-4">
                    {/* Item Image */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <OptimizedImage
                        src={item.imageUrl}
                        alt={item.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-neutral-900 truncate">{item.name}</h3>
                      <p className="text-sm text-neutral-500">{formatPrice(item.price)}</p>

                      {/* Availability Toggle */}
                      <div className="flex items-center gap-2 mt-2">
                        <AvailabilityToggle
                          item={item}
                          onToggle={handleToggleAvailability}
                        />
                        <span className={`text-sm ${item.isAvailable !== false ? 'text-teal-600' : 'text-red-500'}`}>
                          {item.isAvailable !== false ? 'Available' : 'Sold Out'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-600">No menu items found</p>
          </div>
        )}
      </div>
    </div>
  )
}
