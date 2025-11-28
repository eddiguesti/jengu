import React, { useState, useMemo, useEffect, useRef } from 'react'
import { PriceDemandCalendar } from '../components/pricing/PriceDemandCalendar'
import { Calendar, TrendingUp, DollarSign, Users } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { useUploadedFiles, useFileData } from '../hooks/queries/useFileData'
import { forecastDemand } from '../lib/api/services/analytics'
import type { DayData } from '../components/pricing/PriceDemandCalendar'

export const PricingCalendarDemo: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [forecastData, setForecastData] = useState<unknown[]>([])
  const [forecastError, setForecastError] = useState<string | null>(null)
  const lastFileIdRef = useRef<string>('')

  // Fetch real data from API
  const { data: uploadedFiles = [] } = useUploadedFiles()
  const validFiles = uploadedFiles.filter(
    f => f.status !== 'deleted' && (f.actualRows || f.rows || 0) > 0
  )
  const firstFileId = validFiles[0]?.id || ''
  const { data: fileData = [], isLoading } = useFileData(firstFileId, 10000)

  console.log('📅 PricingCalendar Debug:', {
    uploadedFiles: uploadedFiles.length,
    validFiles: validFiles.length,
    firstFileId,
    fileDataLength: fileData.length,
    isLoading,
    forecastDataLength: forecastData.length,
    forecastError,
    lastFileId: lastFileIdRef.current,
  })

  // Fetch demand forecast when data is loaded (only once per file)
  useEffect(() => {
    console.log('📅 useEffect triggered:', {
      firstFileId,
      lastFileId: lastFileIdRef.current,
      fileDataLength: fileData.length,
      forecastDataLength: forecastData.length,
      forecastError,
      isLoading,
    })

    // Check if file has changed - if so, reset forecast data
    if (lastFileIdRef.current !== firstFileId) {
      console.log(
        '📅 File changed from',
        lastFileIdRef.current,
        'to',
        firstFileId,
        '- resetting forecast'
      )
      lastFileIdRef.current = firstFileId
      setForecastData([])
      setForecastError(null)
      return // Exit early to let next render fetch data
    }

    // Only fetch if we have data and haven't fetched for this file yet
    if (fileData.length > 0 && forecastData.length === 0 && !forecastError && !isLoading) {
      console.log('📊 Fetching demand forecast for', fileData.length, 'rows')

      void forecastDemand({ data: fileData, daysAhead: 90 })
        .then(response => {
          console.log('📈 Demand forecast received:', response)
          console.log('📈 Response keys:', Object.keys(response))

          // The API returns { success: true, data: { forecast: [...] } }
          const forecastArray = response.data?.forecast || response.forecast

          console.log('📈 Forecast array exists?', !!forecastArray)
          console.log('📈 Forecast is array?', Array.isArray(forecastArray))

          if (forecastArray && Array.isArray(forecastArray)) {
            console.log('📈 Setting forecast data, length:', forecastArray.length)
            setForecastData(forecastArray)
          } else {
            console.warn('⚠️ Forecast data not in expected format:', response)
          }
        })
        .catch(error => {
          console.warn('⚠️ Failed to get demand forecast:', error)
          setForecastError(error instanceof Error ? error.message : 'Unknown error')
        })
    } else {
      console.log('📅 Not fetching forecast:', {
        hasData: fileData.length > 0,
        noForecast: forecastData.length === 0,
        noError: !forecastError,
        notLoading: !isLoading,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstFileId, fileData.length, forecastData.length, forecastError, isLoading])

  // Process real data + forecast for calendar
  const calendarData = useMemo(() => {
    if (!fileData || fileData.length === 0) {
      return []
    }

    console.log(
      '📅 Calendar: Processing',
      fileData.length,
      'historical rows +',
      forecastData.length,
      'forecast rows'
    )

    // Create a map of forecast data by date for easy lookup
    const forecastMap = new Map()
    forecastData.forEach((f: any) => {
      forecastMap.set(f.date, f)
    })

    // Process historical data
    const historical = fileData.map((row: any) => {
      const date = new Date(row.date)
      const dateStr = date.toISOString().split('T')[0]
      const isWeekend = row.isWeekend ?? (date.getDay() === 0 || date.getDay() === 6)
      const isPast = date < new Date()

      // Calculate demand from occupancy (0-1 scale)
      let demand = parseFloat(row.occupancy || 0)
      if (demand > 1) demand = demand / 100 // Convert percentage to decimal

      // Check if there's a forecast for this date (recommended price)
      const forecast = forecastMap.get(dateStr)
      const recommendedPrice = forecast?.predicted_price || forecast?.recommendedPrice

      return {
        date: dateStr,
        price: recommendedPrice || parseFloat(row.price || 0), // Use recommended price if available
        demand: forecast?.predicted_demand || demand,
        occupancy: forecast?.predicted_occupancy || demand,
        isWeekend,
        isHoliday: row.isHoliday || false,
        isPast,
        holidayName: row.holidayName || undefined,
        // Weather data from enrichment
        temperature: row.temperature,
        precipitation: row.precipitation,
        weatherCondition: row.weatherCondition,
        sunshineHours: row.sunshineHours,
      } as DayData
    })

    // Add pure forecast dates (future dates not in historical data)
    const historicalDates = new Set(
      fileData.map((r: any) => new Date(r.date).toISOString().split('T')[0])
    )
    const futureForecast = forecastData
      .filter((f: any) => !historicalDates.has(f.date))
      .map((f: any) => {
        const date = new Date(f.date)
        return {
          date: f.date,
          price: f.predicted_price || f.recommendedPrice || 0,
          demand: f.predicted_demand || 0.5,
          occupancy: f.predicted_occupancy || f.predicted_demand || 0.5,
          isWeekend: date.getDay() === 0 || date.getDay() === 6,
          isHoliday: false,
          isPast: false,
        } as DayData
      })

    return [...historical, ...futureForecast]
  }, [fileData, forecastData])

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
    return calendarData.find(d => d.date === selectedDate)
  }, [selectedDate, calendarData])

  // Calculate overall stats
  const stats = useMemo(() => {
    if (calendarData.length === 0) {
      return {
        avgPrice: 0,
        avgDemand: 0,
        maxPrice: 0,
        minPrice: 0,
        totalRevenue: 0,
      }
    }

    const futureDays = calendarData.filter(d => !d.isPast)
    const daysToUse = futureDays.length > 0 ? futureDays : calendarData
    const avgPrice = daysToUse.reduce((sum, d) => sum + d.price, 0) / daysToUse.length
    const avgDemand = daysToUse.reduce((sum, d) => sum + d.demand, 0) / daysToUse.length
    const maxPrice = Math.max(...daysToUse.map(d => d.price))
    const minPrice = Math.min(...daysToUse.map(d => d.price))

    return {
      avgPrice: Math.round(avgPrice),
      avgDemand: Math.round(avgDemand * 100),
      maxPrice,
      minPrice,
      totalRevenue: Math.round(daysToUse.reduce((sum, d) => sum + d.price * (d.occupancy || 0), 0)),
    }
  }, [calendarData])

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
          {isLoading ? (
            <div className="flex h-96 items-center justify-center">
              <p className="text-muted">Loading calendar data...</p>
            </div>
          ) : calendarData.length === 0 ? (
            <div className="flex h-96 items-center justify-center">
              <p className="text-muted">No data available. Please upload pricing data first.</p>
            </div>
          ) : (
            <PriceDemandCalendar
              data={calendarData}
              currency="€"
              onDateClick={handleDateClick}
              onMonthChange={handleMonthChange}
            />
          )}
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
                  {selectedDayData.competitorPrice != null && (
                    <>
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
                    </>
                  )}
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
                      {Math.round((selectedDayData.occupancy ?? 0) * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Est. Revenue:</span>
                    <span className="font-semibold text-text">
                      €{Math.round(selectedDayData.price * (selectedDayData.occupancy ?? 0))}
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
