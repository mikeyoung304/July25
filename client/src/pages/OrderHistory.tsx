import React from 'react'
import { Calendar, Download, RefreshCw, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useOrderHistory } from '@/hooks/useOrderHistory'
import { OrderHistoryTable } from '@/modules/analytics/components/OrderHistoryTable'
import { OrderStatisticsCards } from '@/modules/analytics/components/OrderStatisticsCards'
import { DateRangePicker } from '@/components/shared/inputs/DateRangePicker'
import { cn } from '@/utils'

export const OrderHistory: React.FC = () => {
  const {
    orders,
    statistics,
    isLoading,
    error,
    page,
    totalPages,
    searchQuery,
    startDate,
    endDate,
    setPage,
    setSearchQuery,
    setDateRange,
    refresh,
    exportToCSV
  } = useOrderHistory()

  return (
    <div className="min-h-screen bg-macon-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Order History</h1>
          <p className="text-muted-foreground">View and analyze past orders</p>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="mb-6">
            <OrderStatisticsCards statistics={statistics} />
          </div>
        )}

        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by order number, table, or items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onRangeChange={setDateRange}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={orders.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            <OrderHistoryTable
              orders={orders}
              isLoading={isLoading}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}