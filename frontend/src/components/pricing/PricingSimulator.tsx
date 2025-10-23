/**
 * Pricing Simulator - "What-if" Analysis Component
 *
 * Allows users to preview different pricing strategies and their impact
 * before applying changes.
 */

import React, { useState } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  BarChart3,
  Info,
  Check,
  Loader2,
} from 'lucide-react'
import apiClient from '../../lib/api/client'

interface SimulationVariant {
  label: string
  price: number
  adjustment: number
  conf_band: { lower: number; upper: number }
  expected: {
    occ_delta: number
    revpar_delta: number
    projected_occ: number
    projected_revpar: number
  }
  reasons: string[]
}

interface SimulationResponse {
  variants: SimulationVariant[]
  baseline: {
    price: number
    occ: number
    revpar: number
  }
  metadata: {
    property_id: string
    stay_date: string
    product: {
      type: string
      refundable: boolean
      los: number
    }
    generated_at: string
  }
}

interface PricingSimulatorProps {
  propertyId: string
  stayDate: string
  product: {
    type: string
    refundable: boolean
    los: number
  }
  toggles: any
  onApplyVariant?: (variant: SimulationVariant) => void
}

export const PricingSimulator: React.FC<PricingSimulatorProps> = ({
  propertyId,
  stayDate,
  product,
  toggles,
  onApplyVariant,
}) => {
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<SimulationVariant | null>(null)

  const runSimulation = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.post('/api/pricing/simulate', {
        propertyId,
        stayDate,
        product,
        toggles,
      })

      setSimulation(response.data)
    } catch (err: any) {
      console.error('Simulation error:', err)
      setError(err.response?.data?.error || 'Failed to run simulation')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyVariant = (variant: SimulationVariant) => {
    setSelectedVariant(variant)
    if (onApplyVariant) {
      onApplyVariant(variant)
    }
  }

  const getVariantColor = (adjustment: number): string => {
    if (adjustment < 0) return 'text-green-600 dark:text-green-400'
    if (adjustment > 0) return 'text-orange-600 dark:text-orange-400'
    return 'text-blue-600 dark:text-blue-400'
  }

  const getVariantBgColor = (adjustment: number): string => {
    if (adjustment < 0) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    if (adjustment > 0) return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
    return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Pricing Simulator
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Preview different pricing strategies before applying
            </p>
          </div>
        </div>

        <Button
          onClick={runSimulation}
          disabled={loading}
          variant="primary"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Simulating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Run Simulation
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {simulation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Baseline Info */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Price</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  ${simulation.baseline.price}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Occupancy</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {simulation.baseline.occ}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current RevPAR</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  ${simulation.baseline.revpar.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Variants Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {simulation.variants.map((variant, index) => (
                <motion.div
                  key={variant.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={`p-4 border-2 cursor-pointer transition-all hover:shadow-lg ${
                      getVariantBgColor(variant.adjustment)
                    } ${
                      selectedVariant?.label === variant.label
                        ? 'ring-2 ring-purple-500 dark:ring-purple-400'
                        : ''
                    }`}
                    onClick={() => handleApplyVariant(variant)}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant={variant.adjustment === 0 ? 'default' : 'secondary'}>
                        {variant.label}
                      </Badge>
                      {selectedVariant?.label === variant.label && (
                        <Check className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      )}
                    </div>

                    {/* Price */}
                    <div className="mb-4">
                      <div className="flex items-baseline gap-2">
                        <DollarSign className={`w-5 h-5 ${getVariantColor(variant.adjustment)}`} />
                        <span className={`text-2xl font-bold ${getVariantColor(variant.adjustment)}`}>
                          {variant.price}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        CI: ${variant.conf_band.lower.toFixed(0)} - ${variant.conf_band.upper.toFixed(0)}
                      </p>
                    </div>

                    {/* Metrics */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-400">Occ</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {variant.expected.projected_occ}%
                          </span>
                          {variant.expected.occ_delta !== 0 && (
                            <span
                              className={`text-xs ${
                                variant.expected.occ_delta > 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              ({variant.expected.occ_delta > 0 ? '+' : ''}
                              {variant.expected.occ_delta}%)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <BarChart3 className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-400">RevPAR</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-900 dark:text-white">
                            ${variant.expected.projected_revpar}
                          </span>
                          {variant.expected.revpar_delta !== 0 && (
                            <span
                              className={`text-xs ${
                                variant.expected.revpar_delta > 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              ({variant.expected.revpar_delta > 0 ? '+' : ''}
                              {variant.expected.revpar_delta.toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Impact Indicator */}
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      {variant.expected.revpar_delta > 0 ? (
                        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                          <TrendingUp className="w-4 h-4" />
                          <span>Revenue increase projected</span>
                        </div>
                      ) : variant.expected.revpar_delta < 0 ? (
                        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                          <TrendingDown className="w-4 h-4" />
                          <span>Revenue decrease projected</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <span>Current baseline</span>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Selected Variant Details */}
            {selectedVariant && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Selected: {selectedVariant.label} (${selectedVariant.price})
                    </h4>
                    <div className="space-y-1">
                      {selectedVariant.reasons.map((reason, index) => (
                        <p key={index} className="text-sm text-gray-700 dark:text-gray-300">
                          • {reason}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Metadata */}
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Generated at {new Date(simulation.metadata.generated_at).toLocaleString()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!simulation && !loading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Run a simulation to see pricing variants
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Compare different pricing strategies and their projected impact
          </p>
        </div>
      )}
    </Card>
  )
}

export default PricingSimulator
