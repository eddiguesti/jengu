import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  Activity,
  Zap,
  Database,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useDataStore } from '../store'
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

// Mock data for charts
const revenueData = [
  { month: 'Jan', revenue: 42000, target: 40000 },
  { month: 'Feb', revenue: 45000, target: 43000 },
  { month: 'Mar', revenue: 52000, target: 48000 },
  { month: 'Apr', revenue: 58000, target: 52000 },
  { month: 'May', revenue: 62000, target: 58000 },
  { month: 'Jun', revenue: 68000, target: 62000 },
]

const occupancyData = [
  { day: 'Mon', occupancy: 65 },
  { day: 'Tue', occupancy: 68 },
  { day: 'Wed', occupancy: 72 },
  { day: 'Thu', occupancy: 78 },
  { day: 'Fri', occupancy: 92 },
  { day: 'Sat', occupancy: 98 },
  { day: 'Sun', occupancy: 95 },
]

const priceData = [
  { date: '1', price: 245 },
  { date: '5', price: 258 },
  { date: '10', price: 275 },
  { date: '15', price: 268 },
  { date: '20', price: 290 },
  { date: '25', price: 310 },
  { date: '30', price: 295 },
]

export const Dashboard = () => {
  const navigate = useNavigate()
  const { uploadedFiles } = useDataStore()

  // Check if user has uploaded data
  const hasData = uploadedFiles.length > 0

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
          <h1 className="text-text text-4xl font-bold">Dashboard</h1>
          <p className="text-muted mt-2">
            {hasData
              ? 'Real-time insights into your pricing performance'
              : 'Get started by uploading your data'}
          </p>
        </div>
        {hasData && (
          <Badge variant="success" className="px-4 py-2 text-base">
            <Activity className="mr-2 h-4 w-4" />
            Live Data
          </Badge>
        )}
      </div>

      {/* Empty State - No Data */}
      {!hasData && (
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

      {/* KPI Cards - Enhanced */}
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
                  <Badge variant="success" size="sm">
                    +12.5%
                  </Badge>
                </div>
                <p className="text-muted mb-1 text-sm">Total Records</p>
                <h3 className="text-text text-3xl font-bold">3,972</h3>
                <div className="text-success mt-3 flex items-center gap-1 text-xs">
                  <ArrowUpRight className="h-3 w-3" />
                  <span>487 this month</span>
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
                  <Badge variant="success" size="sm">
                    +8.2%
                  </Badge>
                </div>
                <p className="text-muted mb-1 text-sm">Average Price</p>
                <h3 className="text-text text-3xl font-bold">€287</h3>
                <div className="text-success mt-3 flex items-center gap-1 text-xs">
                  <ArrowUpRight className="h-3 w-3" />
                  <span>€21 vs last month</span>
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
                  <Badge variant="success" size="sm">
                    +5.1%
                  </Badge>
                </div>
                <p className="text-muted mb-1 text-sm">Occupancy Rate</p>
                <h3 className="text-text text-3xl font-bold">87.3%</h3>
                <div className="text-success mt-3 flex items-center gap-1 text-xs">
                  <ArrowUpRight className="h-3 w-3" />
                  <span>4.2% improvement</span>
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
                    Active
                  </Badge>
                </div>
                <p className="text-muted mb-1 text-sm">ML Model Status</p>
                <h3 className="text-primary text-2xl font-bold">Optimized</h3>
                <div className="text-muted mt-3 flex items-center gap-1 text-xs">
                  <span>92% accuracy</span>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Charts Section */}
      {hasData && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Revenue Trend */}
          <Card variant="default">
            <Card.Header>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-text text-xl font-semibold">Revenue Performance</h2>
                  <p className="text-muted mt-1 text-sm">Monthly revenue vs target</p>
                </div>
                <Badge variant="success">+15.2%</Badge>
              </div>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={revenueData}>
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
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#EBFF57"
                    strokeWidth={3}
                    fill="url(#revenueGradient)"
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="#9CA3AF"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
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
                <Badge variant="primary">Current Week</Badge>
              </div>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={occupancyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="day" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #2A2A2A',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="occupancy" fill="#EBFF57" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </div>
      )}

      {/* Price Trend */}
      {hasData && (
        <Card variant="default">
          <Card.Header>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-text text-xl font-semibold">Price Trend (Last 30 Days)</h2>
                <p className="text-muted mt-1 text-sm">Average daily price over time</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">€287 Avg</Badge>
                <Badge variant="success">+8.2%</Badge>
              </div>
            </div>
          </Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={priceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #2A2A2A',
                    borderRadius: '8px',
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

      {/* Quick Actions - Enhanced */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-text text-2xl font-semibold">Quick Actions</h2>
          <p className="text-muted text-sm">Start your pricing optimization journey</p>
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
    </motion.div>
  )
}
