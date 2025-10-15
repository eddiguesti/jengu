import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, Building2, MapPin, DollarSign, Clock, CheckCircle2, Loader2 } from 'lucide-react'
import { Card, Button, Input, Select } from '../components/ui'
import { useBusinessStore } from '../store'
import axios from 'axios'
import { getAccessToken } from '../lib/supabase'

export const Settings = () => {
  const { profile, setProfile } = useBusinessStore()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    business_name: profile?.business_name || '',
    city: profile?.location?.city || '',
    country: profile?.location?.country || '',
    latitude: profile?.location?.latitude || 0,
    longitude: profile?.location?.longitude || 0,
    currency: profile?.currency || 'EUR',
    timezone: profile?.timezone || 'Europe/Paris',
    property_type: profile?.property_type || 'hotel',
  })

  // Load settings from database on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = await getAccessToken()
        if (!token) {
          console.error('No access token available')
          setIsLoading(false)
          return
        }

        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
        const response = await axios.get(`${API_URL}/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.data.success && response.data.settings) {
          const settings = response.data.settings

          // Populate form with loaded settings
          setFormData({
            business_name: settings.business_name || '',
            city: settings.city || '',
            country: settings.country || '',
            latitude: settings.latitude || 0,
            longitude: settings.longitude || 0,
            currency: settings.currency || 'EUR',
            timezone: settings.timezone || 'Europe/Paris',
            property_type: settings.property_type || 'hotel',
          })

          // Also update the store
          setProfile({
            business_name: settings.business_name,
            location: {
              city: settings.city,
              country: settings.country,
              latitude: settings.latitude,
              longitude: settings.longitude,
            },
            currency: settings.currency,
            timezone: settings.timezone,
            property_type: settings.property_type,
          })
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Auto-geocode when city and country are both filled
  useEffect(() => {
    const geocodeLocation = async () => {
      if (formData.city && formData.country && formData.city.length > 2 && formData.country.length > 2) {
        setIsGeocoding(true)
        setGeocodeError(null)

        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
          const address = `${formData.city}, ${formData.country}`

          const response = await axios.get(`${API_URL}/geocoding/forward`, {
            params: { address }
          })

          if (response.data && response.data.features && response.data.features.length > 0) {
            const [longitude, latitude] = response.data.features[0].center

            setFormData(prev => ({
              ...prev,
              latitude: parseFloat(latitude.toFixed(6)),
              longitude: parseFloat(longitude.toFixed(6))
            }))
          } else {
            setGeocodeError('Location not found. Please enter manually.')
          }
        } catch (error) {
          console.error('Geocoding error:', error)
          setGeocodeError('Could not auto-fill location. Please enter manually.')
        } finally {
          setIsGeocoding(false)
        }
      }
    }

    // Debounce the geocoding request
    const timer = setTimeout(() => {
      geocodeLocation()
    }, 1000)

    return () => clearTimeout(timer)
  }, [formData.city, formData.country])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    setSaveError(null)

    try {
      const token = await getAccessToken()
      if (!token) {
        throw new Error('Not authenticated. Please sign in again.')
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

      // Save to backend database
      const response = await axios.post(`${API_URL}/settings`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        // Update local store after successful save
        setProfile({
          business_name: formData.business_name,
          location: {
            city: formData.city,
            country: formData.country,
            latitude: formData.latitude,
            longitude: formData.longitude,
          },
          currency: formData.currency as any,
          timezone: formData.timezone,
          property_type: formData.property_type as any,
        })

        setSaveSuccess(true)

        // Clear success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (error: any) {
      console.error('Failed to save settings:', error)
      setSaveError(error.response?.data?.message || error.message || 'Failed to save settings. Please try again.')

      // Clear error message after 5 seconds
      setTimeout(() => setSaveError(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-text">Settings</h1>
        <p className="text-muted mt-2">Manage your business profile and preferences</p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card variant="elevated" className="bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <p className="text-sm font-medium text-primary">Loading your settings...</p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Success Message */}
      {saveSuccess && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card variant="elevated" className="bg-success/5 border-success/20">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <p className="text-sm font-medium text-success">Settings saved successfully to database!</p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Error Message */}
      {saveError && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card variant="elevated" className="bg-error/5 border-error/20">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-error">{saveError}</p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Business Information */}
      <Card variant="default">
        <Card.Header>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text">Business Information</h2>
              <p className="text-sm text-muted mt-1">Basic details about your property</p>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Input
                label="Business Name"
                value={formData.business_name}
                onChange={(e) =>
                  setFormData({ ...formData, business_name: e.target.value })
                }
                placeholder="Enter your business name"
              />
            </div>
            <Select
              label="Property Type"
              value={formData.property_type}
              onChange={(e) =>
                setFormData({ ...formData, property_type: e.target.value })
              }
              options={[
                { value: 'hotel', label: 'Hotel' },
                { value: 'resort', label: 'Resort' },
                { value: 'vacation_rental', label: 'Vacation Rental' },
                { value: 'hostel', label: 'Hostel' },
                { value: 'other', label: 'Other' },
              ]}
            />
          </div>
        </Card.Body>
      </Card>

      {/* Location Settings */}
      <Card variant="default">
        <Card.Header>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <MapPin className="w-5 h-5 text-success" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text">Location</h2>
                <p className="text-sm text-muted mt-1">
                  Used for weather data and competitor analysis
                </p>
              </div>
            </div>
            {isGeocoding && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Auto-filling coordinates...</span>
              </div>
            )}
          </div>
        </Card.Header>
        <Card.Body>
          <div className="space-y-4">
            {/* Info Banner */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-muted">
                💡 Enter your city and country, and we'll automatically find the coordinates for you!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g., Nice"
              />
              <Input
                label="Country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="e.g., France"
              />
              <div className="relative">
                <Input
                  label="Latitude"
                  type="number"
                  step="0.000001"
                  value={formData.latitude || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="Auto-filled"
                  helperText={isGeocoding ? 'Searching...' : '✅ Auto-filled from city/country'}
                  disabled={isGeocoding}
                />
              </div>
              <div className="relative">
                <Input
                  label="Longitude"
                  type="number"
                  step="0.000001"
                  value={formData.longitude || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="Auto-filled"
                  helperText={isGeocoding ? 'Searching...' : '✅ Auto-filled from city/country'}
                  disabled={isGeocoding}
                />
              </div>
            </div>

            {/* Geocode Error */}
            {geocodeError && (
              <div className="p-3 bg-warning/5 border border-warning/20 rounded-lg">
                <p className="text-sm text-warning">{geocodeError}</p>
              </div>
            )}

            {/* Success Indicator */}
            {!isGeocoding && formData.latitude !== 0 && formData.longitude !== 0 && !geocodeError && (
              <div className="p-3 bg-success/5 border border-success/20 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <p className="text-sm text-success">
                  Location coordinates auto-filled: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                </p>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Regional Settings */}
      <Card variant="default">
        <Card.Header>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text">Regional Settings</h2>
              <p className="text-sm text-muted mt-1">Currency and timezone preferences</p>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Currency"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              options={[
                { value: 'EUR', label: 'EUR (€) - Euro' },
                { value: 'USD', label: 'USD ($) - US Dollar' },
                { value: 'GBP', label: 'GBP (£) - British Pound' },
                { value: 'CHF', label: 'CHF - Swiss Franc' },
                { value: 'JPY', label: 'JPY (¥) - Japanese Yen' },
                { value: 'AUD', label: 'AUD (A$) - Australian Dollar' },
                { value: 'CAD', label: 'CAD (C$) - Canadian Dollar' },
                { value: 'AED', label: 'AED - UAE Dirham' },
              ]}
              helperText="All pricing will be displayed in this currency"
            />
            <Select
              label="Timezone"
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              options={[
                { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
                { value: 'Europe/London', label: 'Europe/London (GMT)' },
                { value: 'America/New_York', label: 'America/New_York (EST)' },
                { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
                { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
                { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
                { value: 'Australia/Sydney', label: 'Australia/Sydney (AEDT)' },
              ]}
              helperText="Used for date/time displays and scheduling"
            />
          </div>
        </Card.Body>
      </Card>

      {/* API Keys (Placeholder) */}
      <Card variant="default">
        <Card.Header>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-elevated rounded-lg">
              <Clock className="w-5 h-5 text-muted" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text">API Integrations</h2>
              <p className="text-sm text-muted mt-1">Connect external services (coming soon)</p>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="space-y-4">
            <div className="p-4 bg-elevated rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text">Weather API</h3>
                  <p className="text-xs text-muted mt-1">Connect weather data provider</p>
                </div>
                <Button variant="secondary" size="sm" disabled>
                  Configure
                </Button>
              </div>
            </div>
            <div className="p-4 bg-elevated rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text">PMS Integration</h3>
                  <p className="text-xs text-muted mt-1">
                    Sync with your Property Management System
                  </p>
                </div>
                <Button variant="secondary" size="sm" disabled>
                  Configure
                </Button>
              </div>
            </div>
            <div className="p-4 bg-elevated rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text">Channel Manager</h3>
                  <p className="text-xs text-muted mt-1">
                    Connect to booking channels (Booking.com, Expedia, etc.)
                  </p>
                </div>
                <Button variant="secondary" size="sm" disabled>
                  Configure
                </Button>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" size="lg">
          Cancel
        </Button>
        <Button variant="primary" size="lg" onClick={handleSave} loading={isSaving}>
          {isSaving ? (
            'Saving...'
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </motion.div>
  )
}
