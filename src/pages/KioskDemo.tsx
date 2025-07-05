import React, { useState } from 'react'
import { VoiceCapture } from '@/features/kiosk-voice-capture/components/VoiceCapture'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Mic, CheckCircle } from 'lucide-react'
import { parseVoiceOrder, submitVoiceOrder } from '@/features/kiosk-voice-capture/services/orderIntegration'
import { useToast } from '@/hooks/useToast'
import { OrderSuccessAnimation } from '@/features/kiosk-voice-capture/components/OrderSuccessAnimation'

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
    <div className="min-h-screen bg-gray-50 p-8">
      <OrderSuccessAnimation 
        orderNumber={successOrderNumber} 
        isVisible={orderSubmitted && !!successOrderNumber} 
      />
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Voice Ordering Kiosk</h1>
          <p className="text-lg text-muted-foreground">
            Tap the button and speak your order naturally
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Voice Capture Section */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  Voice Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VoiceCapture onOrderComplete={handleOrderComplete} />
                
                {/* Sample phrases */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Try saying:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>"I'd like a burger with extra cheese"</li>
                    <li>"One large pizza, no onions"</li>
                    <li>"Two burgers and a salad"</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary Section */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {parsedOrder && parsedOrder.items.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-muted-foreground">
                        Parsed with {Math.round(parsedOrder.confidence * 100)}% confidence
                      </span>
                      <Badge variant="secondary">
                        {parsedOrder.items.length} item(s)
                      </Badge>
                    </div>
                    
                    {parsedOrder.items.map((item, index) => (
                      <div key={index} className="border-b pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              {item.quantity}x {item.name}
                            </p>
                            {item.modifiers && item.modifiers.length > 0 && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.modifiers.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="pt-4">
                      <button 
                        onClick={handleConfirmOrder}
                        disabled={isSubmitting || orderSubmitted}
                        className="w-full bg-primary text-primary-foreground rounded-md py-3 font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No items in order yet</p>
                    <p className="text-sm mt-1">Speak your order to begin</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order History */}
            {orderHistory.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm">Recent Transcriptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {orderHistory.slice(-3).reverse().map((text, index) => (
                      <p key={index} className="text-sm text-muted-foreground">
                        "{text}"
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}