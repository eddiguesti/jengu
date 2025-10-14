/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Backend API
  readonly VITE_API_URL: string

  // Feature Flags
  readonly VITE_ENABLE_AI_ASSISTANT: string
  readonly VITE_ENABLE_COMPETITOR_PRICING: string
  readonly VITE_ENABLE_WEATHER_DATA: string
  readonly VITE_ENABLE_HOLIDAYS: string
  readonly VITE_ENABLE_GEOCODING: string
  readonly VITE_ENABLE_MAKCORPS: string

  // API Keys (Development only - should use backend in production)
  readonly VITE_ANTHROPIC_API_KEY: string
  readonly VITE_OPENWEATHER_API_KEY: string
  readonly VITE_CALENDARIFIC_API_KEY: string
  readonly VITE_SCRAPERAPI_KEY: string
  readonly VITE_MAPBOX_TOKEN: string
  readonly VITE_MAKCORPS_API_KEY: string

  // App Config
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
