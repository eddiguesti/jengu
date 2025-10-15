import { motion } from 'framer-motion'
import { Card, Badge } from '../ui'
import { TrendingUp, TrendingDown, Minus, Cloud, Users, Building2, Calendar, Sparkles } from 'lucide-react'
import type { MarketSentiment } from '../../lib/services/analyticsService'

interface MarketSentimentCardProps {
  sentiment: MarketSentiment | null
  isLoading?: boolean
}

export const MarketSentimentCard: React.FC<MarketSentimentCardProps> = ({ sentiment, isLoading }) => {
  if (isLoading) {
    return (
      <Card variant="elevated" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <Card.Body className="relative p-8">
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </Card.Body>
      </Card>
    )
  }

  if (!sentiment) {
    return (
      <Card variant="elevated">
        <Card.Body className="text-center py-12">
          <p className="text-muted">Market sentiment data unavailable</p>
        </Card.Body>
      </Card>
    )
  }

  const { overallScore, categoryLabel, components } = sentiment

  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 75) return '#10B981' // Green
    if (score >= 60) return '#EBFF57' // Yellow
    if (score >= 40) return '#F59E0B' // Orange
    return '#EF4444' // Red
  }

  const scoreColor = getScoreColor(overallScore)

  // Icon for overall sentiment
  const SentimentIcon = overallScore >= 60 ? TrendingUp : overallScore >= 40 ? Minus : TrendingDown

  const componentIcons = {
    weather: Cloud,
    occupancy: Users,
    competitor: Building2,
    demand: TrendingUp,
    seasonal: Calendar,
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card variant="elevated" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />

        <Card.Header className="relative">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text">Market Sentiment Analysis</h2>
              <p className="text-sm text-muted mt-1">
                AI-powered demand strength indicator combining multiple factors
              </p>
            </div>
          </div>
        </Card.Header>

        <Card.Body className="relative">
          {/* Overall Sentiment Score */}
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              {/* Circular progress */}
              <svg className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="#2A2A2A"
                  strokeWidth="12"
                  fill="none"
                />
                <motion.circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke={scoreColor}
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 88}
                  initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - overallScore / 100) }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
              </svg>

              {/* Score display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <SentimentIcon className="w-8 h-8 mb-2" style={{ color: scoreColor }} />
                <p className="text-5xl font-bold text-text">{overallScore}</p>
                <p className="text-sm text-muted mt-1">out of 100</p>
                <Badge
                  variant={overallScore >= 75 ? 'success' : overallScore >= 40 ? 'default' : 'error'}
                  size="sm"
                  className="mt-2"
                >
                  {categoryLabel}
                </Badge>
              </div>
            </div>
          </div>

          {/* AI Summary */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-text leading-relaxed">
              {overallScore >= 75 && (
                'Market conditions are very strong. High demand across multiple indicators suggests excellent pricing power and revenue opportunities.'
              )}
              {overallScore >= 60 && overallScore < 75 && (
                'Market conditions are favorable. Good balance of demand factors supports moderate price increases while maintaining occupancy.'
              )}
              {overallScore >= 40 && overallScore < 60 && (
                'Market conditions are neutral. Mixed signals suggest maintaining current strategy while monitoring for opportunities.'
              )}
              {overallScore < 40 && (
                'Market conditions are challenging. Weak demand indicators suggest focusing on occupancy through competitive pricing.'
              )}
            </p>
          </div>

          {/* Component Breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text mb-4">Contributing Factors</h3>

            {Object.entries(components).map(([key, data]) => {
              const Icon = componentIcons[key as keyof typeof componentIcons]
              const score = data.score
              const weight = data.weight

              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted" />
                      <span className="text-sm font-medium text-text capitalize">
                        {key === 'demand' ? 'Demand Trend' : key}
                      </span>
                      <span className="text-xs text-muted">({weight})</span>
                    </div>
                    <span className="text-sm font-bold text-text">{score}/100</span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: getScoreColor(score) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card.Body>
      </Card>
    </motion.div>
  )
}
