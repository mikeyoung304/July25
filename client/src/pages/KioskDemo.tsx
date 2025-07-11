import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { VoiceCapture } from '@/modules/voice/components/VoiceCapture'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Mic, CheckCircle } from 'lucide-react'
import { parseVoiceOrder, submitVoiceOrder } from '@/modules/voice/services/orderIntegration'
import { useToast } from '@/hooks/useToast'
import { OrderSuccessAnimation } from '@/modules/voice/components/OrderSuccessAnimation'

interface ParsedOrder {
  items: Array<{
    name: string
    quantity: number
    modifiers?: string[]
  }>
  confidence: number
}

export const KioskDemo: React.FC = () => {
  const [parsedOrder, setParsedOrder] = useState<ParsedOrder | null>(null)
  const [orderHistory, setOrderHistory] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderSubmitted, setOrderSubmitted] = useState(false)
  const [successOrderNumber, setSuccessOrderNumber] = useState<string>('')
  const { toast } = useToast()
  // Restaurant context is available but not currently used
  // const { restaurant } = useRestaurant()

  const handleOrderComplete = (transcription: string) => {
    setOrderHistory(prev => [...prev, transcription])
    const voiceOrder = parseVoiceOrder(transcription)
    
    if (voiceOrder) {
      setParsedOrder({
        items: voiceOrder.items,
        confidence: 0.85
      })
      setOrderSubmitted(false)
    } else {
      setParsedOrder({
        items: [],
        confidence: 0.3
      })
      toast.error('Could not understand the order. Please try again.')
    }
  }

  const handleConfirmOrder = async () => {
    if (!parsedOrder || parsedOrder.items.length === 0) return
    
    setIsSubmitting(true)
    try {
      const voiceOrder = parseVoiceOrder(orderHistory[orderHistory.length - 1])
      if (!voiceOrder) throw new Error('Invalid order')
      
      const result = await submitVoiceOrder(voiceOrder)
      
      if (result.order) {
        toast.success(`Order #${result.order.orderNumber} submitted to kitchen!`)
        setOrderSubmitted(true)
        setSuccessOrderNumber(result.order.orderNumber)
        
        // Reset after 3 seconds
        setTimeout(() => {
          setParsedOrder(null)
          setOrderSubmitted(false)
          setOrderHistory([])
          setSuccessOrderNumber('')
        }, 3000)
      }
    } catch (error) {
      toast.error('Failed to submit order. Please try again.')
      console.error('Order submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-macon-background via-white to-macon-orange/5 p-8">
      <OrderSuccessAnimation 
        orderNumber={successOrderNumber} 
        isVisible={orderSubmitted && !!successOrderNumber} 
      />
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold mb-3 text-macon-navy"
          >
            Voice Ordering Kiosk
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-neutral-600"
          >
            Tap the button and speak your order naturally
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Voice Capture Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-large hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-macon-orange/10 to-transparent">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-macon-orange/20">
                    <Mic className="h-5 w-5 text-macon-orange" />
                  </div>
                  Voice Order
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <VoiceCapture onOrderComplete={handleOrderComplete} />
                
                {/* Sample phrases */}
                <div className="mt-6 p-4 bg-gradient-to-br from-macon-navy/5 to-macon-orange/5 rounded-xl border border-macon-navy/10">
                  <p className="text-sm font-semibold text-macon-navy mb-3">Try saying:</p>
                  <ul className="text-sm text-neutral-600 space-y-2">
                    <li className="flex items-start">
                      <span className="text-macon-orange mr-2">•</span>
                      "I'd like a burger with extra cheese"
                    </li>
                    <li className="flex items-start">
                      <span className="text-macon-orange mr-2">•</span>
                      "One large pizza, no onions"
                    </li>
                    <li className="flex items-start">
                      <span className="text-macon-orange mr-2">•</span>
                      "Two burgers and a salad"
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Order Summary Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-large hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-macon-teal/10 to-transparent">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-macon-teal/20">
                    <ShoppingCart className="h-5 w-5 text-macon-teal" />
                  </div>
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {parsedOrder && parsedOrder.items.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-sm text-neutral-600">
                        Parsed with {Math.round(parsedOrder.confidence * 100)}% confidence
                      </span>
                      <Badge variant="success" className="px-3 py-1">
                        {parsedOrder.items.length} item(s)
                      </Badge>
                    </div>
                    
                    {parsedOrder.items.map((item, index) => (
                      <motion.div 
                        key={index} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border-b border-neutral-100 pb-4 mb-4 last:border-0"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-macon-navy">
                              <span className="text-macon-orange mr-2">{item.quantity}x</span>
                              {item.name}
                            </p>
                            {item.modifiers && item.modifiers.length > 0 && (
                              <p className="text-sm text-neutral-600 mt-1 ml-7">
                                {item.modifiers.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    
                    <div className="pt-6">
                      <button 
                        onClick={handleConfirmOrder}
                        disabled={isSubmitting || orderSubmitted}
                        className="w-full bg-macon-navy text-white rounded-lg py-3.5 font-medium hover:bg-macon-navy-dark hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-medium hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {orderSubmitted ? (
                          <>
                            <CheckCircle className="h-5 w-5" />
                            Order Submitted!
                          </>
                        ) : isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Submitting...
                          </>
                        ) : (
                          'Confirm Order'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-macon-teal/10 flex items-center justify-center">
                      <ShoppingCart className="h-10 w-10 text-macon-teal/40" />
                    </div>
                    <p className="text-neutral-600 font-medium">No items in order yet</p>
                    <p className="text-sm text-neutral-500 mt-2">Speak your order to begin</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order History */}
            {orderHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="mt-4 border-0 shadow-soft">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-macon-navy">Recent Transcriptions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {orderHistory.slice(-3).reverse().map((text, index) => (
                        <p key={index} className="text-sm text-neutral-600 italic">
                          "{text}"
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}