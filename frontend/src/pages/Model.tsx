import { useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, Play, CheckCircle2, TrendingUp, Zap, Target } from 'lucide-react'
import { Card, Button, Badge, Progress, Select } from '../components/ui'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'

interface ModelConfig {
  algorithm: 'xgboost' | 'random_forest' | 'neural_network'
  features: string[]
  target: string
  test_size: number
}

interface ModelMetrics {
  accuracy: number
  mae: number
  rmse: number
  r2_score: number
}

export const Model = () => {
  const navigate = useNavigate()
  const [config, setConfig] = useState<ModelConfig>({
    algorithm: 'xgboost',
    features: ['temperature_avg', 'is_weekend', 'is_holiday', 'day_of_week'],
    target: 'price',
    test_size: 0.2,
  })

  const [isTraining, setIsTraining] = useState(false)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [trainedModel, setTrainedModel] = useState<{
    id: string
    metrics: ModelMetrics
    trained_at: string
  } | null>(null)

  const availableFeatures = [
    'temperature_avg',
    'precipitation_mm',
    'sunshine_hours',
    'is_weekend',
    'is_holiday',
    'day_of_week',
    'month',
    'season',
    'competitor_avg_price',
  ]

  const handleTrain = () => {
    setIsTraining(true)
    setTrainingProgress(0)

    // Simulate training progress
    const interval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsTraining(false)
          setTrainedModel({
            id: `model_${Date.now()}`,
            metrics: {
              accuracy: 0.92,
              mae: 12.5,
              rmse: 18.3,
              r2_score: 0.89,
            },
            trained_at: new Date().toISOString(),
          })
          return 100
        }
        return prev + 10
      })
    }, 500)
  }

  const algorithmInfo = {
    xgboost: {
      name: 'XGBoost',
      description: 'Gradient boosting optimized for speed and performance',
      icon: Zap,
      color: 'text-primary',
    },
    random_forest: {
      name: 'Random Forest',
      description: 'Ensemble learning method using multiple decision trees',
      icon: Brain,
      color: 'text-success',
    },
    neural_network: {
      name: 'Neural Network',
      description: 'Deep learning model for complex pattern recognition',
      icon: Target,
      color: 'text-warning',
    },
  }

  const currentAlgoInfo = algorithmInfo[config.algorithm]
  const AlgoIcon = currentAlgoInfo.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-text">Model Training</h1>
        <p className="mt-2 text-muted">Train ML models to predict optimal pricing</p>
      </div>

      {/* Algorithm Selection */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {Object.entries(algorithmInfo).map(([key, info]) => {
          const Icon = info.icon
          const isSelected = config.algorithm === key
          return (
            <Card
              key={key}
              variant={isSelected ? 'elevated' : 'default'}
              className={clsx('cursor-pointer transition-all', isSelected && 'ring-2 ring-primary')}
              onClick={() => setConfig({ ...config, algorithm: key as any })}
            >
              <div className="flex items-start gap-4">
                <div className={clsx('rounded-lg bg-elevated p-3')}>
                  <Icon className={clsx('h-6 w-6', info.color)} />
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 text-lg font-semibold text-text">{info.name}</h3>
                  <p className="text-sm text-muted">{info.description}</p>
                </div>
                {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Configuration */}
      <Card variant="default">
        <Card.Header>
          <h2 className="text-xl font-semibold text-text">Model Configuration</h2>
          <p className="mt-1 text-sm text-muted">Select features and training parameters</p>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-text">Selected Features</h3>
              <div className="space-y-2">
                {availableFeatures.map(feature => {
                  const isSelected = config.features.includes(feature)
                  return (
                    <label
                      key={feature}
                      className={clsx(
                        'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-border/60'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={e => {
                          if (e.target.checked) {
                            setConfig({
                              ...config,
                              features: [...config.features, feature],
                            })
                          } else {
                            setConfig({
                              ...config,
                              features: config.features.filter(f => f !== feature),
                            })
                          }
                        }}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="font-mono text-sm text-text">{feature}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-text">Target Variable</h3>
                <Select
                  value={config.target}
                  onChange={e => setConfig({ ...config, target: e.target.value })}
                  options={[
                    { value: 'price', label: 'Price' },
                    { value: 'occupancy', label: 'Occupancy' },
                    { value: 'bookings', label: 'Bookings' },
                  ]}
                />
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-text">Test Set Size</h3>
                <Select
                  value={config.test_size.toString()}
                  onChange={e => setConfig({ ...config, test_size: parseFloat(e.target.value) })}
                  options={[
                    { value: '0.1', label: '10% (90% training)' },
                    { value: '0.2', label: '20% (80% training)' },
                    { value: '0.3', label: '30% (70% training)' },
                  ]}
                />
              </div>

              <div className="rounded-lg border border-border bg-elevated p-4">
                <p className="mb-2 text-xs font-medium text-muted">Selected Algorithm</p>
                <div className="flex items-center gap-2">
                  <AlgoIcon className={clsx('h-5 w-5', currentAlgoInfo.color)} />
                  <span className="text-sm font-semibold text-text">{currentAlgoInfo.name}</span>
                </div>
              </div>
            </div>
          </div>
        </Card.Body>
        <Card.Footer>
          <div className="flex w-full items-center justify-between">
            <p className="text-sm text-muted">
              {config.features.length} features selected for training
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={handleTrain}
              disabled={isTraining || config.features.length === 0}
              loading={isTraining}
            >
              {isTraining ? (
                <>Training Model...</>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Train Model
                </>
              )}
            </Button>
          </div>
        </Card.Footer>
      </Card>

      {/* Training Progress */}
      {isTraining && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card variant="elevated" className="border-primary/20 bg-primary/5">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Brain className="h-6 w-6 animate-pulse text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text">Training in Progress</h3>
                  <p className="text-sm text-muted">Optimizing {currentAlgoInfo.name} model...</p>
                </div>
              </div>
              <Progress value={trainingProgress} showLabel variant="primary" size="lg" />
            </div>
          </Card>
        </motion.div>
      )}

      {/* Model Results */}
      {trainedModel && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card variant="elevated" className="border-success/20 bg-success/5">
            <Card.Header>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-success/10 p-2">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-text">Model Trained Successfully</h2>
                  <p className="mt-1 text-sm text-muted">
                    Trained at {new Date(trainedModel.trained_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant="success" className="ml-auto">
                  Ready to Use
                </Badge>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                <div className="text-center">
                  <p className="mb-2 text-sm text-muted">Accuracy</p>
                  <p className="text-3xl font-bold text-success">
                    {(trainedModel.metrics.accuracy * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="mb-2 text-sm text-muted">R² Score</p>
                  <p className="text-3xl font-bold text-primary">
                    {trainedModel.metrics.r2_score.toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="mb-2 text-sm text-muted">MAE</p>
                  <p className="text-3xl font-bold text-text">
                    €{trainedModel.metrics.mae.toFixed(1)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="mb-2 text-sm text-muted">RMSE</p>
                  <p className="text-3xl font-bold text-text">
                    €{trainedModel.metrics.rmse.toFixed(1)}
                  </p>
                </div>
              </div>
            </Card.Body>
            <Card.Footer>
              <div className="flex w-full items-center justify-between">
                <p className="text-sm text-muted">
                  Model performs well with {(trainedModel.metrics.r2_score * 100).toFixed(0)}%
                  variance explained
                </p>
                <Button variant="primary" size="lg" onClick={() => navigate('/optimize')}>
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Use for Pricing
                </Button>
              </div>
            </Card.Footer>
          </Card>
        </motion.div>
      )}

      {/* Info Section */}
      <Card variant="default">
        <Card.Header>
          <h3 className="text-lg font-semibold text-text">About Model Training</h3>
        </Card.Header>
        <Card.Body>
          <div className="space-y-4 text-sm text-muted">
            <p>
              Our ML models analyze your historical data to identify patterns and predict optimal
              pricing. Each algorithm has different strengths:
            </p>
            <ul className="ml-4 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong className="text-text">XGBoost</strong>: Best for most use cases, fast
                  training, handles complex relationships
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong className="text-text">Random Forest</strong>: Robust to outliers, provides
                  feature importance
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong className="text-text">Neural Network</strong>: Best for very large
                  datasets, captures non-linear patterns
                </span>
              </li>
            </ul>
            <p className="pt-2">
              The model is evaluated using Mean Absolute Error (MAE), Root Mean Square Error (RMSE),
              and R² score. Higher R² scores indicate better predictive performance.
            </p>
          </div>
        </Card.Body>
      </Card>
    </motion.div>
  )
}
