import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Minus, DollarSign, ShoppingCart } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ActionButton } from '@/components/ui/ActionButton'
import type { ApiMenuItem, ApiMenuItemModifierGroup } from '@rebuild/shared'

interface SelectedModifier {
  groupId: string
  optionId: string
  name: string
  price: number
}

interface ItemModifiersModalProps {
  isOpen: boolean
  onClose: () => void
  item: ApiMenuItem | null
  onAddToOrder: (
    item: ApiMenuItem,
    quantity: number,
    specialInstructions?: string,
    modifiers?: SelectedModifier[]
  ) => void
}

export function ItemModifiersModal({
  isOpen,
  onClose,
  item,
  onAddToOrder
}: ItemModifiersModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const modalRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)

  // Reset state when modal opens with new item
  useEffect(() => {
    if (isOpen && item) {
      setQuantity(1)
      setSpecialInstructions('')
      setSelectedModifiers([])
      setValidationErrors([])
    }
  }, [isOpen, item])

  // Focus trap
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      firstFocusableRef.current.focus()
    }
  }, [isOpen])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleAddToOrder()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedModifiers, quantity, specialInstructions])

  if (!item) return null

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, Math.min(10, quantity + delta))
    setQuantity(newQuantity)
  }

  const handleModifierToggle = (
    group: ApiMenuItemModifierGroup,
    optionId: string,
    optionName: string,
    optionPrice: number
  ) => {
    setValidationErrors([])
    const groupId = group.id

    // Check if this is a radio group (maxSelections === 1)
    const isRadioGroup = group.maxSelections === 1

    if (isRadioGroup) {
      // Radio button behavior: replace any existing selection in this group
      const filtered = selectedModifiers.filter(m => m.groupId !== groupId)
      setSelectedModifiers([...filtered, { groupId, optionId, name: optionName, price: optionPrice }])
    } else {
      // Checkbox behavior
      const existingIndex = selectedModifiers.findIndex(
        m => m.groupId === groupId && m.optionId === optionId
      )

      if (existingIndex >= 0) {
        // Deselect
        setSelectedModifiers(selectedModifiers.filter((_, i) => i !== existingIndex))
      } else {
        // Check maxSelections
        const currentGroupSelections = selectedModifiers.filter(m => m.groupId === groupId).length
        if (group.maxSelections && currentGroupSelections >= group.maxSelections) {
          setValidationErrors([`${group.name} allows a maximum of ${group.maxSelections} selections`])
          return
        }
        // Add selection
        setSelectedModifiers([...selectedModifiers, { groupId, optionId, name: optionName, price: optionPrice }])
      }
    }
  }

  const validateModifiers = (): boolean => {
    const errors: string[] = []
    const modifierGroups = item.modifierGroups || []

    modifierGroups.forEach(group => {
      if (group.required) {
        const hasSelection = selectedModifiers.some(m => m.groupId === group.id)
        if (!hasSelection) {
          errors.push(`${group.name} is required`)
        }
      }
    })

    setValidationErrors(errors)
    return errors.length === 0
  }

  const calculateTotalPrice = (): number => {
    const basePrice = item.price || 0
    const modifiersPrice = selectedModifiers.reduce((sum, mod) => sum + mod.price, 0)
    return (basePrice + modifiersPrice) * quantity
  }

  const handleAddToOrder = () => {
    if (!validateModifiers()) {
      return
    }

    onAddToOrder(item, quantity, specialInstructions || undefined, selectedModifiers.length > 0 ? selectedModifiers : undefined)
    onClose()
  }

  const isModifierSelected = (groupId: string, optionId: string): boolean => {
    return selectedModifiers.some(m => m.groupId === groupId && m.optionId === optionId)
  }

  const modifierGroups = item.modifierGroups || []
  const totalPrice = calculateTotalPrice()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
              <div className="sticky top-0 bg-white border-b border-neutral-200 p-6 z-10">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-neutral-800 mb-1">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-sm text-neutral-600">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <DollarSign className="h-4 w-4 text-teal-600" />
                      <span className="text-lg font-semibold text-teal-600">
                        ${(item.price || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    ref={firstFocusableRef}
                    onClick={onClose}
                    className="p-2 hover:bg-neutral-100 rounded-lg transition-colors ml-4"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5 text-neutral-500" />
                  </button>
                </div>

                {/* Quantity Selector */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-neutral-700">
                    Quantity:
                  </label>
                  <div className="flex items-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      className="w-10 h-10 rounded-full bg-teal-500 hover:bg-teal-600 disabled:bg-neutral-300 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-5 w-5" />
                    </motion.button>
                    <span className="text-2xl font-semibold text-neutral-800 w-12 text-center">
                      {quantity}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= 10}
                      className="w-10 h-10 rounded-full bg-teal-500 hover:bg-teal-600 disabled:bg-neutral-300 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-5 w-5" />
                    </motion.button>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Modifier Groups */}
                {modifierGroups.length > 0 && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-neutral-800">
                      Customize Your Order
                    </h4>
                    {modifierGroups.map(group => {
                      const isRadioGroup = group.maxSelections === 1
                      return (
                        <motion.div
                          key={group.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border border-neutral-200 rounded-xl p-4 bg-neutral-50"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-semibold text-neutral-800">
                              {group.name}
                              {group.required && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </h5>
                            {group.maxSelections && group.maxSelections > 1 && (
                              <span className="text-xs text-neutral-500">
                                Select up to {group.maxSelections}
                              </span>
                            )}
                          </div>
                          <div className="space-y-2">
                            {group.options.map(option => {
                              const isSelected = isModifierSelected(group.id, option.id)
                              return (
                                <motion.label
                                  key={option.id}
                                  whileHover={{ scale: 1.02 }}
                                  className={`
                                    flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all
                                    ${isSelected
                                      ? 'bg-teal-50 border-2 border-teal-500'
                                      : 'bg-white border-2 border-neutral-200 hover:border-teal-300'
                                    }
                                  `}
                                >
                                  <div className="flex items-center gap-3">
                                    <input
                                      type={isRadioGroup ? 'radio' : 'checkbox'}
                                      name={isRadioGroup ? `modifier-group-${group.id}` : undefined}
                                      checked={isSelected}
                                      onChange={() => handleModifierToggle(group, option.id, option.name, option.price)}
                                      className="w-5 h-5 text-teal-500 focus:ring-teal-500 focus:ring-2"
                                    />
                                    <span className="font-medium text-neutral-800">
                                      {option.name}
                                    </span>
                                  </div>
                                  {option.price > 0 && (
                                    <span className="text-sm font-semibold text-teal-600">
                                      +${option.price.toFixed(2)}
                                    </span>
                                  )}
                                </motion.label>
                              )
                            })}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}

                {/* Special Instructions */}
                <div>
                  <label htmlFor="special-instructions" className="block text-sm font-semibold text-neutral-800 mb-2">
                    Special Instructions (Optional)
                  </label>
                  <textarea
                    id="special-instructions"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Add any special requests or dietary notes..."
                    rows={3}
                    maxLength={200}
                    className="w-full px-4 py-3 border-2 border-neutral-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all resize-none"
                  />
                  <div className="text-xs text-neutral-500 mt-1 text-right">
                    {specialInstructions.length}/200 characters
                  </div>
                </div>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 rounded-lg p-4"
                  >
                    <h5 className="font-semibold text-red-800 mb-2">
                      Please fix the following:
                    </h5>
                    <ul className="list-disc list-inside space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index} className="text-sm text-red-700">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </div>

              {/* Footer with Price and Actions */}
              <div className="sticky bottom-0 bg-white border-t border-neutral-200 p-6 z-10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-sm text-neutral-600">Total Price</span>
                    <div className="text-3xl font-bold text-neutral-800">
                      ${totalPrice.toFixed(2)}
                    </div>
                    {selectedModifiers.length > 0 && (
                      <span className="text-xs text-neutral-500">
                        Includes {selectedModifiers.length} modifier{selectedModifiers.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 border-2 hover:bg-neutral-50"
                  >
                    Cancel
                  </Button>
                  <ActionButton
                    onClick={handleAddToOrder}
                    color="#4CAF50"
                    size="medium"
                    fullWidth
                    icon={<ShoppingCart className="h-5 w-5" />}
                  >
                    Add to Order
                  </ActionButton>
                </div>

                <div className="mt-3 text-center text-xs text-neutral-500">
                  Press <kbd className="px-2 py-1 bg-neutral-100 rounded">ESC</kbd> to cancel
                  or <kbd className="px-2 py-1 bg-neutral-100 rounded">Cmd/Ctrl + Enter</kbd> to add
                </div>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
