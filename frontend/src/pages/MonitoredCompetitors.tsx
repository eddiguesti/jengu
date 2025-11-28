import { useState, useEffect } from 'react'
import {
  Tent,
  Loader2,
  MapPin,
  Star,
  TrendingUp,
  TrendingDown,
  Trash2,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
  BarChart3,
  Clock,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import apiClient from '../lib/api/client'
import { toast } from '../stores/useToastStore'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

// Raw API response uses snake_case from database
interface CompetitorApiResponse {
  id: string
  name: string
  url: string
  photo_url: string | null
  photos?: string[]
  town: string
  region: string
  latitude: number | null
  longitude: number | null
  rating: number | null
  review_count: number | null
  created_at: string
  last_scraped_at: string | null
  is_monitoring: boolean
}

// Frontend interface uses camelCase
interface MonitoredCompetitor {
  id: string
  name: string
  url: string
  photoUrl: string | null
  photos?: string[]
  town: string
  region: string
  coordinates: {
    latitude: number
    longitude: number
  } | null
  rating: number | null
  reviewCount: number | null
  createdAt: string
  lastScraped: string | null
  isMonitoring: boolean
  latestPricing?: {
    price: number
    scrapedAt: string
  }
  priceHistory?: Array<{
    price: number
    scrapedAt: string
  }>
}

// Transform API response to frontend format
function transformCompetitor(raw: CompetitorApiResponse): MonitoredCompetitor {
  return {
    id: raw.id,
    name: raw.name,
    url: raw.url,
    photoUrl: raw.photo_url,
    photos: raw.photos,
    town: raw.town,
    region: raw.region,
    coordinates:
      raw.latitude && raw.longitude ? { latitude: raw.latitude, longitude: raw.longitude } : null,
    rating: raw.rating,
    reviewCount: raw.review_count,
    createdAt: raw.created_at,
    lastScraped: raw.last_scraped_at,
    isMonitoring: raw.is_monitoring,
  }
}

export const MonitoredCompetitors = () => {
  const [competitors, setCompetitors] = useState<MonitoredCompetitor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const fetchCompetitors = async () => {
    setLoading(true)
    setError(null)
    try {
      // Backend returns { success, data: { competitors: [...], total, monitoring } }
      const response = await apiClient.get('/competitor/monitor/list')
      const rawCompetitors: CompetitorApiResponse[] = response.data.data?.competitors || []
      // Transform snake_case API response to camelCase frontend format
      setCompetitors(rawCompetitors.map(transformCompetitor))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load monitored competitors')
      setCompetitors([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompetitors()
  }, [])

  const handleDelete = async (competitorId: string, name: string) => {
    if (!confirm(`Are you sure you want to stop monitoring "${name}"?`)) {
      return
    }

    setDeletingIds(prev => new Set(prev).add(competitorId))

    try {
      await apiClient.delete(`/competitor/monitor/${competitorId}`)
      setCompetitors(prev => prev.filter(c => c.id !== competitorId))
      toast.success('Removed from monitoring', `${name} will no longer be tracked.`)
    } catch (err: any) {
      toast.error('Failed to remove', err.response?.data?.message || 'Please try again')
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(competitorId)
        return newSet
      })
    }
  }

  const getPriceTrend = (competitor: MonitoredCompetitor) => {
    if (!competitor.priceHistory || competitor.priceHistory.length < 2) return null
    const latest = competitor.priceHistory[0].price
    const previous = competitor.priceHistory[1].price
    const change = ((latest - previous) / previous) * 100
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same',
      percentage: Math.abs(change).toFixed(1),
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              to="/pricing/competitors"
              className="mb-4 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-text"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Discovery
            </Link>
            <h1 className="mb-2 flex items-center gap-3 text-4xl font-bold text-text">
              <BarChart3 className="h-10 w-10 text-primary" />
              Monitored Competitors
            </h1>
            <p className="text-muted">Track pricing changes from your competitors over time</p>
          </div>
          <Button
            variant="outline"
            onClick={fetchCompetitors}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <Card className="p-12 text-center">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium text-text">Loading monitored competitors...</p>
          </Card>
        )}

        {/* Error State */}
        <AnimatePresence>
          {error && !loading && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="border-error/30 bg-error/10">
                <Card.Body>
                  <div className="flex items-center gap-2 text-error">
                    <span>{error}</span>
                  </div>
                </Card.Body>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!loading && !error && competitors.length === 0 && (
          <Card className="p-12 text-center">
            <Tent className="mx-auto mb-4 h-16 w-16 text-muted" />
            <h2 className="mb-2 text-xl font-bold text-text">No Monitored Competitors</h2>
            <p className="mb-6 text-muted">
              Start monitoring competitors from the discovery page to see their pricing history
            </p>
            <Link to="/pricing/competitors">
              <Button variant="primary">Discover Competitors</Button>
            </Link>
          </Card>
        )}

        {/* Competitors List */}
        {!loading && competitors.length > 0 && (
          <div className="space-y-4">
            {/* Summary Card */}
            <Card>
              <Card.Body>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-muted">Total Monitored</p>
                    <p className="text-3xl font-bold text-text">{competitors.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted">Avg. Competitor Price</p>
                    <p className="text-3xl font-bold text-success">
                      {competitors.some(c => c.latestPricing)
                        ? `€${Math.round(
                            competitors.reduce((sum, c) => sum + (c.latestPricing?.price || 0), 0) /
                              competitors.filter(c => c.latestPricing).length
                          )}`
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted">Last Updated</p>
                    <p className="text-lg font-medium text-text">
                      {competitors.some(c => c.lastScraped)
                        ? formatDate(
                            competitors
                              .filter(c => c.lastScraped)
                              .sort(
                                (a, b) =>
                                  new Date(b.lastScraped!).getTime() -
                                  new Date(a.lastScraped!).getTime()
                              )[0]?.lastScraped || null
                          )
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Competitor Cards */}
            <AnimatePresence>
              {competitors.map((competitor, index) => {
                const trend = getPriceTrend(competitor)

                return (
                  <motion.div
                    key={competitor.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="overflow-hidden transition-all hover:shadow-md">
                      <div className="flex">
                        {/* Photo */}
                        <div className="relative h-40 w-48 flex-shrink-0 overflow-hidden bg-gray-200">
                          {competitor.photoUrl ? (
                            <img
                              src={competitor.photoUrl}
                              alt={competitor.name}
                              className="h-full w-full object-cover"
                              onError={e => {
                                e.currentTarget.src =
                                  'https://via.placeholder.com/200x160?text=No+Image'
                              }}
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-elevated">
                              <Tent className="h-12 w-12 text-muted" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex flex-1 flex-col p-4">
                          <div className="mb-auto flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-text">{competitor.name}</h3>
                              <p className="flex items-center gap-1 text-sm text-muted">
                                <MapPin className="h-3 w-3" />
                                {competitor.town}
                                {competitor.region && `, ${competitor.region}`}
                              </p>
                              {competitor.rating && (
                                <div className="mt-1 flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span className="text-sm text-text">{competitor.rating}/5</span>
                                  {competitor.reviewCount && (
                                    <span className="text-xs text-muted">
                                      ({competitor.reviewCount} reviews)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Price Section */}
                            <div className="text-right">
                              {competitor.latestPricing ? (
                                <>
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-2xl font-bold text-text">
                                      €{competitor.latestPricing.price}
                                    </span>
                                    {trend && trend.direction !== 'same' && (
                                      <span
                                        className={clsx(
                                          'flex items-center gap-1 text-sm font-medium',
                                          trend.direction === 'up' ? 'text-error' : 'text-success'
                                        )}
                                      >
                                        {trend.direction === 'up' ? (
                                          <TrendingUp className="h-4 w-4" />
                                        ) : (
                                          <TrendingDown className="h-4 w-4" />
                                        )}
                                        {trend.percentage}%
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 text-xs text-muted">/ night</p>
                                </>
                              ) : (
                                <span className="text-sm text-muted">No pricing data</span>
                              )}
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
                            <div className="flex items-center gap-1 text-xs text-muted">
                              <Clock className="h-3 w-3" />
                              Last updated: {formatDate(competitor.lastScraped)}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(competitor.url, '_blank')}
                              >
                                <ExternalLink className="mr-1 h-4 w-4" />
                                View Site
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(competitor.id, competitor.name)}
                                disabled={deletingIds.has(competitor.id)}
                                className="text-error hover:bg-error/10"
                              >
                                {deletingIds.has(competitor.id) ? (
                                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="mr-1 h-4 w-4" />
                                )}
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
