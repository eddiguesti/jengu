import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, Building2, MapPin, DollarSign, Clock, CheckCircle2, Loader2 } from 'lucide-react'
import { Card, Button, Input, Select } from '../components/ui'
import { useBusinessStore } from '../store'
import { useBusinessProfile, useUpdateBusinessProfile } from '../hooks/queries/useBusinessSettings'
import axios from 'axios'

export const Settings = () => {
  const { profile } = useBusinessStore()
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)

  // React Query hooks
  const { data: businessSettings, isLoading } = useBusinessProfile()
  const updateSettingsMutation = useUpdateBusinessProfile()

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

  // Update form when data is loaded from React Query
  useEffect(() => {
    if (businessSettings) {
      setFormData({
        business_name: businessSettings.business_name || '',
        city: businessSettings.city || '',
        country: businessSettings.country || '',
        latitude: businessSettings.latitude || 0,
        longitude: businessSettings.longitude || 0,
        currency: businessSettings.currency || 'EUR',
        timezone: businessSettings.timezone || 'Europe/Paris',
        property_type: businessSettings.property_type || 'hotel',
      })
    }
  }, [businessSettings])

  // Auto-geocode when city and country are both filled
  useEffect(() => {
    const geocodeLocation = async () => {
      if (
        formData.city &&
        formData.country &&
        formData.city.length > 2 &&
        formData.country.length > 2
      ) {
        setIsGeocoding(true)
        setGeocodeError(null)

        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
          const address = `${formData.city}, ${formData.country}`

          const response = await axios.get(`${API_URL}/geocoding/forward`, {
            params: { address },
          })

          if (response.data && response.data.features && response.data.features.length > 0) {
            const [longitude, latitude] = response.data.features[0].center

            setFormData(prev => ({
              ...prev,
              latitude: parseFloat(latitude.toFixed(6)),
              longitude: parseFloat(longitude.toFixed(6)),
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

  const handleSave = () => {
    // Use React Query mutation to save settings
    updateSettingsMutation.mutate(formData)
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
        <h1 className="text-text text-4xl font-bold">Settings</h1>
        <p className="text-muted mt-2">Manage your business profile and preferences</p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card variant="elevated" className="border-primary/20 bg-primary/5">
            <div className="flex items-center gap-3">
              <Loader2 className="text-primary h-5 w-5 animate-spin" />
              <p className="text-primary text-sm font-medium">Loading your settings...</p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Success Message */}
      {updateSettingsMutation.isSuccess && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card variant="elevated" className="border-success/20 bg-success/5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-success h-5 w-5" />
              <p className="text-success text-sm font-medium">
                Settings saved successfully to database!
              </p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Error Message */}
      {updateSettingsMutation.isError && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card variant="elevated" className="border-error/20 bg-error/5">
            <div className="flex items-center gap-3">
              <p className="text-error text-sm font-medium">
                {updateSettingsMutation.error instanceof Error
                  ? updateSettingsMutation.error.message
                  : 'Failed to save settings. Please try again.'}
              </p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Business Information */}
      <Card variant="default">
        <Card.Header>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-lg p-2">
              <Building2 className="text-primary h-5 w-5" />
            </div>
            <div>
              <h2 className="text-text text-xl font-semibold">Business Information</h2>
              <p className="text-muted mt-1 text-sm">Basic details about your property</p>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Business Name"
                value={formData.business_name}
                onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                placeholder="Enter your business name"
              />
            </div>
            <Select
              label="Property Type"
              value={formData.property_type}
              onChange={e =>
                setFormData({
                  ...formData,
                  property_type: e.target.value as
                    | 'hotel'
                    | 'resort'
                    | 'vacation_rental'
                    | 'hostel'
                    | 'other',
                })
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
              <div className="bg-success/10 rounded-lg p-2">
                <MapPin className="text-success h-5 w-5" />
              </div>
              <div>
                <h2 className="text-text text-xl font-semibold">Location</h2>
                <p className="text-muted mt-1 text-sm">
                  Used for weather data and competitor analysis
                </p>
              </div>
            </div>
            {isGeocoding && (
              <div className="text-primary flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Auto-filling coordinates...</span>
              </div>
            )}
          </div>
        </Card.Header>
        <Card.Body>
          <div className="space-y-4">
            {/* Info Banner */}
            <div className="border-primary/20 bg-primary/5 rounded-lg border p-3">
              <p className="text-muted text-sm">
                💡 Enter your city and country, and we'll automatically find the coordinates for
                you!
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Input
                label="City"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g., Nice"
              />
              <Input
                label="Country"
                value={formData.country}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                placeholder="e.g., France"
              />
              <div className="relative">
                <Input
                  label="Latitude"
                  type="number"
                  step="0.000001"
                  value={formData.latitude || ''}
                  onChange={e =>
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
                  onChange={e =>
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
              <div className="border-warning/20 bg-warning/5 rounded-lg border p-3">
                <p className="text-warning text-sm">{geocodeError}</p>
              </div>
            )}

            {/* Success Indicator */}
            {!isGeocoding &&
              formData.latitude !== 0 &&
              formData.longitude !== 0 &&
              !geocodeError && (
                <div className="border-success/20 bg-success/5 flex items-center gap-2 rounded-lg border p-3">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  <p className="text-success text-sm">
                    Location coordinates auto-filled: {formData.latitude.toFixed(6)},{' '}
                    {formData.longitude.toFixed(6)}
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
            <div className="bg-warning/10 rounded-lg p-2">
              <DollarSign className="text-warning h-5 w-5" />
            </div>
            <div>
              <h2 className="text-text text-xl font-semibold">Regional Settings</h2>
              <p className="text-muted mt-1 text-sm">Currency and timezone preferences</p>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Select
              label="Currency"
              value={formData.currency}
              onChange={e =>
                setFormData({
                  ...formData,
                  currency: e.target.value as
                    | 'EUR'
                    | 'USD'
                    | 'GBP'
                    | 'CHF'
                    | 'JPY'
                    | 'AUD'
                    | 'CAD'
                    | 'AED',
                })
              }
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
              onChange={e => setFormData({ ...formData, timezone: e.target.value })}
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
            <div className="bg-elevated rounded-lg p-2">
              <Clock className="text-muted h-5 w-5" />
            </div>
            <div>
              <h2 className="text-text text-xl font-semibold">API Integrations</h2>
              <p className="text-muted mt-1 text-sm">Connect external services (coming soon)</p>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="space-y-4">
            <div className="border-border bg-elevated rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-text text-sm font-semibold">Weather API</h3>
                  <p className="text-muted mt-1 text-xs">Connect weather data provider</p>
                </div>
                <Button variant="secondary" size="sm" disabled>
                  Configure
                </Button>
              </div>
            </div>
            <div className="border-border bg-elevated rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-text text-sm font-semibold">PMS Integration</h3>
                  <p className="text-muted mt-1 text-xs">
                    Sync with your Property Management System
                  </p>
                </div>
                <Button variant="secondary" size="sm" disabled>
                  Configure
                </Button>
              </div>
            </div>
            <div className="border-border bg-elevated rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-text text-sm font-semibold">Channel Manager</h3>
                  <p className="text-muted mt-1 text-xs">
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
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          loading={updateSettingsMutation.isPending}
        >
          {updateSettingsMutation.isPending ? (
            'Saving...'
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </motion.div>
  )
}
