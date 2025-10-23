import { motion } from 'framer-motion'
import { Card, Badge, Button } from '../ui'
import { Sparkles, Brain, RefreshCw, CheckCircle } from 'lucide-react'
import type { ClaudeInsights } from '../../lib/services/analyticsService'

interface AIInsightsCardProps {
  insights: ClaudeInsights | null
  isLoading?: boolean
  onRefresh?: () => void
}

export const AIInsightsCard: React.FC<AIInsightsCardProps> = ({
  insights,
  isLoading,
  onRefresh,
}) => {
  if (isLoading) {
    return (
      <Card variant="elevated" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <Sparkles className="h-32 w-32 animate-pulse text-primary" />
            </div>
          </div>
        </div>
        <Card.Body className="relative p-8">
          <div className="flex h-64 flex-col items-center justify-center gap-4">
            <Brain className="h-16 w-16 animate-pulse text-primary" />
            <div>
              <p className="text-center text-lg font-semibold text-text">Analyzing Your Data...</p>
              <p className="mt-2 text-center text-sm text-muted">
                Claude is generating personalized insights
              </p>
            </div>
          </div>
        </Card.Body>
      </Card>
    )
  }

  if (!insights || insights.insights.length === 0) {
    return (
      <Card variant="elevated">
        <Card.Body className="py-12 text-center">
          <Brain className="mx-auto mb-4 h-12 w-12 text-muted" />
          <p className="mb-4 text-muted">AI insights unavailable</p>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate Insights
            </Button>
          )}
        </Card.Body>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card variant="elevated" className="relative overflow-hidden">
        <div className="absolute right-0 top-0 -mr-32 -mt-32 h-64 w-64 rounded-full bg-primary/5" />

        <Card.Header className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="flex items-center gap-2 text-xl font-semibold text-text">
                  AI-Powered Insights
                  <Badge variant="primary" size="sm">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Claude
                  </Badge>
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Actionable recommendations based on your data
                </p>
              </div>
            </div>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            )}
          </div>
        </Card.Header>

        <Card.Body className="relative">
          {insights.error && (
            <div className="mb-6 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
              <p className="text-sm text-orange-500">{insights.error}</p>
            </div>
          )}

          <div className="space-y-4">
            {insights.insights.map((insight, index) => {
              // Extract emoji and text
              const match = insight.match(/^([\u{1F300}-\u{1F9FF}])\s*(.+)$/u)
              const emoji = match ? match[1] : '💡'
              const text = match ? match[2] : insight

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-4 rounded-xl border border-border bg-elevated p-4 transition-colors hover:border-primary/30"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-2xl">
                    {emoji}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed text-text">{text}</p>
                  </div>
                  <CheckCircle className="mt-1 h-5 w-5 flex-shrink-0 text-success opacity-0 transition-opacity hover:opacity-100" />
                </motion.div>
              )
            })}
          </div>

          <div className="mt-6 border-t border-border pt-6">
            <p className="text-center text-xs text-muted">
              Generated on {new Date(insights.generatedAt).toLocaleString()} •{' '}
              <span className="text-primary">Powered by Claude 3.5 Sonnet</span>
            </p>
          </div>
        </Card.Body>
      </Card>
    </motion.div>
  )
}
