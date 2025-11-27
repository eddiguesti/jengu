import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Upload,
  BarChart3,
  DollarSign,
  Building2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { useNavigate } from 'react-router-dom'

interface OnboardingWizardProps {
  onComplete: () => void
  onDismiss: () => void
}

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to Jengu',
    description: 'Your intelligent pricing platform for maximizing campsite revenue.',
    icon: CheckCircle2,
    content: (
      <div className="space-y-4 text-center">
        <p className="text-muted">
          Jengu helps you make data-driven pricing decisions by analyzing your historical data,
          tracking competitors, and providing AI-powered recommendations.
        </p>
        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="bg-elevated rounded-xl p-4">
            <Upload className="text-primary mx-auto mb-2 h-8 w-8" />
            <p className="text-text text-sm font-medium">Upload Data</p>
          </div>
          <div className="bg-elevated rounded-xl p-4">
            <BarChart3 className="text-primary mx-auto mb-2 h-8 w-8" />
            <p className="text-text text-sm font-medium">Get Insights</p>
          </div>
          <div className="bg-elevated rounded-xl p-4">
            <DollarSign className="text-primary mx-auto mb-2 h-8 w-8" />
            <p className="text-text text-sm font-medium">Optimize Prices</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'upload',
    title: 'Upload Your Data',
    description: 'Start by uploading your historical pricing and occupancy data.',
    icon: Upload,
    action: '/data-sources',
    content: (
      <div className="space-y-4">
        <p className="text-muted">
          Upload a CSV file with your historical booking data. We support the following columns:
        </p>
        <div className="bg-elevated rounded-xl p-4">
          <ul className="text-muted space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="text-success h-4 w-4" />
              <span><strong className="text-text">date</strong> - The booking date</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="text-success h-4 w-4" />
              <span><strong className="text-text">price</strong> - Nightly rate</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="text-success h-4 w-4" />
              <span><strong className="text-text">occupancy</strong> - Occupancy percentage</span>
            </li>
          </ul>
        </div>
        <p className="text-muted text-sm">
          Once uploaded, we&apos;ll automatically enrich your data with weather patterns and
          seasonal trends.
        </p>
      </div>
    ),
  },
  {
    id: 'competitors',
    title: 'Track Competitors',
    description: 'Monitor competitor pricing to stay competitive in your market.',
    icon: Building2,
    action: '/pricing/competitors',
    content: (
      <div className="space-y-4">
        <p className="text-muted">
          Find and track competitor campsites in your area. We&apos;ll automatically monitor their
          pricing changes.
        </p>
        <div className="bg-elevated rounded-xl p-4">
          <ul className="text-muted space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="text-success h-4 w-4" />
              Search by location or postal code
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="text-success h-4 w-4" />
              View competitor photos, ratings, and amenities
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="text-success h-4 w-4" />
              Track price changes over time
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'analytics',
    title: 'View Analytics',
    description: 'Get powerful insights from your data.',
    icon: BarChart3,
    action: '/analytics',
    content: (
      <div className="space-y-4">
        <p className="text-muted">
          Once you&apos;ve uploaded data, explore detailed analytics including:
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-elevated rounded-xl p-3 text-center">
            <p className="text-text text-sm font-medium">Demand Patterns</p>
            <p className="text-muted text-xs">Peak days & seasons</p>
          </div>
          <div className="bg-elevated rounded-xl p-3 text-center">
            <p className="text-text text-sm font-medium">Price Elasticity</p>
            <p className="text-muted text-xs">Customer sensitivity</p>
          </div>
          <div className="bg-elevated rounded-xl p-3 text-center">
            <p className="text-text text-sm font-medium">Weather Impact</p>
            <p className="text-muted text-xs">Temperature effects</p>
          </div>
          <div className="bg-elevated rounded-xl p-3 text-center">
            <p className="text-text text-sm font-medium">Revenue Trends</p>
            <p className="text-muted text-xs">Monthly performance</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'pricing',
    title: 'Optimize Your Prices',
    description: 'Get AI-powered pricing recommendations.',
    icon: DollarSign,
    action: '/pricing/optimizer',
    content: (
      <div className="space-y-4">
        <p className="text-muted">
          Our ML-powered pricing engine analyzes your data to recommend optimal prices for
          maximum revenue.
        </p>
        <div className="bg-primary/10 border-primary/30 rounded-xl border p-4">
          <p className="text-text text-sm font-medium">What you&apos;ll get:</p>
          <ul className="text-muted mt-2 space-y-1 text-sm">
            <li>- Daily price recommendations</li>
            <li>- Seasonal pricing strategies</li>
            <li>- Competitor-aware suggestions</li>
            <li>- Weather-based adjustments</li>
          </ul>
        </div>
      </div>
    ),
  },
]

export const OnboardingWizard = ({ onComplete, onDismiss }: OnboardingWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0)
  const navigate = useNavigate()

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  const handleNext = () => {
    if (isLastStep) {
      onComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleGoToStep = (action: string) => {
    onComplete()
    navigate(action)
  }

  const Icon = step.icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg"
      >
        <Card className="relative overflow-hidden">
          {/* Close Button */}
          <button
            onClick={onDismiss}
            className="text-muted hover:text-text absolute right-4 top-4 z-10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Progress Bar */}
          <div className="bg-elevated flex gap-1 p-4 pb-0">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-primary' : 'bg-border'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <Card.Body className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Icon */}
                <div className="mb-4 flex justify-center">
                  <div className="bg-primary/10 rounded-2xl p-4">
                    <Icon className="text-primary h-10 w-10" />
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-text mb-2 text-center text-2xl font-bold">{step.title}</h2>
                <p className="text-muted mb-6 text-center text-sm">{step.description}</p>

                {/* Step Content */}
                <div className="mb-6">{step.content}</div>
              </motion.div>
            </AnimatePresence>
          </Card.Body>

          {/* Footer */}
          <Card.Footer className="flex items-center justify-between border-t border-border/50 px-6 py-4">
            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {step.action && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGoToStep(step.action!)}
                >
                  Go to {step.title.split(' ').pop()}
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={handleNext}>
                {isLastStep ? (
                  <>
                    Get Started
                    <CheckCircle2 className="ml-1 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </Card.Footer>
        </Card>
      </motion.div>
    </motion.div>
  )
}

export default OnboardingWizard
