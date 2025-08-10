import React from 'react'
import { motion } from 'framer-motion'
import { Users, Home, Clock, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface ServerStatsProps {
  stats: {
    totalTables: number
    availableTables: number
    occupiedTables: number
    reservedTables: number
    totalSeats: number
    availableSeats: number
  }
}

export function ServerStats({ stats }: ServerStatsProps) {
  const statsData = [
    {
      label: 'Available Tables',
      value: stats.is_availableTables,
      total: stats.totalTables,
      icon: Home,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'Occupied Tables',
      value: stats.occupiedTables,
      total: stats.totalTables,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Reserved Tables',
      value: stats.reservedTables,
      total: stats.totalTables,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      label: 'Available Seats',
      value: stats.is_availableSeats,
      total: stats.totalSeats,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      {statsData.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <span className="text-2xl font-bold text-neutral-800">
                {stat.value}
              </span>
            </div>
            <p className="text-sm text-neutral-600">{stat.label}</p>
            <p className="text-xs text-neutral-500 mt-1">
              of {stat.total} total
            </p>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}