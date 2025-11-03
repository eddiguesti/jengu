/**
 * Neighborhood Competitive Index Card
 * Displays competitive positioning with radar chart and sparkline trend
 * Task 15: Competitor Graph & Neighborhood Index
 */

import { useState, useEffect } from 'react'
import { Card, Badge } from '../ui'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import { Target, TrendingUp, TrendingDown, Minus, Star } from 'lucide-react'
import apiClient from '../../lib/api/client'

interface NeighborhoodIndex {
  date: string
  overallIndex: number
  priceCompetitivenessScore: number
  valueScore: number
  positioningScore: number
  marketPosition: string
  competitorsAnalyzed: number
  propertyPrice?: number
  neighborhoodMedianPrice?: number
  pricePercentile?: number
  avgCompetitorRating?: number
  propertyRating?: number
  indexChange1d?: number
  indexChange7d?: number
  indexChange30d?: number
  competitiveAdvantage: string[]
  competitiveWeakness: string[]
}

interface NeighborhoodIndexCardProps {
  propertyId: string
  className?: string
}

export const NeighborhoodIndexCard: React.FC<NeighborhoodIndexCardProps> = ({
  propertyId,
  className = '',
}) => {
  const [latestIndex, setLatestIndex] = useState<NeighborhoodIndex | null>(null)
  const [trendData, setTrendData] = useState<NeighborhoodIndex[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchIndexData()
  }, [propertyId])

  const fetchIndexData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch latest index
      const latestResponse = await apiClient.get(`/api/neighborhood-index/${propertyId}/latest`)
      if (latestResponse.data.success && latestResponse.data.index) {
        setLatestIndex(latestResponse.data.index)
      }

      // Fetch 30-day trend
      const trendResponse = await apiClient.get(
        `/api/neighborhood-index/${propertyId}/trend?days=30`
      )
      if (trendResponse.data.success) {
        setTrendData(trendResponse.data.trend)
      }
    } catch (err: any) {
      console.error('Failed to fetch neighborhood index:', err)
      setError(err.response?.data?.message || 'Failed to load competitive index')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card variant="default" className={className}>
        <Card.Body>
          <div className="flex items-center justify-center py-8">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
          </div>
        </Card.Body>
      </Card>
    )
  }

  if (error || !latestIndex) {
    return (
      <Card variant="default" className={className}>
        <Card.Body>
          <div className="py-8 text-center">
            <Target className="text-muted mx-auto mb-4 h-12 w-12" />
            <p className="text-muted">{error || 'No competitive index data available'}</p>
            <p className="text-muted mt-2 text-xs">
              Build competitor graph to enable competitive analysis
            </p>
          </div>
        </Card.Body>
      </Card>
    )
  }

  // Prepare radar chart data
  const radarData = [
    {
      metric: 'Price',
      score: latestIndex.priceCompetitivenessScore,
      fullMark: 100,
    },
    {
      metric: 'Value',
      score: latestIndex.valueScore,
      fullMark: 100,
    },
    {
      metric: 'Position',
      score: latestIndex.positioningScore,
      fullMark: 100,
    },
  ]

  // Prepare sparkline data (last 30 days)
  const sparklineData = trendData.map(item => ({
    date: item.date,
    index: item.overallIndex,
  }))

  // Get market position color
  const getMarketPositionColor = (position: string) => {
    switch (position) {
      case 'ultra-premium':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'premium':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'mid-market':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'budget':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  // Get index trend icon
  const getTrendIcon = (change?: number) => {
    if (!change) return <Minus className="h-4 w-4" />
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-400" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-400" />
    return <Minus className="h-4 w-4" />
  }

  // Get index rating
  const getIndexRating = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-400' }
    if (score >= 60) return { label: 'Good', color: 'text-blue-400' }
    if (score >= 40) return { label: 'Average', color: 'text-yellow-400' }
    if (score >= 20) return { label: 'Below Average', color: 'text-orange-400' }
    return { label: 'Poor', color: 'text-red-400' }
  }

  const indexRating = getIndexRating(latestIndex.overallIndex)

  // Format advantage/weakness labels
  const formatFactor = (factor: string) => {
    return factor
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Index Score */}
      <Card variant="default">
        <Card.Header>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-text flex items-center gap-2 text-xl font-semibold">
                <Target className="text-primary h-5 w-5" />
                Neighborhood Competitive Index
              </h2>
              <p className="text-muted mt-1 text-sm">
                {latestIndex.competitorsAnalyzed} competitors analyzed • Updated {latestIndex.date}
              </p>
            </div>
            <div className="text-right">
              <p className="text-primary text-4xl font-bold">
                {latestIndex.overallIndex.toFixed(1)}
              </p>
              <p className={`text-sm font-medium ${indexRating.color}`}>{indexRating.label}</p>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Radar Chart */}
            <div>
              <h3 className="text-text mb-4 text-sm font-medium">Competitive Profile</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#2A2A2A" />
                  <PolarAngleAxis dataKey="metric" stroke="#9CA3AF" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#9CA3AF" />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#EBFF57"
                    fill="#EBFF57"
                    fillOpacity={0.3}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid #2A2A2A',
                      borderRadius: '8px',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Metrics Grid */}
            <div className="space-y-4">
              {/* Market Position */}
              <div>
                <p className="text-muted mb-2 text-xs">Market Position</p>
                <Badge
                  variant="default"
                  className={getMarketPositionColor(latestIndex.marketPosition)}
                >
                  {latestIndex.marketPosition.replace('-', ' ').toUpperCase()}
                </Badge>
              </div>

              {/* Component Scores */}
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-muted text-xs">Price Competitiveness</span>
                    <span className="text-text text-sm font-medium">
                      {latestIndex.priceCompetitivenessScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-800">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${latestIndex.priceCompetitivenessScore}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-muted text-xs">Value Score</span>
                    <span className="text-text text-sm font-medium">
                      {latestIndex.valueScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-800">
                    <div
                      className="h-2 rounded-full bg-blue-400"
                      style={{ width: `${latestIndex.valueScore}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-muted text-xs">Positioning Score</span>
                    <span className="text-text text-sm font-medium">
                      {latestIndex.positioningScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-800">
                    <div
                      className="h-2 rounded-full bg-purple-400"
                      style={{ width: `${latestIndex.positioningScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Trend Indicators */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="text-center">
                  <div className="text-muted mb-1 flex items-center justify-center gap-1 text-xs">
                    {getTrendIcon(latestIndex.indexChange1d)}
                    <span>1D</span>
                  </div>
                  <span className="text-text text-sm font-medium">
                    {latestIndex.indexChange1d
                      ? `${latestIndex.indexChange1d > 0 ? '+' : ''}${latestIndex.indexChange1d.toFixed(1)}`
                      : '--'}
                  </span>
                </div>
                <div className="text-center">
                  <div className="text-muted mb-1 flex items-center justify-center gap-1 text-xs">
                    {getTrendIcon(latestIndex.indexChange7d)}
                    <span>7D</span>
                  </div>
                  <span className="text-text text-sm font-medium">
                    {latestIndex.indexChange7d
                      ? `${latestIndex.indexChange7d > 0 ? '+' : ''}${latestIndex.indexChange7d.toFixed(1)}`
                      : '--'}
                  </span>
                </div>
                <div className="text-center">
                  <div className="text-muted mb-1 flex items-center justify-center gap-1 text-xs">
                    {getTrendIcon(latestIndex.indexChange30d)}
                    <span>30D</span>
                  </div>
                  <span className="text-text text-sm font-medium">
                    {latestIndex.indexChange30d
                      ? `${latestIndex.indexChange30d > 0 ? '+' : ''}${latestIndex.indexChange30d.toFixed(1)}`
                      : '--'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Trend Sparkline */}
      {sparklineData.length > 0 && (
        <Card variant="default">
          <Card.Header>
            <h3 className="text-text text-lg font-semibold">30-Day Index Trend</h3>
          </Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={sparklineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                  tickFormatter={value =>
                    new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }
                />
                <YAxis stroke="#9CA3AF" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #2A2A2A',
                    borderRadius: '8px',
                  }}
                  labelFormatter={label => `Date: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="index"
                  stroke="#EBFF57"
                  strokeWidth={2}
                  dot={{ fill: '#EBFF57', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      )}

      {/* Competitive Factors */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Advantages */}
        {latestIndex.competitiveAdvantage.length > 0 && (
          <Card variant="default">
            <Card.Header>
              <h3 className="text-text text-lg font-semibold text-green-400">
                ✓ Competitive Advantages
              </h3>
            </Card.Header>
            <Card.Body>
              <ul className="space-y-2">
                {latestIndex.competitiveAdvantage.map((advantage, index) => (
                  <li key={index} className="text-text flex items-center gap-2 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    {formatFactor(advantage)}
                  </li>
                ))}
              </ul>
            </Card.Body>
          </Card>
        )}

        {/* Weaknesses */}
        {latestIndex.competitiveWeakness.length > 0 && (
          <Card variant="default">
            <Card.Header>
              <h3 className="text-text text-lg font-semibold text-orange-400">
                ⚠ Areas for Improvement
              </h3>
            </Card.Header>
            <Card.Body>
              <ul className="space-y-2">
                {latestIndex.competitiveWeakness.map((weakness, index) => (
                  <li key={index} className="text-text flex items-center gap-2 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                    {formatFactor(weakness)}
                  </li>
                ))}
              </ul>
            </Card.Body>
          </Card>
        )}
      </div>

      {/* Price Context */}
      {latestIndex.propertyPrice && latestIndex.neighborhoodMedianPrice && (
        <Card variant="default">
          <Card.Header>
            <h3 className="text-text text-lg font-semibold">Price Positioning</h3>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-muted mb-1 text-xs">Your Price</p>
                <p className="text-primary text-2xl font-bold">
                  ${latestIndex.propertyPrice.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-muted mb-1 text-xs">Neighborhood Median</p>
                <p className="text-text text-2xl font-bold">
                  ${latestIndex.neighborhoodMedianPrice.toFixed(0)}
                </p>
              </div>
              {latestIndex.pricePercentile !== undefined && (
                <div>
                  <p className="text-muted mb-1 text-xs">Price Percentile</p>
                  <p className="text-text text-2xl font-bold">
                    {latestIndex.pricePercentile.toFixed(0)}%
                  </p>
                </div>
              )}
              {latestIndex.propertyRating && latestIndex.avgCompetitorRating && (
                <div>
                  <p className="text-muted mb-1 text-xs">Rating vs Avg</p>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <p className="text-text text-2xl font-bold">
                      {latestIndex.propertyRating.toFixed(1)}
                    </p>
                    <span className="text-muted text-sm">
                      ({latestIndex.avgCompetitorRating.toFixed(1)})
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  )
}
