import React, { useState, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Sun, Cloud, CloudRain, CloudDrizzle, Snowflake, CloudLightning, Tent } from 'lucide-react'
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

  // Calculate min/max prices from data if not provided
  const priceRange = useMemo(() => {
    const prices = data.map((d) => d.price).filter((p) => p > 0)
    return {
      min: minPrice ?? Math.min(...prices),
      max: maxPrice ?? Math.max(...prices),
    }
  }, [data, minPrice, maxPrice])

  // Get demand color based on 0-1 scale (cool blue → warm red)
  const getDemandColor = (demand: number, isPast: boolean): string => {
    if (isPast) return 'rgba(156, 163, 175, 0.1)' // gray-400 with low opacity

    // Cool to warm gradient
    if (demand < 0.2) return 'rgba(219, 234, 254, 0.3)' // blue-100
    if (demand < 0.4) return 'rgba(147, 197, 253, 0.4)' // blue-300
    if (demand < 0.6) return 'rgba(96, 165, 250, 0.5)' // blue-400
    if (demand < 0.7) return 'rgba(251, 191, 36, 0.4)' // amber-400
    if (demand < 0.85) return 'rgba(251, 146, 60, 0.5)' // orange-400
    return 'rgba(239, 68, 68, 0.6)' // red-500 (hot dates)
  }

  // Get border color for special dates
  const getBorderColor = (day: DayData): string => {
    if (day.isHoliday) return '#10B981' // green-500
    if (day.isWeekend) return '#EBFF57' // primary yellow
    return 'transparent'
  }

  // Get price color relative to range
  const getPriceColor = (price: number): string => {
    const range = priceRange.max - priceRange.min
    const position = (price - priceRange.min) / range

    if (position < 0.33) return '#9CA3AF' // Low price (gray)
    if (position < 0.66) return '#FAFAFA' // Mid price (white)
    return '#EBFF57' // High price (primary yellow)
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
          <Sun className={`${iconSize} text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]`} />
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
          <CloudRain className={`${iconSize} text-blue-400 drop-shadow-[0_0_6px_rgba(96,165,250,0.5)]`} />
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
          <CloudDrizzle className={`${iconSize} text-blue-300 drop-shadow-[0_0_4px_rgba(147,197,253,0.4)]`} />
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
          <Snowflake className={`${iconSize} text-blue-200 drop-shadow-[0_0_6px_rgba(219,234,254,0.6)]`} />
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
          <CloudLightning className={`${iconSize} text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]`} />
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
          <Cloud className={`${iconSize} text-gray-400 drop-shadow-[0_0_3px_rgba(156,163,175,0.3)]`} />
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
        <Cloud className={`${iconSize} text-gray-400 drop-shadow-[0_0_3px_rgba(156,163,175,0.3)]`} />
      </motion.div>
    )
  }

  // Check if day is perfect for camping (18-25°C, <2mm rain)
  const isPerfectCampingDay = (day: DayData): boolean => {
    if (day.isPast) return false
    if (day.temperature === undefined || day.precipitation === undefined) return false

    return (
      day.temperature >= 18 &&
      day.temperature <= 25 &&
      day.precipitation < 2
    )
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
      const dayData = data.find((d) => d.date === dateStr)

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
  const handleMouseEnter = useCallback(
    (day: DayData, event: React.MouseEvent<HTMLDivElement>) => {
      if (!day || day.price === 0) return
      setHoveredDate(day.date)

      // Calculate tooltip position
      const rect = event.currentTarget.getBoundingClientRect()
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      })
    },
    []
  )

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
  const hoveredDay = data.find((d) => d.date === hoveredDate)

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-text">{monthName}</h3>
          <div className="flex items-center gap-1 text-xs text-muted">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-blue-100 to-blue-400" />
              <span>Low demand</span>
            </div>
            <span className="mx-1">→</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-orange-400 to-red-500" />
              <span>High demand</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={previousMonth}
            className="p-1.5 rounded-lg hover:bg-elevated transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4 text-text" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-elevated transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4 text-text" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted py-2">
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

          const isToday =
            day.date === new Date().toISOString().split('T')[0]
          const isEmpty = day.price === 0
          const isHovered = hoveredDate === day.date

          return (
            <motion.div
              key={day.date}
              className={`
                relative aspect-square rounded-lg overflow-hidden cursor-pointer
                transition-all duration-200
                ${isEmpty ? 'opacity-30 cursor-not-allowed' : ''}
                ${isHovered ? 'ring-2 ring-primary ring-opacity-50 scale-105 z-10' : ''}
                ${isToday ? 'ring-2 ring-blue-400' : ''}
              `}
              style={{
                backgroundColor: getDemandColor(day.demand, day.isPast || false),
                borderColor: getBorderColor(day),
                borderWidth: day.isHoliday || day.isWeekend ? '2px' : '0',
              }}
              onMouseEnter={(e) => handleMouseEnter(day, e)}
              onMouseLeave={handleMouseLeave}
              onClick={() => !isEmpty && onDateClick?.(day.date)}
              onKeyDown={(e) => handleKeyDown(e, day)}
              tabIndex={isEmpty ? -1 : 0}
              role="button"
              aria-label={`${day.date}, ${formatPrice(day.price)}, ${Math.round(day.demand * 100)}% demand`}
              whileHover={isEmpty ? {} : { scale: 1.05 }}
              whileTap={isEmpty ? {} : { scale: 0.98 }}
            >
              {/* Day number */}
              <div className="absolute top-1 left-1 text-xs font-medium text-muted">
                {new Date(day.date).getDate()}
              </div>

              {/* Holiday indicator */}
              {day.isHoliday && (
                <div className="absolute top-1 right-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                </div>
              )}

              {/* Weather icon (top-right for future dates) */}
              {!day.isPast && getWeatherIcon(day) && (
                <motion.div
                  className="absolute top-1 right-1"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.1,
                    duration: 0.3,
                    ease: 'backOut',
                  }}
                >
                  {getWeatherIcon(day)}
                </motion.div>
              )}

              {/* Perfect camping day indicator (tent icon) */}
              {isPerfectCampingDay(day) && (
                <motion.div
                  className="absolute top-1 left-1 z-10"
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
                  <Tent className="w-4 h-4 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.7)]" title="Perfect camping conditions!" />
                </motion.div>
              )}

              {/* Price */}
              {!isEmpty && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center"
                  style={{ color: getPriceColor(day.price) }}
                >
                  <div className="text-sm font-bold">{formatPrice(day.price)}</div>

                  {/* Price change indicator */}
                  {day.priceChange !== undefined && Math.abs(day.priceChange) > 2 && (
                    <div className="flex items-center gap-0.5 text-xs mt-0.5">
                      {day.priceChange > 0 ? (
                        <TrendingUp className="w-3 h-3 text-success" />
                      ) : day.priceChange < 0 ? (
                        <TrendingDown className="w-3 h-3 text-error" />
                      ) : (
                        <Minus className="w-3 h-3 text-muted" />
                      )}
                      <span
                        className={`font-medium ${
                          day.priceChange > 0
                            ? 'text-success'
                            : day.priceChange < 0
                              ? 'text-error'
                              : 'text-muted'
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
            className="fixed z-50 pointer-events-none"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="bg-elevated border border-border rounded-lg shadow-elevated p-3 min-w-[200px]">
              {/* Date */}
              <div className="text-sm font-semibold text-text mb-2">
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
                  <div className="border-t border-border pt-1.5 mt-1.5 space-y-1">
                    {hoveredDay.temperature !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted">Temperature:</span>
                        <span className="font-semibold text-text flex items-center gap-1">
                          {hoveredDay.temperature.toFixed(1)}°C
                          {isPerfectCampingDay(hoveredDay) && (
                            <Tent className="w-3 h-3 text-green-400" title="Perfect camping!" />
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
                      <div className="flex justify-between items-center">
                        <span className="text-muted">Conditions:</span>
                        <span className="font-semibold text-text flex items-center gap-1">
                          {getWeatherIcon(hoveredDay)}
                          {hoveredDay.weatherCondition}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Competitor price */}
                {hoveredDay.competitorPrice && (
                  <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
                    <span className="text-muted">Competitor avg:</span>
                    <span className="font-semibold text-text">
                      {formatPrice(hoveredDay.competitorPrice)}
                    </span>
                  </div>
                )}
              </div>

              {/* Demand bar */}
              <div className="mt-2 pt-2 border-t border-border">
                <div className="h-1.5 bg-card rounded-full overflow-hidden">
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
          <div className="w-4 h-4 rounded border-2 border-success" />
          <span>Holiday</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-primary" />
          <span>Weekend</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded ring-2 ring-blue-400" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted">Price range:</span>
          <span className="font-semibold text-text">
            {formatPrice(priceRange.min)} - {formatPrice(priceRange.max)}
          </span>
        </div>
      </div>
    </div>
  )
}
