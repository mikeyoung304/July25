import React from 'react'
import { CheckCircle } from 'lucide-react'

interface OrderSuccessAnimationProps {
  orderNumber: string
  isVisible: boolean
}

export const OrderSuccessAnimation: React.FC<OrderSuccessAnimationProps> = ({ 
  orderNumber, 
  isVisible 
}) => {
  if (!isVisible) return null
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="bg-white rounded-lg shadow-2xl p-8 transform animate-bounce-in">
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-green-100 rounded-full p-4 animate-pulse">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Order Confirmed!</h2>
          <p className="text-lg text-gray-600">Order #{orderNumber}</p>
          <p className="text-sm text-gray-500">Sent to kitchen</p>
        </div>
      </div>
    </div>
  )
}