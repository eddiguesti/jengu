import { useMemo } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
  Database,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUploadedFiles, useFileData } from '../hooks/queries/useFileData'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export const Dashboard = () => {
  const navigate = useNavigate()

  // Fetch files list and data using React Query
  const { data: uploadedFiles = [] } = useUploadedFiles()
  const firstFileId = uploadedFiles[0]?.id || ''
  const { data: fileData = [], isLoading } = useFileData(firstFileId, 10000)

  const hasData = fileData.length > 0

  // Process real data from Supabase for charts and statistics
  const processedData = useMemo(() => {
    if (!fileData || fileData.length === 0) {
      return {
        totalRecords: 0,
        avgPrice: 0,
        avgOccupancy: 0,
        revenueData: [],
        occupancyByDay: [],
        priceTimeSeries: [],
      }
    }

    // Calculate totals
    const totalRecords = fileData.length

    // Calculate average price
    const prices = fileData
      .map((row: any) => parseFloat(row.price || row.rate || 0))
      .filter(p => p > 0)
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0

    // Calculate average occupancy
    const occupancies = fileData
      .map((row: any) => {
        const occ = parseFloat(row.occupancy || row.occupancy_rate || 0)
        if (occ > 1 && occ <= 100) return occ // Already percentage
        if (occ > 0 && occ <= 1) return occ * 100 // Convert decimal to percentage
        return 0
      })
      .filter(o => o > 0)
    const avgOccupancy =
      occupancies.length > 0 ? occupancies.reduce((a, b) => a + b, 0) / occupancies.length : 0

    // Revenue by month (last 6 months)
    const revenueByMonth: Record<string, { revenue: number; count: number }> = {}
    fileData.forEach((row: any) => {
      const date = new Date(row.date || row.check_in || row.booking_date)
      if (isNaN(date.getTime())) return

      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      const price = parseFloat(row.price || row.rate || 0)

      if (!revenueByMonth[monthKey]) {
        revenueByMonth[monthKey] = { revenue: 0, count: 0 }
      }

      revenueByMonth[monthKey].revenue += price
      revenueByMonth[monthKey].count++
    })

    const revenueData = Object.entries(revenueByMonth)
      .map(([month, data]) => ({
        month,
        revenue: Math.round(data.revenue),
        avgRevenue: Math.round(data.revenue / data.count),
      }))
      .sort((a, b) => {
        const dateA = new Date(a.month)
        const dateB = new Date(b.month)
        return dateA.getTime() - dateB.getTime()
      })
      .slice(-6) // Last 6 months

    // Occupancy by day of week
    const dayGroups: Record<string, number[]> = {
      Mon: [],
      Tue: [],
      Wed: [],
      Thu: [],
      Fri: [],
      Sat: [],
      Sun: [],
    }

    fileData.forEach((row: any) => {
      const date = new Date(row.date || row.check_in || row.booking_date)
      if (isNaN(date.getTime())) return

      const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
      let occupancy = parseFloat(row.occupancy || row.occupancy_rate || 0)

      if (occupancy > 1 && occupancy <= 100) {
        // Already percentage
      } else if (occupancy > 0 && occupancy <= 1) {
        occupancy = occupancy * 100
      }

      if (occupancy > 0 && dayOfWeek in dayGroups) {
        dayGroups[dayOfWeek].push(occupancy)
      }
    })

    const occupancyByDay = Object.entries(dayGroups).map(([day, occupancies]) => ({
      day,
      occupancy:
        occupancies.length > 0
          ? Math.round(occupancies.reduce((a, b) => a + b, 0) / occupancies.length)
          : 0,
    }))

    // Price time series (last 30 days)
    const last30Days = fileData
      .map((row: any) => ({
        date: new Date(row.date || row.check_in || row.booking_date),
        price: parseFloat(row.price || row.rate || 0),
      }))
      .filter(d => !isNaN(d.date.getTime()) && d.price > 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-30)

    const priceTimeSeries = last30Days.map(d => ({
      date: d.date.getDate().toString(),
      price: Math.round(d.price),
    }))

    return {
      totalRecords,
      avgPrice: Math.round(avgPrice),
      avgOccupancy: Math.round(avgOccupancy),
      revenueData,
      occupancyByDay,
      priceTimeSeries,
    }
  }, [fileData])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text flex items-center gap-3 text-4xl font-bold">
            Dashboard
            {isLoading && (
              <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
            )}
          </h1>
          <p className="text-muted mt-2">
            {hasData
              ? 'Real-time insights from your uploaded data'
              : 'Get started by uploading your data'}
          </p>
        </div>
        {hasData && (
          <Badge variant="success" className="px-4 py-2 text-base">
            <Activity className="mr-2 h-4 w-4" />
            {processedData.totalRecords.toLocaleString()} Records
          </Badge>
        )}
      </div>

      {/* Quick Action Cards */}
      {hasData && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card
              variant="elevated"
              className="group cursor-pointer border-l-4 border-l-[#EBFF57] p-6 transition-all hover:shadow-xl"
              onClick={() => navigate('/pricing/optimizer')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-400">Quick Action</p>
                  <h3 className="mt-1 text-lg font-semibold text-gray-100">Get Price Quote</h3>
                  <p className="mt-2 text-sm text-gray-400">
                    AI-powered pricing recommendation
                  </p>
                </div>
                <div className="rounded-lg bg-[#EBFF57]/10 p-3">
                  <Zap className="h-6 w-6 text-[#EBFF57]" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm font-medium text-[#EBFF57]">
                Open Optimizer
                <ArrowUpRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card
              variant="elevated"
              className="group cursor-pointer border-l-4 border-l-blue-500 p-6 transition-all hover:shadow-xl"
              onClick={() => navigate('/data-sources')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-400">Quick Action</p>
                  <h3 className="mt-1 text-lg font-semibold text-gray-100">Upload Data</h3>
                  <p className="mt-2 text-sm text-gray-400">Add new CSV files to analyze</p>
                </div>
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <Database className="h-6 w-6 text-blue-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm font-medium text-blue-500">
                Manage Files
                <ArrowUpRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card
              variant="elevated"
              className="group cursor-pointer border-l-4 border-l-purple-500 p-6 transition-all hover:shadow-xl"
              onClick={() => navigate('/analytics')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-400">Quick Action</p>
                  <h3 className="mt-1 text-lg font-semibold text-gray-100">View Analytics</h3>
                  <p className="mt-2 text-sm text-gray-400">Deep dive into trends & insights</p>
                </div>
                <div className="rounded-lg bg-purple-500/10 p-3">
                  <BarChart3 className="h-6 w-6 text-purple-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm font-medium text-purple-500">
                Explore Charts
                <ArrowUpRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card
              variant="elevated"
              className="group cursor-pointer border-l-4 border-l-green-500 p-6 transition-all hover:shadow-xl"
              onClick={() => navigate('/tools/assistant')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-400">Quick Action</p>
                  <h3 className="mt-1 text-lg font-semibold text-gray-100">Ask AI</h3>
                  <p className="mt-2 text-sm text-gray-400">Get instant answers & advice</p>
                </div>
                <div className="rounded-lg bg-green-500/10 p-3">
                  <Activity className="h-6 w-6 text-green-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm font-medium text-green-500">
                Open Assistant
                <ArrowUpRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Empty State - No Data */}
      {!hasData && !isLoading && (
        <Card variant="elevated" className="py-20 text-center">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
            <div className="bg-primary/10 rounded-full p-6">
              <Database className="text-primary h-16 w-16" />
            </div>
            <div>
              <h2 className="text-text mb-3 text-2xl font-bold">
                Add Data to See Your Complete Dashboard
              </h2>
              <p className="text-muted mb-6 text-lg">
                Upload your historical booking data to unlock powerful insights, analytics, and
                AI-powered pricing recommendations.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button variant="primary" size="lg" onClick={() => navigate('/data')}>
                <Database className="mr-2 h-5 w-5" />
                Upload Data Now
              </Button>
              <Button variant="ghost" size="lg" onClick={() => navigate('/assistant')}>
                Learn How It Works
              </Button>
            </div>

            {/* Preview of what they'll get */}
            <div className="border-border mt-8 w-full border-t pt-8">
              <p className="text-muted mb-4 text-sm">Once you upload data, you&apos;ll see:</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="border-border bg-elevated rounded-lg border p-4">
                  <BarChart3 className="text-primary mx-auto mb-2 h-6 w-6" />
                  <p className="text-text text-xs font-medium">Revenue Charts</p>
                </div>
                <div className="border-border bg-elevated rounded-lg border p-4">
                  <TrendingUp className="text-success mx-auto mb-2 h-6 w-6" />
                  <p className="text-text text-xs font-medium">Occupancy Trends</p>
                </div>
                <div className="border-border bg-elevated rounded-lg border p-4">
                  <Activity className="text-warning mx-auto mb-2 h-6 w-6" />
                  <p className="text-text text-xs font-medium">Price Analytics</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* KPI Cards - Real Data */}
      {hasData && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card
              variant="elevated"
              className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg"
            >
              <div className="bg-primary/5 group-hover:bg-primary/10 absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full transition-colors" />
              <div className="relative">
                <div className="mb-4 flex items-center justify-between">
                  <div className="bg-primary/10 rounded-xl p-3">
                    <BarChart3 className="text-primary h-6 w-6" />
                  </div>
                </div>
                <p className="text-muted mb-1 text-sm">Total Records</p>
                <h3 className="text-text text-3xl font-bold">
                  {processedData.totalRecords.toLocaleString()}
                </h3>
                <div className="text-muted mt-3 flex items-center gap-1 text-xs">
                  <span>From uploaded data</span>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card
              variant="elevated"
              className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg"
            >
              <div className="bg-success/5 group-hover:bg-success/10 absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full transition-colors" />
              <div className="relative">
                <div className="mb-4 flex items-center justify-between">
                  <div className="bg-success/10 rounded-xl p-3">
                    <DollarSign className="text-success h-6 w-6" />
                  </div>
                </div>
                <p className="text-muted mb-1 text-sm">Average Price</p>
                <h3 className="text-text text-3xl font-bold">
                  €{processedData.avgPrice.toLocaleString()}
                </h3>
                <div className="text-muted mt-3 flex items-center gap-1 text-xs">
                  <span>Across all records</span>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card
              variant="elevated"
              className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg"
            >
              <div className="bg-warning/5 group-hover:bg-warning/10 absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full transition-colors" />
              <div className="relative">
                <div className="mb-4 flex items-center justify-between">
                  <div className="bg-warning/10 rounded-xl p-3">
                    <TrendingUp className="text-warning h-6 w-6" />
                  </div>
                  {processedData.avgOccupancy > 75 ? (
                    <Badge variant="success" size="sm">
                      <ArrowUpRight className="mr-1 h-3 w-3" />
                      High
                    </Badge>
                  ) : processedData.avgOccupancy > 50 ? (
                    <Badge variant="default" size="sm">
                      Moderate
                    </Badge>
                  ) : (
                    <Badge variant="default" size="sm">
                      <ArrowDownRight className="mr-1 h-3 w-3" />
                      Low
                    </Badge>
                  )}
                </div>
                <p className="text-muted mb-1 text-sm">Occupancy Rate</p>
                <h3 className="text-text text-3xl font-bold">{processedData.avgOccupancy}%</h3>
                <div className="text-muted mt-3 flex items-center gap-1 text-xs">
                  <span>Average across dataset</span>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card
              variant="elevated"
              className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg"
            >
              <div className="bg-primary/5 group-hover:bg-primary/10 absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full transition-colors" />
              <div className="relative">
                <div className="mb-4 flex items-center justify-between">
                  <div className="bg-primary/10 rounded-xl p-3">
                    <Zap className="text-primary h-6 w-6" />
                  </div>
                  <Badge variant="primary" size="sm">
                    Ready
                  </Badge>
                </div>
                <p className="text-muted mb-1 text-sm">ML Predictions</p>
                <h3 className="text-primary text-2xl font-bold">Available</h3>
                <div className="text-muted mt-3 flex items-center gap-1 text-xs">
                  <span>View in Insights</span>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Charts Section - Real Data */}
      {hasData && processedData.revenueData.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Revenue Trend */}
          <Card variant="default">
            <Card.Header>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-text text-xl font-semibold">Revenue Performance</h2>
                  <p className="text-muted mt-1 text-sm">Monthly revenue (last 6 months)</p>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={processedData.revenueData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EBFF57" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EBFF57" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #2A2A2A',
                      borderRadius: '8px',
                      color: '#FAFAFA',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#EBFF57"
                    strokeWidth={3}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>

          {/* Occupancy by Day */}
          <Card variant="default">
            <Card.Header>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-text text-xl font-semibold">Weekly Occupancy</h2>
                  <p className="text-muted mt-1 text-sm">Average occupancy by day</p>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={processedData.occupancyByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="day" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #2A2A2A',
                      borderRadius: '8px',
                      color: '#FAFAFA',
                    }}
                  />
                  <Bar dataKey="occupancy" fill="#EBFF57" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </div>
      )}

      {/* Price Trend - Real Data */}
      {hasData && processedData.priceTimeSeries.length > 0 && (
        <Card variant="default">
          <Card.Header>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-text text-xl font-semibold">Price Trend</h2>
                <p className="text-muted mt-1 text-sm">
                  Last {processedData.priceTimeSeries.length} days
                </p>
              </div>
              <Badge variant="default">€{processedData.avgPrice} Avg</Badge>
            </div>
          </Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={processedData.priceTimeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #2A2A2A',
                    borderRadius: '8px',
                    color: '#FAFAFA',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: '#10B981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      )}

      {/* Quick Actions - Always show */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-text text-2xl font-semibold">Quick Actions</h2>
          <p className="text-muted text-sm">Manage your pricing intelligence</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card
            variant="default"
            className="hover:border-primary group cursor-pointer transition-all hover:shadow-lg"
            onClick={() => navigate('/data')}
          >
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 group-hover:bg-primary/20 rounded-xl p-3 transition-colors">
                <BarChart3 className="text-primary h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-text mb-1 text-lg font-semibold">Upload Data</h3>
                <p className="text-muted mb-4 text-sm">Import your historical booking data</p>
                <Button variant="secondary" size="sm">
                  Go to Data →
                </Button>
              </div>
            </div>
          </Card>

          <Card
            variant="default"
            className="hover:border-primary group cursor-pointer transition-all hover:shadow-lg"
            onClick={() => navigate('/enrichment')}
          >
            <div className="flex items-start gap-4">
              <div className="bg-success/10 group-hover:bg-success/20 rounded-xl p-3 transition-colors">
                <Activity className="text-success h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-text mb-1 text-lg font-semibold">Enrich Dataset</h3>
                <p className="text-muted mb-4 text-sm">Add weather, holidays, and features</p>
                <Button variant="secondary" size="sm">
                  Go to Enrichment →
                </Button>
              </div>
            </div>
          </Card>

          <Card
            variant="default"
            className="hover:border-primary group cursor-pointer transition-all hover:shadow-lg"
            onClick={() => navigate('/insights')}
          >
            <div className="flex items-start gap-4">
              <div className="bg-warning/10 group-hover:bg-warning/20 rounded-xl p-3 transition-colors">
                <TrendingUp className="text-warning h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-text mb-1 text-lg font-semibold">View Insights</h3>
                <p className="text-muted mb-4 text-sm">Explore pricing patterns and trends</p>
                <Button variant="primary" size="sm">
                  Go to Insights →
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Getting Started Banner */}
      {!hasData && (
        <Card
          variant="elevated"
          className="border-primary from-primary/5 border-l-4 bg-gradient-to-r to-transparent"
        >
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 rounded-xl p-4">
              <Zap className="text-primary h-8 w-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-text mb-2 text-xl font-semibold">
                Welcome to Jengu Dynamic Pricing
              </h3>
              <p className="text-muted mb-4">
                Start by uploading your booking data, then enrich it with weather and competitor
                intelligence. Our ML models will help you optimize pricing for maximum revenue and
                occupancy.
              </p>
              <div className="flex gap-3">
                <Button variant="primary" onClick={() => navigate('/data')}>
                  Get Started
                </Button>
                <Button variant="ghost" onClick={() => navigate('/assistant')}>
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </motion.div>
  )
}
