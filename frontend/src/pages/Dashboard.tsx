import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { TrendingUp, DollarSign, Calendar, BarChart3, ArrowUpRight, ArrowDownRight, Activity, Zap, Database } from 'lucide-react'
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
          <h1 className="text-4xl font-bold text-text">Dashboard</h1>
          <p className="text-muted mt-2">
            {hasData ? 'Real-time insights into your pricing performance' : 'Get started by uploading your data'}
          </p>
        </div>
        {hasData && (
          <Badge variant="success" className="text-base px-4 py-2">
            <Activity className="w-4 h-4 mr-2" />
            Live Data
          </Badge>
        )}
      </div>

      {/* Empty State - No Data */}
      {!hasData && (
        <Card variant="elevated" className="text-center py-20">
          <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto">
            <div className="p-6 bg-primary/10 rounded-full">
              <Database className="w-16 h-16 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text mb-3">
                Add Data to See Your Complete Dashboard
              </h2>
              <p className="text-muted text-lg mb-6">
                Upload your historical booking data to unlock powerful insights, analytics, and AI-powered pricing recommendations.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="primary" size="lg" onClick={() => navigate('/data')}>
                <Database className="w-5 h-5 mr-2" />
                Upload Data Now
              </Button>
              <Button variant="ghost" size="lg" onClick={() => navigate('/assistant')}>
                Learn How It Works
              </Button>
            </div>

            {/* Preview of what they'll get */}
            <div className="mt-8 pt-8 border-t border-border w-full">
              <p className="text-sm text-muted mb-4">Once you upload data, you'll see:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-elevated rounded-lg border border-border">
                  <BarChart3 className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-text font-medium">Revenue Charts</p>
                </div>
                <div className="p-4 bg-elevated rounded-lg border border-border">
                  <TrendingUp className="w-6 h-6 text-success mx-auto mb-2" />
                  <p className="text-xs text-text font-medium">Occupancy Trends</p>
                </div>
                <div className="p-4 bg-elevated rounded-lg border border-border">
                  <Activity className="w-6 h-6 text-warning mx-auto mb-2" />
                  <p className="text-xs text-text font-medium">Price Analytics</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* KPI Cards - Enhanced */}
      {hasData && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card variant="elevated" className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <Badge variant="success" size="sm">+12.5%</Badge>
              </div>
              <p className="text-sm text-muted mb-1">Total Records</p>
              <h3 className="text-3xl font-bold text-text">3,972</h3>
              <div className="mt-3 flex items-center gap-1 text-xs text-success">
                <ArrowUpRight className="w-3 h-3" />
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
          <Card variant="elevated" className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-success/5 rounded-full -mr-16 -mt-16 group-hover:bg-success/10 transition-colors" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-success/10 rounded-xl">
                  <DollarSign className="w-6 h-6 text-success" />
                </div>
                <Badge variant="success" size="sm">+8.2%</Badge>
              </div>
              <p className="text-sm text-muted mb-1">Average Price</p>
              <h3 className="text-3xl font-bold text-text">€287</h3>
              <div className="mt-3 flex items-center gap-1 text-xs text-success">
                <ArrowUpRight className="w-3 h-3" />
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
          <Card variant="elevated" className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-warning/5 rounded-full -mr-16 -mt-16 group-hover:bg-warning/10 transition-colors" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-warning/10 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-warning" />
                </div>
                <Badge variant="success" size="sm">+5.1%</Badge>
              </div>
              <p className="text-sm text-muted mb-1">Occupancy Rate</p>
              <h3 className="text-3xl font-bold text-text">87.3%</h3>
              <div className="mt-3 flex items-center gap-1 text-xs text-success">
                <ArrowUpRight className="w-3 h-3" />
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
          <Card variant="elevated" className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <Badge variant="primary" size="sm">Active</Badge>
              </div>
              <p className="text-sm text-muted mb-1">ML Model Status</p>
              <h3 className="text-2xl font-bold text-primary">Optimized</h3>
              <div className="mt-3 flex items-center gap-1 text-xs text-muted">
                <span>92% accuracy</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      )}

      {/* Charts Section */}
      {hasData && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card variant="default">
          <Card.Header>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-text">Revenue Performance</h2>
                <p className="text-sm text-muted mt-1">Monthly revenue vs target</p>
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
                <h2 className="text-xl font-semibold text-text">Weekly Occupancy</h2>
                <p className="text-sm text-muted mt-1">Average occupancy by day</p>
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
              <h2 className="text-xl font-semibold text-text">Price Trend (Last 30 Days)</h2>
              <p className="text-sm text-muted mt-1">Average daily price over time</p>
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-text">Quick Actions</h2>
          <p className="text-sm text-muted">Start your pricing optimization journey</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            variant="default"
            className="hover:border-primary hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => navigate('/data')}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-text mb-1">Upload Data</h3>
                <p className="text-sm text-muted mb-4">Import your historical booking data</p>
                <Button variant="secondary" size="sm">Go to Data →</Button>
              </div>
            </div>
          </Card>

          <Card
            variant="default"
            className="hover:border-primary hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => navigate('/enrichment')}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-success/10 rounded-xl group-hover:bg-success/20 transition-colors">
                <Activity className="w-6 h-6 text-success" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-text mb-1">Enrich Dataset</h3>
                <p className="text-sm text-muted mb-4">Add weather, holidays, and features</p>
                <Button variant="secondary" size="sm">Go to Enrichment →</Button>
              </div>
            </div>
          </Card>

          <Card
            variant="default"
            className="hover:border-primary hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => navigate('/insights')}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-warning/10 rounded-xl group-hover:bg-warning/20 transition-colors">
                <TrendingUp className="w-6 h-6 text-warning" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-text mb-1">View Insights</h3>
                <p className="text-sm text-muted mb-4">Explore pricing patterns and trends</p>
                <Button variant="primary" size="sm">Go to Insights →</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Getting Started Banner */}
      <Card variant="elevated" className="bg-gradient-to-r from-primary/5 to-transparent border-l-4 border-primary">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-primary/10 rounded-xl">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-text mb-2">Welcome to Jengu Dynamic Pricing</h3>
            <p className="text-muted mb-4">
              Start by uploading your booking data, then enrich it with weather and competitor intelligence.
              Our ML models will help you optimize pricing for maximum revenue and occupancy.
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
