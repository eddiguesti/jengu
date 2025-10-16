/**
 * Environment variable types
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: 'development' | 'production' | 'test'
      PORT?: string
      FRONTEND_URL?: string
      MAX_REQUESTS_PER_MINUTE?: string

      SUPABASE_URL: string
      SUPABASE_ANON_KEY: string
      SUPABASE_SERVICE_KEY: string

      ANTHROPIC_API_KEY?: string
      OPENWEATHER_API_KEY?: string
      CALENDARIFIC_API_KEY?: string
      MAPBOX_TOKEN?: string
      SCRAPERAPI_KEY?: string
      MAKCORPS_API_KEY?: string
    }
  }
}

export {}
