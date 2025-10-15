import { motion } from 'framer-motion'
import { Card, Badge, Button } from '../ui'
import { Sparkles, Brain, RefreshCw, CheckCircle } from 'lucide-react'
import type { ClaudeInsights } from '../../lib/services/analyticsService'

interface AIInsightsCardProps {
  insights: ClaudeInsights | null
  isLoading?: boolean
  onRefresh?: () => void
}

export const AIInsightsCard: React.FC<AIInsightsCardProps> = ({ insights, isLoading, onRefresh }) => {
  if (isLoading) {
    return (
      <Card variant="elevated" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <Sparkles className="w-32 h-32 text-primary animate-pulse" />
            </div>
          </div>
        </div>
        <Card.Body className="relative p-8">
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Brain className="w-16 h-16 text-primary animate-pulse" />
            <div>
              <p className="text-lg font-semibold text-text text-center">Analyzing Your Data...</p>
              <p className="text-sm text-muted text-center mt-2">
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
        <Card.Body className="text-center py-12">
          <Brain className="w-12 h-12 text-muted mx-auto mb-4" />
          <p className="text-muted mb-4">AI insights unavailable</p>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
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
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32" />

        <Card.Header className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text flex items-center gap-2">
                  AI-Powered Insights
                  <Badge variant="primary" size="sm">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Claude
                  </Badge>
                </h2>
                <p className="text-sm text-muted mt-1">
                  Actionable recommendations based on your data
                </p>
              </div>
            </div>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            )}
          </div>
        </Card.Header>

        <Card.Body className="relative">
          {insights.error && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-orange-500">
                {insights.error}
              </p>
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
                  className="flex items-start gap-4 p-4 bg-elevated rounded-xl border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-2xl">
                    {emoji}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-text leading-relaxed">{text}</p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-1 opacity-0 hover:opacity-100 transition-opacity" />
                </motion.div>
              )
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted text-center">
              Generated on {new Date(insights.generatedAt).toLocaleString()} •{' '}
              <span className="text-primary">Powered by Claude 3.5 Sonnet</span>
            </p>
          </div>
        </Card.Body>
      </Card>
    </motion.div>
  )
}
