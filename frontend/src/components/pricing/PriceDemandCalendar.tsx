import React, { useState, useCallback, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Sun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  Snowflake,
  CloudLightning,
  Tent,
  Zap,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface DayData {
  date: string // YYYY-MM-DD
  price: number
  demand: number // 0-1 (0 = no demand, 1 = max demand)
  occupancy?: number
  isHoliday?: boolean
  isWeekend?: boolean
  isPast?: boolean
  holidayName?: string
  priceChange?: number // % change from previous day
  competitorPrice?: number
  // Weather data (from enrichment)
  temperature?: number
  precipitation?: number
  weatherCondition?: string
  sunshineHours?: number
  // ML Pricing Recommendations
  recommendedPrice?: number
  predictedOccupancy?: number
  revenueImpact?: number
  confidence?: 'very_high' | 'high' | 'medium' | 'low'
  explanation?: string
}

interface PriceDemandCalendarProps {
  data: DayData[]
  currency?: string
  onDateClick?: (date: string) => void
  onMonthChange?: (year: number, month: number) => void
  minPrice?: number
  maxPrice?: number
  className?: string
}

export const PriceDemandCalendar: React.FC<PriceDemandCalendarProps> = ({
  data,
  currency = '€',
  onDateClick,
  onMonthChange,
  minPrice,
  maxPrice,
  className = '',
}) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  // Calculate min/max prices and average from data if not provided
  const priceRange = useMemo(() => {
    const prices = data.map(d => d.price).filter(p => p > 0)
    return {
      min: minPrice ?? Math.min(...prices),
      max: maxPrice ?? Math.max(...prices),
      avg: prices.reduce((sum, p) => sum + p, 0) / prices.length,
    }
  }, [data, minPrice, maxPrice])

  // Get background color based on price deviation from average
  const getPriceDeviationColor = (price: number, isPast: boolean): string => {
    if (isPast) return 'rgba(156, 163, 175, 0.15)' // gray-400 with low opacity
    if (price === 0) return 'rgba(156, 163, 175, 0.1)'

    const avgPrice = priceRange.avg
    const deviation = (price - avgPrice) / avgPrice

    // Color scale based on price vs average:
    // Green = cheap (good deal for customers)
    // Yellow = average
    // Orange/Red = expensive (premium pricing)
    if (deviation < -0.2) return 'rgba(16, 185, 129, 0.2)' // green-500 - Very cheap
    if (deviation < -0.1) return 'rgba(52, 211, 153, 0.15)' // green-400 - Cheap
    if (deviation < 0.1) return 'rgba(251, 191, 36, 0.15)' // amber-400 - Average
    if (deviation < 0.2) return 'rgba(251, 146, 60, 0.25)' // orange-400 - Above average
    if (deviation < 0.3) return 'rgba(239, 68, 68, 0.3)' // red-500 - Expensive
    return 'rgba(220, 38, 38, 0.4)' // red-600 - Very expensive
  }

  // Get border color for special dates and ML confidence
  const getBorderColor = (day: DayData): string => {
    // Priority: ML confidence > holiday > weekend
    if (day.confidence) {
      switch (day.confidence) {
        case 'very_high':
          return '#10B981' // green-500
        case 'high':
          return '#3B82F6' // blue-500
        case 'medium':
          return '#F59E0B' // amber-500
        case 'low':
          return '#6B7280' // gray-500
      }
    }
    if (day.isHoliday) return '#10B981' // green-500
    if (day.isWeekend) return '#EBFF57' // primary yellow
    return 'transparent'
  }

  // Get price text color based on deviation from average
  const getPriceTextColor = (price: number): string => {
    const avgPrice = priceRange.avg
    const deviation = (price - avgPrice) / avgPrice

    if (deviation < -0.15) return '#10B981' // green-500 - Cheap
    if (deviation < 0.15) return '#F3F4F6' // gray-100 - Average
    if (deviation < 0.25) return '#F59E0B' // amber-500 - Above average
    return '#EF4444' // red-500 - Expensive
  }

  // Format price
  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return `${currency}${(price / 1000).toFixed(1)}k`
    }
    return `${currency}${Math.round(price)}`
  }

  // Get weather icon based on condition with animations
  const getWeatherIcon = (day: DayData) => {
    if (!day.weatherCondition && day.temperature === undefined) return null

    const condition = day.weatherCondition?.toLowerCase() || ''
    const iconSize = 'w-4 h-4'

    // Sun - gentle pulsing glow
    if (condition.includes('sun') || condition.includes('clear')) {
      return (
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 10, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Sun
            className={`${iconSize} text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]`}
          />
        </motion.div>
      )
    }
    // Rain - falling animation
    else if (condition.includes('rain') && !condition.includes('drizzle')) {
      return (
        <motion.div
          animate={{
            y: [0, 2, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <CloudRain
            className={`${iconSize} text-blue-400 drop-shadow-[0_0_6px_rgba(96,165,250,0.5)]`}
          />
        </motion.div>
      )
    }
    // Drizzle - gentle floating
    else if (condition.includes('drizzle')) {
      return (
        <motion.div
          animate={{
            y: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <CloudDrizzle
            className={`${iconSize} text-blue-300 drop-shadow-[0_0_4px_rgba(147,197,253,0.4)]`}
          />
        </motion.div>
      )
    }
    // Snow - gentle floating down
    else if (condition.includes('snow')) {
      return (
        <motion.div
          animate={{
            y: [0, 3, 0],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Snowflake
            className={`${iconSize} text-blue-200 drop-shadow-[0_0_6px_rgba(219,234,254,0.6)]`}
          />
        </motion.div>
      )
    }
    // Storm - shake effect
    else if (condition.includes('storm') || condition.includes('thunder')) {
      return (
        <motion.div
          animate={{
            x: [-1, 1, -1, 1, 0],
            opacity: [1, 0.8, 1, 0.8, 1],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatDelay: 2,
          }}
        >
          <CloudLightning
            className={`${iconSize} text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]`}
          />
        </motion.div>
      )
    }
    // Cloud - gentle drift
    else if (condition.includes('cloud')) {
      return (
        <motion.div
          animate={{
            x: [0, 2, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Cloud
            className={`${iconSize} text-gray-400 drop-shadow-[0_0_3px_rgba(156,163,175,0.3)]`}
          />
        </motion.div>
      )
    }

    return (
      <motion.div
        animate={{
          x: [0, 2, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Cloud
          className={`${iconSize} text-gray-400 drop-shadow-[0_0_3px_rgba(156,163,175,0.3)]`}
        />
      </motion.div>
    )
  }

  // Check if day is perfect for camping (18-25°C, <2mm rain)
  const isPerfectCampingDay = (day: DayData): boolean => {
    if (day.isPast) return false
    if (day.temperature === undefined || day.precipitation === undefined) return false

    return day.temperature >= 18 && day.temperature <= 25 && day.precipitation < 2
  }

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDay = firstDay.getDay() // 0 = Sunday
    const daysInMonth = lastDay.getDate()

    const days: (DayData | null)[] = []

    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayData = data.find(d => d.date === dateStr)

      if (dayData) {
        days.push(dayData)
      } else {
        // Fill with empty data
        days.push({
          date: dateStr,
          price: 0,
          demand: 0,
          isPast: new Date(dateStr) < new Date(),
        })
      }
    }

    return days
  }, [currentDate, data])

  // Navigate months
  const previousMonth = useCallback(() => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    setCurrentDate(newDate)
    onMonthChange?.(newDate.getFullYear(), newDate.getMonth())
  }, [currentDate, onMonthChange])

  const nextMonth = useCallback(() => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    setCurrentDate(newDate)
    onMonthChange?.(newDate.getFullYear(), newDate.getMonth())
  }, [currentDate, onMonthChange])

  // Handle date hover
  const handleMouseEnter = useCallback((day: DayData, event: React.MouseEvent<HTMLDivElement>) => {
    if (!day || day.price === 0) return
    setHoveredDate(day.date)

    // Calculate tooltip position
    const rect = event.currentTarget.getBoundingClientRect()
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoveredDate(null)
  }, [])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, day: DayData | null) => {
      if (!day || day.price === 0) return

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onDateClick?.(day.date)
      }
    },
    [onDateClick]
  )

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const hoveredDay = data.find(d => d.date === hoveredDate)

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-text">{monthName}</h3>
          <div className="flex items-center gap-2 text-xs text-muted">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm border border-green-500/30 bg-green-500/20" />
              <span>Cheap</span>
            </div>
            <span>→</span>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm border border-amber-400/30 bg-amber-400/15" />
              <span>Average</span>
            </div>
            <span>→</span>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm border border-red-500/40 bg-red-500/30" />
              <span>Expensive</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={previousMonth}
            className="rounded-lg p-1.5 transition-colors hover:bg-elevated"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4 text-text" />
          </button>
          <button
            onClick={nextMonth}
            className="rounded-lg p-1.5 transition-colors hover:bg-elevated"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4 text-text" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2 text-center text-xs font-medium text-muted">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="aspect-square" />
          }

          const isToday = day.date === new Date().toISOString().split('T')[0]
          const isEmpty = day.price === 0
          const isHovered = hoveredDate === day.date

          return (
            <motion.div
              key={day.date}
              className={`relative aspect-square cursor-pointer overflow-hidden rounded-lg border transition-all duration-200 ${isEmpty ? 'cursor-not-allowed opacity-30' : ''} ${isHovered ? 'z-10 scale-105 ring-2 ring-primary ring-opacity-50' : ''} ${isToday ? 'ring-2 ring-blue-400' : ''} `}
              style={{
                backgroundColor: getPriceDeviationColor(day.price, day.isPast || false),
                borderColor: getBorderColor(day),
                borderWidth: day.confidence || day.isHoliday || day.isWeekend ? '2px' : '1px',
              }}
              onMouseEnter={e => handleMouseEnter(day, e)}
              onMouseLeave={handleMouseLeave}
              onClick={() => !isEmpty && onDateClick?.(day.date)}
              onKeyDown={e => handleKeyDown(e, day)}
              tabIndex={isEmpty ? -1 : 0}
              role="button"
              aria-label={`${day.date}, ${formatPrice(day.price)}, ${Math.round(day.demand * 100)}% demand`}
              whileHover={isEmpty ? {} : { scale: 1.05 }}
              whileTap={isEmpty ? {} : { scale: 0.98 }}
            >
              {/* Day number */}
              <div className="absolute left-1 top-1 text-xs font-semibold text-muted">
                {new Date(day.date).getDate()}
              </div>

              {/* Weather icon (top-right for ALL dates, not just future) */}
              {(() => {
                const weatherIcon = getWeatherIcon(day)
                return weatherIcon ? (
                  <motion.div
                    className="absolute right-1 top-1"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 0.05,
                      duration: 0.2,
                      ease: 'backOut',
                    }}
                  >
                    {weatherIcon}
                  </motion.div>
                ) : null
              })()}

              {/* Holiday indicator (moved to left side, below day number) */}
              {day.isHoliday && (
                <div className="absolute left-1 top-6">
                  <div className="h-1.5 w-1.5 rounded-full bg-success shadow-sm" />
                </div>
              )}

              {/* Perfect camping day indicator (tent icon) */}
              {isPerfectCampingDay(day) && (
                <motion.div
                  className="absolute left-1 top-1 z-10"
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{
                    scale: [1, 1.15, 1],
                    rotate: 0,
                  }}
                  transition={{
                    scale: {
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    },
                    rotate: {
                      duration: 0.3,
                    },
                  }}
                >
                  <Tent
                    className="h-4 w-4 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.7)]"
                    aria-label="Perfect camping conditions!"
                  />
                </motion.div>
              )}

              {/* Price and occupancy info */}
              {!isEmpty && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                  {/* Price with ML indicator */}
                  <div
                    className="flex items-center gap-0.5 text-sm font-bold drop-shadow-sm"
                    style={{ color: getPriceTextColor(day.price) }}
                  >
                    {formatPrice(day.price)}
                    {/* ML indicator */}
                    {day.recommendedPrice && (
                      <Zap
                        className={`h-3 w-3 ${
                          day.confidence === 'very_high'
                            ? 'text-success'
                            : day.confidence === 'high'
                              ? 'text-primary'
                              : day.confidence === 'medium'
                                ? 'text-warning'
                                : 'text-muted'
                        }`}
                      />
                    )}
                  </div>

                  {/* Occupancy percentage (new) */}
                  {day.occupancy !== undefined && day.occupancy > 0 && (
                    <div className="rounded bg-background/50 px-1.5 py-0.5 text-[10px] font-semibold text-gray-300 backdrop-blur-sm">
                      {Math.round(day.occupancy * 100)}%
                    </div>
                  )}

                  {/* Price change indicator (only show for significant changes) */}
                  {day.priceChange !== undefined && Math.abs(day.priceChange) > 5 && (
                    <div className="flex items-center gap-0.5 text-[10px]">
                      {day.priceChange > 0 ? (
                        <TrendingUp className="h-2.5 w-2.5 text-success" />
                      ) : (
                        <TrendingDown className="h-2.5 w-2.5 text-error" />
                      )}
                      <span
                        className={`font-semibold ${
                          day.priceChange > 0 ? 'text-success' : 'text-error'
                        }`}
                      >
                        {Math.abs(day.priceChange).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Past date overlay */}
              {day.isPast && !isEmpty && (
                <div className="absolute inset-0 bg-background opacity-60" />
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredDay && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none fixed z-50"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="min-w-[200px] rounded-lg border border-border bg-elevated p-3 shadow-elevated">
              {/* Date */}
              <div className="mb-2 text-sm font-semibold text-text">
                {new Date(hoveredDay.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
                {hoveredDay.isHoliday && hoveredDay.holidayName && (
                  <span className="ml-2 text-xs text-success">({hoveredDay.holidayName})</span>
                )}
              </div>

              {/* Price */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Price:</span>
                  <span className="font-semibold text-text">{formatPrice(hoveredDay.price)}</span>
                </div>

                {/* Demand */}
                <div className="flex justify-between">
                  <span className="text-muted">Demand:</span>
                  <span className="font-semibold text-text">
                    {Math.round(hoveredDay.demand * 100)}%
                  </span>
                </div>

                {/* Occupancy */}
                {hoveredDay.occupancy !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted">Occupancy:</span>
                    <span className="font-semibold text-text">
                      {Math.round(hoveredDay.occupancy * 100)}%
                    </span>
                  </div>
                )}

                {/* Price change */}
                {hoveredDay.priceChange !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted">vs. Yesterday:</span>
                    <span
                      className={`font-semibold ${
                        hoveredDay.priceChange > 0
                          ? 'text-success'
                          : hoveredDay.priceChange < 0
                            ? 'text-error'
                            : 'text-muted'
                      }`}
                    >
                      {hoveredDay.priceChange > 0 ? '+' : ''}
                      {hoveredDay.priceChange.toFixed(1)}%
                    </span>
                  </div>
                )}

                {/* Weather information */}
                {(hoveredDay.temperature !== undefined || hoveredDay.weatherCondition) && (
                  <div className="mt-1.5 space-y-1 border-t border-border pt-1.5">
                    {hoveredDay.temperature !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Temperature:</span>
                        <span className="flex items-center gap-1 font-semibold text-text">
                          {hoveredDay.temperature.toFixed(1)}°C
                          {isPerfectCampingDay(hoveredDay) && (
                            <Tent
                              className="h-3 w-3 text-green-400"
                              aria-label="Perfect camping!"
                            />
                          )}
                        </span>
                      </div>
                    )}
                    {hoveredDay.precipitation !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted">Rain:</span>
                        <span className="font-semibold text-text">
                          {hoveredDay.precipitation.toFixed(1)}mm
                        </span>
                      </div>
                    )}
                    {hoveredDay.weatherCondition && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Conditions:</span>
                        <span className="flex items-center gap-1 font-semibold text-text">
                          {getWeatherIcon(hoveredDay)}
                          {hoveredDay.weatherCondition}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Competitor median price */}
                {hoveredDay.competitorPrice && (
                  <div className="mt-1.5 flex justify-between border-t border-border pt-1.5">
                    <span className="text-muted">Competitor median:</span>
                    <span className="font-semibold text-text">
                      {formatPrice(hoveredDay.competitorPrice)}
                    </span>
                  </div>
                )}

                {/* ML Pricing Recommendations */}
                {hoveredDay.recommendedPrice && (
                  <div className="mt-2 space-y-1.5 border-t border-border pt-2">
                    <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-primary">
                      <Zap className="h-3 w-3" />
                      ML Recommendation
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Suggested Price:</span>
                      <span className="font-bold text-primary">
                        {formatPrice(hoveredDay.recommendedPrice)}
                      </span>
                    </div>
                    {hoveredDay.predictedOccupancy !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted">Predicted Occupancy:</span>
                        <span className="font-semibold text-text">
                          {Math.round(hoveredDay.predictedOccupancy)}%
                        </span>
                      </div>
                    )}
                    {hoveredDay.revenueImpact != null && (
                      <div className="flex justify-between">
                        <span className="text-muted">Revenue Impact:</span>
                        <span
                          className={`font-bold ${
                            hoveredDay.revenueImpact > 0
                              ? 'text-success'
                              : hoveredDay.revenueImpact < 0
                                ? 'text-error'
                                : 'text-muted'
                          }`}
                        >
                          {hoveredDay.revenueImpact > 0 ? '+' : ''}
                          {hoveredDay.revenueImpact.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {hoveredDay.confidence && (
                      <div className="flex justify-between">
                        <span className="text-muted">Confidence:</span>
                        <span
                          className={`text-xs font-semibold uppercase ${
                            hoveredDay.confidence === 'very_high'
                              ? 'text-success'
                              : hoveredDay.confidence === 'high'
                                ? 'text-primary'
                                : hoveredDay.confidence === 'medium'
                                  ? 'text-warning'
                                  : 'text-muted'
                          }`}
                        >
                          {hoveredDay.confidence.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                    {hoveredDay.explanation && (
                      <div className="mt-1 text-xs italic text-muted">{hoveredDay.explanation}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Demand bar */}
              <div className="mt-2 border-t border-border pt-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-card">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background:
                        hoveredDay.demand > 0.7
                          ? 'linear-gradient(90deg, #F59E0B 0%, #EF4444 100%)'
                          : hoveredDay.demand > 0.4
                            ? 'linear-gradient(90deg, #60A5FA 0%, #F59E0B 100%)'
                            : 'linear-gradient(90deg, #DBEAFE 0%, #60A5FA 100%)',
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${hoveredDay.demand * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border-2 border-success" />
          <span>Holiday</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border-2 border-primary" />
          <span>Weekend</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded ring-2 ring-blue-400" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span>ML Recommendation</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted">Avg price:</span>
          <span className="font-semibold text-text">{formatPrice(priceRange.avg)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted">Range:</span>
          <span className="font-semibold text-text">
            {formatPrice(priceRange.min)} - {formatPrice(priceRange.max)}
          </span>
        </div>
      </div>
    </div>
  )
}
