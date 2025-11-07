import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, ShoppingCart, Trash2, Edit2, Plus, Minus, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ActionButton } from '@/components/ui/ActionButton'
import { Badge } from '@/components/ui/badge'
import { VoiceControlWebRTC } from '@/modules/voice/components/VoiceControlWebRTC'
import { OrderModification } from '@/modules/voice/contexts/types'
import { OrderInputSelector, OrderInputMode } from '@/components/shared/OrderInputSelector'
import { MenuGrid } from '@/modules/order-system/components/MenuGrid'
import { ItemDetailModal } from '@/modules/order-system/components/ItemDetailModal'
import { MenuItem } from '@/services/types'
import { CartItem } from '@/modules/order-system/types'
import type { Table } from '@/types/table'
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems'

interface OrderItem {
  id: string
  menuItemId?: string
  name: string
  quantity: number
  modifications?: OrderModification[]
  source?: 'voice' | 'touch' // Track how item was added
  price?: number
}

interface VoiceOrderModalProps {
  show: boolean
  table: Table | null | undefined
  seat: number | null
  voiceOrder: {
    currentTranscript: string
    orderItems: OrderItem[]
    isVoiceActive: boolean
    isProcessing: boolean
    handleVoiceTranscript: (event: { text: string; isFinal: boolean }) => void
    handleOrderData?: (orderData: any) => void
    removeOrderItem: (itemId: string) => void
    updateOrderItem?: (itemId: string, updates: Partial<OrderItem>) => void
    setOrderItems: (items: OrderItem[]) => void
    setIsProcessing: (processing: boolean) => void
    orderNotes?: string
    setOrderNotes?: (notes: string) => void
  }
  onSubmit: () => void
  onClose: () => void
  isSubmitting?: boolean
}

