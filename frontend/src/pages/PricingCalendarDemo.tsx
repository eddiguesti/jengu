import React, { useState, useMemo } from 'react'
import { PriceDemandCalendar } from '../components/pricing/PriceDemandCalendar'
import { Calendar, TrendingUp, DollarSign, Users } from 'lucide-react'
import { Card } from '../components/ui/Card'

export const PricingCalendarDemo: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Generate sample data for 3 months
  const sampleData = useMemo(() => {
    const data: any[] = []
    const startDate = new Date()
    startDate.setDate(1) // Start of current month

    // Generate data for 90 days (3 months)
    for (let i = 0; i < 90; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)

      const dateStr = date.toISOString().split('T')[0]
      const dayOfWeek = date.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const isPast = date < new Date()

      // Simulate holiday (Christmas, New Year's, etc.)
      const month = date.getMonth()
      const day = date.getDate()
      const isHoliday =
        (month === 11 && day === 25) || // Christmas
        (month === 0 && day === 1) || // New Year
        (month === 6 && day === 4) || // July 4th
        (month === 10 && day >= 23 && day <= 24) // Thanksgiving

      let holidayName = ''
      if (month === 11 && day === 25) holidayName = 'Christmas'
      if (month === 0 && day === 1) holidayName = "New Year's Day"
      if (month === 6 && day === 4) holidayName = 'Independence Day'
      if (month === 10 && day >= 23 && day <= 24) holidayName = 'Thanksgiving'

      // Simulate demand (higher on weekends, holidays, summer)
      let demand = 0.3 + Math.random() * 0.3 // Base: 30-60%

      if (isWeekend) demand += 0.2 // Weekend boost
      if (isHoliday) demand += 0.3 // Holiday boost
      if (month >= 5 && month <= 8) demand += 0.15 // Summer boost
      if (isPast) demand = Math.max(0.2, demand - 0.3) // Lower for past dates

      demand = Math.min(1, demand) // Cap at 100%

      // Price based on demand (base €100-250)
      const basePrice = 120
      const demandMultiplier = 1 + demand * 1.5 // Up to 2.5x for high demand
      const weekendMultiplier = isWeekend ? 1.2 : 1
      const holidayMultiplier = isHoliday ? 1.5 : 1

      let price = basePrice * demandMultiplier * weekendMultiplier * holidayMultiplier
      price += (Math.random() - 0.5) * 20 // Add some randomness

      // Calculate price change (vs yesterday)
      let priceChange = undefined
      if (i > 0 && !isPast) {
        const yesterdayPrice = data[i - 1]?.price || price
        priceChange = ((price - yesterdayPrice) / yesterdayPrice) * 100
      }

      // Competitor price (slightly lower on average)
      const competitorPrice = price * (0.85 + Math.random() * 0.2)

      data.push({
        date: dateStr,
        price: Math.round(price),
        demand,
        occupancy: demand * (0.8 + Math.random() * 0.2), // Occupancy ~80-100% of demand
        isWeekend,
        isHoliday,
        isPast,
        holidayName,
        priceChange,
        competitorPrice: Math.round(competitorPrice),
      })
    }

    return data
  }, [])

  const handleDateClick = (date: string) => {
    setSelectedDate(date)
    console.log('Selected date:', date)
  }

  const handleMonthChange = (year: number, month: number) => {
    console.log('Month changed:', year, month)
  }

  // Calculate stats for selected date
  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null
    return sampleData.find(d => d.date === selectedDate)
  }, [selectedDate, sampleData])

  // Calculate overall stats
  const stats = useMemo(() => {
    const futureDays = sampleData.filter(d => !d.isPast)
    const avgPrice = futureDays.reduce((sum, d) => sum + d.price, 0) / futureDays.length
    const avgDemand = futureDays.reduce((sum, d) => sum + d.demand, 0) / futureDays.length
    const maxPrice = Math.max(...futureDays.map(d => d.price))
    const minPrice = Math.min(...futureDays.map(d => d.price))

    return {
      avgPrice: Math.round(avgPrice),
      avgDemand: Math.round(avgDemand * 100),
      maxPrice,
      minPrice,
      totalRevenue: Math.round(futureDays.reduce((sum, d) => sum + d.price * d.occupancy, 0)),
    }
  }, [sampleData])

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <div className="mb-2 flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-text">Price + Demand Calendar</h1>
          </div>
          <p className="text-muted">
            Visualize pricing and demand patterns across time. Hover for details, click to select
            dates.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1 text-xs text-muted">Avg Price (Next 90d)</p>
                <p className="text-2xl font-bold text-text">€{stats.avgPrice}</p>
              </div>
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1 text-xs text-muted">Avg Demand</p>
                <p className="text-2xl font-bold text-text">{stats.avgDemand}%</p>
              </div>
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1 text-xs text-muted">Price Range</p>
                <p className="text-2xl font-bold text-text">
                  €{stats.minPrice}-{stats.maxPrice}
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1 text-xs text-muted">Est. Revenue (90d)</p>
                <p className="text-2xl font-bold text-text">
                  €{(stats.totalRevenue / 1000).toFixed(1)}k
                </p>
              </div>
              <Users className="h-5 w-5 text-success" />
            </div>
          </Card>
        </div>

        {/* Main Calendar */}
        <Card className="p-6">
          <PriceDemandCalendar
            data={sampleData}
            currency="€"
            onDateClick={handleDateClick}
            onMonthChange={handleMonthChange}
          />
        </Card>

        {/* Selected Date Details */}
        {selectedDayData && (
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-text">
              Selected Date:{' '}
              {new Date(selectedDayData.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              {selectedDayData.isHoliday && (
                <span className="ml-2 text-sm text-success">({selectedDayData.holidayName})</span>
              )}
            </h3>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Pricing */}
              <div>
                <h4 className="mb-3 text-sm font-medium text-muted">Pricing</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Your Price:</span>
                    <span className="font-semibold text-text">€{selectedDayData.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Competitor Avg:</span>
                    <span className="font-semibold text-text">
                      €{selectedDayData.competitorPrice}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Price Advantage:</span>
                    <span
                      className={`font-semibold ${
                        selectedDayData.price > selectedDayData.competitorPrice
                          ? 'text-success'
                          : 'text-error'
                      }`}
                    >
                      {(
                        ((selectedDayData.price - selectedDayData.competitorPrice) /
                          selectedDayData.competitorPrice) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  {selectedDayData.priceChange !== undefined && (
                    <div className="flex justify-between border-t border-border pt-2">
                      <span className="text-muted">vs. Yesterday:</span>
                      <span
                        className={`font-semibold ${
                          selectedDayData.priceChange > 0
                            ? 'text-success'
                            : selectedDayData.priceChange < 0
                              ? 'text-error'
                              : 'text-muted'
                        }`}
                      >
                        {selectedDayData.priceChange > 0 ? '+' : ''}
                        {selectedDayData.priceChange.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Demand */}
              <div>
                <h4 className="mb-3 text-sm font-medium text-muted">Demand</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Demand Score:</span>
                    <span className="font-semibold text-text">
                      {Math.round(selectedDayData.demand * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Expected Occupancy:</span>
                    <span className="font-semibold text-text">
                      {Math.round(selectedDayData.occupancy * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Est. Revenue:</span>
                    <span className="font-semibold text-text">
                      €{Math.round(selectedDayData.price * selectedDayData.occupancy)}
                    </span>
                  </div>

                  {/* Demand bar */}
                  <div className="pt-2">
                    <div className="h-2 overflow-hidden rounded-full bg-card">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${selectedDayData.demand * 100}%`,
                          background:
                            selectedDayData.demand > 0.7
                              ? 'linear-gradient(90deg, #F59E0B 0%, #EF4444 100%)'
                              : selectedDayData.demand > 0.4
                                ? 'linear-gradient(90deg, #60A5FA 0%, #F59E0B 100%)'
                                : 'linear-gradient(90deg, #DBEAFE 0%, #60A5FA 100%)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Context */}
              <div>
                <h4 className="mb-3 text-sm font-medium text-muted">Context</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Day Type:</span>
                    <span className="font-semibold text-text">
                      {selectedDayData.isWeekend ? 'Weekend' : 'Weekday'}
                    </span>
                  </div>
                  {selectedDayData.isHoliday && (
                    <div className="flex justify-between">
                      <span className="text-muted">Holiday:</span>
                      <span className="font-semibold text-success">
                        {selectedDayData.holidayName}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted">Recommendation:</span>
                    <span className="font-semibold text-text">
                      {selectedDayData.demand > 0.8
                        ? 'Increase price'
                        : selectedDayData.demand > 0.6
                          ? 'Hold price'
                          : 'Consider discount'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Instructions */}
        <Card className="border-primary border-opacity-20 bg-elevated p-6">
          <h3 className="mb-2 text-sm font-semibold text-text">How to Use</h3>
          <ul className="space-y-1 text-sm text-muted">
            <li>
              • <span className="font-medium">Hover</span> over any date to see detailed pricing
              breakdown
            </li>
            <li>
              • <span className="font-medium">Click</span> a date to select it and view full details
            </li>
            <li>
              • <span className="font-medium">Navigate</span> months using arrow buttons in the
              header
            </li>
            <li>
              • <span className="font-medium">Color intensity</span> indicates demand level (cool
              blue = low, warm red = high)
            </li>
            <li>
              • <span className="font-medium">Green borders</span> mark holidays,{' '}
              <span className="font-medium">yellow borders</span> mark weekends
            </li>
            <li>
              • <span className="font-medium">Keyboard navigation</span> supported: Tab to focus,
              Enter/Space to select
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
