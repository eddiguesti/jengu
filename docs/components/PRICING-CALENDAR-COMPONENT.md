# Pricing Calendar Component Documentation

**Created**: October 24, 2025
**Component**: `PriceDemandCalendar.tsx`
**Demo Page**: `PricingCalendarDemo.tsx`
**Route**: `/pricing/calendar`

---

## Overview

The Pricing Calendar is a beautiful, interactive month-view calendar component designed for dynamic pricing dashboards. It matches the aesthetic and UX of PriceLabs and Google Flights price calendars, providing an intuitive way to visualize pricing and demand patterns across time.

### Key Features

✅ **Month-view calendar** with daily price labels (e.g., €135)
✅ **Cool-to-warm color scale** for demand visualization (blue → amber → orange → red)
✅ **Hot dates detection** - Very high demand dates highlighted in red
✅ **Holiday & weekend accents** - Green borders for holidays, yellow for weekends
✅ **Interactive tooltips** - Hover to see detailed pricing breakdown
✅ **Keyboard navigation** - Tab to focus, Enter/Space to select
✅ **Responsive design** - Works on all screen sizes
✅ **Smooth animations** - Framer Motion for polished interactions
✅ **Price trend indicators** - Show price changes with up/down arrows
✅ **Accessibility** - ARIA labels and keyboard support

---

## Component Architecture

### File Structure

```
frontend/src/
├── components/
│   └── pricing/
│       └── PriceDemandCalendar.tsx    # Main calendar component (~444 lines)
└── pages/
    └── PricingCalendarDemo.tsx         # Demo page with sample data (~367 lines)
```

### Data Interface

```typescript
interface DayData {
  date: string // YYYY-MM-DD format
  price: number // Price in currency
  demand: number // 0-1 scale (0 = no demand, 1 = max demand)
  occupancy?: number // 0-1 scale (optional)
  isHoliday?: boolean // Holiday indicator
  isWeekend?: boolean // Weekend indicator
  isPast?: boolean // Past date indicator
  holidayName?: string // Holiday name (e.g., "Christmas")
  priceChange?: number // % change from previous day
  competitorPrice?: number // Competitor average price
}

interface PriceDemandCalendarProps {
  data: DayData[] // Array of day data
  currency?: string // Currency symbol (default: '€')
  onDateClick?: (date: string) => void
  onMonthChange?: (year: number, month: number) => void
  minPrice?: number // Min price for range calculation
  maxPrice?: number // Max price for range calculation
  className?: string // Additional CSS classes
}
```

---

## Visual Design

### Demand Color Scale

The component uses a 6-level cool-to-warm gradient to represent demand intensity:

| Demand Level | Color       | RGBA                       | Meaning                       |
| ------------ | ----------- | -------------------------- | ----------------------------- |
| 0-20%        | Light Blue  | `rgba(219, 234, 254, 0.3)` | Very low demand               |
| 20-40%       | Blue        | `rgba(147, 197, 253, 0.4)` | Low demand                    |
| 40-60%       | Medium Blue | `rgba(96, 165, 250, 0.5)`  | Moderate demand               |
| 60-70%       | Amber       | `rgba(251, 191, 36, 0.4)`  | High demand                   |
| 70-85%       | Orange      | `rgba(251, 146, 60, 0.5)`  | Very high demand              |
| 85-100%      | Red         | `rgba(239, 68, 68, 0.6)`   | **Hot date** - Maximum demand |

Past dates are shown with gray background: `rgba(156, 163, 175, 0.1)`

### Price Color Coding

Prices are colored based on their position in the price range:

- **Low price** (0-33%): Gray `#9CA3AF`
- **Mid price** (33-66%): White `#FAFAFA`
- **High price** (66-100%): Primary Yellow `#EBFF57`

### Special Date Indicators

- **Holidays**: 2px green border `#10B981`
- **Weekends**: 2px yellow border `#EBFF57` (primary color)
- **Today**: 2px blue ring `ring-blue-400`
- **Hovered**: Primary ring with 1.05x scale

### Price Formatting

```typescript
// Prices under €1000: €135
// Prices over €1000: €1.2k
const formatPrice = (price: number): string => {
  if (price >= 1000) {
    return `${currency}${(price / 1000).toFixed(1)}k`
  }
  return `${currency}${Math.round(price)}`
}
```

---

## Interactive Features

### Hover Tooltips

When hovering over a date, a tooltip appears showing:

- **Date** - e.g., "Tue, Dec 25"
- **Price** - Your price (formatted)
- **Demand** - Demand percentage (0-100%)
- **Occupancy** - Expected occupancy (if available)
- **Price Change** - vs. Yesterday (with color coding)
- **Competitor Price** - Average competitor price (if available)
- **Demand Bar** - Visual demand gradient bar