export function VoiceOrderModal({
  show,
  table,
  seat,
  voiceOrder,
  onSubmit,
  onClose,
  isSubmitting = false
}: VoiceOrderModalProps) {
  const [inputMode, setInputMode] = useState<OrderInputMode>('voice')
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null)
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [orderNotes, setOrderNotes] = useState('')

  const { items: menuItems } = useMenuItems()

  if (!show || !table || !seat) return null

  // Calculate order totals
  const orderTotals = useMemo(() => {
    const subtotal = voiceOrder.orderItems.reduce((sum, item) => {
      const menuItem = menuItems.find(m => m.id === item.menuItemId)
      const itemPrice = (menuItem?.price || item.price || 0)
      const modifiersTotal = (item.modifications || []).reduce((modSum, mod) => modSum + (mod.price || 0), 0)
      return sum + ((itemPrice + modifiersTotal) * item.quantity)
    }, 0)
    return {
      itemCount: voiceOrder.orderItems.reduce((sum, item) => sum + item.quantity, 0),
      total: subtotal
    }
  }, [voiceOrder.orderItems, menuItems])

  const handleTouchItemClick = (item: MenuItem) => {
    setEditingItemId(null)
    setSelectedMenuItem(item)
    setIsItemModalOpen(true)
  }

  const handleEditItem = (orderItem: OrderItem) => {
    const menuItem = menuItems.find(m => m.id === orderItem.menuItemId)
    if (menuItem) {
      setEditingItemId(orderItem.id)
      setSelectedMenuItem(menuItem)
      setIsItemModalOpen(true)
    }
  }

  const handleAddToOrder = (cartItem: CartItem) => {
    // Convert CartItem to OrderItem
    const orderItem: OrderItem = {
      id: editingItemId || cartItem.id,
      menuItemId: cartItem.menuItemId,
      name: cartItem.name,
      quantity: cartItem.quantity,
      price: cartItem.price,
      source: editingItemId ? voiceOrder.orderItems.find(i => i.id === editingItemId)?.source : inputMode,
      modifications: cartItem.modifiers?.map(mod => ({
        id: mod.id,
        name: mod.name,
        price: mod.price
      }))
    }

    if (editingItemId) {
      // Update existing item
      voiceOrder.setOrderItems(
        voiceOrder.orderItems.map(item => item.id === editingItemId ? orderItem : item)
      )
    } else {
      // Add new item
      voiceOrder.setOrderItems([...voiceOrder.orderItems, orderItem])
    }

    setIsItemModalOpen(false)
    setEditingItemId(null)
  }

  const handleQuantityChange = (itemId: string, delta: number) => {
    voiceOrder.setOrderItems(
      voiceOrder.orderItems.map(item => {
        if (item.id === itemId) {
          const newQuantity = Math.max(1, item.quantity + delta)
          return { ...item, quantity: newQuantity }
        }
        return item
      })
    )
  }

  const handleRemoveItem = (itemId: string) => {
    setShowRemoveConfirm(itemId)
  }

  const confirmRemoveItem = (itemId: string) => {
    voiceOrder.removeOrderItem(itemId)
    setShowRemoveConfirm(null)
  }

  const handleSubmit = async () => {
    // Sync order notes if hook supports it
    if (voiceOrder.setOrderNotes) {
      voiceOrder.setOrderNotes(orderNotes)
    }

    await onSubmit()
    setSubmitSuccess(true)
    setTimeout(() => setSubmitSuccess(false), 2000)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="w-full max-w-7xl max-h-[90vh] overflow-hidden bg-white">
              <div className="p-6 border-b">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-neutral-800">
                      Order - {table.label}, Seat {seat}
                    </h3>
                    <p className="text-sm text-neutral-600 mt-1">
                      {inputMode === 'voice'
                        ? 'Press and hold the microphone to add items'
                        : 'Select items from the menu to add to your order'
                      }
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5 text-neutral-500" />
                  </button>
                </div>

                {/* Order Input Mode Selector */}
                <div className="flex justify-center">
                  <OrderInputSelector
                    mode={inputMode}
                    onChange={setInputMode}
                    size="medium"
                  />
                </div>
              </div>

              {/* Side-by-side layout: Touch menu (left) | Voice + Order list (right) */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 250px)' }}>
                <div className="flex flex-col lg:flex-row gap-6 p-6">
                  {/* LEFT PANEL: Touch Menu Grid (only shown in touch mode) */}
                  {inputMode === 'touch' && (
                    <div className="flex-1 lg:w-3/5">
                      <div className="border rounded-lg overflow-hidden bg-neutral-50">
                        <MenuGrid
                          selectedCategory={selectedCategory}
                          searchQuery={searchQuery}
                          onItemClick={handleTouchItemClick}
                        />
                      </div>
                    </div>
                  )}

                  {/* RIGHT PANEL: Voice Control + Order Items List */}
                  <div className={inputMode === 'touch' ? 'flex-1 lg:w-2/5' : 'w-full'}>
                    {/* Voice Control (only shown in voice mode) */}
                    {inputMode === 'voice' && (
                      <div className="flex justify-center mb-6">
                        <VoiceControlWebRTC
                          onTranscript={(event) => {
                            console.log('[VoiceOrderModal] Transcript received:', event);
                            voiceOrder.handleVoiceTranscript(event);
                          }}
                          onOrderDetected={(orderData) => {
                            console.log('[VoiceOrderModal] Order detected:', orderData);
                            voiceOrder.handleOrderData?.(orderData);
                          }}
                          debug={true}
                          muteAudioOutput={true}
                        />
                      </div>
                    )}

                    {/* Current Transcript (voice mode only) */}
                    {inputMode === 'voice' && voiceOrder.currentTranscript && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 p-4 bg-accent/10 rounded-lg border border-accent"
                      >
                        <div className="flex items-center gap-2">
                          <Mic className="h-4 w-4 text-accent animate-pulse" />
                          <span className="text-sm font-medium text-accent">Listening...</span>
                        </div>
                        <p className="text-sm text-neutral-700 mt-2">{voiceOrder.currentTranscript}</p>
                      </motion.div>
                    )}

                    {/* Order Items List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-neutral-800">Order Items</h4>
                        <Badge variant="secondary">
                          {orderTotals.itemCount} item{orderTotals.itemCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      {voiceOrder.orderItems.length === 0 ? (
                        <div className="text-center py-8">
                          <ShoppingCart className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                          <p className="text-neutral-500">No items added yet</p>
                          <p className="text-sm text-neutral-400 mt-1">
                            {inputMode === 'voice'
                              ? 'Press and hold the microphone to start ordering'
                              : 'Select items from the menu to add to your order'
                            }
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {voiceOrder.orderItems.map((item, index) => (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="relative p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors border border-neutral-200"
                            >
                              {/* Source Badge */}
                              {item.source && (
                                <div className="absolute top-2 right-2">
                                  <Badge
                                    variant={item.source === 'voice' ? 'default' : 'secondary'}
                                    className="text-xs px-1.5 py-0.5"
                                  >
                                    {item.source === 'voice' ? (
                                      <><Mic className="h-2.5 w-2.5 mr-0.5 inline" />Voice</>
                                    ) : (
                                      'Touch'
                                    )}
                                  </Badge>
                                </div>
                              )}

                              <div className="flex items-start gap-3 pr-16">
                                {/* Quantity Controls */}
                                <div className="flex flex-col items-center gap-1 bg-white rounded-md border border-neutral-200 p-1">
                                  <button
                                    onClick={() => handleQuantityChange(item.id, 1)}
                                    className="p-0.5 hover:bg-neutral-100 rounded transition-colors"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus className="h-3 w-3 text-neutral-600" />
                                  </button>
                                  <span className="text-sm font-semibold text-neutral-700 px-1">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => handleQuantityChange(item.id, -1)}
                                    className="p-0.5 hover:bg-neutral-100 rounded transition-colors"
                                    aria-label="Decrease quantity"
                                    disabled={item.quantity <= 1}
                                  >
                                    <Minus className="h-3 w-3 text-neutral-600" />
                                  </button>
                                </div>

                                {/* Item Details */}
                                <div className="flex-1">
                                  <div className="font-medium text-neutral-800">{item.name}</div>
                                  {item.modifications && item.modifications.length > 0 && (
                                    <div className="text-xs text-neutral-500 mt-1">
                                      {item.modifications.map(mod => mod.name).join(', ')}
                                    </div>
                                  )}
                                  {/* Price Display */}
                                  {(item.price !== undefined || menuItems.find(m => m.id === item.menuItemId)?.price) && (
                                    <div className="text-xs text-neutral-600 mt-1">
                                      {formatPrice(
                                        ((menuItems.find(m => m.id === item.menuItemId)?.price || item.price || 0) +
                                        ((item.modifications || []).reduce((sum, mod) => sum + (mod.price || 0), 0))) *
                                        item.quantity
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="absolute bottom-2 right-2 flex gap-1">
                                {item.menuItemId && (
                                  <button
                                    onClick={() => handleEditItem(item)}
                                    className="p-1.5 hover:bg-blue-100 rounded-md transition-colors group"
                                    aria-label={`Edit ${item.name}`}
                                  >
                                    <Edit2 className="h-3.5 w-3.5 text-neutral-400 group-hover:text-blue-600" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="p-1.5 hover:bg-red-100 rounded-md transition-colors group"
                                  aria-label={`Remove ${item.name}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-neutral-400 group-hover:text-red-500" />
                                </button>
                              </div>

                              {/* Remove Confirmation */}
                              {showRemoveConfirm === item.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="absolute inset-0 bg-white rounded-lg border-2 border-red-500 flex items-center justify-center gap-2 p-2"
                                >
                                  <span className="text-sm text-neutral-700">Remove this item?</span>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => confirmRemoveItem(item.id)}
                                  >
                                    Yes
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowRemoveConfirm(null)}
                                  >
                                    No
                                  </Button>
                                </motion.div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {/* Order Notes */}
                      {voiceOrder.orderItems.length > 0 && (
                        <div className="mt-4">
                          <label
                            htmlFor="order-notes"
                            className="block text-sm font-medium text-neutral-700 mb-2"
                          >
                            Special Requests or Table Notes
                          </label>
                          <textarea
                            id="order-notes"
                            value={orderNotes}
                            onChange={(e) => {
                              if (e.target.value.length <= 500) {
                                setOrderNotes(e.target.value)
                              }
                            }}
                            placeholder="Add special requests or table notes..."
                            className="w-full p-3 border border-neutral-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                            rows={3}
                            maxLength={500}
                          />
                          <div className="text-xs text-neutral-500 mt-1 text-right">
                            {orderNotes.length}/500 characters
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Processing Indicator (voice mode only) */}
                    {inputMode === 'voice' && voiceOrder.isProcessing && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                          <span className="text-sm text-blue-700">Processing voice input...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t bg-neutral-50">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <ActionButton
                    onClick={handleSubmit}
                    disabled={voiceOrder.orderItems.length === 0 || voiceOrder.isProcessing || isSubmitting}
                    color={submitSuccess ? "#4CAF50" : "#FF6B35"}
                    size="medium"
                    fullWidth
                    icon={
                      submitSuccess ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : isSubmitting ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      ) : (
                        <ShoppingCart className="h-5 w-5" />
                      )
                    }
                  >
                    {submitSuccess
                      ? 'Order Sent!'
                      : isSubmitting
                      ? 'Sending...'
                      : `Send Order (${orderTotals.itemCount} item${orderTotals.itemCount !== 1 ? 's' : ''} - ${formatPrice(orderTotals.total)})`
                    }
                  </ActionButton>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Item Detail Modal for Touch Ordering and Editing */}
          <ItemDetailModal
            isOpen={isItemModalOpen}
            onClose={() => {
              setIsItemModalOpen(false)
              setEditingItemId(null)
            }}
            item={selectedMenuItem}
            onAddToCart={handleAddToOrder}
          />
        </>
      )}
    </AnimatePresence>
  )
}
