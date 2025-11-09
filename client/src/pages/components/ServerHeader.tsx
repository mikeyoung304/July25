import React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { Restaurant } from 'shared/types'

interface ServerHeaderProps {
  restaurant: Restaurant | null | undefined
}

export function ServerHeader({ restaurant }: ServerHeaderProps) {
  const navigate = useNavigate()

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="rounded-full hover:bg-neutral-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-neutral-800">
                {restaurant?.name || 'Restaurant'} - Server View
              </h1>
              <p className="text-sm text-neutral-600">Dining room management</p>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  )
}