Tooltip positioning:

- Fixed position above the hovered date
- Centered horizontally
- 10px offset from top of cell
- Smooth fade-in/out animation (150ms)

### Keyboard Navigation

- **Tab**: Focus on dates sequentially
- **Enter or Space**: Select focused date
- **ARIA labels**: Each date has descriptive label (e.g., "2025-10-25, €135, 67% demand")

### Month Navigation

- **Previous month**: Left chevron button
- **Next month**: Right chevron button
- **Callback**: `onMonthChange(year, month)` fired when month changes

### Date Selection

- **Click**: Select date and fire `onDateClick(date)` callback
- **Visual feedback**: Ring highlight + scale animation
- **State management**: Parent component handles selection state

---

## Price Change Indicators

Price changes > 2% show trend arrows:

```tsx
{
  day.priceChange !== undefined && Math.abs(day.priceChange) > 2 && (
    <div className="mt-0.5 flex items-center gap-0.5 text-xs">
      {day.priceChange > 0 ? (
        <TrendingUp className="text-success h-3 w-3" />
      ) : day.priceChange < 0 ? (
        <TrendingDown className="text-error h-3 w-3" />
      ) : (
        <Minus className="text-muted h-3 w-3" />
      )}
      <span className="font-medium">{Math.abs(day.priceChange).toFixed(0)}%</span>
    </div>
  )
}
```

---

## Demo Page Features

The `PricingCalendarDemo.tsx` page includes:

### Sample Data Generation

- **90 days** of sample data (3 months)
- **Realistic demand simulation**:
  - Base demand: 30-60%
  - Weekend boost: +20%
  - Holiday boost: +30%
  - Summer boost: +15% (June-September)
  - Past dates: Lower demand (-30%)

- **Dynamic pricing algorithm**:

  ```typescript
  const basePrice = 120
  const demandMultiplier = 1 + demand * 1.5 // Up to 2.5x
  const weekendMultiplier = isWeekend ? 1.2 : 1
  const holidayMultiplier = isHoliday ? 1.5 : 1

  let price = basePrice * demandMultiplier * weekendMultiplier * holidayMultiplier
  price += (Math.random() - 0.5) * 20 // Add randomness
  ```

- **Competitor pricing**: 85-105% of your price
- **Occupancy**: 80-100% of demand level

### Stats Cards

Four summary cards showing:

1. **Average Price** (next 90 days)
2. **Average Demand** (%)
3. **Price Range** (min-max)
4. **Estimated Revenue** (90 days)

### Selected Date Panel

When a date is selected, shows detailed breakdown:

**Pricing Section**:

- Your Price
- Competitor Average
- Price Advantage (%)
- vs. Yesterday (% change)

**Demand Section**:

- Demand Score (%)
- Expected Occupancy (%)
- Estimated Revenue (€)
- Visual demand bar

**Context Section**:

- Day Type (Weekend/Weekday)
- Holiday name (if applicable)
- Pricing Recommendation:
  - Demand > 80%: "Increase price"
  - Demand 60-80%: "Hold price"
  - Demand < 60%: "Consider discount"

### Instructions Card

User guide explaining:

- Hover for detailed breakdown
- Click to select dates
- Month navigation
- Color intensity meaning
- Border indicators (green=holiday, yellow=weekend)
- Keyboard navigation support

---

## Integration Guide

### 1. Add to Your Page

```tsx
import { PriceDemandCalendar } from '../components/pricing/PriceDemandCalendar'

function MyPricingPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const handleDateClick = (date: string) => {
    setSelectedDate(date)
    // Fetch detailed data for this date, update state, etc.
  }

  const handleMonthChange = (year: number, month: number) => {
    // Fetch data for new month
    console.log('Month changed:', year, month)
  }

  return (
    <PriceDemandCalendar
      data={myPricingData}
      currency="€"
      onDateClick={handleDateClick}
      onMonthChange={handleMonthChange}
    />
  )
}
```

### 2. Prepare Your Data

```typescript
const myPricingData: DayData[] = [
  {
    date: '2025-10-25',
    price: 135,
    demand: 0.67,
    occupancy: 0.72,
    isWeekend: false,
    isHoliday: false,
    isPast: false,
    priceChange: 5.2,
    competitorPrice: 128,
  },
  // ... more days
]
```

### 3. Access the Demo

The demo page is accessible at: `/pricing/calendar`

To add it to navigation, update your sidebar:

```tsx
<NavItem icon={Calendar} label="Pricing Calendar" href="/pricing/calendar" />
```

---

## Performance Optimizations

### 1. Memoization

