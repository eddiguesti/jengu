import { useState } from 'react'
import {
  Search,
  MapPin,
  Star,
  Euro,
  Tent,
  Loader2,
  AlertCircle,
  ExternalLink,
  Heart,
  TrendingUp,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import apiClient from '../lib/api/client'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

interface Campsite {
  id: string
  name: string
  url: string
  photoUrl: string
  photos: string[]
  distance: number
  distanceText: string
  address: string
  town: string
  region: string
  coordinates: {
    latitude: number
    longitude: number
  }
  rating: number
  reviewCount: number
  amenities: string[]
  description: string
  pricePreview?: {
    amount: number
    period: string
  }
}

export const CompetitorMonitor = () => {
  const [location, setLocation] = useState('Sanary-sur-Mer 83110')
  const [radiusKm, setRadiusKm] = useState(15)
  const [campsites, setCampsites] = useState<Campsite[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [monitoringIds, setMonitoringIds] = useState<Set<string>>(new Set())
  const [monitoringLoading, setMonitoringLoading] = useState<Set<string>>(new Set())

  const handleSearch = async () => {
    if (!location.trim()) {
      setError('Please enter a location')
      return
    }

    setLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const response = await apiClient.post('/competitor/discover', {
        location: location.trim(),
        radiusKm,
      })

      setCampsites(response.data.data.campsites)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to discover campsites')
      setCampsites([])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleStartMonitoring = async (campsite: Campsite) => {
    // Add to loading set
    setMonitoringLoading(prev => new Set(prev).add(campsite.id))

    try {
      const response = await apiClient.post('/competitor/monitor/start', {
        campsite,
      })

      if (response.data.success) {
        // Add to monitoring set
        setMonitoringIds(prev => new Set(prev).add(campsite.id))

        // Show success message (you can replace this with a toast notification)
        alert(`✅ Now monitoring ${campsite.name}!\n\nPricing data will be scraped daily.`)
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to start monitoring'
      alert(`❌ Error: ${errorMsg}`)
    } finally {
      // Remove from loading set
      setMonitoringLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(campsite.id)
        return newSet
      })
    }
  }

  return (
    <div className="bg-background min-h-screen p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-text mb-2 flex items-center gap-3 text-4xl font-bold">
            <Tent className="text-primary h-10 w-10" />
            Competitor Discovery
          </h1>
          <p className="text-muted">
            Find and track competitor campsites in France using camping-and-co.com
          </p>
        </div>

        {/* Search Section */}
        <Card>
          <Card.Body>
            <div className="space-y-4">
              {/* Location Input */}
              <div>
                <label className="text-text mb-2 block text-sm font-medium">📍 Location</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="text-muted absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
                    <Input
                      type="text"
                      placeholder="e.g., Sanary-sur-Mer 83110, Paris 75001..."
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    onClick={handleSearch}
                    disabled={loading}
                    variant="primary"
                    className="flex items-center gap-2 px-6"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        Discover
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-muted mt-2 text-xs">
                  💡 <strong>Include the 5-digit postal code</strong> for best results (e.g.,
                  "Sanary-sur-Mer 83110")
                </p>
              </div>

              {/* Radius Slider */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-text text-sm font-medium">📏 Search Radius</label>
                  <span className="text-primary text-sm font-semibold">{radiusKm} km</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={radiusKm}
                  onChange={e => setRadiusKm(parseInt(e.target.value))}
                  className="bg-card accent-primary h-2 w-full cursor-pointer appearance-none rounded-lg"
                />
                <div className="text-muted mt-1 flex justify-between text-xs">
                  <span>5 km</span>
                  <span>50 km</span>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="border-red-500 bg-red-50">
                <Card.Body>
                  <div className="flex items-center gap-2 text-red-900">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error}</span>
                  </div>
                </Card.Body>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Summary */}
        {hasSearched && !loading && campsites.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h2 className="text-text text-2xl font-bold">
                Found {campsites.length} Competitor{campsites.length !== 1 ? 's' : ''}
              </h2>
              <p className="text-muted text-sm">
                Within {radiusKm}km of {location}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="primary" className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Live from camping-and-co.com
              </Badge>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <Card className="p-12 text-center">
            <Loader2 className="text-primary mx-auto mb-4 h-12 w-12 animate-spin" />
            <p className="text-text text-lg font-medium">Discovering campsites...</p>
            <p className="text-muted mt-2 text-sm">
              Searching camping-and-co.com for competitors near {location}
            </p>
          </Card>
        )}

        {/* Campsite Cards Grid */}
        <AnimatePresence>
          {!loading && campsites.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {campsites.map((campsite, index) => (
                <motion.div
                  key={campsite.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <CampsiteCard
                    campsite={campsite}
                    onStartMonitoring={handleStartMonitoring}
                    isMonitoring={monitoringIds.has(campsite.id)}
                    isLoading={monitoringLoading.has(campsite.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {hasSearched && !loading && campsites.length === 0 && !error && (
          <Card className="p-12 text-center">
            <Tent className="text-muted mx-auto mb-4 h-16 w-16" />
            <h2 className="text-text mb-2 text-xl font-bold">No Competitors Found</h2>
            <p className="text-muted">
              Try searching in a different location or increasing the search radius
            </p>
          </Card>
        )}

        {/* Initial State */}
        {!hasSearched && !loading && (
          <Card className="p-12 text-center">
            <MapPin className="text-primary mx-auto mb-4 h-16 w-16" />
            <h2 className="text-text mb-2 text-xl font-bold">Discover Competitor Campsites</h2>
            <p className="text-muted">
              Enter a location in France to find nearby competitors from camping-and-co.com
            </p>
            <p className="text-muted mt-4 text-sm">
              We'll fetch photos, pricing, distances, and more for each campsite
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}

// Badge Component
interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning'
  className?: string
  children: React.ReactNode
}

const Badge: React.FC<BadgeProps> = ({ variant = 'primary', className, children }) => {
  const variantClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-green-500/10 text-green-700',
    warning: 'bg-orange-500/10 text-orange-700',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

// Campsite Card Component
interface CampsiteCardProps {
  campsite: Campsite
  onStartMonitoring?: (campsite: Campsite) => void
  isMonitoring?: boolean
  isLoading?: boolean
}

const CampsiteCard: React.FC<CampsiteCardProps> = ({
  campsite,
  onStartMonitoring,
  isMonitoring = false,
  isLoading = false,
}) => {
  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      {/* Photo */}
      <div className="relative h-48 overflow-hidden bg-gray-200">
        {campsite.photoUrl ? (
          <img
            src={campsite.photoUrl}
            alt={campsite.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            onError={e => {
              e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image'
            }}
          />
        ) : (
          <div className="bg-elevated flex h-full items-center justify-center">
            <Tent className="text-muted h-16 w-16" />
          </div>
        )}

        {/* Distance Badge */}
        <div className="absolute left-2 top-2">
          <Badge variant="primary" className="bg-black/70 text-white backdrop-blur-sm">
            <MapPin className="mr-1 h-3 w-3" />
            {campsite.distance > 0 ? `${campsite.distance.toFixed(1)} km` : campsite.distanceText}
          </Badge>
        </div>

        {/* Favorite Icon */}
        <button className="absolute right-2 top-2 rounded-full bg-black/50 p-2 backdrop-blur-sm transition-colors hover:bg-black/70">
          <Heart className="h-4 w-4 text-white" />
        </button>
      </div>

      {/* Content */}
      <Card.Body className="space-y-3">
        {/* Name */}
        <div>
          <h3 className="text-text line-clamp-1 text-lg font-bold">{campsite.name}</h3>
          <p className="text-muted mt-1 flex items-center gap-1 text-sm">
            <MapPin className="h-3 w-3" />
            {campsite.town}
            {campsite.region && `, ${campsite.region}`}
          </p>
        </div>

        {/* Rating */}
        {campsite.rating > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={clsx(
                    'h-4 w-4',
                    i < campsite.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'fill-gray-200 text-gray-200'
                  )}
                />
              ))}
            </div>
            <span className="text-text text-sm font-medium">{campsite.rating}/5</span>
            {campsite.reviewCount > 0 && (
              <span className="text-muted text-xs">({campsite.reviewCount} reviews)</span>
            )}
          </div>
        )}

        {/* Price */}
        {campsite.pricePreview && (
          <div className="flex items-baseline gap-2">
            <span className="text-success text-2xl font-bold">€{campsite.pricePreview.amount}</span>
            <span className="text-muted text-sm">/ {campsite.pricePreview.period}</span>
          </div>
        )}

        {/* Amenities */}
        {campsite.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {campsite.amenities.slice(0, 3).map((amenity, i) => (
              <span key={i} className="bg-elevated text-muted rounded-full px-2 py-1 text-xs">
                {amenity}
              </span>
            ))}
            {campsite.amenities.length > 3 && (
              <span className="bg-elevated text-muted rounded-full px-2 py-1 text-xs">
                +{campsite.amenities.length - 3} more
              </span>
            )}
          </div>
        )}
      </Card.Body>

      {/* Actions */}
      <Card.Footer className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => window.open(campsite.url, '_blank')}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          View Details
        </Button>
        <Button
          variant={isMonitoring ? 'success' : 'primary'}
          size="sm"
          className="flex-1"
          onClick={() => onStartMonitoring?.(campsite)}
          disabled={isLoading || isMonitoring}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : isMonitoring ? (
            <>
              <Heart className="mr-2 h-4 w-4 fill-current" />
              Monitoring
            </>
          ) : (
            <>
              <Euro className="mr-2 h-4 w-4" />
              Start Monitoring
            </>
          )}
        </Button>
      </Card.Footer>
    </Card>
  )
}
