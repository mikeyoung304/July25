import React from 'react'
import { BrandHeader } from '@/components/layout/BrandHeader'
import { BrandHeaderPresets } from '@/components/layout/BrandHeaderPresets'
import type { Restaurant } from '@/types/restaurant'

interface ServerHeaderProps {
  restaurant: Restaurant | null | undefined
}

export function ServerHeader({ restaurant }: ServerHeaderProps) {
  return (
    <BrandHeader
      {...BrandHeaderPresets.server}
      title={`${restaurant?.name || 'Restaurant'} - Server View`}
      subtitle="Dining room management"
      rightContent={
        <span className="text-xs text-macon-orange font-medium">MACON AI Restaurant</span>
      }
      className="bg-white shadow-sm"
    />
  )
}