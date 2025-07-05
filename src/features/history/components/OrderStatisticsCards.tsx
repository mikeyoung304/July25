import React from 'react'
import { TrendingUp, DollarSign, Clock, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface OrderStatistics {
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  totalRevenue: number
  averageOrderValue: number
  averagePreparationTime: number
  ordersByHour: Array<{ hour: number; count: number }>
}

interface OrderStatisticsCardsProps {
  statistics: OrderStatistics
}

export const OrderStatisticsCards: React.FC<OrderStatisticsCardsProps> = ({ statistics }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const completionRate = statistics.totalOrders > 0
    ? (statistics.completedOrders / statistics.totalOrders * 100).toFixed(1)
    : '0'

  const cards = [
    {
      title: 'Total Orders',
      value: statistics.totalOrders.toString(),
      subtitle: `${completionRate}% completion rate`,
      icon: Package,
      color: 'text-blue-600'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(statistics.totalRevenue),
      subtitle: `${formatCurrency(statistics.averageOrderValue)} avg order`,
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Avg Preparation Time',
      value: `${Math.round(statistics.averagePreparationTime)} min`,
      subtitle: 'From order to ready',
      icon: Clock,
      color: 'text-orange-600'
    },
    {
      title: 'Peak Hour Orders',
      value: Math.max(...statistics.ordersByHour.map(h => h.count)).toString(),
      subtitle: `At ${statistics.ordersByHour.find(h => h.count === Math.max(...statistics.ordersByHour.map(h => h.count)))?.hour || 0}:00`,
      icon: TrendingUp,
      color: 'text-purple-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.subtitle}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}