import { motion } from 'framer-motion'
import { Card, Badge } from '../ui'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Cloud,
  Users,
  Building2,
  Calendar,
  Sparkles,
} from 'lucide-react'
import type { MarketSentiment } from '../../lib/services/analyticsService'

interface MarketSentimentCardProps {
  sentiment: MarketSentiment | null
  isLoading?: boolean
}

export const MarketSentimentCard: React.FC<MarketSentimentCardProps> = ({
  sentiment,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card variant="elevated" className="relative overflow-hidden">
        <div className="from-primary/5 via-background to-background absolute inset-0 bg-gradient-to-br" />
        <Card.Body className="relative p-8">
          <div className="flex h-64 items-center justify-center">
            <div className="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
          </div>
        </Card.Body>
      </Card>
    )
  }

  if (!sentiment) {
    return (
      <Card variant="elevated">
        <Card.Body className="py-12 text-center">
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
        <div className="from-primary/10 via-background to-background absolute inset-0 bg-gradient-to-br" />

        <Card.Header className="relative">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-xl p-3">
              <Sparkles className="text-primary h-6 w-6" />
            </div>
            <div>
              <h2 className="text-text text-xl font-semibold">Market Sentiment Analysis</h2>
              <p className="text-muted mt-1 text-sm">
                AI-powered demand strength indicator combining multiple factors
              </p>
            </div>
          </div>
        </Card.Header>

        <Card.Body className="relative">
          {/* Overall Sentiment Score */}
          <div className="mb-8 flex items-center justify-center">
            <div className="relative">
              {/* Circular progress */}
              <svg className="h-48 w-48 -rotate-90 transform">
                <circle cx="96" cy="96" r="88" stroke="#2A2A2A" strokeWidth="12" fill="none" />
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
                <SentimentIcon className="mb-2 h-8 w-8" style={{ color: scoreColor }} />
                <p className="text-text text-5xl font-bold">{overallScore}</p>
                <p className="text-muted mt-1 text-sm">out of 100</p>
                <Badge
                  variant={
                    overallScore >= 75 ? 'success' : overallScore >= 40 ? 'default' : 'error'
                  }
                  size="sm"
                  className="mt-2"
                >
                  {categoryLabel}
                </Badge>
              </div>
            </div>
          </div>

          {/* AI Summary */}
          <div className="border-primary/20 bg-primary/5 mb-6 rounded-xl border p-4">
            <p className="text-text text-sm leading-relaxed">
              {overallScore >= 75 &&
                'Market conditions are very strong. High demand across multiple indicators suggests excellent pricing power and revenue opportunities.'}
              {overallScore >= 60 &&
                overallScore < 75 &&
                'Market conditions are favorable. Good balance of demand factors supports moderate price increases while maintaining occupancy.'}
              {overallScore >= 40 &&
                overallScore < 60 &&
                'Market conditions are neutral. Mixed signals suggest maintaining current strategy while monitoring for opportunities.'}
              {overallScore < 40 &&
                'Market conditions are challenging. Weak demand indicators suggest focusing on occupancy through competitive pricing.'}
            </p>
          </div>

          {/* Component Breakdown */}
          <div className="space-y-3">
            <h3 className="text-text mb-4 text-sm font-semibold">Contributing Factors</h3>

            {Object.entries(components).map(([key, data]) => {
              const Icon = componentIcons[key as keyof typeof componentIcons]
              const score = data.score
              const weight = data.weight

              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="text-muted h-4 w-4" />
                      <span className="text-text text-sm font-medium capitalize">
                        {key === 'demand' ? 'Demand Trend' : key}
                      </span>
                      <span className="text-muted text-xs">({weight})</span>
                    </div>
                    <span className="text-text text-sm font-bold">{score}/100</span>
                  </div>

                  {/* Progress bar */}
                  <div className="bg-border h-2 overflow-hidden rounded-full">
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