```typescript
// Price range calculated once per data change
const priceRange = useMemo(() => {
  const prices = data.map(d => d.price).filter(p => p > 0)
  return {
    min: minPrice ?? Math.min(...prices),
    max: maxPrice ?? Math.max(...prices),
  }
}, [data, minPrice, maxPrice])

// Calendar days calculated once per month/data change
const calendarDays = useMemo(() => {
  // Generate calendar grid...
}, [currentDate, data])
```

### 2. Event Handler Optimization

```typescript
// Callbacks wrapped in useCallback to prevent re-renders
const handleMouseEnter = useCallback((day: DayData, event: React.MouseEvent) => {
  // ...
}, [])

const handleMouseLeave = useCallback(() => {
  // ...
}, [])
```

### 3. Lazy Rendering

```typescript
// Component uses AnimatePresence for efficient tooltip rendering
<AnimatePresence>
  {hoveredDay && <motion.div>{/* Tooltip */}</motion.div>}
</AnimatePresence>
```

---

## Customization Options

### Change Currency

```tsx
<PriceDemandCalendar
  data={data}
  currency="$" // USD instead of Euro
/>
```

### Custom Price Range

```tsx
<PriceDemandCalendar
  data={data}
  minPrice={50} // Force minimum price
  maxPrice={500} // Force maximum price
/>
```

### Add Custom Styling

```tsx
<PriceDemandCalendar data={data} className="rounded-xl shadow-xl" />
```

### Modify Colors

Edit the component's color functions:

```typescript
// Customize demand colors
const getDemandColor = (demand: number, isPast: boolean): string => {
  // Your custom color logic
}

// Customize price colors
const getPriceColor = (price: number): string => {
  // Your custom color logic
}
```

---

## Dependencies

The component requires:

- **React 18+**: Core framework
- **Framer Motion**: Animations (`motion`, `AnimatePresence`)
- **Lucide React**: Icons (`ChevronLeft`, `ChevronRight`, `TrendingUp`, `TrendingDown`, `Minus`)
- **Tailwind CSS**: Styling

Install if missing:

```bash
pnpm add framer-motion lucide-react
```

---

## Accessibility

### ARIA Labels

Every interactive date has descriptive label:

```tsx
aria-label={`${day.date}, ${formatPrice(day.price)}, ${Math.round(day.demand * 100)}% demand`}
```

### Keyboard Navigation

- **Tab**: Navigate between dates
- **Enter/Space**: Select date
- **Disabled dates**: `tabIndex={-1}` (skipped in tab order)

### Screen Reader Support

- Semantic button role: `role="button"`
- Clear month/year header
- Legend explaining visual indicators

---

## Future Enhancements

Potential improvements:

1. **Multi-month view** - Show 3 months side-by-side
2. **Date range selection** - Click and drag to select range
3. **Export calendar** - Download as PNG/PDF
4. **Custom tooltips** - Pass custom tooltip component
5. **Zoom levels** - Week view, year view
6. **Historical comparison** - Overlay last year's data
7. **Event markers** - Add custom events (conferences, local events)
8. **Loading states** - Skeleton loader while fetching data
9. **Error boundaries** - Handle missing/invalid data gracefully
10. **Mobile optimizations** - Touch gestures, bottom sheet tooltips

---

## Troubleshooting

### Tooltip not appearing

- Check that day has valid `price` (not 0)
- Verify `hoveredDate` state is updating
- Check `tooltipPosition` calculation

### Colors not displaying correctly

- Verify `demand` is 0-1 scale (not 0-100)
- Check Tailwind CSS is properly configured
- Ensure `getDemandColor` is receiving correct values

### Dates not clickable

- Check that day has valid data
- Verify `onDateClick` callback is passed
- Check `isEmpty` condition (price > 0)

### Animation issues

- Ensure Framer Motion is installed
- Check that `motion.div` is not nested incorrectly
- Verify `AnimatePresence` is outside conditional

---

## Code Location Reference

- **Component**: [frontend/src/components/pricing/PriceDemandCalendar.tsx](../frontend/src/components/pricing/PriceDemandCalendar.tsx)
- **Demo Page**: [frontend/src/pages/PricingCalendarDemo.tsx](../frontend/src/pages/PricingCalendarDemo.tsx)
- **Route Config**: [frontend/src/App.tsx](../frontend/src/App.tsx) - Line 89
- **Type Definitions**: Defined in component file (lines 5-26)

---

## Screenshots & Examples

Visit `/pricing/calendar` to see the live demo with:

- 90 days of realistic sample data
- All features enabled
- Interactive tooltips
- Stats cards
- Selected date details
- Usage instructions

---

**Questions or issues?** Check the demo page for working examples, or review the component source code with inline comments.
